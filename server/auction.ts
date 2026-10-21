import { Prisma } from "@prisma/client";
import { db } from "./db";
import { payments, shipping } from "./providers";
export class DomainError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export const nextBid = (lot: {
  currentCents: number | null;
  startCents: number;
  incrementCents: number;
}) =>
  lot.currentCents === null
    ? Math.max(
        lot.startCents,
        lot.incrementCents * (lot.startCents === 0 ? 1 : 0),
      )
    : lot.currentCents + lot.incrementCents;
export async function submitBid(
  lotId: string,
  userId: string,
  amountCents: number,
  attemptId: string,
  shippingCeilingCents?: number,
) {
  return db.$transaction(
    async (tx) => {
      await tx.$queryRaw`SELECT id FROM "AuctionLot" WHERE id=${lotId} FOR UPDATE`;
      const prior = await tx.bid.findUnique({ where: { attemptId } });
      if (prior) {
        if (
          prior.userId !== userId ||
          prior.lotId !== lotId ||
          prior.amountCents !== amountCents
        )
          throw new DomainError(
            "Identificador já utilizado por outra tentativa.",
            409,
          );
        return prior;
      }
      const lot = await tx.auctionLot.findUnique({
        where: { id: lotId },
        include: { stream: { include: { seller: true } } },
      });
      if (!lot) throw new DomainError("Lote não encontrado.", 404);
      await tx.$queryRaw`SELECT id FROM "User" WHERE id=${userId} FOR UPDATE`;
      const user = await tx.user.findUnique({
        where: { id: userId },
        include: { addresses: true, payments: true },
      });
      if (
        !user?.enabled ||
        !user.termsAt ||
        !user.addresses.length ||
        !user.payments.length
      )
        throw new DomainError("Habilite seu cadastro antes de ofertar.", 403);
      if (lot.stream.seller.userId === userId)
        throw new DomainError(
          "Vendedor não pode ofertar nos próprios lotes.",
          403,
        );
      if (
        lot.status !== "LIVE" ||
        !lot.endsAt ||
        lot.endsAt.getTime() <= Date.now()
      )
        throw new DomainError("Este lote já está encerrado.", 409);
      const min = nextBid(lot);
      if (
        !Number.isSafeInteger(amountCents) ||
        amountCents < min ||
        amountCents > 100_000_000 ||
        (lot.bidMode === "FIXED" && amountCents !== min)
      )
        throw new DomainError(
          "Lance desatualizado ou inferior ao próximo valor permitido.",
          409,
        );
      const address = user.addresses.find((a) => a.kind === "SHIPPING");
      if (!address)
        throw new DomainError("Cadastre o endereço de entrega.", 403);
      const shippingCents = shipping.quote(
        await tx.product.findUniqueOrThrow({ where: { id: lot.productId } }),
        address.postalCode,
      ).cents;
      if (
        shippingCeilingCents !== undefined &&
        shippingCeilingCents !== shippingCents
      )
        throw new DomainError(
          "A cotação mudou. Atualize o frete antes de ofertar.",
          409,
        );
      const bid = await tx.bid.create({
        data: {
          lotId,
          userId,
          amountCents,
          attemptId,
          shippingCents,
          sequence: lot.version + 1,
          createdAt: new Date(),
        },
      });
      const now = Date.now();
      const endsAt =
        lot.endsAt.getTime() - now <= lot.extensionSeconds * 1000
          ? new Date(now + lot.extensionSeconds * 1000)
          : lot.endsAt;
      await tx.auctionLot.update({
        where: { id: lotId },
        data: {
          currentCents: amountCents,
          leaderId: userId,
          endsAt,
          version: { increment: 1 },
        },
      });
      await tx.auctionEvent.create({
        data: {
          lotId,
          type: "BID_ACCEPTED",
          actorId: userId,
          data: {
            bidId: bid.id,
            sequence: bid.sequence,
            amountCents,
            shippingCents,
            endsAt: endsAt.toISOString(),
          },
        },
      });
      return bid;
    },
    { timeout: 10000 },
  );
}
export async function closeLot(lotId: string, actorId?: string, force = false) {
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "AuctionLot" WHERE id=${lotId} FOR UPDATE`;
    const lot = await tx.auctionLot.findUnique({
      where: { id: lotId },
      include: { product: true, stream: true },
    });
    if (
      !lot ||
      lot.status !== "LIVE" ||
      !lot.endsAt ||
      (!force && lot.endsAt.getTime() > Date.now())
    )
      return false;
    const status = lot.leaderId ? "SOLD" : "UNSOLD";
    await tx.auctionLot.update({
      where: { id: lotId },
      data: { status, version: { increment: 1 } },
    });
    await tx.auctionResult.create({
      data: { lotId, winnerId: lot.leaderId, amountCents: lot.currentCents },
    });
    if (lot.leaderId && lot.currentCents !== null) {
      const buyer = await tx.user.findUniqueOrThrow({
        where: { id: lot.leaderId },
        include: { addresses: true, payments: true },
      });
      const address = buyer.addresses.find((a) => a.kind === "SHIPPING")!;
      const winningBid = await tx.bid.findFirstOrThrow({
        where: { lotId, userId: lot.leaderId, amountCents: lot.currentCents },
      });
      const shippingCents =
        winningBid.shippingCents ??
        shipping.quote(lot.product, address.postalCode).cents;
      const status = payments.capture(buyer.payments[0].scenario);
      await tx.order.create({
        data: {
          lotId,
          buyerId: buyer.id,
          amountCents: lot.currentCents,
          shippingCents,
          totalCents: lot.currentCents + shippingCents,
          status,
          shippingAddress: JSON.parse(
            JSON.stringify(address),
          ) as Prisma.InputJsonValue,
          attempts: { create: { status } },
        },
      });
      await tx.product.update({
        where: { id: lot.productId },
        data: { stock: { decrement: 1 } },
      });
    }
    await tx.auctionEvent.create({
      data: {
        lotId,
        type: status,
        actorId,
        data: {
          winnerId: lot.leaderId,
          amountCents: lot.currentCents,
          forced: force,
        },
      },
    });
    return true;
  });
}
export async function startLot(lotId: string, actorId: string) {
  return db.$transaction(async (tx) => {
    const initial = await tx.auctionLot.findUniqueOrThrow({
      where: { id: lotId },
    });
    await tx.$queryRaw`SELECT id FROM "LiveStream" WHERE id=${initial.streamId} FOR UPDATE`;
    await tx.$queryRaw`SELECT id FROM "Product" WHERE id=${initial.productId} FOR UPDATE`;
    const lot = await tx.auctionLot.findUniqueOrThrow({
      where: { id: lotId },
      include: { product: true, stream: { include: { seller: true } } },
    });
    if (lot.stream.seller.userId !== actorId)
      throw new DomainError("Acesso negado.", 403);
    if (
      !["READY", "SCHEDULED", "DRAFT"].includes(lot.status) ||
      lot.product.stock < 1
    )
      throw new DomainError("Lote indisponível ou estoque esgotado.", 409);
    const active = await tx.auctionLot.count({
      where: {
        OR: [{ streamId: lot.streamId }, { productId: lot.productId }],
        status: "LIVE",
      },
    });
    if (active)
      throw new DomainError(
        "Encerre o lote ativo antes de iniciar outro.",
        409,
      );
    const updated = await tx.auctionLot.update({
      where: { id: lotId },
      data: {
        status: "LIVE",
        endsAt: new Date(Date.now() + lot.durationSeconds * 1000),
        version: { increment: 1 },
      },
    });
    await tx.liveStream.update({
      where: { id: lot.streamId },
      data: { status: "LIVE" },
    });
    await tx.auctionEvent.create({
      data: {
        lotId,
        type: "STARTED",
        actorId,
        data: { endsAt: updated.endsAt?.toISOString() },
      },
    });
    return updated;
  });
}

import type { Prisma } from "@prisma/client";
import { db } from "./db";
import { DomainError } from "./auction";
export async function editLot(
  id: string,
  sellerId: string,
  data: Prisma.AuctionLotUncheckedUpdateInput,
) {
  return db.$transaction(async (tx) => {
    const original = await tx.auctionLot.findUniqueOrThrow({ where: { id } });
    await tx.$queryRaw`SELECT id FROM "LiveStream" WHERE id=${original.streamId} FOR UPDATE`;
    await tx.$queryRaw`SELECT id FROM "AuctionLot" WHERE id=${id} FOR UPDATE`;
    const lot = await tx.auctionLot.findUniqueOrThrow({
      where: { id },
      include: { stream: true },
    });
    if (lot.stream.sellerId !== sellerId)
      throw new DomainError("Acesso negado.", 403);
    if (!["READY", "DRAFT", "SCHEDULED"].includes(lot.status))
      throw new DomainError("Regras congeladas após o início.", 409);
    const product = await tx.product.findUnique({
      where: { id: String(data.productId) },
    });
    if (product?.sellerId !== sellerId)
      throw new DomainError("Produto indisponível.", 403);
    return tx.auctionLot.update({ where: { id }, data });
  });
}
export async function editProduct(
  id: string,
  sellerId: string,
  data: Prisma.ProductUncheckedUpdateInput,
) {
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Product" WHERE id=${id} FOR UPDATE`;
    const p = await tx.product.findUnique({ where: { id } });
    if (!p || p.sellerId !== sellerId)
      throw new DomainError("Acesso negado.", 403);
    if (await tx.auctionLot.count({ where: { productId: id, status: "LIVE" } }))
      throw new DomainError("Produto em disputa não pode ser alterado.", 409);
    return tx.product.update({ where: { id }, data });
  });
}

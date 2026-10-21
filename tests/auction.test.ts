import { test, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { db } from "../server/db";
import { editLot, editProduct } from "../server/catalog";
import { submitBid, startLot, closeLot, nextBid } from "../server/auction";
const streams: string[] = [];
async function fixture(settings: Record<string, unknown> = {}) {
  const stream = await db.liveStream.create({
    data: {
      sellerId: "seller-select",
      title: "Automated integration test",
      category: "TEST",
      demonstration: true,
    },
  });
  streams.push(stream.id);
  const product = await db.product.create({
    data: {
      sellerId: "seller-select",
      name: "Test lot",
      description: "Automated test fixture",
      category: "TEST",
      artwork: "perfume",
      stock: 1,
    },
  });
  return db.auctionLot.create({
    data: {
      streamId: stream.id,
      productId: product.id,
      startCents: 1500,
      incrementCents: 100,
      durationSeconds: 30,
      ...settings,
    },
  });
}
after(async () => {
  for (const streamId of streams) {
    const lots = await db.auctionLot.findMany({ where: { streamId } });
    for (const lot of lots) {
      const orders = await db.order.findMany({ where: { lotId: lot.id } });
      await db.paymentAttempt.deleteMany({
        where: { orderId: { in: orders.map((o) => o.id) } },
      });
      await db.order.deleteMany({ where: { lotId: lot.id } });
      await db.auctionResult.deleteMany({ where: { lotId: lot.id } });
      await db.auctionEvent.deleteMany({ where: { lotId: lot.id } });
      await db.bid.deleteMany({ where: { lotId: lot.id } });
      await db.auctionLot.delete({ where: { id: lot.id } });
      await db.product.delete({ where: { id: lot.productId } });
    }
    await db.liveStream.delete({ where: { id: streamId } });
  }
  await db.$disconnect();
});
test("first bid R$15, B sees R$16, extension, a single winner and persisted sandbox order", async () => {
  const lot = await fixture();
  await startLot(lot.id, "seller-demo");
  await submitBid(lot.id, "buyer-a", 1500, randomUUID());
  let state = await db.auctionLot.findUniqueOrThrow({ where: { id: lot.id } });
  assert.equal(nextBid(state), 1600);
  await db.auctionLot.update({
    where: { id: lot.id },
    data: { endsAt: new Date(Date.now() + 6000) },
  });
  await submitBid(lot.id, "buyer-b", 1600, randomUUID());
  state = await db.auctionLot.findUniqueOrThrow({ where: { id: lot.id } });
  assert.equal(nextBid(state), 1700);
  assert.ok(state.endsAt!.getTime() - Date.now() > 9000);
  await db.auctionLot.update({
    where: { id: lot.id },
    data: { endsAt: new Date(Date.now() - 10) },
  });
  await Promise.all([closeLot(lot.id), closeLot(lot.id)]);
  const result = await db.auctionResult.findUniqueOrThrow({
    where: { lotId: lot.id },
  });
  assert.equal(result.winnerId, "buyer-b");
  const order = await db.order.findUniqueOrThrow({ where: { lotId: lot.id } });
  assert.equal(order.status, "PAID_SANDBOX");
  assert.equal(order.amountCents, 1600);
  assert.ok(order.shippingCents > 0);
  await assert.rejects(
    submitBid(lot.id, "buyer-a", 1700, randomUUID()),
    /encerrado/,
  );
});
test("simultaneous equal bids accept exactly one; stale bid rejected", async () => {
  const lot = await fixture();
  await startLot(lot.id, "seller-demo");
  const results = await Promise.allSettled([
    submitBid(lot.id, "buyer-a", 1500, randomUUID()),
    submitBid(lot.id, "buyer-b", 1500, randomUUID()),
  ]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal(await db.bid.count({ where: { lotId: lot.id } }), 1);
  await assert.rejects(
    submitBid(lot.id, "buyer-a", 1499, randomUUID()),
    /desatualizado/,
  );
});
test("idempotent retry returns original bid and conflicting attempt is rejected", async () => {
  const lot = await fixture();
  await startLot(lot.id, "seller-demo");
  const attempt = randomUUID();
  const [a, b] = await Promise.all([
    submitBid(lot.id, "buyer-a", 1500, attempt),
    submitBid(lot.id, "buyer-a", 1500, attempt),
  ]);
  assert.equal(a.id, b.id);
  assert.equal(await db.bid.count({ where: { lotId: lot.id } }), 1);
  await assert.rejects(
    submitBid(lot.id, "buyer-b", 1600, attempt),
    /Identificador/,
  );
});
test("unqualified and own-seller bids denied; rules freeze; unauthorized start denied", async () => {
  const lot = await fixture();
  await assert.rejects(startLot(lot.id, "buyer-a"), /Acesso/);
  await startLot(lot.id, "seller-demo");
  await assert.rejects(
    submitBid(lot.id, "admin-demo", 1500, randomUUID()),
    /Habilite/,
  );
  await db.user.update({
    where: { id: "seller-demo" },
    data: { enabled: true, termsAt: new Date() },
  });
  try {
    await assert.rejects(submitBid(lot.id, "seller-demo", 1500, randomUUID()));
  } finally {
    await db.user.update({
      where: { id: "seller-demo" },
      data: { enabled: false, termsAt: null },
    });
  }
  await assert.rejects(startLot(lot.id, "seller-demo"), /indisponível/);
});
test("zero opening starts at increment; free bid validates minimum; unsold closes without order", async () => {
  const lot = await fixture({
    startCents: 0,
    bidMode: "FREE",
    incrementCents: 200,
  });
  assert.equal(nextBid({ ...lot, currentCents: null }), 200);
  await startLot(lot.id, "seller-demo");
  await assert.rejects(
    submitBid(lot.id, "buyer-a", 100, randomUUID()),
    /desatualizado/,
  );
  await submitBid(lot.id, "buyer-a", 2700, randomUUID());
  assert.equal(
    (await db.auctionLot.findUniqueOrThrow({ where: { id: lot.id } }))
      .currentCents,
    2700,
  );
  const empty = await fixture();
  await startLot(empty.id, "seller-demo");
  await closeLot(empty.id, "seller-demo", true);
  assert.equal(
    (await db.auctionLot.findUniqueOrThrow({ where: { id: empty.id } })).status,
    "UNSOLD",
  );
  assert.equal(await db.order.count({ where: { lotId: empty.id } }), 0);
});
test("declined and pending payments persist with winner, no real capture", async () => {
  for (const [scenario, expected] of [
    ["DECLINED", "PAYMENT_DECLINED"],
    ["PENDING", "PAYMENT_PENDING"],
  ]) {
    await db.paymentMethodReference.updateMany({
      where: { userId: "buyer-a" },
      data: { scenario },
    });
    try {
      const lot = await fixture();
      await startLot(lot.id, "seller-demo");
      await submitBid(lot.id, "buyer-a", 1500, randomUUID());
      await closeLot(lot.id, "seller-demo", true);
      assert.equal(
        (await db.order.findUniqueOrThrow({ where: { lotId: lot.id } })).status,
        expected,
      );
    } finally {
      await db.paymentMethodReference.updateMany({
        where: { userId: "buyer-a" },
        data: { scenario: "APPROVED" },
      });
    }
  }
});

test("accepted shipping is persisted and stale quote cannot bind buyer", async () => {
  const lot = await fixture();
  await startLot(lot.id, "seller-demo");
  await assert.rejects(
    submitBid(lot.id, "buyer-a", 1500, randomUUID(), 0),
    /cotação mudou/,
  );
  const bid = await submitBid(lot.id, "buyer-a", 1500, randomUUID(), 1350);
  assert.equal(bid.shippingCents, 1350);
  await closeLot(lot.id, "seller-demo", true);
  assert.equal(
    (await db.order.findUniqueOrThrow({ where: { lotId: lot.id } }))
      .shippingCents,
    1350,
  );
});

test("started lot settings and product cannot change through catalog operations", async () => {
  const lot = await fixture();
  await startLot(lot.id, "seller-demo");
  await assert.rejects(
    editLot(lot.id, "seller-select", {
      productId: lot.productId,
      startCents: 1,
    }),
    /congeladas/,
  );
  await assert.rejects(
    editProduct(lot.productId, "seller-select", { weight: 999 }),
    /disputa/,
  );
});

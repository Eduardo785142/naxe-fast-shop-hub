import { db } from "../server/db";
export async function cleanupBrowserFixtures() {
  if (process.env.DEMO_MODE !== "true")
    throw new Error("Test cleanup requires sandbox.");
  const streams = await db.liveStream.findMany({
    where: {
      title: { in: ["Browser multiuser test", "Live de teste do Studio"] },
    },
  });
  for (const stream of streams) {
    const lots = await db.auctionLot.findMany({
      where: { streamId: stream.id },
    });
    for (const lot of lots) {
      const order = await db.order.findUnique({ where: { lotId: lot.id } });
      if (order) {
        await db.product.update({
          where: { id: lot.productId },
          data: { stock: { increment: 1 } },
        });
        await db.paymentAttempt.deleteMany({ where: { orderId: order.id } });
        await db.order.delete({ where: { id: order.id } });
      }
      await db.auctionResult.deleteMany({ where: { lotId: lot.id } });
      await db.auctionEvent.deleteMany({ where: { lotId: lot.id } });
      await db.bid.deleteMany({ where: { lotId: lot.id } });
      await db.auctionLot.delete({ where: { id: lot.id } });
    }
    await db.chatMessage.deleteMany({ where: { streamId: stream.id } });
    await db.liveStream.delete({ where: { id: stream.id } });
  }
  const products = await db.product.findMany({
    where: {
      name: { startsWith: "Produto de teste " },
      description: "Produto fictício para teste automatizado.",
    },
  });
  for (const p of products)
    if ((await db.auctionLot.count({ where: { productId: p.id } })) === 0)
      await db.product.delete({ where: { id: p.id } });
  const users = await db.user.findMany({
    where: {
      name: "Pessoa de Teste",
      email: { startsWith: "test-", endsWith: "@naxe.test" },
    },
  });
  for (const u of users) {
    if (await db.bid.count({ where: { userId: u.id } })) continue;
    await db.session.deleteMany({ where: { userId: u.id } });
    await db.address.deleteMany({ where: { userId: u.id } });
    await db.paymentMethodReference.deleteMany({ where: { userId: u.id } });
    await db.user.delete({ where: { id: u.id } });
  }
}

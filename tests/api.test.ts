import { cleanupBrowserFixtures } from "./cleanup";
import { startLot, submitBid, closeLot } from "../server/auction";
import { test, after } from "node:test";
import { db } from "../server/db";
import { randomUUID } from "node:crypto";
after(async () => db.$disconnect());
import assert from "node:assert/strict";
const root = "http://127.0.0.1:4000";
test("API authorization and cross-origin protections", async () => {
  for (const path of ["/api/account", "/api/seller", "/api/admin"])
    assert.equal((await fetch(root + path)).status, 401);
  assert.equal(
    (
      await fetch(root + "/api/auth/login", {
        method: "POST",
        headers: {
          Origin: "https://untrusted.example",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: "comprador.a@naxe.test",
          password: process.env.DEMO_PASSWORD,
        }),
      })
    ).status,
    403,
  );
  const auth = await fetch(root + "/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "comprador.a@naxe.test",
      password: process.env.DEMO_PASSWORD,
    }),
  });
  assert.equal(auth.status, 200);
  const cookie = auth.headers.get("set-cookie")!.split(";")[0];
  assert.match(auth.headers.get("set-cookie")!, /HttpOnly/i);
  assert.match(auth.headers.get("set-cookie")!, /SameSite=Lax/i);
  assert.equal(
    (await fetch(root + "/api/admin", { headers: { Cookie: cookie } })).status,
    403,
  );
  assert.equal(
    (
      await fetch(root + "/api/playground/start", {
        method: "POST",
        headers: { Cookie: cookie, "Content-Type": "application/json" },
        body: "{}",
      })
    ).status,
    403,
  );
  const publicState = await (
    await fetch(root + "/api/streams/live-perfume")
  ).json();
  const serialized = JSON.stringify(publicState);
  assert.ok(!serialized.includes("passwordHash"));
  assert.ok(!serialized.includes('postalCode":"01310100'));
  assert.ok(!serialized.includes("comprador.a@naxe.test"));
  const malformed = await fetch(root + "/api/lots/lot-perfume/bid", {
    method: "POST",
    headers: { Cookie: cookie, "Content-Type": "application/json" },
    body: JSON.stringify({ amountCents: 15.2, attemptId: "not-a-uuid" }),
  });
  assert.equal(malformed.status, 400);
  const logout = await fetch(root + "/api/auth/logout", {
    method: "POST",
    headers: { Cookie: cookie, "Content-Type": "application/json" },
    body: "{}",
  });
  assert.equal(logout.status, 200);
  assert.equal(
    (await fetch(root + "/api/account", { headers: { Cookie: cookie } }))
      .status,
    401,
  );
});

test("admin role changes are audited, revoke sessions and respect resource ownership", async () => {
  const login = async (email: string) => {
    const r = await fetch(root + "/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: process.env.DEMO_PASSWORD }),
    });
    assert.equal(r.status, 200);
    return r.headers.get("set-cookie")!.split(";")[0];
  };
  const admin = await login("admin@naxe.test");
  const email = `api-test-${randomUUID()}@naxe.test`,
    password = "FicticiaSegura2026!";
  const register = await fetch(root + "/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "API role fixture", email, password }),
  });
  assert.equal(register.status, 201);
  const user = await register.json();
  const initialCookie = register.headers.get("set-cookie")!.split(";")[0];
  try {
    const promoted = await fetch(root + `/api/admin/users/${user.id}/role`, {
      method: "PATCH",
      headers: { Cookie: admin, "Content-Type": "application/json" },
      body: JSON.stringify({ role: "SELLER" }),
    });
    assert.equal(promoted.status, 200);
    assert.equal(
      (
        await fetch(root + "/api/account", {
          headers: { Cookie: initialCookie },
        })
      ).status,
      401,
    );
    const signed = await fetch(root + "/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const cookie = signed.headers.get("set-cookie")!.split(";")[0];
    assert.equal(
      (await fetch(root + "/api/seller", { headers: { Cookie: cookie } }))
        .status,
      200,
    );
    const forbidden = await fetch(root + "/api/seller/lots/lot-perfume/start", {
      method: "POST",
      headers: { Cookie: cookie, "Content-Type": "application/json" },
      body: "{}",
    });
    assert.equal(forbidden.status, 403);
    assert.equal(
      await db.auditLog.count({
        where: { resourceId: user.id, action: "CHANGE_ROLE" },
      }),
      1,
    );
  } finally {
    await db.session.deleteMany({ where: { userId: user.id } });
    await db.seller.deleteMany({ where: { userId: user.id } });
    await db.auditLog.deleteMany({ where: { resourceId: user.id } });
    await db.user.delete({ where: { id: user.id } });
  }
});

test("sandbox fulfillment, idempotent refund and moderation use authorized persisted state", async () => {
  const login = async (email: string) => {
    const r = await fetch(root + "/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: process.env.DEMO_PASSWORD }),
    });
    assert.equal(r.status, 200);
    return r.headers.get("set-cookie")!.split(";")[0];
  };
  const seller = await login("vendedor@naxe.test"),
    buyer = await login("comprador.a@naxe.test"),
    admin = await login("admin@naxe.test");
  const stream = await db.liveStream.create({
    data: {
      sellerId: "seller-select",
      title: "Browser multiuser test",
      category: "TEST",
    },
  });
  const lot = await db.auctionLot.create({
    data: {
      streamId: stream.id,
      productId: "perfume",
      startCents: 1500,
      incrementCents: 100,
      durationSeconds: 30,
    },
  });
  let orderId: string | undefined, messageId: string | undefined;
  try {
    await startLot(lot.id, "seller-demo");
    await submitBid(lot.id, "buyer-a", 1500, randomUUID());
    await closeLot(lot.id, "seller-demo", true);
    const order = await db.order.findUniqueOrThrow({
      where: { lotId: lot.id },
    });
    orderId = order.id;
    const send = async (
      path: string,
      body: unknown,
      cookie: string,
      method = "POST",
    ) =>
      fetch(root + path, {
        method,
        headers: { Cookie: cookie, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    for (const status of [
      "PROCESSING_SANDBOX",
      "SHIPPED_SANDBOX",
      "DELIVERED_SANDBOX",
    ])
      assert.equal(
        (
          await send(
            `/api/seller/orders/${order.id}/status`,
            { status },
            seller,
            "PATCH",
          )
        ).status,
        200,
      );
    assert.equal(
      (await db.order.findUniqueOrThrow({ where: { id: order.id } })).status,
      "DELIVERED_SANDBOX",
    );
    const refunds = await Promise.all([
      send(`/api/orders/${order.id}/refund`, {}, buyer),
      send(`/api/orders/${order.id}/refund`, {}, buyer),
    ]);
    assert.ok(refunds.every((r) => r.status === 200));
    assert.equal(
      await db.auditLog.count({
        where: { resourceId: order.id, action: "SANDBOX_REFUND" },
      }),
      1,
    );
    assert.equal(
      (
        await send(
          `/api/streams/${stream.id}/chat`,
          { text: "Mensagem para teste de moderação" },
          buyer,
        )
      ).status,
      200,
    );
    const message = await db.chatMessage.findFirstOrThrow({
      where: { streamId: stream.id },
    });
    messageId = message.id;
    assert.equal(
      (await send(`/api/admin/messages/${message.id}/hide`, {}, buyer)).status,
      403,
    );
    assert.equal(
      (await send(`/api/admin/messages/${message.id}/hide`, {}, admin)).status,
      200,
    );
    const state = await (
      await fetch(root + `/api/streams/${stream.id}`)
    ).json();
    assert.equal(state.messages.length, 0);
  } finally {
    await db.auditLog.deleteMany({
      where: {
        resourceId: {
          in: [orderId, messageId].filter((s): s is string => !!s),
        },
      },
    });
    await cleanupBrowserFixtures();
  }
});

import express, {
  type Request,
  type Response,
  type NextFunction,
} from "express";
import { createServer } from "node:http";
import { randomBytes, randomUUID } from "node:crypto";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { Server } from "socket.io";
import { createClient } from "redis";
import { z } from "zod";
import { db } from "./db";
import { editLot, editProduct } from "./catalog";
import {
  hashPassword,
  verifyPassword,
  tokenHash,
  publicUser,
} from "./security";
import { DomainError, submitBid, startLot, closeLot, nextBid } from "./auction";
import {
  shipping,
  payments,
  pseudonym,
  DemoStreamingProvider,
  CloudflareStreamingProvider,
} from "./providers";
const app = express();
app.set("trust proxy", "loopback");
const http = createServer(app);
const origin = process.env.APP_ORIGIN ?? "http://localhost:3000";
const demo = process.env.DEMO_MODE === "true";
if (!demo)
  throw new Error(
    "This release supports sandbox only. Commercial mode is not implemented.",
  );
const redis = createClient({ url: process.env.REDIS_URL });
redis.on("error", (e) =>
  console.error(JSON.stringify({ event: "redis_error", message: e.message })),
);
await redis.connect();
const io = new Server(http, {
  path: "/socket.io",
  addTrailingSlash: false,
  cors: { origin, credentials: true },
  allowRequest: (req, cb) =>
    cb(null, !req.headers.origin || req.headers.origin === origin),
  maxHttpBufferSize: 8192,
});
app.disable("x-powered-by");
app.use(helmet());
app.use(express.json({ limit: "24kb" }));
app.use(cookieParser());
app.use(
  "/api",
  rateLimit({
    windowMs: 60000,
    limit: 240,
    standardHeaders: "draft-7",
    legacyHeaders: false,
  }),
);
app.use("/api", (req, res, next) => {
  if (
    !["GET", "HEAD", "OPTIONS"].includes(req.method) &&
    req.headers.origin &&
    req.headers.origin !== origin
  )
    return res.status(403).json({ error: "Origem não autorizada." });
  next();
});
async function current(req: Request) {
  const raw = req.cookies.naxe_session as string | undefined;
  if (!raw) return null;
  const s = await db.session.findUnique({
    where: { id: tokenHash(raw) },
    include: { user: true },
  });
  return s && s.expiresAt > new Date() ? s.user : null;
}
async function requireUser(req: Request) {
  const u = await current(req);
  if (!u) throw new DomainError("Entre na sua conta.", 401);
  return u;
}
async function sellerFor(req: Request) {
  const u = await requireUser(req);
  const seller = await db.seller.findUnique({ where: { userId: u.id } });
  if (!seller || u.role !== "SELLER")
    throw new DomainError("Área exclusiva do vendedor.", 403);
  return seller;
}
async function ownLot(req: Request) {
  const seller = await sellerFor(req);
  const lot = await db.auctionLot.findUnique({
    where: { id: String(req.params.id) },
    include: { stream: true },
  });
  if (!lot || lot.stream.sellerId !== seller.id)
    throw new DomainError("Lote indisponível.", 403);
  return lot;
}
const route =
  (fn: (req: Request, res: Response) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res)).catch(next);
  };
async function snapshot(id: string) {
  const s = await db.liveStream.findUnique({
    where: { id },
    include: {
      seller: {
        select: { id: true, slug: true, displayName: true, verified: true },
      },
      lots: {
        orderBy: { position: "asc" },
        include: {
          product: true,
          bids: { orderBy: { sequence: "desc" }, take: 30 },
          result: true,
        },
      },
      messages: {
        where: { hidden: false },
        orderBy: { createdAt: "desc" },
        take: 50,
        include: { user: { select: { id: true, role: true } } },
      },
    },
  });
  if (!s) throw new DomainError("Transmissão não encontrada.", 404);
  const sockets = await io.in(id).fetchSockets();
  return {
    ...s,
    viewers: sockets.length,
    serverNow: Date.now(),
    lots: s.lots.map((l) => ({
      ...l,
      leaderId: l.leaderId ? pseudonym(l.leaderId) : null,
      nextCents: nextBid(l),
      bids: l.bids.map((b) => ({
        id: b.id,
        sequence: b.sequence,
        amountCents: b.amountCents,
        alias: pseudonym(b.userId),
        createdAt: b.createdAt,
      })),
      result: l.result
        ? {
            ...l.result,
            winnerId: l.result.winnerId ? pseudonym(l.result.winnerId) : null,
          }
        : null,
    })),
    messages: s.messages.reverse().map((m) => ({
      id: m.id,
      text: m.text,
      alias: m.user.role === "SELLER" ? "Vendedor" : pseudonym(m.userId),
      createdAt: m.createdAt,
    })),
  };
}
async function broadcast(id: string) {
  io.to(id).emit("state", await snapshot(id));
}
async function session(res: Response, userId: string) {
  const token = randomBytes(32).toString("hex");
  await db.session.create({
    data: {
      id: tokenHash(token),
      userId,
      expiresAt: new Date(Date.now() + 7 * 86400000),
    },
  });
  res.cookie("naxe_session", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 7 * 86400000,
    path: "/",
  });
}
app.get(
  "/api/health",
  route(async (_req, res) => {
    await db.$queryRaw`SELECT 1`;
    await redis.ping();
    res.json({
      ok: true,
      mode: "sandbox",
      streaming: process.env.STREAMING_PROVIDER ?? "demo",
    });
  }),
);
app.get(
  "/api/me",
  route(async (req, res) => {
    const u = await current(req);
    res.json(u ? publicUser(u) : null);
  }),
);
const authLimit = rateLimit({ windowMs: 60000, limit: 30 });
app.post(
  "/api/auth/register",
  authLimit,
  route(async (req, res) => {
    const d = z
      .object({
        name: z.string().trim().min(2).max(80),
        email: z.string().email().max(200),
        password: z.string().min(12).max(128),
      })
      .parse(req.body);
    const u = await db.user.create({
      data: {
        name: d.name,
        email: d.email.toLowerCase(),
        passwordHash: hashPassword(d.password),
        alias: `user-${randomUUID().slice(0, 8)}`,
      },
    });
    await session(res, u.id);
    res.status(201).json(publicUser(u));
  }),
);
app.post(
  "/api/auth/login",
  authLimit,
  route(async (req, res) => {
    const d = z
      .object({
        email: z.string().email(),
        password: z.string().min(1).max(128),
      })
      .parse(req.body);
    const u = await db.user.findUnique({
      where: { email: d.email.toLowerCase() },
    });
    if (!u || !verifyPassword(d.password, u.passwordHash))
      throw new DomainError("E-mail ou senha incorretos.", 401);
    await session(res, u.id);
    res.json(publicUser(u));
  }),
);
app.post(
  "/api/auth/logout",
  route(async (req, res) => {
    const token = req.cookies.naxe_session as string | undefined;
    if (token) await db.session.deleteMany({ where: { id: tokenHash(token) } });
    res.clearCookie("naxe_session", { path: "/" });
    res.json({ ok: true });
  }),
);
const addressSchema = z.object({
  postalCode: z.string().regex(/^\d{8}$/),
  street: z.string().trim().min(3).max(120),
  number: z.string().min(1).max(20),
  city: z.string().min(2).max(80),
  state: z.string().regex(/^[A-Z]{2}$/),
});
app.post(
  "/api/account/enable",
  route(async (req, res) => {
    const u = await requireUser(req);
    const d = z
      .object({
        shipping: addressSchema,
        billing: addressSchema.optional(),
        sameBilling: z.boolean(),
        terms: z.literal(true),
        scenario: z.enum(["APPROVED", "DECLINED", "PENDING"]),
      })
      .parse(req.body);
    await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "User" WHERE id=${u.id} FOR UPDATE`;
      // Freeze commercial details while a buyer leads an active lot: the quoted shipping must remain stable.
      if (
        await tx.auctionLot.count({ where: { leaderId: u.id, status: "LIVE" } })
      )
        throw new DomainError(
          "Aguarde o encerramento do lote que você lidera para alterar os dados.",
          409,
        );
      await tx.address.deleteMany({ where: { userId: u.id } });
      await tx.address.createMany({
        data: [
          { ...d.shipping, kind: "SHIPPING", userId: u.id },
          {
            ...(d.sameBilling ? d.shipping : addressSchema.parse(d.billing)),
            kind: "BILLING",
            userId: u.id,
          },
        ],
      });
      await tx.paymentMethodReference.deleteMany({ where: { userId: u.id } });
      await tx.paymentMethodReference.create({
        data: {
          userId: u.id,
          reference: `sandbox-${randomUUID()}`,
          scenario: d.scenario,
        },
      });
      await tx.user.update({
        where: { id: u.id },
        data: { enabled: true, termsAt: new Date() },
      });
    });
    res.json({ ok: true });
  }),
);
app.get(
  "/api/account",
  route(async (req, res) => {
    const u = await requireUser(req);
    const [addresses, payment, bids, orders] = await Promise.all([
      db.address.findMany({ where: { userId: u.id } }),
      db.paymentMethodReference.findFirst({
        where: { userId: u.id },
        select: { scenario: true, provider: true },
      }),
      db.bid.findMany({
        where: { userId: u.id },
        take: 100,
        orderBy: { createdAt: "desc" },
        include: { lot: { include: { product: true } } },
      }),
      db.order.findMany({
        where: { buyerId: u.id },
        orderBy: { createdAt: "desc" },
        include: { lot: { include: { product: true } }, attempts: true },
      }),
    ]);
    res.json({ user: publicUser(u), addresses, payment, bids, orders });
  }),
);
app.get(
  "/api/streams",
  route(async (req, res) => {
    const search = String(req.query.q ?? "").slice(0, 100),
      category = String(req.query.category ?? "");
    const streams = await db.liveStream.findMany({
      where: {
        id: { not: "playground" },
        title: { contains: search, mode: "insensitive" },
        ...(category ? { category } : {}),
      },
      include: {
        seller: { select: { slug: true, displayName: true, verified: true } },
        lots: { include: { product: true }, orderBy: { position: "asc" } },
      },
      orderBy: { title: "asc" },
    });
    res.json(
      await Promise.all(
        streams.map(async (s) => ({
          ...s,
          viewers: (await io.in(s.id).fetchSockets()).length,
        })),
      ),
    );
  }),
);
app.get(
  "/api/streams/:id",
  route(async (req, res) => res.json(await snapshot(String(req.params.id)))),
);
app.get(
  "/api/sellers/:slug",
  route(async (req, res) => {
    const s = await db.seller.findUnique({
      where: { slug: String(req.params.slug) },
      select: {
        id: true,
        displayName: true,
        slug: true,
        verified: true,
        _count: { select: { followers: true } },
        streams: true,
      },
    });
    if (!s) throw new DomainError("Vendedor não encontrado.", 404);
    res.json(s);
  }),
);
app.post(
  "/api/sellers/:id/follow",
  route(async (req, res) => {
    const u = await requireUser(req);
    const sellerId = String(req.params.id);
    const existing = await db.follow.findUnique({
      where: { userId_sellerId: { userId: u.id, sellerId } },
    });
    if (existing)
      await db.follow.delete({
        where: { userId_sellerId: { userId: u.id, sellerId } },
      });
    else await db.follow.create({ data: { userId: u.id, sellerId } });
    res.json({ following: !existing });
  }),
);
app.get(
  "/api/quote/:id",
  route(async (req, res) => {
    const p = await db.product.findUniqueOrThrow({
      where: { id: String(req.params.id) },
    });
    const u = await current(req);
    const address = u
      ? await db.address.findFirst({
          where: { userId: u.id, kind: "SHIPPING" },
        })
      : null;
    res.json({
      ...shipping.quote(p, address?.postalCode ?? "01310100"),
      estimated: !address,
    });
  }),
);
app.post(
  "/api/lots/:id/bid",
  route(async (req, res) => {
    const u = await requireUser(req);
    const d = z
      .object({
        amountCents: z.number().int().positive().max(100000000),
        attemptId: z.string().uuid(),
        shippingMaxCents: z.number().int().min(0).max(100000),
      })
      .parse(req.body);
    const n = await redis.incr(`bid-rate:${u.id}`);
    if (n === 1) await redis.expire(`bid-rate:${u.id}`, 1);
    if (n > 6)
      throw new DomainError(
        "Aguarde um instante antes de ofertar novamente.",
        429,
      );
    const bid = await submitBid(
      String(req.params.id),
      u.id,
      d.amountCents,
      d.attemptId,
      d.shippingMaxCents,
    );
    const lot = await db.auctionLot.findUniqueOrThrow({
      where: { id: bid.lotId },
    });
    await broadcast(lot.streamId);
    res.json({ id: bid.id, amountCents: bid.amountCents });
  }),
);
app.post(
  "/api/streams/:id/chat",
  route(async (req, res) => {
    const u = await requireUser(req);
    const d = z
      .object({ text: z.string().trim().min(1).max(300) })
      .parse(req.body);
    const count = await redis.incr(`chat:${u.id}`);
    if (count === 1) await redis.expire(`chat:${u.id}`, 10);
    if (count > 5)
      throw new DomainError(
        "Limite de mensagens. Aguarde alguns segundos.",
        429,
      );
    await db.chatMessage.create({
      data: { userId: u.id, streamId: String(req.params.id), text: d.text },
    });
    await broadcast(String(req.params.id));
    res.json({ ok: true });
  }),
);
app.get(
  "/api/seller",
  route(async (req, res) => {
    const seller = await sellerFor(req);
    const [products, streams, orders] = await Promise.all([
      db.product.findMany({ where: { sellerId: seller.id } }),
      db.liveStream.findMany({
        where: { sellerId: seller.id },
        include: { lots: { include: { product: true } } },
      }),
      db.order.findMany({
        where: { lot: { stream: { sellerId: seller.id } } },
        include: { lot: { include: { product: true } } },
        orderBy: { createdAt: "desc" },
      }),
    ]);
    res.json({ seller, products, streams, orders });
  }),
);
app.post(
  "/api/seller/onboard",
  route(async (req, res) => {
    const u = await requireUser(req);
    if (u.role === "ADMIN")
      throw new DomainError("Use uma conta de vendedor.", 403);
    const d = z
      .object({
        displayName: z.string().min(2).max(80),
        slug: z.string().regex(/^[a-z0-9-]{3,50}$/),
      })
      .parse(req.body);
    await db.$transaction([
      db.user.update({ where: { id: u.id }, data: { role: "SELLER" } }),
      db.seller.create({ data: { userId: u.id, ...d } }),
    ]);
    res.json({ ok: true });
  }),
);
const productSchema = z.object({
  name: z.string().min(3).max(120),
  description: z.string().min(3).max(2000),
  category: z.enum(["Beleza", "Moda", "Tecnologia", "Colecionáveis"]),
  artwork: z.enum([
    "perfume",
    "bag",
    "skincare",
    "headphones",
    "sneakers",
    "collectible",
  ]),
  stock: z.number().int().min(0).max(10000),
  weight: z.number().int().min(1).max(50000),
  height: z.number().int().min(1).max(200),
  width: z.number().int().min(1).max(200),
  length: z.number().int().min(1).max(200),
  originPostalCode: z.string().regex(/^\d{8}$/),
});
app.post(
  "/api/seller/products",
  route(async (req, res) => {
    const s = await sellerFor(req);
    res.status(201).json(
      await db.product.create({
        data: { ...productSchema.parse(req.body), sellerId: s.id },
      }),
    );
  }),
);
app.patch(
  "/api/seller/products/:id",
  route(async (req, res) => {
    const s = await sellerFor(req);
    res.json(
      await editProduct(
        String(req.params.id),
        s.id,
        productSchema.parse(req.body),
      ),
    );
  }),
);
app.post(
  "/api/seller/streams",
  route(async (req, res) => {
    const s = await sellerFor(req);
    const d = z
      .object({
        title: z.string().min(3).max(140),
        category: z.string().min(2).max(50),
        scheduledAt: z.string().datetime().optional(),
      })
      .parse(req.body);
    res.status(201).json(
      await db.liveStream.create({
        data: {
          ...d,
          scheduledAt: d.scheduledAt ? new Date(d.scheduledAt) : null,
          sellerId: s.id,
          demonstration: true,
        },
      }),
    );
  }),
);
const lotSchema = z.object({
  productId: z.string().min(1),
  startCents: z.number().int().min(0).max(100000000),
  incrementCents: z.number().int().min(1).max(10000000),
  bidMode: z.enum(["FIXED", "FREE"]),
  durationSeconds: z.number().int().min(10).max(600),
  position: z.number().int().min(0).max(1000),
});
app.post(
  "/api/seller/streams/:id/lots",
  route(async (req, res) => {
    const s = await sellerFor(req);
    const stream = await db.liveStream.findUnique({
      where: { id: String(req.params.id) },
    });
    const d = lotSchema.parse(req.body);
    const p = await db.product.findUnique({ where: { id: d.productId } });
    if (!stream || stream.sellerId !== s.id || p?.sellerId !== s.id)
      throw new DomainError("Recurso indisponível.", 403);
    res
      .status(201)
      .json(
        await db.auctionLot.create({ data: { ...d, streamId: stream.id } }),
      );
    await broadcast(stream.id);
  }),
);
app.patch(
  "/api/seller/lots/:id",
  route(async (req, res) => {
    const seller = await sellerFor(req);
    const lot = await editLot(
      String(req.params.id),
      seller.id,
      lotSchema.parse(req.body),
    );
    res.json(lot);
    await broadcast(lot.streamId);
  }),
);
app.delete(
  "/api/seller/lots/:id",
  route(async (req, res) => {
    const l = await ownLot(req);
    if (!["READY", "DRAFT", "SCHEDULED"].includes(l.status))
      throw new DomainError("Lote iniciado não pode ser excluído.", 409);
    await db.auctionLot.delete({ where: { id: l.id } });
    res.json({ ok: true });
    await broadcast(l.streamId);
  }),
);
app.post(
  "/api/seller/lots/:id/start",
  route(async (req, res) => {
    const l = await ownLot(req);
    const u = await requireUser(req);
    await startLot(l.id, u.id);
    await broadcast(l.streamId);
    res.json({ ok: true });
  }),
);
app.post(
  "/api/seller/lots/:id/cancel",
  route(async (req, res) => {
    const l = await ownLot(req);
    const u = await requireUser(req);
    const { reason } = z
      .object({ reason: z.string().min(10).max(500) })
      .parse(req.body);
    await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "AuctionLot" WHERE id=${l.id} FOR UPDATE`;
      const fresh = await tx.auctionLot.findUniqueOrThrow({
        where: { id: l.id },
      });
      if (fresh.status !== "LIVE")
        throw new DomainError("Lote não está ativo.", 409);
      await tx.auctionLot.update({
        where: { id: l.id },
        data: { status: "CANCELLED" },
      });
      await tx.auctionEvent.create({
        data: {
          lotId: l.id,
          type: "CANCELLED",
          actorId: u.id,
          data: { reason },
        },
      });
    });
    await broadcast(l.streamId);
    res.json({ ok: true });
  }),
);
app.post(
  "/api/seller/streams/:id/end",
  route(async (req, res) => {
    const s = await sellerFor(req);
    const stream = await db.liveStream.findUnique({
      where: { id: String(req.params.id) },
      include: { lots: true },
    });
    if (!stream || stream.sellerId !== s.id)
      throw new DomainError("Acesso negado.", 403);
    if (stream.lots.some((l) => l.status === "LIVE"))
      throw new DomainError(
        "Aguarde o lote encerrar ou cancele com justificativa.",
        409,
      );
    await db.liveStream.update({
      where: { id: stream.id },
      data: { status: "ENDED" },
    });
    await broadcast(stream.id);
    res.json({ ok: true });
  }),
);
// Publishing secrets are returned only to the owning seller, never in public snapshots.
const streamSessions = new Map<
  string,
  { mode: string; publishUrl?: string; playbackUrl?: string }
>();
app.post(
  "/api/seller/streams/:id/session",
  route(async (req, res) => {
    const s = await sellerFor(req);
    const stream = await db.liveStream.findUniqueOrThrow({
      where: { id: String(req.params.id) },
    });
    if (stream.sellerId !== s.id) throw new DomainError("Acesso negado.", 403);
    const provider =
      process.env.STREAMING_PROVIDER === "cloudflare"
        ? new CloudflareStreamingProvider()
        : new DemoStreamingProvider();
    const result = await provider.createSession(stream.id);
    streamSessions.set(stream.id, result);
    res.json(result);
  }),
);
app.get(
  "/api/streams/:id/playback",
  route(async (req, res) => {
    const s = streamSessions.get(String(req.params.id));
    res.json(
      s?.playbackUrl
        ? { mode: s.mode, playbackUrl: s.playbackUrl }
        : { mode: "demo" },
    );
  }),
);
app.post(
  "/api/playground/:action",
  route(async (req, res) => {
    const u = await requireUser(req);
    if (!["SELLER", "ADMIN"].includes(u.role))
      throw new DomainError(
        "Entre como vendedor ou administrador para operar o laboratório.",
        403,
      );
    const stream = await db.liveStream.findUniqueOrThrow({
      where: { id: "playground" },
    });
    if (!demo || !stream.demonstration)
      throw new DomainError("Controles exclusivos do sandbox.", 403);
    const action = String(req.params.action);
    let lot = await db.auctionLot.findFirst({
      where: { streamId: "playground", status: "LIVE" },
    });
    if (action === "start") {
      if (lot) throw new DomainError("Finalize a simulação atual.", 409);
      const d = lotSchema.parse(req.body);
      const p = await db.product.findUniqueOrThrow({
        where: { id: d.productId },
      });
      if (p.sellerId !== stream.sellerId)
        throw new DomainError("Use um produto demonstrativo.", 403);
      lot = await db.auctionLot.create({
        data: { ...d, streamId: "playground" },
      });
      await startLot(lot.id, "seller-demo");
    } else if (!lot) throw new DomainError("Inicie uma simulação.", 409);
    else if (action === "bid") {
      const who = z.enum(["buyer-a", "buyer-b"]).parse(req.body.buyer);
      await submitBid(lot.id, who, nextBid(lot), randomUUID());
    } else if (action === "advance") {
      const seconds = z.number().int().min(1).max(600).parse(req.body.seconds);
      await db.auctionLot.update({
        where: { id: lot.id },
        data: { endsAt: new Date(lot.endsAt!.getTime() - seconds * 1000) },
      });
      await closeLot(lot.id, u.id);
    } else if (action === "close") await closeLot(lot.id, u.id, true);
    else if (action === "reset") {
      await db.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM "AuctionLot" WHERE id=${lot!.id} FOR UPDATE`;
        await tx.auctionLot.update({
          where: { id: lot!.id },
          data: { status: "CANCELLED" },
        });
        await tx.auctionEvent.create({
          data: { lotId: lot!.id, type: "DEMO_RESET", actorId: u.id, data: {} },
        });
      });
    } else throw new DomainError("Ação desconhecida.");
    await db.auditLog.create({
      data: {
        actorId: u.id,
        action: `PLAYGROUND_${action}`,
        resourceId: "playground",
        data: {},
      },
    });
    await broadcast("playground");
    res.json({ ok: true });
  }),
);
app.get(
  "/api/admin",
  route(async (req, res) => {
    const u = await requireUser(req);
    if (u.role !== "ADMIN") throw new DomainError("Área administrativa.", 403);
    const [users, sellers, streams, events, orders, audit, messages] =
      await Promise.all([
        db.user.findMany({
          select: {
            id: true,
            alias: true,
            role: true,
            enabled: true,
            createdAt: true,
          },
        }),
        db.seller.findMany(),
        db.liveStream.findMany(),
        db.auctionEvent.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
        db.order.findMany({
          select: { id: true, totalCents: true, status: true, createdAt: true },
        }),
        db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
        db.chatMessage.findMany({
          where: { hidden: false },
          take: 50,
          orderBy: { createdAt: "desc" },
          select: { id: true, text: true, streamId: true },
        }),
      ]);
    res.json({ users, sellers, streams, events, orders, audit, messages });
  }),
);
app.post(
  "/api/admin/messages/:id/hide",
  route(async (req, res) => {
    const u = await requireUser(req);
    if (u.role !== "ADMIN") throw new DomainError("Acesso negado.", 403);
    const m = await db.chatMessage.update({
      where: { id: String(req.params.id) },
      data: { hidden: true },
    });
    await db.auditLog.create({
      data: {
        actorId: u.id,
        action: "MODERATE_CHAT",
        resourceId: m.id,
        data: {},
      },
    });
    await broadcast(m.streamId);
    res.json({ ok: true });
  }),
);
app.patch(
  "/api/admin/users/:id/role",
  route(async (req, res) => {
    const admin = await requireUser(req);
    if (admin.role !== "ADMIN") throw new DomainError("Acesso negado.", 403);
    const { role } = z
      .object({ role: z.enum(["BUYER", "SELLER", "ADMIN"]) })
      .parse(req.body);
    const id = String(req.params.id);
    if (id === admin.id)
      throw new DomainError("Você não pode alterar seu próprio papel.", 409);
    await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "User" WHERE id=${id} FOR UPDATE`;
      const target = await tx.user.findUniqueOrThrow({ where: { id } });
      if (role === "SELLER")
        await tx.seller.upsert({
          where: { userId: id },
          update: {},
          create: { userId: id, slug: target.alias, displayName: target.name },
        });
      await tx.user.update({ where: { id }, data: { role } });
      await tx.session.deleteMany({ where: { userId: id } });
      await tx.auditLog.create({
        data: {
          actorId: admin.id,
          action: "CHANGE_ROLE",
          resourceId: id,
          data: { previous: target.role, role },
        },
      });
    });
    res.json({ ok: true });
  }),
);
app.patch(
  "/api/admin/sellers/:id/verify",
  route(async (req, res) => {
    const admin = await requireUser(req);
    if (admin.role !== "ADMIN") throw new DomainError("Acesso negado.", 403);
    const { verified } = z.object({ verified: z.boolean() }).parse(req.body);
    const id = String(req.params.id);
    await db.$transaction([
      db.seller.update({ where: { id }, data: { verified } }),
      db.auditLog.create({
        data: {
          actorId: admin.id,
          action: "VERIFY_DEMO_SELLER",
          resourceId: id,
          data: { verified },
        },
      }),
    ]);
    res.json({ ok: true });
  }),
);
app.patch(
  "/api/seller/orders/:id/status",
  route(async (req, res) => {
    const seller = await sellerFor(req);
    const { status } = z
      .object({
        status: z.enum([
          "PROCESSING_SANDBOX",
          "SHIPPED_SANDBOX",
          "DELIVERED_SANDBOX",
        ]),
      })
      .parse(req.body);
    const id = String(req.params.id);
    await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Order" WHERE id=${id} FOR UPDATE`;
      const order = await tx.order.findUniqueOrThrow({
        where: { id },
        include: { lot: { include: { stream: true } } },
      });
      if (order.lot.stream.sellerId !== seller.id)
        throw new DomainError("Acesso negado.", 403);
      const allowed: Record<string, string> = {
        PAID_SANDBOX: "PROCESSING_SANDBOX",
        PROCESSING_SANDBOX: "SHIPPED_SANDBOX",
        SHIPPED_SANDBOX: "DELIVERED_SANDBOX",
      };
      if (allowed[order.status] !== status)
        throw new DomainError("Etapa de pedido inválida.", 409);
      await tx.order.update({ where: { id }, data: { status } });
      await tx.auditLog.create({
        data: {
          actorId: seller.userId,
          action: "SANDBOX_FULFILLMENT",
          resourceId: id,
          data: { status },
        },
      });
    });
    res.json({ ok: true });
  }),
);
app.post(
  "/api/orders/:id/refund",
  route(async (req, res) => {
    const u = await requireUser(req);
    const id = String(req.params.id);
    await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Order" WHERE id=${id} FOR UPDATE`;
      const o = await tx.order.findUniqueOrThrow({ where: { id } });
      if (o.buyerId !== u.id && u.role !== "ADMIN")
        throw new DomainError("Acesso negado.", 403);
      if (o.status === "REFUNDED_SANDBOX") return;
      await tx.order.update({
        where: { id },
        data: {
          status: payments.refund(),
          attempts: { create: { status: "REFUNDED_SANDBOX" } },
        },
      });
      await tx.auditLog.create({
        data: {
          actorId: u.id,
          action: "SANDBOX_REFUND",
          resourceId: id,
          data: {},
        },
      });
    });
    res.json({ ok: true });
  }),
);

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (error instanceof z.ZodError)
    return res
      .status(400)
      .json({ error: "Revise os campos informados.", fields: error.flatten() });
  if (error instanceof DomainError)
    return res.status(error.status).json({ error: error.message });
  if (
    typeof error === "object" &&
    error &&
    "code" in error &&
    error.code === "P2002"
  )
    return res.status(409).json({ error: "Este registro já existe." });
  console.error(
    JSON.stringify({
      event: "request_failed",
      message: error instanceof Error ? error.message : "unknown",
    }),
  );
  res
    .status(500)
    .json({ error: "Não foi possível concluir. Tente novamente." });
});
io.on("connection", (socket) => {
  let lastJoin = 0;
  socket.on("join", async (id: unknown) => {
    if (
      typeof id !== "string" ||
      id.length > 100 ||
      Date.now() - lastJoin < 500
    )
      return;
    lastJoin = Date.now();
    try {
      if (!(await db.liveStream.findUnique({ where: { id } }))) return;
      for (const room of socket.rooms)
        if (room !== socket.id) await socket.leave(room);
      await socket.join(id);
      await redis.set(`presence:${socket.id}`, id, { EX: 120 });
      await broadcast(id);
    } catch {
      socket.emit("notice", "Não foi possível entrar na sala.");
    }
  });
  socket.on("disconnecting", () => {
    const rooms = [...socket.rooms].filter((id) => id !== socket.id);
    setTimeout(() => {
      for (const id of rooms) void broadcast(id).catch(() => {});
    }, 0);
  });
  socket.on("disconnect", () => {
    void redis.del(`presence:${socket.id}`);
  });
});
// Row locks make multiple scheduler ticks and API bids safe. Commit before broadcasting.
let ticking = false;
const timer = setInterval(async () => {
  if (ticking) return;
  ticking = true;
  try {
    const due = await db.auctionLot.findMany({
      where: { status: "LIVE", endsAt: { lte: new Date() } },
    });
    for (const lot of due)
      if (await closeLot(lot.id)) await broadcast(lot.streamId);
  } catch (e) {
    console.error(
      JSON.stringify({
        event: "scheduler_failed",
        message: e instanceof Error ? e.message : "unknown",
      }),
    );
  } finally {
    ticking = false;
  }
}, 250);
http.listen(
  Number(process.env.PORT ?? 4000),
  process.env.API_HOST ?? "0.0.0.0",
  () =>
    console.log(
      JSON.stringify({
        event: "api_ready",
        port: Number(process.env.PORT ?? 4000),
        mode: "sandbox",
      }),
    ),
);
async function shutdown() {
  clearInterval(timer);
  io.close();
  http.close();
  await redis.quit();
  await db.$disconnect();
  process.exit(0);
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

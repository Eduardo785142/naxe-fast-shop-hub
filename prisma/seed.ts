import { db } from "../server/db";
import { hashPassword } from "../server/security";
if (process.env.ENABLE_DEMO_SEED !== "true" || process.env.DEMO_MODE !== "true")
  throw new Error("Demo seed requires explicit sandbox flags.");
const password = process.env.DEMO_PASSWORD;
if (!password || password.length < 12)
  throw new Error("Set DEMO_PASSWORD (12+ characters).");
for (const [id, email, name, role, alias] of [
  ["seller-demo", "vendedor@naxe.test", "Naxe Select", "SELLER", "naxe-select"],
  ["buyer-a", "comprador.a@naxe.test", "Comprador A", "BUYER", "comprador-a"],
  ["buyer-b", "comprador.b@naxe.test", "Comprador B", "BUYER", "comprador-b"],
  ["admin-demo", "admin@naxe.test", "Admin Demo", "ADMIN", "admin-demo"],
]) {
  await db.user.upsert({
    where: { id },
    update: {},
    create: {
      id,
      email,
      name,
      role,
      alias,
      passwordHash: hashPassword(password),
      enabled: role === "BUYER",
      termsAt: role === "BUYER" ? new Date() : null,
    },
  });
  if (
    role === "BUYER" &&
    (await db.address.count({ where: { userId: id } })) === 0
  ) {
    await db.address.createMany({
      data: ["SHIPPING", "BILLING"].map((kind) => ({
        userId: id,
        kind,
        postalCode: "01310100",
        street: "Avenida Demonstração",
        number: "100",
        city: "São Paulo",
        state: "SP",
      })),
    });
    await db.paymentMethodReference.create({
      data: { userId: id, reference: "sandbox-approved", scenario: "APPROVED" },
    });
  }
}
await db.seller.upsert({
  where: { id: "seller-select" },
  update: {},
  create: {
    id: "seller-select",
    userId: "seller-demo",
    slug: "naxe-select",
    displayName: "Naxe Select",
    verified: true,
  },
});
const items = [
  [
    "perfume",
    "Perfume Premium 100 ml",
    "Uma fragrância amadeirada. Produto fictício para testes.",
    "Beleza",
    "perfume",
  ],
  [
    "bolsa",
    "Bolsa Atelier",
    "Design atemporal, acabamento em caramelo. Produto fictício.",
    "Moda",
    "bag",
  ],
  [
    "skincare",
    "Ritual de skincare",
    "Kit de cuidados com três itens. Produto fictício.",
    "Beleza",
    "skincare",
  ],
  [
    "headphones",
    "Headphone Studio",
    "Fones over-ear para sua coleção. Produto fictício.",
    "Tecnologia",
    "headphones",
  ],
  [
    "sneakers",
    "Tênis edição urbana",
    "Silhueta clássica, tamanho 40. Produto fictício.",
    "Moda",
    "sneakers",
  ],
  [
    "collectible",
    "Colecionável Orbital",
    "Figura de coleção numerada. Produto fictício.",
    "Colecionáveis",
    "collectible",
  ],
];
for (const [i, [id, name, description, category, artwork]] of items.entries()) {
  await db.product.upsert({
    where: { id },
    update: {},
    create: {
      id,
      sellerId: "seller-select",
      name,
      description,
      category,
      artwork,
      stock: 20,
    },
  });
  await db.liveStream.upsert({
    where: { id: `live-${id}` },
    update: {},
    create: {
      id: `live-${id}`,
      sellerId: "seller-select",
      title: [
        "Achados de beleza, lance a lance",
        "Seu próximo favorito está aqui",
        "Um momento para cuidar de você",
        "Som de primeira. Disputa de verdade.",
        "Drop urbano: peças selecionadas",
        "Pequenos objetos, grandes histórias",
      ][i],
      category,
      status: i > 3 ? "SCHEDULED" : "READY",
      scheduledAt: i > 3 ? new Date(Date.now() + 3600000 * (i - 3)) : null,
    },
  });
  await db.auctionLot.upsert({
    where: { id: `lot-${id}` },
    update: {},
    create: {
      id: `lot-${id}`,
      streamId: `live-${id}`,
      productId: id,
      startCents: 1500,
      incrementCents: 100,
      durationSeconds: 30,
    },
  });
}
await db.liveStream.upsert({
  where: { id: "playground" },
  update: {},
  create: {
    id: "playground",
    sellerId: "seller-select",
    title: "Auction Playground",
    category: "Laboratório",
    demonstration: true,
    status: "READY",
  },
});
console.log("Demo seed complete. Existing accounts and auctions preserved.");
await db.$disconnect();

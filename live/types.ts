export type User = {
  id: string;
  name: string;
  email: string;
  alias: string;
  bidderAlias: string;
  role: string;
  enabled: boolean;
};
export type Product = {
  id: string;
  name: string;
  description: string;
  category: string;
  artwork: string;
  stock: number;
  weight: number;
  height: number;
  width: number;
  length: number;
  originPostalCode: string;
};
export type Bid = {
  id: string;
  alias: string;
  amountCents: number;
  createdAt: string;
};
export type Lot = {
  id: string;
  productId: string;
  streamId: string;
  status: string;
  position: number;
  startCents: number;
  incrementCents: number;
  bidMode: "FIXED" | "FREE";
  durationSeconds: number;
  endsAt: string | null;
  currentCents: number | null;
  nextCents: number;
  leaderId: string | null;
  product: Product;
  bids: Bid[];
  result: { winnerId: string | null; amountCents: number | null } | null;
};
export type Stream = {
  id: string;
  title: string;
  category: string;
  status: string;
  scheduledAt: string | null;
  seller: { id: string; slug: string; displayName: string; verified: boolean };
  lots: Lot[];
  viewers: number;
  serverNow: number;
  messages: { id: string; text: string; alias: string }[];
};
export type Order = {
  id: string;
  lotId: string;
  status: string;
  amountCents: number;
  shippingCents: number;
  totalCents: number;
  createdAt: string;
  lot: { product: Product };
};
export const money = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    cents / 100,
  );
export async function api<T>(
  path: string,
  body?: unknown,
  method?: string,
): Promise<T> {
  const r = await fetch(`/api${path}`, {
    method: method ?? (body === undefined ? "GET" : "POST"),
    credentials: "same-origin",
    headers: body === undefined ? {} : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error ?? "Não foi possível conectar.");
  return data as T;
}

"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowUpRight,
  Camera,
  CameraOff,
  Check,
  Package,
  Play,
  Plus,
  Radio,
  ShieldCheck,
  ShoppingBag,
  Square,
  Trash2,
  Video,
  X,
} from "lucide-react";
import type { Common } from "./LiveApp";
import {
  api,
  money,
  type Stream,
  type Product,
  type Order,
  type Lot,
} from "./types";
import { useRoom, Timer } from "./Room";
export type SellerData = {
  seller: { id: string; displayName: string };
  products: Product[];
  streams: Stream[];
  orders: Order[];
};
export default function Seller({ path, ...common }: Common & { path: string }) {
  const router = useRouter();
  const { data, error, refetch } = useQuery({
    queryKey: ["seller-dashboard", common.user?.id],
    queryFn: () => api<SellerData>("/seller"),
    enabled: !!common.user,
    refetchInterval: 10000,
  });
  const [product, setProduct] = useState<Product | null | undefined>(undefined),
    [newLive, setNewLive] = useState(false);
  if (!common.user)
    return (
      <div className="empty">
        <Video size={40} />
        <span className="eyebrow">NAXE SELLER</span>
        <h1>
          Sua comunidade.
          <br />
          Seus produtos. Ao vivo.
        </h1>
        <p className="muted">
          Entre como vendedor para preparar sua transmissão.
        </p>
        <button className="primary" onClick={common.login}>
          Entrar no Seller Studio
        </button>
      </div>
    );
  if (common.user.role === "BUYER")
    return (
      <div className="panel onboarding">
        <h1>Abra sua vitrine.</h1>
        <p className="muted">Crie um perfil de vendedor sandbox.</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            void api("/seller/onboard", Object.fromEntries(f))
              .then(async () => {
                await common.reload();
                await refetch();
              })
              .catch((e) => common.notify(e.message));
          }}
        >
          <label>
            Nome da loja
            <input name="displayName" required minLength={2} />
          </label>
          <label>
            Identificador público
            <input
              name="slug"
              required
              pattern="[a-z0-9-]{3,50}"
              placeholder="minha-loja"
            />
          </label>
          <button className="primary">Criar loja demonstrativa</button>
        </form>
      </div>
    );
  if (path.startsWith("/seller/studio/"))
    return <Studio id={path.split("/")[3]} data={data} {...common} />;
  const sales =
    data?.orders
      .filter((o) => o.status === "PAID_SANDBOX")
      .reduce((s, o) => s + o.amountCents, 0) ?? 0;
  return (
    <>
      <div className="section-title">
        <div>
          <span className="eyebrow">NAXE SELLER STUDIO</span>
          <h1>Seu palco está pronto.</h1>
          <p className="muted">
            Olá, {data?.seller.displayName ?? common.user.name}. Vamos criar
            boas descobertas?
          </p>
        </div>
        <button className="primary" onClick={() => setNewLive(true)}>
          <Plus size={18} />
          Criar transmissão
        </button>
      </div>
      <nav className="page-tabs">
        <Link href="/seller" className={path === "/seller" ? "active" : ""}>
          Visão geral
        </Link>
        <Link
          href="/seller/produtos"
          className={path.includes("produtos") ? "active" : ""}
        >
          Produtos
        </Link>
        <Link
          href="/seller/lives"
          className={path.includes("lives") ? "active" : ""}
        >
          Transmissões
        </Link>
        <Link
          href="/seller/pedidos"
          className={path.includes("pedidos") ? "active" : ""}
        >
          Pedidos
        </Link>
      </nav>
      {error && <p className="error">{error.message}</p>}
      <div className="metrics">
        <Metric
          label="VENDAS SANDBOX"
          value={money(sales)}
          icon={<ShoppingBag />}
        />
        <Metric
          label="PEDIDOS DEMONSTRATIVOS"
          value={String(data?.orders.length ?? 0)}
          icon={<Package />}
        />
        <Metric
          label="PRODUTOS CADASTRADOS"
          value={String(data?.products.length ?? 0)}
          icon={<Check />}
        />
      </div>
      {path.includes("produtos") ? (
        <>
          <div className="section-title">
            <h2>Seu catálogo</h2>
            <button className="secondary" onClick={() => setProduct(null)}>
              <Plus size={16} />
              Adicionar produto
            </button>
          </div>
          <div className="product-list">
            {data?.products.map((p) => (
              <article key={p.id} className="panel product-row">
                <img src={`/products/${p.artwork}.svg`} alt={p.name} />
                <div>
                  <h3>{p.name}</h3>
                  <p>
                    {p.category} · {p.stock} em estoque · {p.weight} g
                  </p>
                </div>
                <button className="secondary" onClick={() => setProduct(p)}>
                  Editar
                </button>
              </article>
            ))}
          </div>
        </>
      ) : path.includes("pedidos") ? (
        <OrderList
          orders={data?.orders ?? []}
          fulfill={async (id, status) => {
            try {
              await api(`/seller/orders/${id}/status`, { status }, "PATCH");
              await refetch();
              common.notify("Etapa demonstrativa do pedido atualizada.");
            } catch (e) {
              common.notify((e as Error).message);
            }
          }}
        />
      ) : (
        <>
          <div className="section-title">
            <h2>Suas transmissões</h2>
            <span className="muted">Configure, apresente e acompanhe.</span>
          </div>
          <div className="simple-list">
            {data?.streams
              .filter((s) => s.id !== "playground")
              .map((s) => (
                <article className="panel stream-row" key={s.id}>
                  <span className="metric-icon">
                    <Radio size={22} />
                  </span>
                  <div>
                    <h3>{s.title}</h3>
                    <p>
                      {s.status} · {s.lots.length} lotes · {s.category}
                    </p>
                  </div>
                  <Link
                    href={`/live/${s.id}`}
                    className="icon-btn"
                    title="Ver sala"
                  >
                    <ArrowUpRight size={19} />
                  </Link>
                  <Link className="secondary" href={`/seller/studio/${s.id}`}>
                    Abrir Studio <ArrowUpRight size={15} />
                  </Link>
                </article>
              ))}
          </div>
        </>
      )}
      {product !== undefined && (
        <ProductForm
          product={product}
          close={() => setProduct(undefined)}
          done={async () => {
            setProduct(undefined);
            await refetch();
            common.notify("Produto salvo.");
          }}
          notify={common.notify}
        />
      )}
      {newLive && (
        <div className="modal-backdrop">
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-live"
          >
            <button
              className="modal-close icon-btn"
              aria-label="Fechar"
              onClick={() => setNewLive(false)}
            >
              <X />
            </button>
            <h2 id="new-live">Uma nova transmissão.</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                const scheduled = String(f.get("scheduledAt") ?? "");
                void api<Stream>("/seller/streams", {
                  title: f.get("title"),
                  category: f.get("category"),
                  ...(scheduled
                    ? { scheduledAt: new Date(scheduled).toISOString() }
                    : {}),
                })
                  .then((s) => {
                    setNewLive(false);
                    router.push(`/seller/studio/${s.id}`);
                  })
                  .catch((e) => common.notify(e.message));
              }}
            >
              <label>
                Título
                <input name="title" required minLength={3} />
              </label>
              <label>
                Categoria
                <select name="category">
                  {["Beleza", "Moda", "Tecnologia", "Colecionáveis"].map(
                    (c) => (
                      <option key={c}>{c}</option>
                    ),
                  )}
                </select>
              </label>
              <label>
                Agendamento (opcional · seu horário local)
                <input type="datetime-local" name="scheduledAt" />
              </label>
              <button className="primary full">Criar e configurar lotes</button>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
export function Metric({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="panel metric-card">
      <div>
        <span className="eyebrow">{label}</span>
        <strong>{value}</strong>
      </div>
      <span className="metric-icon">{icon}</span>
    </div>
  );
}
export function OrderList({
  orders,
  refund,
  fulfill,
}: {
  orders: Order[];
  refund?: (id: string) => void;
  fulfill?: (id: string, status: string) => Promise<void>;
}) {
  return (
    <div className="simple-list">
      {!orders.length && (
        <div className="empty panel">
          <ShoppingBag size={30} />
          <h3>Os próximos arremates aparecem aqui.</h3>
          <p className="muted">
            Pedidos são criados após o encerramento do lote.
          </p>
        </div>
      )}
      {orders.map((o) => (
        <article className="panel order-row" key={o.id}>
          <img src={`/products/${o.lot.product.artwork}.svg`} alt="" />
          <div>
            <small>
              #{o.id.slice(0, 8)} ·{" "}
              {new Date(o.createdAt).toLocaleDateString("pt-BR", {
                timeZone: "America/Sao_Paulo",
              })}
            </small>
            <h3>{o.lot.product.name}</h3>
            <p>
              {(
                {
                  PAID_SANDBOX: "Pagamento aprovado (sandbox)",
                  PAYMENT_DECLINED: "Pagamento recusado (sandbox)",
                  PAYMENT_PENDING: "Aguardando pagamento (sandbox)",
                  REFUNDED_SANDBOX: "Estorno simulado",
                  PROCESSING_SANDBOX: "Em preparação (sandbox)",
                  SHIPPED_SANDBOX: "Envio simulado",
                  DELIVERED_SANDBOX: "Entrega simulada",
                } as Record<string, string>
              )[o.status] ?? o.status}
            </p>
            <small>
              Lance {money(o.amountCents)} + frete {money(o.shippingCents)} ·
              entrega não realizada no sandbox
            </small>
          </div>
          <b>{money(o.totalCents)}</b>
          {fulfill &&
            ["PAID_SANDBOX", "PROCESSING_SANDBOX", "SHIPPED_SANDBOX"].includes(
              o.status,
            ) && (
              <button
                className="secondary"
                onClick={() =>
                  void fulfill(
                    o.id,
                    (
                      {
                        PAID_SANDBOX: "PROCESSING_SANDBOX",
                        PROCESSING_SANDBOX: "SHIPPED_SANDBOX",
                        SHIPPED_SANDBOX: "DELIVERED_SANDBOX",
                      } as Record<string, string>
                    )[o.status],
                  )
                }
              >
                {
                  (
                    {
                      PAID_SANDBOX: "Preparar pedido",
                      PROCESSING_SANDBOX: "Simular envio",
                      SHIPPED_SANDBOX: "Simular entrega",
                    } as Record<string, string>
                  )[o.status]
                }
              </button>
            )}
          {refund && o.status !== "REFUNDED_SANDBOX" && (
            <button className="secondary" onClick={() => refund(o.id)}>
              Simular estorno
            </button>
          )}
        </article>
      ))}
    </div>
  );
}
function ProductForm({
  product,
  close,
  done,
  notify,
}: {
  product: Product | null;
  close: () => void;
  done: () => Promise<void>;
  notify: (s: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <div className="modal-backdrop">
      <section
        className="modal wide-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-title"
      >
        <button
          aria-label="Fechar"
          className="modal-close icon-btn"
          onClick={close}
        >
          <X />
        </button>
        <h2 id="product-title">
          {product ? "Editar produto" : "Novo produto"}
        </h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setBusy(true);
            const f = new FormData(e.currentTarget);
            const values: Record<string, unknown> = Object.fromEntries(f);
            for (const k of ["stock", "weight", "height", "width", "length"])
              values[k] = Number(values[k]);
            void api(
              `/seller/products${product ? `/${product.id}` : ""}`,
              values,
              product ? "PATCH" : "POST",
            )
              .then(done)
              .catch((e) => notify(e.message))
              .finally(() => setBusy(false));
          }}
        >
          <label>
            Nome
            <input
              name="name"
              defaultValue={product?.name}
              required
              minLength={3}
            />
          </label>
          <label>
            Descrição
            <textarea
              name="description"
              defaultValue={product?.description}
              required
              minLength={3}
            />
          </label>
          <div className="form-grid">
            <label>
              Categoria
              <select name="category" defaultValue={product?.category}>
                {["Beleza", "Moda", "Tecnologia", "Colecionáveis"].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label>
              Ilustração demonstrativa
              <select name="artwork" defaultValue={product?.artwork}>
                {[
                  ["perfume", "Perfume"],
                  ["bag", "Bolsa"],
                  ["skincare", "Skincare"],
                  ["headphones", "Fones"],
                  ["sneakers", "Tênis"],
                  ["collectible", "Colecionável"],
                ].map(([v, n]) => (
                  <option value={v} key={v}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="form-grid">
            {[
              ["stock", "Estoque", 1],
              ["weight", "Peso (g)", 500],
              ["height", "Altura (cm)", 10],
              ["width", "Largura (cm)", 15],
              ["length", "Comprimento (cm)", 20],
            ].map(([k, label, def]) => (
              <label key={k}>
                {label}
                <input
                  name={String(k)}
                  type="number"
                  required
                  min={k === "stock" ? 0 : 1}
                  defaultValue={product ? product[k as keyof Product] : def}
                />
              </label>
            ))}
          </div>
          <label>
            CEP de origem
            <input
              name="originPostalCode"
              defaultValue={product?.originPostalCode ?? "01001000"}
              pattern="[0-9]{8}"
              required
            />
          </label>
          <button className="primary full" disabled={busy}>
            Salvar produto
          </button>
        </form>
      </section>
    </div>
  );
}
function Studio({
  id,
  data,
  ...common
}: Common & { id: string; data?: SellerData }) {
  const { stream, offset, connected, error } = useRoom(id);
  const [editing, setEditing] = useState<Lot | null | undefined>(undefined);
  const active = stream?.lots.find((l) => l.status === "LIVE");
  const [reason, setReason] = useState("");
  async function action(l: Lot, a: string, body: unknown = {}) {
    try {
      await api(`/seller/lots/${l.id}/${a}`, body);
      common.notify(
        a === "start"
          ? "Lote iniciado. Relógio sob autoridade do servidor."
          : "Ação registrada.",
      );
    } catch (e) {
      common.notify((e as Error).message);
    }
  }
  return (
    <>
      <div className="section-title">
        <div>
          <Link className="eyebrow" href="/seller">
            ← SELLER STUDIO
          </Link>
          <h1>{stream?.title ?? "Preparando o Studio…"}</h1>
        </div>
        <Link className="secondary" href={`/live/${id}`}>
          Abrir visão do comprador <ArrowUpRight size={16} />
        </Link>
      </div>
      {error && <p className="error">{error}</p>}
      <div className="studio-grid">
        <div>
          <CameraPreview id={id} notify={common.notify} />
          <div className="panel studio-active">
            <span className="eyebrow">CONTROLE DO LOTE ATIVO</span>
            {active ? (
              <>
                <h2>{active.product.name}</h2>
                <div className="auction-metrics">
                  <strong>
                    {money(active.currentCents ?? active.startCents)}
                  </strong>
                  <Timer lot={active} offset={offset} />
                </div>
                <p className="muted">
                  {active.leaderId ?? "Aguardando primeiro lance"} ·{" "}
                  {connected ? "Conectado" : "Reconectando"}
                </p>
                <label>
                  Cancelamento excepcional (auditado)
                  <input
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    minLength={10}
                    placeholder="Descreva a justificativa (mín. 10 caracteres)"
                  />
                </label>
                <button
                  className="danger-btn"
                  disabled={reason.length < 10}
                  onClick={() => void action(active, "cancel", { reason })}
                >
                  Cancelar lote com justificativa
                </button>
              </>
            ) : (
              <>
                <h2>A próxima disputa começa com você.</h2>
                <p className="muted">
                  Selecione um lote pronto na lista ao lado. O relógio só começa
                  após iniciar.
                </p>
              </>
            )}
          </div>
          <div className="panel">
            <h3>Últimos lances</h3>
            {active?.bids?.map((b) => (
              <p className="bid-row" key={b.id}>
                {b.alias}
                <b>{money(b.amountCents)}</b>
              </p>
            )) ?? <p className="muted">Nenhum lote em disputa.</p>}
          </div>
          <div className="panel">
            <h3>Chat da transmissão</h3>
            {stream?.messages.slice(-10).map((m) => (
              <p key={m.id}>
                <b>{m.alias}</b> {m.text}
              </p>
            ))}
          </div>
        </div>
        <div className="panel studio-lots">
          <div className="section-title">
            <h2>Fila de lotes</h2>
            <button className="secondary" onClick={() => setEditing(null)}>
              <Plus size={16} />
              Lote
            </button>
          </div>
          {stream?.lots.map((l) => (
            <div className="studio-lot" key={l.id}>
              <img src={`/products/${l.product.artwork}.svg`} alt="" />
              <div>
                <small>
                  #{l.position + 1} · {l.status}
                </small>
                <h3>{l.product.name}</h3>
                <p>
                  {money(l.startCents)} · +{money(l.incrementCents)} ·{" "}
                  {l.durationSeconds}s
                </p>
                <span className="mini-actions">
                  {["READY", "DRAFT", "SCHEDULED"].includes(l.status) && (
                    <>
                      <button onClick={() => setEditing(l)}>Editar</button>
                      <button
                        onClick={() => {
                          void api(`/seller/lots/${l.id}`, {}, "DELETE").catch(
                            (e) => common.notify(e.message),
                          );
                        }}
                        aria-label="Excluir lote"
                      >
                        <Trash2 size={13} />
                      </button>
                      <button
                        className="start-lot"
                        disabled={!!active}
                        onClick={() => void action(l, "start")}
                      >
                        <Play size={13} />
                        Iniciar
                      </button>
                    </>
                  )}
                  {l.result && (
                    <b className="green">
                      {l.result.winnerId ?? "Sem vencedor"}
                    </b>
                  )}
                </span>
              </div>
            </div>
          ))}
          {!stream?.lots.length && (
            <p className="muted">Adicione um produto à fila para começar.</p>
          )}
          <button
            className="secondary full"
            disabled={!!active}
            onClick={() => {
              void api(`/seller/streams/${id}/end`, {})
                .then(() => common.notify("Transmissão encerrada."))
                .catch((e) => common.notify(e.message));
            }}
          >
            <Square size={14} />
            Encerrar transmissão
          </button>
          <p className="legal">
            Regras essenciais ficam bloqueadas após o início. Cancelamentos
            exigem justificativa e são auditados.
          </p>
        </div>
      </div>
      {editing !== undefined && (
        <div className="modal-backdrop">
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="lot-title"
          >
            <button
              className="icon-btn modal-close"
              aria-label="Fechar"
              onClick={() => setEditing(undefined)}
            >
              <X />
            </button>
            <h2 id="lot-title">
              {editing ? "Editar lote" : "Preparar novo lote"}
            </h2>
            <LotForm
              products={data?.products ?? []}
              lot={editing}
              onSubmit={async (values) => {
                await api(
                  editing
                    ? `/seller/lots/${editing.id}`
                    : `/seller/streams/${id}/lots`,
                  values,
                  editing ? "PATCH" : "POST",
                );
                setEditing(undefined);
              }}
              notify={common.notify}
            />
          </section>
        </div>
      )}
    </>
  );
}
export function LotForm({
  products,
  lot,
  onSubmit,
  notify,
}: {
  products: Product[];
  lot?: Lot | null;
  onSubmit: (v: Record<string, unknown>) => Promise<void>;
  notify: (s: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setBusy(true);
        const f = new FormData(e.currentTarget);
        const values = {
          productId: f.get("productId"),
          startCents: Math.round(Number(f.get("start")) * 100),
          incrementCents: Math.round(Number(f.get("increment")) * 100),
          bidMode: f.get("bidMode"),
          durationSeconds: Number(f.get("durationSeconds")),
          position: Number(f.get("position")),
        };
        void onSubmit(values)
          .catch((e) => notify(e.message))
          .finally(() => setBusy(false));
      }}
    >
      <label>
        Produto
        <select name="productId" defaultValue={lot?.productId} required>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.stock} disponíveis)
            </option>
          ))}
        </select>
      </label>
      <div className="form-grid">
        <label>
          Abertura (R$) · 0 permitido
          <input
            name="start"
            type="number"
            min="0"
            step="0.01"
            defaultValue={(lot?.startCents ?? 1500) / 100}
            required
          />
        </label>
        <label>
          Incremento (R$)
          <input
            name="increment"
            type="number"
            min="0.01"
            step="0.01"
            defaultValue={(lot?.incrementCents ?? 100) / 100}
            list="increments"
            required
          />
          <datalist id="increments">
            {[1, 2, 5, 10].map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>
        </label>
      </div>
      <label>
        Modalidade
        <select name="bidMode" defaultValue={lot?.bidMode ?? "FIXED"}>
          <option value="FIXED">Incremento fixo · um clique</option>
          <option value="FREE">Lance livre · mínimo validado</option>
        </select>
      </label>
      <div className="form-grid">
        <label>
          Duração (segundos)
          <input
            name="durationSeconds"
            type="number"
            min="10"
            max="600"
            defaultValue={lot?.durationSeconds ?? 30}
            list="durations"
            required
          />
          <datalist id="durations">
            {[10, 15, 30, 60].map((n) => (
              <option value={n} key={n} />
            ))}
          </datalist>
        </label>
        <label>
          Posição na fila
          <input
            name="position"
            type="number"
            min="0"
            max="1000"
            defaultValue={lot?.position ?? 0}
            required
          />
        </label>
      </div>
      <div className="notice">
        Lances válidos nos últimos 10 segundos estendem o relógio para 10
        segundos. Preço inicial não é reserva oculta.
      </div>
      <button className="primary full" disabled={busy || !products.length}>
        {busy ? "Salvando…" : "Salvar configuração"}
      </button>
    </form>
  );
}
function CameraPreview({
  id,
  notify,
}: {
  id: string;
  notify: (s: string) => void;
}) {
  const ref = useRef<HTMLVideoElement>(null),
    media = useRef<MediaStream | null>(null),
    pc = useRef<RTCPeerConnection | null>(null),
    resource = useRef<string | undefined>(),
    [on, setOn] = useState(false),
    [publishing, setPublishing] = useState(false);
  const stop = () => {
    media.current?.getTracks().forEach((t) => t.stop());
    pc.current?.close();
    if (resource.current)
      void fetch(resource.current, { method: "DELETE" }).catch(() => {});
    media.current = null;
    setOn(false);
    setPublishing(false);
  };
  useEffect(
    () => () => {
      media.current?.getTracks().forEach((t) => t.stop());
      pc.current?.close();
    },
    [],
  );
  async function camera() {
    try {
      media.current = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: true,
      });
      if (ref.current) ref.current.srcObject = media.current;
      setOn(true);
    } catch {
      notify(
        "Câmera indisponível. Autorize câmera e microfone em HTTPS ou localhost.",
      );
    }
  }
  async function publish() {
    try {
      const d = await api<{
        mode: string;
        message?: string;
        publishUrl?: string;
      }>(`/seller/streams/${id}/session`, {});
      if (!d.publishUrl)
        return notify(
          d.message ??
            "Modo demonstração: apenas prévia local, sem transmissão compartilhada.",
        );
      if (!media.current) throw new Error("Ative a câmera primeiro.");
      const peer = new RTCPeerConnection({ iceServers: [] });
      pc.current = peer;
      media.current
        .getTracks()
        .forEach((t) => peer.addTrack(t, media.current!));
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      await new Promise<void>((resolve) => {
        if (peer.iceGatheringState === "complete") return resolve();
        const timeout = setTimeout(resolve, 5000);
        peer.onicegatheringstatechange = () => {
          if (peer.iceGatheringState === "complete") {
            clearTimeout(timeout);
            resolve();
          }
        };
      });
      const r = await fetch(d.publishUrl, {
        method: "POST",
        headers: { "Content-Type": "application/sdp" },
        body: peer.localDescription?.sdp,
      });
      if (!r.ok) throw new Error("Falha ao publicar no provedor.");
      resource.current = r.headers.get("Location") ?? undefined;
      await peer.setRemoteDescription({ type: "answer", sdp: await r.text() });
      peer.onconnectionstatechange = () => {
        setPublishing(peer.connectionState === "connected");
        if (peer.connectionState === "failed")
          notify("Conexão de vídeo perdida. Pare e inicie novamente.");
      };
    } catch (e) {
      notify((e as Error).message);
    }
  }
  return (
    <div className="camera-preview">
      <video
        ref={ref}
        autoPlay
        playsInline
        muted
        className={on ? "" : "hidden"}
      />
      {!on && (
        <div className="empty">
          <Camera size={42} />
          <h3>Prepare seu melhor ângulo.</h3>
          <p>Teste câmera e microfone antes de começar.</p>
        </div>
      )}
      <span className="camera-badge">
        {publishing
          ? "PUBLICANDO NO PROVEDOR"
          : "PRÉVIA LOCAL · NÃO COMPARTILHADA"}
      </span>
      <div className="camera-controls">
        <button
          className="secondary"
          onClick={() => (on ? stop() : void camera())}
        >
          {on ? <CameraOff size={17} /> : <Camera size={17} />}{" "}
          {on ? "Parar câmera" : "Testar câmera e microfone"}
        </button>
        <button
          className="primary"
          disabled={!on || publishing}
          onClick={() => void publish()}
        >
          <Radio size={17} />
          {publishing ? "Conectado" : "Iniciar mídia"}
        </button>
      </div>
    </div>
  );
}

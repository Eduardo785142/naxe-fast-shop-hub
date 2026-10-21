"use client";
import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowUpRight,
  Beaker,
  Clock,
  ShieldCheck,
  ShoppingBag,
  Users,
  Radio,
  RefreshCw,
} from "lucide-react";
import { api, money, type User, type Order, type Product } from "./types";
import type { Common } from "./LiveApp";
import { EnableModal, useRoom, Timer } from "./Room";
import { Metric, OrderList, LotForm, type SellerData } from "./Seller";
export function Account({ path, ...common }: Common & { path: string }) {
  const [enable, setEnable] = useState(false);
  const { data, error, refetch } = useQuery({
    queryKey: ["account", common.user?.id],
    queryFn: () =>
      api<{
        user: User;
        addresses: {
          id: string;
          kind: string;
          street: string;
          number: string;
          postalCode: string;
          city: string;
          state: string;
        }[];
        payment: { scenario: string; provider: string } | null;
        bids: {
          id: string;
          amountCents: number;
          createdAt: string;
          lot: { product: Product; streamId: string };
        }[];
        orders: Order[];
      }>("/account"),
    enabled: !!common.user,
  });
  if (!common.user)
    return (
      <div className="empty">
        <ShoppingBag size={36} />
        <h1>Seus achados, em um só lugar.</h1>
        <button className="primary" onClick={common.login}>
          Entrar na minha conta
        </button>
      </div>
    );
  return (
    <>
      <span className="eyebrow">MINHA NAXE</span>
      <h1>Olá, {common.user.name.split(" ")[0]}.</h1>
      <p className="muted">Acompanhe seus lances e arremates demonstrativos.</p>
      <nav className="page-tabs">
        {[
          ["/minha-conta", "Resumo"],
          ["/minha-conta/enderecos", "Endereços"],
          ["/minha-conta/pagamentos", "Pagamentos"],
          ["/minha-conta/pedidos", "Pedidos"],
        ].map(([href, label]) => (
          <Link
            className={path === href ? "active" : ""}
            href={href}
            key={href}
          >
            {label}
          </Link>
        ))}
      </nav>
      {error && <p className="error">{error.message}</p>}
      {path.includes("enderecos") ? (
        <>
          <div className="section-title">
            <h2>Seus endereços</h2>
            <button className="primary" onClick={() => setEnable(true)}>
              Atualizar dados
            </button>
          </div>
          <div className="simple-list">
            {data?.addresses.map((a) => (
              <div className="panel" key={a.id}>
                <span className="eyebrow">
                  {a.kind === "SHIPPING" ? "ENTREGA" : "COBRANÇA"}
                </span>
                <h3>
                  {a.street}, {a.number}
                </h3>
                <p>
                  {a.city} · {a.state} · CEP {a.postalCode}
                </p>
              </div>
            ))}
            {!data?.addresses.length && (
              <p className="muted">
                Cadastre seu endereço para calcular o frete antes de ofertar.
              </p>
            )}
          </div>
        </>
      ) : path.includes("pagamentos") ? (
        <div className="panel onboarding">
          <ShieldCheck size={32} />
          <h2>Pagamento seguro, teste tranquilo.</h2>
          <p>
            Provedor: sandbox. Nenhum cartão real é solicitado ou armazenado.
          </p>
          <p className="muted">
            Cenário atual: {data?.payment?.scenario ?? "Não habilitado"}
          </p>
          <button className="primary" onClick={() => setEnable(true)}>
            Configurar pagamento fictício
          </button>
        </div>
      ) : path.includes("pedidos") ? (
        <OrderList
          orders={data?.orders ?? []}
          refund={(id) => {
            void api(`/orders/${id}/refund`, {})
              .then(async () => {
                await refetch();
                common.notify("Estorno sandbox registrado.");
              })
              .catch((e) => common.notify(e.message));
          }}
        />
      ) : (
        <>
          <div className="metrics">
            <Metric
              label="LANCES ENVIADOS"
              value={String(data?.bids.length ?? 0)}
              icon={<ArrowUpRight />}
            />
            <Metric
              label="PEDIDOS DE TESTE"
              value={String(data?.orders.length ?? 0)}
              icon={<ShoppingBag />}
            />
            <Metric
              label="HABILITAÇÃO"
              value={common.user.enabled ? "Pronta" : "Pendente"}
              icon={<ShieldCheck />}
            />
          </div>
          {!common.user.enabled && (
            <div className="panel callout">
              <div>
                <h2>Pronto para seu primeiro lance?</h2>
                <p className="muted">
                  Complete endereço e pagamento fictício. Nenhum lance será
                  enviado.
                </p>
              </div>
              <button className="primary" onClick={() => setEnable(true)}>
                Habilitar lances
              </button>
            </div>
          )}
          <h2>Histórico de lances</h2>
          <div className="simple-list">
            {data?.bids.length ? (
              data.bids.map((b) => (
                <Link
                  key={b.id}
                  href={`/live/${b.lot.streamId}`}
                  className="panel bid-row"
                >
                  <div>
                    <b>{b.lot.product.name}</b>
                    <small>
                      {new Date(b.createdAt).toLocaleString("pt-BR", {
                        timeZone: "America/Sao_Paulo",
                      })}
                    </small>
                  </div>
                  <strong>{money(b.amountCents)}</strong>
                </Link>
              ))
            ) : (
              <div className="panel empty">
                <h3>Sua história de descobertas começa agora.</h3>
                <Link href="/explorar" className="primary">
                  Explorar transmissões <ArrowUpRight size={16} />
                </Link>
              </div>
            )}
          </div>
        </>
      )}
      {enable && (
        <EnableModal
          {...common}
          onClose={() => setEnable(false)}
          onDone={async () => {
            await common.reload();
            await refetch();
            setEnable(false);
            common.notify("Dados salvos. Nenhum lance foi enviado.");
          }}
        />
      )}
    </>
  );
}
export function Playground(common: Common) {
  const { stream, offset, connected } = useRoom("playground");
  const { data } = useQuery({
    queryKey: ["playground-products", common.user?.id],
    queryFn: () => api<SellerData>("/seller"),
    enabled: common.user?.role === "SELLER",
  });
  const [busy, setBusy] = useState(false);
  const active =
    stream?.lots.find((l) => l.status === "LIVE") ?? stream?.lots.at(-1);
  const fallback: Product[] = [
    {
      id: "perfume",
      name: "Perfume Premium 100 ml",
      description: "Demonstração",
      category: "Beleza",
      artwork: "perfume",
      stock: 20,
      weight: 500,
      height: 10,
      width: 15,
      length: 20,
      originPostalCode: "01001000",
    },
  ];
  async function act(action: string, body: unknown = {}) {
    setBusy(true);
    try {
      await api(`/playground/${action}`, body);
      common.notify("Ação demonstrativa registrada pelo motor de leilões.");
    } catch (e) {
      common.notify((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <span className="eyebrow">LABORATÓRIO · SOMENTE SANDBOX</span>
      <h1>
        Auction Playground
        <span className="heading-icon">
          <Beaker size={30} />
        </span>
      </h1>
      <p className="muted">
        O mesmo motor transacional, com controles exclusivos de demonstração.
      </p>
      <div className="notice">
        Lances abaixo são feitos por Comprador A e Comprador B fictícios,
        identificados nos registros de auditoria. Abra a sala em outra sessão
        para observar a sincronização.
      </div>
      {!common.user ? (
        <button className="primary" onClick={common.login}>
          Entrar como vendedor ou administrador
        </button>
      ) : !["SELLER", "ADMIN"].includes(common.user.role) ? (
        <p className="error">
          Entre com uma conta de vendedor ou administrador para operar o
          laboratório.
        </p>
      ) : (
        <div className="playground-grid">
          <section className="panel">
            <h2>Prepare a disputa</h2>
            <LotForm
              products={data?.products ?? fallback}
              onSubmit={async (v) => act("start", v)}
              notify={common.notify}
            />
          </section>
          <section className="panel">
            <span className="eyebrow">
              {connected ? "● CONECTADO AO SERVIDOR" : "RECONECTANDO…"}
            </span>
            <h2>{active?.product.name ?? "Inicie seu primeiro teste"}</h2>
            {active && (
              <>
                <div className="auction-metrics">
                  <strong>
                    {money(active.currentCents ?? active.startCents)}
                  </strong>
                  <Timer lot={active} offset={offset} />
                </div>
                <p>
                  Status: <b>{active.status}</b>
                </p>
                <p className="green">
                  {active.result?.winnerId
                    ? `Vencedor: ${active.result.winnerId}`
                    : active.leaderId
                      ? `Líder: ${active.leaderId}`
                      : "Nenhum lance recebido"}
                </p>
                <div className="demo-controls">
                  <button
                    className="primary"
                    disabled={busy || active.status !== "LIVE"}
                    onClick={() => void act("bid", { buyer: "buyer-a" })}
                  >
                    Comprador A · {money(active.nextCents)}
                  </button>
                  <button
                    className="secondary"
                    disabled={busy || active.status !== "LIVE"}
                    onClick={() => void act("bid", { buyer: "buyer-b" })}
                  >
                    Comprador B · {money(active.nextCents)}
                  </button>
                  <button
                    className="secondary"
                    disabled={busy || active.status !== "LIVE"}
                    onClick={() => void act("advance", { seconds: 25 })}
                  >
                    <Clock size={16} />
                    Avançar 25 segundos
                  </button>
                  <button
                    className="secondary"
                    disabled={busy || active.status !== "LIVE"}
                    onClick={() => void act("close")}
                  >
                    Encerrar e criar pedido
                  </button>
                  <button
                    className="secondary"
                    disabled={busy || active.status !== "LIVE"}
                    onClick={() => void act("reset")}
                  >
                    <RefreshCw size={15} />
                    Cancelar simulação
                  </button>
                </div>
                <h3>Lances aceitos</h3>
                {active.bids.map((b) => (
                  <p className="bid-row" key={b.id}>
                    {b.alias}
                    <b>{money(b.amountCents)}</b>
                  </p>
                ))}
                <Link className="studio-link" href="/live/playground">
                  Abrir sala pública da simulação <ArrowUpRight size={16} />
                </Link>
              </>
            )}
          </section>
        </div>
      )}
    </>
  );
}
type AdminData = {
  users: { id: string; alias: string; role: string; enabled: boolean }[];
  sellers: { id: string; displayName: string; verified: boolean }[];
  streams: { id: string; title: string; status: string }[];
  orders: { id: string; totalCents: number; status: string }[];
  events: {
    id: string;
    lotId: string;
    type: string;
    actorId: string | null;
    createdAt: string;
    data: Record<string, unknown>;
  }[];
  audit: {
    id: string;
    action: string;
    resourceId: string;
    createdAt: string;
  }[];
  messages: { id: string; streamId: string; text: string }[];
};
export function Admin(common: Common) {
  const { data, error, refetch } = useQuery({
    queryKey: ["admin", common.user?.id],
    queryFn: () => api<AdminData>("/admin"),
    enabled: common.user?.role === "ADMIN",
    refetchInterval: 10000,
  });
  const [tab, setTab] = useState("activity");
  if (common.user?.role !== "ADMIN")
    return (
      <div className="empty">
        <ShieldCheck size={40} />
        <h1>Área administrativa.</h1>
        <p className="muted">Permissões verificadas pelo servidor.</p>
        {!common.user && (
          <button className="primary" onClick={common.login}>
            Entrar
          </button>
        )}
      </div>
    );
  const volume =
    data?.orders
      .filter((o) => o.status === "PAID_SANDBOX")
      .reduce((s, o) => s + o.totalCents, 0) ?? 0;
  return (
    <>
      <span className="eyebrow">ADMINISTRAÇÃO · SANDBOX</span>
      <h1>Uma visão de tudo.</h1>
      {error && <p className="error">{error.message}</p>}
      <div className="metrics">
        <Metric
          label="CONTAS DEMONSTRATIVAS"
          value={String(data?.users.length ?? 0)}
          icon={<Users />}
        />
        <Metric
          label="VOLUME FICTÍCIO APROVADO"
          value={money(volume)}
          icon={<ShoppingBag />}
        />
        <Metric
          label="TRANSMISSÕES"
          value={String(data?.streams.length ?? 0)}
          icon={<Radio />}
        />
      </div>
      <div className="page-tabs">
        {[
          ["activity", "Eventos de leilão"],
          ["users", "Usuários e vendedores"],
          ["streams", "Transmissões"],
          ["moderation", "Moderação"],
          ["finance", "Simulação financeira"],
        ].map(([v, n]) => (
          <button
            key={v}
            className={tab === v ? "active" : ""}
            onClick={() => setTab(v)}
          >
            {n}
          </button>
        ))}
      </div>
      <section className="panel">
        {tab === "activity" ? (
          <>
            <h2>Histórico auditável</h2>
            <p className="muted">
              Eventos persistidos no banco. Alterações de demonstração
              permanecem identificadas.
            </p>
            <div className="audit-list">
              {data?.events.map((e) => (
                <div key={e.id}>
                  <time>
                    {new Date(e.createdAt).toLocaleTimeString("pt-BR", {
                      timeZone: "America/Sao_Paulo",
                    })}
                  </time>
                  <b>{e.type}</b>
                  <code>{e.lotId.slice(0, 14)}</code>
                  <span>
                    {typeof e.data.amountCents === "number"
                      ? money(e.data.amountCents)
                      : typeof e.data.reason === "string"
                        ? e.data.reason
                        : "—"}
                  </span>
                </div>
              ))}
            </div>
            <h3>Auditoria operacional</h3>
            {data?.audit.map((a) => (
              <p key={a.id}>
                {a.action} · {a.resourceId}
              </p>
            ))}
          </>
        ) : tab === "users" ? (
          <>
            <h2>Usuários e permissões</h2>
            {data?.users.map((u) => (
              <p className="bid-row" key={u.id}>
                <span>{u.alias}</span>
                <span>
                  <b>{u.enabled ? "Habilitado" : "Não habilitado"}</b>
                  <select
                    aria-label={`Papel de ${u.alias}`}
                    value={u.role}
                    disabled={u.id === common.user?.id}
                    onChange={(e) => {
                      void api(
                        `/admin/users/${u.id}/role`,
                        { role: e.target.value },
                        "PATCH",
                      )
                        .then(() => refetch())
                        .catch((e) => common.notify(e.message));
                    }}
                  >
                    {["BUYER", "SELLER", "ADMIN"].map((r) => (
                      <option key={r}>{r}</option>
                    ))}
                  </select>
                </span>
              </p>
            ))}
            <h3>Vendedores</h3>
            {data?.sellers.map((s) => (
              <p key={s.id}>
                {s.displayName} ·{" "}
                {s.verified
                  ? "Perfil demonstrativo verificado"
                  : "Verificação pendente"}{" "}
                <button
                  className="secondary"
                  onClick={() => {
                    void api(
                      `/admin/sellers/${s.id}/verify`,
                      { verified: !s.verified },
                      "PATCH",
                    )
                      .then(() => refetch())
                      .catch((e) => common.notify(e.message));
                  }}
                >
                  {s.verified
                    ? "Remover verificação demo"
                    : "Verificar perfil demo"}
                </button>
              </p>
            ))}
            <p className="notice">
              Alterações de permissões são auditadas e revogam sessões.
              Verificação de vendedor é demonstrativa; análise documental
              comercial não está integrada.
            </p>
          </>
        ) : tab === "streams" ? (
          <>
            <h2>Transmissões monitoradas</h2>
            {data?.streams.map((s) => (
              <Link key={s.id} href={`/live/${s.id}`} className="bid-row">
                {s.title}
                <b>{s.status} ↗</b>
              </Link>
            ))}
          </>
        ) : tab === "moderation" ? (
          <>
            <h2>Moderação de mensagens</h2>
            {data?.messages.length ? (
              data.messages.map((m) => (
                <div className="moderation-row" key={m.id}>
                  <p>{m.text}</p>
                  <button
                    className="secondary"
                    onClick={() => {
                      void api(`/admin/messages/${m.id}/hide`, {})
                        .then(() => refetch())
                        .catch((e) => common.notify(e.message));
                    }}
                  >
                    Ocultar e auditar
                  </button>
                </div>
              ))
            ) : (
              <p className="muted">Nenhuma mensagem para moderar.</p>
            )}
          </>
        ) : (
          <>
            <h2>Simulação de receita e custos</h2>
            <p>
              Volume sandbox aprovado: <b>{money(volume)}</b>
            </p>
            <p>
              Comissão hipotética de 5%:{" "}
              <b>{money(Math.round(volume * 0.05))}</b>
            </p>
            <p>
              Custo hipotético de 2%: <b>{money(Math.round(volume * 0.02))}</b>
            </p>
            <p className="notice">
              Projeção ilustrativa, sem efeito sobre taxas reais ou valores dos
              pedidos. Nenhuma receita foi realizada.
            </p>
          </>
        )}
      </section>
    </>
  );
}

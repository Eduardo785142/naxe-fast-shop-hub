"use client";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import Link from "next/link";
import { io } from "socket.io-client";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  Clock,
  Heart,
  MessageCircle,
  Radio,
  Send,
  Share2,
  ShieldCheck,
  Users,
  X,
  WifiOff,
  Volume2,
} from "lucide-react";
import { api, money, type Stream, type Lot } from "./types";
import type { Common } from "./LiveApp";
export function useRoom(id: string) {
  const [stream, setStream] = useState<Stream | null>(null),
    [connected, setConnected] = useState(false),
    [error, setError] = useState(""),
    [offset, setOffset] = useState(0);
  const accept = useCallback((s: Stream) => {
    setStream(s);
    setOffset(s.serverNow - Date.now());
    setError("");
  }, []);
  useEffect(() => {
    let active = true;
    void api<Stream>(`/streams/${id}`)
      .then((s) => {
        if (active) accept(s);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    const socket = io(
      process.env.NEXT_PUBLIC_REALTIME_URL ?? window.location.origin,
      {
        path: "/socket.io",
        addTrailingSlash: false,
        transports: ["websocket", "polling"],
        tryAllTransports: true,
        reconnection: true,
      },
    );
    socket.on("connect", () => {
      setConnected(true);
      socket.emit("join", id);
    });
    socket.on("disconnect", () => setConnected(false));
    socket.on("connect_error", () => setConnected(false));
    socket.on("state", accept);
    return () => {
      active = false;
      socket.disconnect();
    };
  }, [id, accept]);
  return { stream, connected, error, offset };
}
export function Timer({ lot, offset }: { lot: Lot; offset: number }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(t);
  }, []);
  const seconds = lot.endsAt
    ? Math.max(
        0,
        Math.ceil((new Date(lot.endsAt).getTime() - now - offset) / 1000),
      )
    : lot.durationSeconds;
  return (
    <div
      className={`clock ${seconds <= 10 && lot.status === "LIVE" ? "urgent" : ""}`}
    >
      <Clock size={17} />
      <span>
        {lot.status === "LIVE"
          ? `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`
          : lot.status === "READY"
            ? "Aguardando"
            : "Encerrado"}
      </span>
    </div>
  );
}
export default function Room({ id, ...common }: Common & { id: string }) {
  const { stream, connected, error, offset } = useRoom(id);
  const [enable, setEnable] = useState(false),
    [busy, setBusy] = useState(false),
    [free, setFree] = useState(""),
    [chat, setChat] = useState(""),
    [tab, setTab] = useState("chat");
  const lot =
    stream?.lots.find((l) => l.status === "LIVE") ??
    stream?.lots.find((l) => l.status === "READY") ??
    stream?.lots.at(-1);
  const { data: quote, refetch: refreshQuote } = useQuery({
    queryKey: ["quote", lot?.productId, common.user?.enabled],
    queryFn: () =>
      api<{ cents: number; estimated: boolean; label: string }>(
        `/quote/${lot?.productId}`,
      ),
    enabled: !!lot,
  });
  const min = lot?.nextCents ?? 0;
  const amount =
    lot?.bidMode === "FREE" ? Math.round(Number(free || min / 100) * 100) : min;
  async function bid() {
    if (!common.user) return common.login();
    if (!common.user.enabled) return setEnable(true);
    if (!lot) return;
    setBusy(true);
    try {
      await api(`/lots/${lot.id}/bid`, {
        amountCents: amount,
        attemptId: crypto.randomUUID(),
        shippingMaxCents: quote?.cents,
      });
      setFree("");
      common.notify(`Lance de ${money(amount)} aceito pelo servidor.`);
    } catch (e) {
      common.notify((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function send(e: FormEvent) {
    e.preventDefault();
    if (!common.user) return common.login();
    try {
      await api(`/streams/${id}/chat`, { text: chat });
      setChat("");
    } catch (e) {
      common.notify((e as Error).message);
    }
  }
  if (error)
    return (
      <div className="empty">
        <WifiOff size={30} />
        <h1>Não foi possível abrir esta sala.</h1>
        <p>{error}</p>
        <Link className="primary" href="/">
          Voltar a explorar
        </Link>
      </div>
    );
  if (!stream)
    return <div className="skeleton tall" aria-label="Carregando sala" />;
  return (
    <>
      <div className="room-top">
        <Link href="/explorar">
          <ArrowLeft size={16} />
          Explorar transmissões
        </Link>
        <span className={connected ? "connection" : "error"}>
          {connected ? "● Conectado em tempo real" : "Reconectando…"}
        </span>
      </div>
      <div className="room-heading">
        <div>
          <span className="eyebrow">{stream.category} · DEMONSTRAÇÃO</span>
          <h1>{stream.title}</h1>
        </div>
        <button
          className="secondary"
          onClick={() => {
            void navigator.clipboard
              ?.writeText(window.location.href)
              .then(() => common.notify("Link copiado."))
              .catch(() => common.notify(window.location.href));
          }}
        >
          <Share2 size={16} />
          Compartilhar
        </button>
      </div>
      <div className="room-grid">
        <div className="room-media">
          <div className="broadcast">
            <div className="broadcast-top">
              <span
                className={
                  stream.status === "LIVE" ? "live-badge" : "demo-badge"
                }
              >
                {stream.status === "LIVE"
                  ? "● LEILÃO AO VIVO"
                  : stream.status === "ENDED"
                    ? "TRANSMISSÃO ENCERRADA"
                    : "SALA DE DEMONSTRAÇÃO"}
              </span>
              <span className="viewer-badge">
                <Users size={13} />
                {stream.viewers}
              </span>
            </div>
            <Playback id={id} artwork={lot?.product.artwork ?? "perfume"} />
            <div className="broadcast-bottom">
              <span>
                <Volume2 size={15} /> Mídia demonstrativa · sem vídeo
                compartilhado
              </span>
            </div>
          </div>
          <div className="seller-room">
            <span className="seller-avatar large">
              {stream.seller.displayName[0]}
            </span>
            <div>
              <Link href={`/vendedor/${stream.seller.slug}`}>
                <b>{stream.seller.displayName}</b>
                <ShieldCheck size={15} />
              </Link>
              <small>Vendedor demonstrativo · Brasil</small>
            </div>
            <button
              className="secondary"
              onClick={() => {
                if (!common.user) return common.login();
                void api<{ following: boolean }>(
                  `/sellers/${stream.seller.id}/follow`,
                  {},
                )
                  .then((d) =>
                    common.notify(
                      d.following
                        ? "Seguindo vendedor."
                        : "Você deixou de seguir.",
                    ),
                  )
                  .catch((e) => common.notify(e.message));
              }}
            >
              <Heart size={15} />
              Seguir
            </button>
          </div>
          <div className="panel chat-panel">
            <div className="tabs">
              <button
                className={tab === "chat" ? "active" : ""}
                onClick={() => setTab("chat")}
              >
                <MessageCircle size={16} />
                Conversa ao vivo
              </button>
              <button
                className={tab === "bids" ? "active" : ""}
                onClick={() => setTab("bids")}
              >
                Histórico de lances
              </button>
            </div>
            <div className="chat-feed" aria-live="polite">
              {tab === "chat" ? (
                stream.messages.length ? (
                  stream.messages.map((m) => (
                    <p key={m.id}>
                      <b>{m.alias}</b> {m.text}
                    </p>
                  ))
                ) : (
                  <div className="empty small-empty">
                    <MessageCircle size={24} />
                    <p>A conversa começa com você.</p>
                  </div>
                )
              ) : lot?.bids?.length ? (
                lot.bids.map((b, i) => (
                  <p className="bid-row" key={b.id}>
                    <span>
                      {i === 0 ? "↑ " : ""}
                      {b.alias}
                    </span>
                    <b>{money(b.amountCents)}</b>
                  </p>
                ))
              ) : (
                <p className="muted">Ainda não há lances neste lote.</p>
              )}
            </div>
            {tab === "chat" && (
              <form className="chat-form" onSubmit={send}>
                <input
                  aria-label="Mensagem no chat"
                  placeholder={
                    common.user ? "Entre na conversa…" : "Entre para conversar"
                  }
                  value={chat}
                  maxLength={300}
                  onChange={(e) => setChat(e.target.value)}
                />
                <button aria-label="Enviar mensagem" disabled={!chat.trim()}>
                  <Send size={17} />
                </button>
              </form>
            )}
          </div>
        </div>
        <aside className="bid-panel panel">
          {lot ? (
            <>
              <div className="lot-label">
                <span className="eyebrow">
                  LOTE {String(lot.position + 1).padStart(3, "0")}
                </span>
                <span className="status-pill">
                  {(
                    {
                      LIVE: "Em disputa",
                      READY: "Preparando",
                      SOLD: "Arrematado",
                      UNSOLD: "Sem lances",
                      CANCELLED: "Cancelado",
                    } as Record<string, string>
                  )[lot.status] ?? lot.status}
                </span>
              </div>
              <div className="active-product">
                <img
                  src={`/products/${lot.product.artwork}.svg`}
                  alt={lot.product.name}
                />
                <div>
                  <h2>{lot.product.name}</h2>
                  <p>{lot.product.description}</p>
                  <small>1 unidade · estoque: {lot.product.stock}</small>
                </div>
              </div>
              <div className="auction-metrics">
                <div>
                  <span className="eyebrow">
                    {lot.currentCents === null ? "ABERTURA" : "MAIOR LANCE"}
                  </span>
                  <strong>{money(lot.currentCents ?? lot.startCents)}</strong>
                </div>
                <Timer lot={lot} offset={offset} />
              </div>
              <div className="leader-line">
                {lot.leaderId ? (
                  <>
                    <span className="green-dot" />
                    {lot.leaderId === common.user?.bidderAlias
                      ? lot.status === "SOLD"
                        ? "Você arrematou este lote!"
                        : "Você está na liderança"
                      : `${lot.status === "SOLD" ? "Vencedor: " : lot.bids.some((b) => b.alias === common.user?.bidderAlias) ? "Seu lance foi superado. Líder: " : "Na liderança: "}${lot.leaderId}`}
                  </>
                ) : lot.status === "LIVE" ? (
                  "Seja o primeiro a participar."
                ) : (
                  "O vendedor inicia o relógio pelo Studio."
                )}
              </div>
              <div className="bid-box">
                <div className="bid-rule">
                  <span>
                    {lot.bidMode === "FIXED"
                      ? "INCREMENTO FIXO"
                      : "LANCE LIVRE"}
                  </span>
                  <b>{money(lot.incrementCents)}</b>
                </div>
                {lot.bidMode === "FREE" && (
                  <label>
                    Seu lance (mínimo {money(min)})
                    <input
                      type="number"
                      min={min / 100}
                      step="0.01"
                      value={free}
                      placeholder={String(min / 100)}
                      onChange={(e) => setFree(e.target.value)}
                    />
                  </label>
                )}
                <button
                  data-testid="bid-button"
                  className="primary bid-button full"
                  onClick={() => void bid()}
                  disabled={
                    busy ||
                    lot.status !== "LIVE" ||
                    !connected ||
                    !quote ||
                    !Number.isFinite(amount) ||
                    amount < min
                  }
                >
                  {busy ? (
                    "Enviando lance…"
                  ) : lot.status === "LIVE" ? (
                    <>
                      Dar lance {money(amount)}
                      <ArrowUpRight size={21} />
                    </>
                  ) : lot.status === "SOLD" ? (
                    "Lote arrematado"
                  ) : lot.status === "READY" ? (
                    "Aguardando início"
                  ) : (
                    "Lote encerrado"
                  )}
                </button>
                <p className="one-click">
                  <Check size={13} />
                  Um clique. Lance enviado sem confirmação.
                </p>
                <dl className="costs">
                  <div>
                    <dt>Valor do lance</dt>
                    <dd>{money(amount)}</dd>
                  </div>
                  <div>
                    <dt>Taxas do comprador</dt>
                    <dd>{money(0)}</dd>
                  </div>
                  <div>
                    <dt>
                      Frete{" "}
                      {quote?.estimated ? "estimado" : "demonstrativo fixado"}
                    </dt>
                    <dd>{money(quote?.cents ?? 1350)}</dd>
                  </div>
                  <div className="total">
                    <dt>Total se vencer</dt>
                    <dd>{money(amount + (quote?.cents ?? 1350))}</dd>
                  </div>
                </dl>
                <small className="muted">
                  {quote?.estimated
                    ? "Exemplo para São Paulo. Habilite seu endereço para fixar o frete antes de ofertar."
                    : "Cotação demonstrativa; valor exibido permanece fixo durante a disputa."}
                </small>
              </div>
              <div className="buyer-state">
                <ShieldCheck size={18} />
                <div>
                  <b>
                    {common.user?.enabled
                      ? "Comprador habilitado"
                      : "Prepare-se para seu primeiro lance"}
                  </b>
                  <p>
                    {common.user?.enabled
                      ? "Pagamento fictício · nenhuma cobrança real"
                      : "Cadastro e meio de pagamento de teste."}
                  </p>
                </div>
                {!common.user?.enabled && (
                  <button
                    onClick={() =>
                      common.user ? setEnable(true) : common.login()
                    }
                    aria-label="Habilitar lances"
                  >
                    <ArrowRightIcon />
                  </button>
                )}
              </div>
              <p className="legal">
                Seu lance aceito representa um compromisso nas condições
                apresentadas. Direitos legais de cancelamento e devolução
                permanecem aplicáveis. Neste sandbox não há compras ou cobranças
                reais.
              </p>
              <Link className="studio-link" href={`/seller/studio/${id}`}>
                Operar esta sala no Seller Studio <ArrowUpRight size={15} />
              </Link>
            </>
          ) : (
            <div className="empty">
              <h3>Nenhum lote preparado.</h3>
              <Link href={`/seller/studio/${id}`}>Preparar no Studio</Link>
            </div>
          )}
        </aside>
      </div>
      <div className="section-title below-room">
        <h2>Na sequência</h2>
        <span className="muted">
          {stream.lots.length} lotes nesta transmissão
        </span>
      </div>
      <div className="lot-strip">
        {stream.lots.map((l) => (
          <div className="panel" key={l.id}>
            <img src={`/products/${l.product.artwork}.svg`} alt="" />
            <div>
              <b>{l.product.name}</b>
              <small>
                {l.status} · abertura {money(l.startCents)}
              </small>
            </div>
          </div>
        ))}
      </div>
      {enable && (
        <EnableModal
          {...common}
          onClose={() => setEnable(false)}
          onDone={async () => {
            await common.reload();
            await refreshQuote();
            setEnable(false);
            common.notify(
              "Habilitação concluída. Clique novamente no valor atual para ofertar. Nenhum lance foi enviado.",
            );
          }}
        />
      )}
    </>
  );
}
function ArrowRightIcon() {
  return <ArrowUpRight size={19} />;
}
function Playback({ id, artwork }: { id: string; artwork: string }) {
  const ref = useRef<HTMLVideoElement>(null),
    [real, setReal] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    const pc = new RTCPeerConnection({ iceServers: [] });
    let resource: string | undefined;
    let stopped = false;
    void api<{ mode: string; playbackUrl?: string }>(`/streams/${id}/playback`)
      .then(async (d) => {
        if (!d.playbackUrl || stopped) return;
        pc.addTransceiver("video", { direction: "recvonly" });
        pc.addTransceiver("audio", { direction: "recvonly" });
        pc.ontrack = (e) => {
          if (ref.current) {
            ref.current.srcObject = e.streams[0] ?? new MediaStream([e.track]);
            setReal(true);
          }
        };
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await new Promise<void>((resolve) => {
          if (pc.iceGatheringState === "complete") return resolve();
          const timeout = setTimeout(resolve, 5000);
          pc.onicegatheringstatechange = () => {
            if (pc.iceGatheringState === "complete") {
              clearTimeout(timeout);
              resolve();
            }
          };
        });
        const r = await fetch(d.playbackUrl, {
          method: "POST",
          headers: { "Content-Type": "application/sdp" },
          body: pc.localDescription?.sdp,
        });
        if (!r.ok)
          throw new Error("Falha no streaming. Reabra a sala para reconectar.");
        resource = r.headers.get("Location") ?? undefined;
        await pc.setRemoteDescription({ type: "answer", sdp: await r.text() });
      })
      .catch((e) => setError(e.message));
    return () => {
      stopped = true;
      pc.close();
      if (resource) void fetch(resource, { method: "DELETE" }).catch(() => {});
    };
  }, [id]);
  return (
    <>
      <video
        ref={ref}
        autoPlay
        playsInline
        controls
        muted
        className={real ? "remote-video" : "hidden"}
        aria-label="Transmissão ao vivo"
      />
      {!real && (
        <div className="demo-media">
          <video
            className="sample-video"
            src={`/demo/${artwork}.mp4`}
            poster={`/products/${artwork}.svg`}
            controls
            loop
            muted
            playsInline
            preload="none"
            aria-label="Vídeo ilustrativo pré-gravado do produto"
          />
          <span className="media-label">
            <Radio size={18} />
            <b>Uma nova forma de descobrir.</b>
            <small>
              {error ||
                "Vídeo ilustrativo pré-gravado · não é transmissão ao vivo"}
            </small>
          </span>
        </div>
      )}
    </>
  );
}
export function EnableModal({
  onClose,
  onDone,
  ...common
}: Common & { onClose: () => void; onDone: () => Promise<void> }) {
  const [same, setSame] = useState(true),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const f = new FormData(e.currentTarget);
    const get = (prefix: string) =>
      Object.fromEntries(
        ["postalCode", "street", "number", "city", "state"].map((k) => [
          k,
          String(f.get(`${prefix}${k}`) ?? "").replace(
            k === "postalCode" ? /\D/g : /$^/g,
            "",
          ),
        ]),
      );
    try {
      await api("/account/enable", {
        shipping: get("s"),
        billing: same ? undefined : get("b"),
        sameBilling: same,
        terms: f.get("terms") === "on",
        scenario: f.get("scenario"),
      });
      await onDone();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const fields = (prefix: string) => (
    <>
      <label>
        CEP
        <input
          name={`${prefix}postalCode`}
          required
          pattern="[0-9]{5}-?[0-9]{3}"
          placeholder="00000-000"
          autoComplete="postal-code"
        />
      </label>
      <label>
        Endereço
        <input
          name={`${prefix}street`}
          required
          minLength={3}
          autoComplete="street-address"
        />
      </label>
      <div className="form-grid">
        <label>
          Número
          <input name={`${prefix}number`} required />
        </label>
        <label>
          Cidade
          <input name={`${prefix}city`} required minLength={2} />
        </label>
        <label>
          UF
          <input
            name={`${prefix}state`}
            required
            pattern="[A-Z]{2}"
            maxLength={2}
            placeholder="SP"
          />
        </label>
      </div>
    </>
  );
  return (
    <div className="modal-backdrop">
      <section
        className="modal wide-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="enable-title"
      >
        <button
          className="icon-btn modal-close"
          onClick={onClose}
          aria-label="Fechar"
        >
          <X />
        </button>
        <span className="eyebrow">PRONTO PARA PARTICIPAR?</span>
        <h2 id="enable-title">Habilite seus lances.</h2>
        <p className="muted">
          A live continua ao fundo. Use dados fictícios neste ambiente.
        </p>
        <form onSubmit={submit}>
          <h3>Endereço de entrega</h3>
          {fields("s")}
          <label className="checkbox">
            <input
              type="checkbox"
              checked={same}
              onChange={(e) => setSame(e.target.checked)}
            />
            Cobrança no mesmo endereço
          </label>
          {!same && (
            <>
              <h3>Endereço de cobrança</h3>
              {fields("b")}
            </>
          )}
          <label>
            Meio de pagamento sandbox
            <select name="scenario">
              <option value="APPROVED">Cartão fictício · aprovação</option>
              <option value="DECLINED">
                Cartão fictício · recusa após vitória
              </option>
              <option value="PENDING">
                Cartão fictício · pagamento pendente
              </option>
            </select>
          </label>
          <div className="notice">
            <ShieldCheck size={16} />
            Nenhum número de cartão é solicitado ou armazenado. Frete
            demonstrativo calculado pelo CEP. Taxa do comprador: R$ 0,00.
          </div>
          <label className="checkbox">
            <input name="terms" type="checkbox" required />
            Entendo o envio com um clique e as condições de frete. Se vencer, o
            compromisso é de compra, preservados meus direitos legais. Neste
            ambiente, tudo é sandbox.
          </label>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <button disabled={busy} className="primary full">
            {busy ? "Salvando…" : "Habilitar e voltar à sala"}
          </button>
          <small className="muted">
            Este cadastro não envia nenhum lance automaticamente.
          </small>
        </form>
      </section>
    </div>
  );
}

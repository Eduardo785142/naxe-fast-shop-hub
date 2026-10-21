"use client";
import { useEffect, useState, useCallback, type FormEvent } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from "@tanstack/react-query";
import {
  Radio,
  Search,
  ArrowUpRight,
  ArrowRight,
  ChevronRight,
  Flame,
  ShieldCheck,
  Video,
  UserRound,
  SlidersHorizontal,
  LayoutDashboard,
  LogOut,
  Menu,
  X,
  ShoppingBag,
  Beaker,
  Compass,
  Heart,
  Check,
  CalendarDays,
} from "lucide-react";
import { api, money, type User, type Stream } from "./types";
import Room from "./Room";
import Seller from "./Seller";
import { Account, Admin, Playground } from "./Panels";
const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: true } },
});
export default function LiveApp() {
  return (
    <QueryClientProvider client={queryClient}>
      <Shell />
    </QueryClientProvider>
  );
}
export type Common = {
  user: User | null;
  reload: () => Promise<unknown>;
  notify: (s: string) => void;
  login: () => void;
};
function Shell() {
  const path = usePathname();
  const router = useRouter();
  const { data: user = null, refetch } = useQuery({
    queryKey: ["me"],
    queryFn: () => api<User | null>("/me"),
  });
  const [auth, setAuth] = useState(false),
    [toast, setToast] = useState(""),
    [menu, setMenu] = useState(false);
  const notify = useCallback((s: string) => setToast(s), []);
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(""), 5000);
      return () => clearTimeout(t);
    }
  }, [toast]);
  const common: Common = {
    user,
    reload: refetch,
    notify,
    login: () => setAuth(true),
  };
  useEffect(() => setMenu(false), [path]);
  const isSeller = path.startsWith("/seller");
  return (
    <>
      <div className="sandbox-bar">
        <span className="dot" /> AMBIENTE DE DEMONSTRAÇÃO{" "}
        <span className="sandbox-detail">
          · Produtos fictícios. Nenhuma cobrança real.
        </span>
      </div>
      <header className="header">
        <Link href="/" className="brand" aria-label="Naxe Live início">
          NAXE
          <span>
            LIVE
            <i />
          </span>
        </Link>
        <nav className="desktop-nav">
          <Link href="/explorar" className={!isSeller ? "active" : ""}>
            Explorar
          </Link>
          <Link href="/seller" className={isSeller ? "active" : ""}>
            Para vendedores
          </Link>
        </nav>
        <form
          className="header-search"
          onSubmit={(e) => {
            e.preventDefault();
            const q = new FormData(e.currentTarget).get("q");
            router.push(`/explorar?q=${encodeURIComponent(String(q ?? ""))}`);
          }}
        >
          <Search size={17} />
          <input
            name="q"
            placeholder="Encontre sua próxima descoberta"
            aria-label="Buscar transmissões"
          />
          <kbd>↵</kbd>
        </form>
        <button
          className="icon-btn mobile-menu"
          onClick={() => setMenu(!menu)}
          aria-label="Abrir menu"
        >
          <Menu size={21} />
        </button>
        {user ? (
          <Link href="/minha-conta" className="account-btn">
            <UserRound size={16} />
            <span>{user.name.split(" ")[0]}</span>
          </Link>
        ) : (
          <button className="account-btn" onClick={() => setAuth(true)}>
            <UserRound size={16} />
            Entrar <ArrowUpRight size={14} />
          </button>
        )}
      </header>
      {menu && (
        <nav className="mobile-nav">
          <Link href="/explorar">Explorar lives</Link>
          <Link href="/seller">Seller Studio</Link>
          <Link href="/playground">Playground</Link>
          <Link href="/minha-conta">Minha conta</Link>
        </nav>
      )}
      <div className="app-body">
        <aside className="sidebar">
          <div className="side-label">DESCUBRA</div>
          <Link
            href="/explorar"
            className={!isSeller && !path.includes("conta") ? "selected" : ""}
          >
            <Compass size={18} />
            Explorar
          </Link>
          <Link href="/explorar?status=LIVE">
            <Radio size={18} />
            Ao vivo agora
            <span className="tiny-dot" />
          </Link>
          <Link href="/explorar?status=SCHEDULED">
            <CalendarDays size={18} />
            Próximas lives
          </Link>
          <div className="side-label spaced">SUAS CONEXÕES</div>
          <Link href="/minha-conta/pedidos">
            <ShoppingBag size={18} />
            Minhas compras
          </Link>
          <Link href="/seller">
            <LayoutDashboard size={18} />
            Seller Studio
          </Link>
          <Link href="/playground">
            <Beaker size={18} />
            Playground
          </Link>
          {user?.role === "ADMIN" && (
            <Link href="/admin">
              <ShieldCheck size={18} />
              Administração
            </Link>
          )}
          <div className="sidebar-note">
            <div className="mini-icon">
              <Video size={19} />
            </div>
            <b>Sua vitrine, ao vivo.</b>
            <p>Transforme boas descobertas em grandes encontros.</p>
            <Link href="/seller">
              Comece a vender <ArrowUpRight size={14} />
            </Link>
          </div>
          <div className="sidebar-bottom">
            Feito para descobrir.
            <br />
            <span>© 2026 Naxe Live · Sandbox</span>
          </div>
        </aside>
        <main className="main-content">
          {path.startsWith("/live/") ? (
            <Room id={path.split("/")[2]} {...common} />
          ) : path.startsWith("/seller") ? (
            <Seller path={path} {...common} />
          ) : path.startsWith("/minha-conta") ? (
            <Account path={path} {...common} />
          ) : path === "/admin" ? (
            <Admin {...common} />
          ) : path === "/playground" ? (
            <Playground {...common} />
          ) : path.startsWith("/vendedor/") ? (
            <SellerProfile slug={path.split("/")[2]} {...common} />
          ) : path === "/login" || path === "/cadastro" ? (
            <div className="empty">
              <h1>Seu próximo achado começa aqui.</h1>
              <button className="primary" onClick={() => setAuth(true)}>
                Entrar ou criar conta
              </button>
            </div>
          ) : (
            <Marketplace {...common} />
          )}
        </main>
      </div>
      <footer>
        <span className="brand small">
          NAXE<span>LIVE</span>
        </span>
        <span>Encontre. Assista. Arremate.</span>
        <Link href="/playground">
          Conheça o sandbox <ArrowUpRight size={14} />
        </Link>
      </footer>
      {user && (
        <button
          className="logout-float"
          title="Sair"
          onClick={() => {
            void api("/auth/logout", {}).then(() => refetch());
          }}
        >
          <LogOut size={16} />
        </button>
      )}
      {toast && (
        <div role="status" className="toast">
          <Check size={17} />
          {toast}
          <button aria-label="Fechar aviso" onClick={() => setToast("")}>
            <X size={16} />
          </button>
        </div>
      )}
      {auth && (
        <AuthModal
          onClose={() => setAuth(false)}
          onDone={async () => {
            await refetch();
            setAuth(false);
            notify("Você entrou. Escolha seu próximo lance.");
          }}
        />
      )}
    </>
  );
}
export function AuthModal({
  onClose,
  onDone,
}: {
  onClose: () => void;
  onDone: () => Promise<void>;
}) {
  const [register, setRegister] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const f = new FormData(e.currentTarget);
    try {
      await api(
        `/auth/${register ? "register" : "login"}`,
        Object.fromEntries(f),
      );
      await onDone();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-title"
        className="modal"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="modal-close icon-btn"
          onClick={onClose}
          aria-label="Fechar"
        >
          <X />
        </button>
        <span className="eyebrow">BEM-VINDO À NAXE LIVE</span>
        <h2 id="auth-title">
          {register ? "Sua próxima descoberta." : "Bom te ver por aqui."}
        </h2>
        <p className="muted">Assista sem cadastro. Entre para participar.</p>
        <form onSubmit={submit}>
          {register && (
            <label>
              Nome completo
              <input name="name" required minLength={2} autoComplete="name" />
            </label>
          )}
          <label>
            E-mail
            <input name="email" type="email" required autoComplete="email" />
          </label>
          <label>
            Senha
            <input
              name="password"
              type="password"
              required
              minLength={register ? 12 : 1}
              autoComplete={register ? "new-password" : "current-password"}
            />
          </label>
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          <button disabled={busy} className="primary full">
            {busy ? "Conectando…" : register ? "Criar minha conta" : "Entrar"}
          </button>
        </form>
        <button className="text-button" onClick={() => setRegister(!register)}>
          {register
            ? "Já tenho uma conta"
            : "Ainda não tenho conta · Cadastrar"}
        </button>
        <div className="notice">
          Contas locais de teste: comprador.a@naxe.test, comprador.b@naxe.test,
          vendedor@naxe.test ou admin@naxe.test. Senha no README de
          desenvolvimento.
        </div>
      </section>
    </div>
  );
}
function Marketplace({ notify }: Common) {
  const path = usePathname();
  const [category, setCategory] = useState(""),
    [search, setSearch] = useState(""),
    [status, setStatus] = useState("");
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    setSearch(p.get("q") ?? "");
    setStatus(p.get("status") ?? "");
    if (path.startsWith("/categoria/"))
      setCategory(
        (
          {
            beleza: "Beleza",
            moda: "Moda",
            tecnologia: "Tecnologia",
            colecionaveis: "Colecionáveis",
          } as Record<string, string>
        )[decodeURIComponent(path.split("/")[2])] ??
          decodeURIComponent(path.split("/")[2]),
      );
  }, [path]);
  const {
    data: streams,
    isPending,
    error,
    refetch,
  } = useQuery({
    queryKey: ["streams", category, search],
    queryFn: () =>
      api<Stream[]>(
        `/streams?q=${encodeURIComponent(search)}&category=${encodeURIComponent(category)}`,
      ),
    refetchInterval: 10000,
  });
  const shown = streams?.filter((s) => !status || s.status === status);
  const upcoming = streams?.filter((s) => s.status === "SCHEDULED");
  return (
    <>
      <div className="breadcrumb">
        A sua próxima descoberta está aqui <span>✦</span>
      </div>
      <section className="hero">
        <div className="hero-copy">
          <span className="hero-tag">
            <span className="dot" /> AO VIVO. DE VERDADE. ENTRE PESSOAS.
          </span>
          <h1>
            O próximo achado
            <br />
            pode ser <em>seu.</em>
          </h1>
          <p>
            Descubra produtos, conheça quem vende e sinta
            <br className="desktop-only" /> a emoção de cada lance. Tudo
            acontece ao vivo.
          </p>
          <div className="hero-actions">
            <a className="primary" href="#discover">
              Explorar transmissões <ArrowUpRight size={18} />
            </a>
            <Link href="/seller" className="hero-secondary">
              Quero vender <ArrowRight size={17} />
            </Link>
          </div>
          <div className="hero-proof">
            <span className="avatar-stack">
              <i>M</i>
              <i>J</i>
              <i>A</i>
            </span>
            <span>
              Gente que ama encontrar o extraordinário.
              <small>Experimente com contas demonstrativas.</small>
            </span>
          </div>
        </div>
        <div className="hero-art">
          <div className="hero-orbit" />
          <img
            src="/products/perfume.svg"
            alt="Frasco ilustrado de perfume demonstrativo"
          />
          <div className="floating-live">
            <span className="dot" /> NAXE SELECT <b>DEMO</b>
          </div>
          <div className="floating-bid">
            <span className="bid-flash">
              <Flame size={19} />
            </span>
            <div>
              <small>CADA LANCE, UMA POSSIBILIDADE</small>
              <b>Achados que surpreendem.</b>
            </div>
            <ArrowUpRight size={19} />
          </div>
          <span className="hero-edition">
            A EXPERIÊNCIA DE COMPRAR MUDOU. <span>01 / NAXE</span>
          </span>
        </div>
      </section>
      <section id="discover" className="discover">
        <div className="section-title">
          <div>
            <span className="eyebrow">DESCUBRA ALGO NOVO</span>
            <h2>
              <span className="live-icon">
                <Radio size={22} />
              </span>
              Entre na próxima disputa
              <span className="count">{shown?.length ?? "—"}</span>
            </h2>
          </div>
          <button
            className="filter-btn"
            onClick={() => {
              setStatus(status === "SCHEDULED" ? "" : "SCHEDULED");
              notify(
                status
                  ? "Exibindo todas as transmissões."
                  : "Exibindo próximas transmissões.",
              );
            }}
          >
            <SlidersHorizontal size={16} />
            {status === "SCHEDULED" ? "Todas" : "Agenda"}
          </button>
        </div>
        <div className="categories">
          {[
            ["", "Tudo para explorar"],
            ["Beleza", "Beleza & cuidados"],
            ["Moda", "Moda & acessórios"],
            ["Tecnologia", "Tecnologia"],
            ["Colecionáveis", "Colecionáveis"],
          ].map(([value, label]) => (
            <button
              key={value}
              className={category === value ? "chosen" : ""}
              onClick={() => setCategory(value)}
            >
              {label}
            </button>
          ))}
        </div>
        {isPending ? (
          <div className="cards">
            {[1, 2, 3, 4].map((n) => (
              <div className="skeleton" key={n} />
            ))}
          </div>
        ) : error ? (
          <div className="empty error">
            <h3>Não conseguimos carregar as lives.</h3>
            <p>Verifique se o backend está disponível.</p>
            <button className="secondary" onClick={() => void refetch()}>
              Tentar novamente
            </button>
          </div>
        ) : !shown?.length ? (
          <div className="empty">
            <Search size={30} />
            <h3>Nenhuma transmissão encontrada.</h3>
            <button
              className="secondary"
              onClick={() => {
                setCategory("");
                setSearch("");
                setStatus("");
              }}
            >
              Limpar filtros
            </button>
          </div>
        ) : (
          <div className="cards">
            {shown.map((s) => (
              <StreamCard key={s.id} stream={s} />
            ))}
          </div>
        )}
      </section>
      <div className="trust-strip">
        <span>
          <ShieldCheck size={19} />
          <b>Dispute com transparência</b>
          <small>Valores e condições antes do lance</small>
        </span>
        <span>
          <Radio size={19} />
          <b>Conexões em tempo real</b>
          <small>Lances sincronizados pelo servidor</small>
        </span>
        <span>
          <Heart size={19} />
          <b>Encontre o que é a sua cara</b>
          <small>Produtos e vendedores para descobrir</small>
        </span>
      </div>
      {!!upcoming?.length && (
        <section className="upcoming">
          <div className="section-title">
            <h2>
              Marque na sua agenda <CalendarDays size={20} />
            </h2>
            <span className="muted">Horário de Brasília</span>
          </div>
          {upcoming.map((s) => (
            <Link href={`/live/${s.id}`} key={s.id} className="schedule-row">
              <img
                src={`/products/${s.lots[0]?.product.artwork ?? "perfume"}.svg`}
                alt=""
              />
              <div>
                <small>{s.category}</small>
                <h3>{s.title}</h3>
                <p>{s.seller.displayName} · Demonstração</p>
              </div>
              <time>
                {s.scheduledAt
                  ? new Intl.DateTimeFormat("pt-BR", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                      timeZone: "America/Sao_Paulo",
                    }).format(new Date(s.scheduledAt))
                  : "Em breve"}
              </time>
              <ArrowUpRight size={20} />
            </Link>
          ))}
        </section>
      )}
    </>
  );
}
export function StreamCard({ stream: s }: { stream: Stream }) {
  const product =
    s.lots.find((l) => l.status === "LIVE")?.product ?? s.lots[0]?.product;
  return (
    <Link className="stream-card" href={`/live/${s.id}`}>
      <div className={`card-art art-${product?.artwork ?? "perfume"}`}>
        <img
          src={`/products/${product?.artwork ?? "perfume"}.svg`}
          alt={product?.name ?? "Transmissão demonstrativa"}
        />
        <div className="card-badges">
          <span className={s.status === "LIVE" ? "live-badge" : "demo-badge"}>
            {s.status === "LIVE" ? (
              <>● AO VIVO</>
            ) : s.status === "SCHEDULED" ? (
              "◷ AGENDADA"
            ) : s.status === "ENDED" ? (
              "ENCERRADA"
            ) : (
              "SALA DEMO"
            )}
          </span>
          <span className="viewer-badge">
            <UserRound size={11} />
            {s.viewers ?? 0}
          </span>
        </div>
        <span className="card-category">{s.category}</span>
        <span className="enter-arrow">
          <ArrowUpRight size={20} />
        </span>
      </div>
      <div className="card-info">
        <div className="seller-line">
          <span className="seller-avatar">{s.seller.displayName[0]}</span>
          {s.seller.displayName}
          <ShieldCheck size={13} />
          <span>DEMO</span>
        </div>
        <h3>{s.title}</h3>
        <div className="card-foot">
          <span>{product?.name ?? "Novos lotes em breve"}</span>
          <ChevronRight size={15} />
        </div>
      </div>
    </Link>
  );
}
function SellerProfile({ slug, ...common }: Common & { slug: string }) {
  const { data, error } = useQuery({
    queryKey: ["seller", slug],
    queryFn: () =>
      api<{
        id: string;
        displayName: string;
        verified: boolean;
        _count: { followers: number };
        streams: Stream[];
      }>(`/sellers/${slug}`),
  });
  return (
    <>
      <span className="eyebrow">CONHEÇA QUEM VENDE</span>
      <h1>{data?.displayName ?? "Perfil do vendedor"}</h1>
      {error && <p className="error">{error.message}</p>}
      <p className="muted">
        Vendedor demonstrativo · {data?._count.followers ?? 0} seguidores
      </p>
      <button
        className="primary"
        onClick={() => {
          if (!common.user) return common.login();
          void api<{ following: boolean }>(`/sellers/${data?.id}/follow`, {})
            .then((d) =>
              common.notify(
                d.following
                  ? "Você está seguindo este vendedor."
                  : "Você deixou de seguir.",
              ),
            )
            .catch((e) => common.notify(e.message));
        }}
      >
        <Heart size={17} />
        Seguir vendedor
      </button>
      <div className="simple-list">
        {data?.streams.map((s) => (
          <Link className="panel" key={s.id} href={`/live/${s.id}`}>
            {s.title}
            <ArrowRight size={18} />
          </Link>
        ))}
      </div>
    </>
  );
}

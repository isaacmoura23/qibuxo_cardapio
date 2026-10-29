import { useCallback, useEffect, useState, type FormEvent } from "react";
import { BookOpen, ExternalLink, Loader2, LogOut, Receipt, Settings as SettingsIcon, Store, UserRound } from "lucide-react";
import { api, ApiError } from "./api";
import { DraftProvider, useDraft } from "./draft";
import { AccountPage } from "./pages/Account";
import { CatalogPage } from "./pages/CatalogPage";
import { OrdersPage, useOrdersFeed } from "./pages/Orders";
import { SettingsPage } from "./pages/SettingsPage";
import { ToastProvider, useToast } from "./ui";

type Auth = "checking" | "out" | "in";

export function AdminApp() {
  return (
    <ToastProvider>
      <Gate />
    </ToastProvider>
  );
}

function Gate() {
  const [auth, setAuth] = useState<Auth>("checking");
  useEffect(() => {
    api
      .me()
      .then(() => setAuth("in"))
      .catch(() => setAuth("out"));
  }, []);
  const expire = useCallback(() => setAuth("out"), []);
  if (auth === "checking") return <div className="acenter">Carregando…</div>;
  if (auth === "out") return <Login onDone={() => setAuth("in")} />;
  return (
    <DraftProvider onExpired={expire}>
      <Shell onLogout={() => setAuth("out")} onExpired={expire} />
    </DraftProvider>
  );
}

function Login({ onDone }: { onDone: () => void }) {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setErr("");
    try {
      await api.login(pw);
      onDone();
    } catch (x) {
      setErr(x instanceof Error ? x.message : "Não foi possível entrar.");
      setBusy(false);
    }
  };
  return (
    <main className="alogin">
      <form className="alogin__card" onSubmit={submit}>
        <img src="/img/marca-logo.webp" alt="" width={88} />
        <h1 className="adisplay">Painel Qi Buxo</h1>
        <p className="afield__hint">Acesso restrito ao dono da loja.</p>
        <div className="afield">
          <label className="afield__label" htmlFor="pw">
            Senha
          </label>
          <input id="pw" className="ainput" type="password" autoComplete="current-password" autoFocus value={pw} onChange={(e) => setPw(e.target.value)} aria-invalid={!!err} aria-describedby={err ? "pw-err" : undefined} />
        </div>
        {err && (
          <p id="pw-err" className="aerror" role="alert">
            {err}
          </p>
        )}
        <button type="submit" className="abtn abtn--primary abtn--block" disabled={busy || !pw}>
          {busy && <Loader2 size={18} className="spin" aria-hidden="true" />} Entrar
        </button>
      </form>
    </main>
  );
}

const PAGES = [
  { id: "pedidos", label: "Pedidos", icon: Receipt },
  { id: "catalogo", label: "Catálogo", icon: BookOpen },
  { id: "loja", label: "Loja", icon: Store },
  { id: "conta", label: "Conta", icon: UserRound },
] as const;
type PageId = (typeof PAGES)[number]["id"];

const readPage = (): PageId => {
  const h = location.hash.replace(/^#\/?/, "").split("/")[0];
  return (PAGES.find((p) => p.id === h)?.id ?? "pedidos") as PageId;
};

function Shell({ onLogout, onExpired }: { onLogout: () => void; onExpired: () => void }) {
  const toast = useToast();
  const { dirty, saving, save, discard, seeded } = useDraft();
  const [page, setPage] = useState<PageId>(readPage);
  const feed = useOrdersFeed(onExpired);

  useEffect(() => {
    const h = () => setPage(readPage());
    window.addEventListener("hashchange", h);
    return () => window.removeEventListener("hashchange", h);
  }, []);

  useEffect(() => {
    document.title = feed.newCount > 0 ? `(${feed.newCount}) Painel Qi Buxo` : "Painel Qi Buxo";
  }, [feed.newCount]);

  const go = (p: PageId) => {
    location.hash = `#/${p}`;
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch (e) {
      if (!(e instanceof ApiError)) toast("Não foi possível sair.", "error");
    }
    onLogout();
  };

  return (
    <div className="ashell">
      <header className="atop">
        <div className="atop__brand">
          <img src="/img/marca-logo.webp" alt="" width={34} />
          <span className="adisplay">Qi Buxo</span>
          <span className="atop__tag">Painel</span>
        </div>
        <nav className="atabs" aria-label="Seções do painel">
          {PAGES.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" className={`atab${page === id ? " is-on" : ""}`} aria-current={page === id ? "page" : undefined} onClick={() => go(id)}>
              <Icon size={20} aria-hidden="true" />
              <span>{label}</span>
              {id === "pedidos" && feed.newCount > 0 && <span className="abadge">{feed.newCount}</span>}
              {id === "catalogo" && dirty && <span className="adot" aria-label="Alterações não publicadas" />}
            </button>
          ))}
        </nav>
        <div className="atop__right">
          <a className="abtn abtn--ghost abtn--sm" href="/" target="_blank" rel="noopener noreferrer">
            <ExternalLink size={16} aria-hidden="true" /> Ver site
          </a>
          <button type="button" className="abtn abtn--ghost abtn--sm" onClick={() => void logout()}>
            <LogOut size={16} aria-hidden="true" /> Sair
          </button>
        </div>
      </header>

      <main className="amain">
        {page === "pedidos" && <OrdersPage feed={feed} onExpired={onExpired} />}
        {page === "catalogo" && <CatalogPage />}
        {page === "loja" && <SettingsPage />}
        {page === "conta" && <AccountPage onLogout={onLogout} />}
      </main>

      {dirty && (
        <div className="asave" role="region" aria-label="Publicar alterações">
          <div className="asave__text">
            <SettingsIcon size={18} aria-hidden="true" />
            <span>{seeded ? "Catálogo inicial ainda não publicado." : "Você tem alterações não publicadas."}</span>
          </div>
          <div className="asave__btns">
            {!seeded && (
              <button type="button" className="abtn abtn--ghost" onClick={discard} disabled={saving}>
                Descartar
              </button>
            )}
            <button type="button" className="abtn abtn--primary" onClick={() => void save()} disabled={saving}>
              {saving && <Loader2 size={18} className="spin" aria-hidden="true" />} Publicar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

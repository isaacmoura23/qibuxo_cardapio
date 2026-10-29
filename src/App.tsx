import { useEffect, useMemo, useRef, useState } from "react";
import { AtSign, MapPin, MessageCircle, Search, ShoppingBag, X } from "lucide-react";
import { useCart } from "./cart";
import { useData } from "./data/context";
import { money, normalize } from "./format";
import { Heart } from "./components/Art";
import { CartSheet } from "./components/CartSheet";
import { StatusPill, StoreInfo } from "./components/StoreInfo";
import { DetailProvider } from "./detail";
import { phoneDisplay } from "./store";
import { KitCard, LadderCard, ProductCard } from "./components/ProductCard";
import type { Category, Product } from "./types";

const cardFor = (p: Product) =>
  p.includes ? (
    <KitCard key={p.id} product={p} />
  ) : p.art ? (
    <LadderCard key={p.id} product={p} />
  ) : (
    <ProductCard key={p.id} product={p} />
  );

const asset = (p: string) => `${import.meta.env.BASE_URL}img/${p}`;

function Section({ cat }: { cat: Category }) {
  const isKits = cat.id === "kits";
  return (
    <section id={cat.id} className="cat" aria-labelledby={`${cat.id}-h`}>
      <header className="cat__head">
        <h2 id={`${cat.id}-h`} className="display cat__title">
          {cat.name}
        </h2>
        <p className="cat__blurb">{cat.blurb}</p>
      </header>

      {cat.notice && (
        <aside className="notice">
          <p className="notice__title">{cat.notice.title}</p>
          <p className="notice__text">{cat.notice.text}</p>
          {cat.notice.items && (
            <ul className="notice__items">
              {cat.notice.items.map((i) => (
                <li key={i}>
                  <Heart size={13} />
                  {i}
                </li>
              ))}
            </ul>
          )}
        </aside>
      )}

      {cat.groups.map((g, gi) => (
        <div className="group" key={g.title ?? gi}>
          {g.title && (
            <h3 className="group__title">
              <span>{g.title}</span>
            </h3>
          )}
          {g.note && <p className="group__note">{g.note}</p>}
          <div className={isKits ? "grid grid--kits" : "grid"}>
            {g.products.map(cardFor)}
          </div>
        </div>
      ))}
    </section>
  );
}

export default function App() {
  const { count, total } = useCart();
  const { cats, settings } = useData();
  const {
    whatsapp: WHATSAPP_NUMBER,
    instagram: INSTAGRAM_HANDLE,
    city: CITY,
    address: ADDRESS,
    deliveryFee: DELIVERY_FEE,
  } = settings;
  const [cartOpen, setCartOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(cats[0]?.id ?? "");
  const navRef = useRef<HTMLElement>(null);
  const tabRefs = useRef(new Map<string, HTMLButtonElement>());
  const searching = query.trim().length > 0;

  const results = useMemo<Product[]>(() => {
    const q = normalize(query.trim());
    if (!q) return [];
    return cats.flatMap((c) =>
      c.groups.flatMap((g) =>
        g.products.filter((p) => normalize(`${p.name} ${p.description ?? ""} ${c.name} ${(p.includes ?? []).join(" ")}`).includes(q)),
      ),
    );
  }, [query, cats]);

  useEffect(() => {
    if (searching) return;
    let raf = 0;
    const calc = () => {
      let cur = cats[0]?.id ?? "";
      for (const c of [...cats, { id: "loja" }]) {
        const el = document.getElementById(c.id);
        if (el && el.getBoundingClientRect().top <= 190) cur = c.id;
      }
      setActive(cur);
    };
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(calc);
    };
    calc();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
    };
  }, [searching, cats]);

  useEffect(() => {
    const nav = navRef.current;
    const tab = tabRefs.current.get(active);
    if (!nav || !tab) return;
    const left = tab.offsetLeft - (nav.clientWidth - tab.clientWidth) / 2;
    nav.scrollTo({ left, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }, [active]);

  const go = (id: string) => {
    setQuery("");
    setActive(id);
    requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({
        behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
        block: "start",
      });
    });
  };

  const waHref = WHATSAPP_NUMBER ? `https://wa.me/${WHATSAPP_NUMBER}` : undefined;

  return (
    <DetailProvider onReturn={() => setCartOpen(true)}>
      <a href="#catalogo" className="skip">
        Ir para o catálogo
      </a>

      {settings.banner.on && settings.banner.text && (
        <div className="notice-bar" role="status">
          {settings.banner.text}
        </div>
      )}

      <header className="top">
        <a className="brand" href="#topo" aria-label="Qi Buxo, início">
          <img src={asset("marca-logo.webp")} alt="" width={40} height={52} />
          <span className="brand__name display">Qi Buxo</span>
        </a>
        <button type="button" className="cartbtn" onClick={() => setCartOpen(true)} aria-label={`Abrir pedido, ${count} itens, ${money(total)}`}>
          <ShoppingBag size={20} aria-hidden="true" />
          <span className="cartbtn__label">Pedido</span>
          {count > 0 && (
            <span className="cartbtn__count" key={count}>
              {count}
            </span>
          )}
        </button>
      </header>

      <div className="intro" id="topo">
        <div className="intro__in">
          <div className="intro__text">
            <h1 className="display intro__title">Catálogo</h1>
            <p className="intro__lead">Bolos, doces, tortas e salgados feitos com um toque muito especial de amor.</p>
          </div>
          <img className="intro__logo" src={asset("marca-logo.webp")} alt="Qi Buxo, confeitaria" width={180} height={236} />
        </div>
        <div className="intro__info">
          <StatusPill />
          {settings.deliveryEnabled ? (
            <span className="chip-info">Entrega {money(DELIVERY_FEE)}</span>
          ) : (
            <span className="chip-info">Somente retirada</span>
          )}
          {waHref && (
            <a className="wa-card" href={waHref} target="_blank" rel="noopener noreferrer">
              <MessageCircle size={20} aria-hidden="true" />
              <span className="wa-card__label">WhatsApp</span>
              <span className="wa-card__num">{phoneDisplay(WHATSAPP_NUMBER)}</span>
            </a>
          )}
        </div>
        <form className="search" role="search" onSubmit={(e) => e.preventDefault()}>
          <Search size={20} aria-hidden="true" />
          <label htmlFor="q" className="sr-only">
            Buscar no catálogo
          </label>
          <input
            id="q"
            type="search"
            inputMode="search"
            autoComplete="off"
            placeholder="Buscar: torta, ninho, vulcão…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button type="button" className="search__clear" onClick={() => setQuery("")} aria-label="Limpar busca">
              <X size={18} />
            </button>
          )}
        </form>
      </div>

      <nav className="tabs" aria-label="Categorias" ref={navRef}>
        {[...cats.map((c) => ({ id: c.id, name: c.name })), { id: "loja", name: "Sobre a loja" }].map((c) => (
          <button
            key={c.id}
            type="button"
            ref={(el) => {
              if (el) tabRefs.current.set(c.id, el);
            }}
            className={`tab${!searching && active === c.id ? " is-on" : ""}`}
            aria-current={!searching && active === c.id ? "true" : undefined}
            onClick={() => go(c.id)}
          >
            {c.name}
          </button>
        ))}
      </nav>

      <main id="catalogo" className="wrap">
        {searching ? (
          <section className="cat" aria-live="polite">
            <header className="cat__head">
              <h2 className="display cat__title">Resultados</h2>
              <p className="cat__blurb">
                {results.length === 0
                  ? `Nada encontrado para “${query.trim()}”. Tente “bolo”, “torta” ou “doce”.`
                  : `${results.length} ${results.length === 1 ? "produto" : "produtos"} para “${query.trim()}”.`}
              </p>
            </header>
            {results.length > 0 && (
              <div className="grid">
                {results.map(cardFor)}
              </div>
            )}
            <button type="button" className="btn btn--ghost" onClick={() => setQuery("")}>
              Voltar ao catálogo
            </button>
          </section>
        ) : (
          <>
            {cats.map((c) => <Section key={c.id} cat={c} />)}
            <StoreInfo />
          </>
        )}
      </main>

      <footer className="foot">
        <div className="foot__in">
          <img className="foot__photo" src={asset("marca-dono.webp")} alt="Foto com o mascote da Qi Buxo" width={150} height={200} loading="lazy" />
          <div className="foot__text">
            <p className="display foot__title">Qi Buxo</p>
            <p>Todos os nossos doces são feitos com produtos de alta qualidade, e um toque muito especial de amor.</p>
            <ul className="foot__links">
              {waHref && (
                <li>
                  <a href={waHref} target="_blank" rel="noopener noreferrer">
                    <MessageCircle size={18} aria-hidden="true" /> WhatsApp
                  </a>
                </li>
              )}
              {INSTAGRAM_HANDLE && (
                <li>
                  <a href={`https://www.instagram.com/${INSTAGRAM_HANDLE}/`} target="_blank" rel="noopener noreferrer">
                    <AtSign size={18} aria-hidden="true" /> @{INSTAGRAM_HANDLE}
                  </a>
                </li>
              )}
              {CITY && (
                <li>
                  <span>
                    <MapPin size={18} aria-hidden="true" /> {CITY}
                  </span>
                </li>
              )}
            </ul>
            <p className="foot__hint">{ADDRESS}</p>
            <p className="foot__hint">Fotos ilustrativas.</p>
          </div>
        </div>
      </footer>

      {count > 0 && !cartOpen && (
        <button type="button" className="bar" onClick={() => setCartOpen(true)}>
          <span className="bar__count">{count}</span>
          <span className="bar__label">Ver pedido</span>
          <span className="bar__total">{money(total)}</span>
        </button>
      )}

      <CartSheet open={cartOpen} onClose={() => setCartOpen(false)} />
    </DetailProvider>
  );
}

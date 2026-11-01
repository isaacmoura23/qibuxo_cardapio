import { useEffect, useId, useRef, useState } from "react";
import { Check, ListPlus, Plus } from "lucide-react";
import { useCart } from "../cart";
import { isAvailable, visibleGroups } from "../data/model";
import { useDetail } from "../detail";
import { money } from "../format";
import type { Product } from "../types";
import { Heart, ProductMedia, TierCake } from "./Art";

function useAdded() {
  const [added, setAdded] = useState(false);
  const timer = useRef<number>(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const flash = () => {
    setAdded(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setAdded(false), 1400);
  };
  return [added, flash] as const;
}

/** Adiciona direto, ou abre a folha de escolhas quando o produto tem sabores/extras. */
function useBuy(product: Product) {
  const { addLine } = useCart();
  const detail = useDetail();
  const [added, flash] = useAdded();
  const soldOut = !isAvailable(product);
  const needsSheet = (optionId: string) => visibleGroups(product, optionId).length > 0;
  const buy = (optionId: string) => {
    if (soldOut) return;
    if (needsSheet(optionId)) {
      detail.open(product.id, optionId);
      return;
    }
    addLine({ productId: product.id, optionId, picks: [], qty: 1, note: "" });
    flash();
  };
  return { buy, added, needsSheet, soldOut };
}

function AddButton({
  added,
  onClick,
  label,
  choose,
  soldOut,
}: {
  added: boolean;
  onClick: () => void;
  label: string;
  choose: boolean;
  soldOut?: boolean;
}) {
  if (soldOut) {
    return (
      <span className="soldout" role="status">
        Esgotado
      </span>
    );
  }
  return (
    <button type="button" className={`add${added ? " is-added" : ""}`} onClick={onClick} aria-label={label}>
      <span className="add__icon" aria-hidden="true">
        {added ? <Check size={18} strokeWidth={3} /> : choose ? <ListPlus size={18} strokeWidth={3} /> : <Plus size={18} strokeWidth={3} />}
      </span>
      <span>{added ? "No pedido" : choose ? "Escolher" : "Adicionar"}</span>
    </button>
  );
}

export function ProductCard({ product }: { product: Product }) {
  const [sel, setSel] = useState(0);
  const { buy, added, needsSheet, soldOut } = useBuy(product);
  const labelId = useId();
  const option = product.options[sel] ?? product.options[0]!;
  const multi = product.options.length > 1;
  const choose = needsSheet(option.id);

  return (
    <article className={`card${multi ? "" : " card--single"}${soldOut ? " is-soldout" : ""}`}>
      <div className={`card__media${product.art ? " card__media--art" : ""}`}>
        <ProductMedia product={product} image={option.image} />
      </div>
      <div className="card__head">
        <h3 className="card__name">{product.name}</h3>
        {product.description && <p className="card__desc">{product.description}</p>}
        {product.badge && <p className="badge">{product.badge}</p>}
      </div>

      {multi && (
        <div className="card__opts">
          <p className="card__optlabel" id={labelId}>
            {product.optionLabel ?? "Opção"}
          </p>
          <div className={`chips${product.options.length === 4 ? " chips--4" : ""}`} role="radiogroup" aria-labelledby={labelId}>
            {product.options.map((o, i) => (
              <button
                key={o.id}
                type="button"
                role="radio"
                aria-checked={i === sel}
                className={`chip${i === sel ? " is-on" : ""}`}
                onClick={() => setSel(i)}
              >
                <span className="chip__label">{o.label}</span>
                {o.detail && <span className="chip__detail">{o.detail}</span>}
                <span className="chip__price">{money(o.price)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="card__buy">
        <div className="price">
          <span className="price__value">{money(option.price)}</span>
          {!multi && <span className="price__unit">{[option.label, option.detail].filter(Boolean).join(" · ")}</span>}
        </div>
        <AddButton
          added={added}
          choose={choose}
          soldOut={soldOut}
          onClick={() => buy(option.id)}
          label={`${choose ? "Escolher opções e adicionar" : "Adicionar"} ${product.name}${multi ? `, ${option.label}` : ""} ao pedido`}
        />
        <span className="sr-only" aria-live="polite">
          {added ? `${product.name} adicionado ao pedido` : ""}
        </span>
      </div>
    </article>
  );
}

export function KitCard({ product }: { product: Product }) {
  const { buy, added, needsSheet, soldOut } = useBuy(product);
  const option = product.options[0]!;
  const choose = needsSheet(option.id);
  return (
    <article className={`kit${soldOut ? " is-soldout" : ""}`}>
      <h3 className="kit__name">{product.name}</h3>
      <ul className="kit__list">
        {product.includes?.map((it) => (
          <li key={it}>
            <Heart size={14} />
            <span>{it}</span>
          </li>
        ))}
      </ul>
      {product.fine && <p className="kit__fine">{product.fine}</p>}
      <div className="kit__buy">
        <span className="kit__price">{money(option.price)}</span>
        <AddButton
          added={added}
          choose={choose}
          soldOut={soldOut}
          onClick={() => buy(option.id)}
          label={`${choose ? "Escolher extras e adicionar" : "Adicionar"} ${product.name} ao pedido`}
        />
        <span className="sr-only" aria-live="polite">
          {added ? `${product.name} adicionado ao pedido` : ""}
        </span>
      </div>
    </article>
  );
}

/** Escada de tamanhos: um produto, várias linhas com preço, sem foto. */
export function LadderCard({ product }: { product: Product }) {
  const { buy, added, soldOut } = useBuy(product);
  const [flashed, setFlashed] = useState<string | null>(null);
  const art = product.art!;
  return (
    <article className={`ladder${soldOut ? " is-soldout" : ""}`}>
      <header className="ladder__head">
        <div className="ladder__art" aria-hidden="true">
          <TierCake tiers={art.tiers} square={art.square} />
        </div>
        <div>
          <h3 className="ladder__name">{product.name}</h3>
          {product.fine && <p className="ladder__fine">{product.fine}</p>}
          {soldOut && <p className="soldout soldout--inline">Esgotado</p>}
        </div>
      </header>
      <ul className="ladder__rows">
        {product.options.map((o) => {
          const done = added && flashed === o.id;
          return (
            <li key={o.id} className="ladder__row">
              <div className="ladder__what">
                <span className="ladder__label">{o.label}</span>
                {o.detail && <span className="ladder__detail">{o.detail}</span>}
              </div>
              <span className="ladder__price">{money(o.price)}</span>
              <button
                type="button"
                disabled={soldOut}
                className={`ladder__add${done ? " is-added" : ""}`}
                aria-label={`Escolher extras e adicionar ${product.name}, ${o.label}, ${money(o.price)}, ao pedido`}
                onClick={() => {
                  setFlashed(o.id);
                  buy(o.id);
                }}
              >
                {done ? <Check size={20} strokeWidth={3} /> : <Plus size={20} strokeWidth={3} />}
              </button>
            </li>
          );
        })}
      </ul>
      <span className="sr-only" aria-live="polite">
        {added ? `${product.name} adicionado ao pedido` : ""}
      </span>
    </article>
  );
}

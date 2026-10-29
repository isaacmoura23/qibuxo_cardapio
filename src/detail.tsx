import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Minus, Plus, X } from "lucide-react";
import { useCart } from "./cart";
import { useData } from "./data/context";
import { picksKey, visibleGroups } from "./data/model";
import { money } from "./format";
import type { ChoiceGroup } from "./types";

export interface EditSeed {
  key: string;
  picks: string[];
  qty: number;
  note: string;
}

interface Api {
  open: (productId: string, optionId?: string, edit?: EditSeed) => void;
}

const Ctx = createContext<Api | null>(null);

interface Target {
  productId: string;
  optionId?: string;
  edit?: EditSeed;
  n: number;
}

export function DetailProvider({ children, onReturn }: { children: ReactNode; onReturn: () => void }) {
  const [target, setTarget] = useState<Target | null>(null);
  const counter = useRef(0);

  const open = useCallback<Api["open"]>((productId, optionId, edit) => {
    counter.current += 1;
    setTarget({ productId, optionId, edit, n: counter.current });
  }, []);

  const api = useMemo(() => ({ open }), [open]);

  const close = () => {
    const hadEdit = !!target?.edit;
    setTarget(null);
    if (hadEdit) onReturn();
  };

  return (
    <Ctx.Provider value={api}>
      {children}
      {target && <ProductSheet key={target.n} target={target} onClose={close} />}
    </Ctx.Provider>
  );
}

export function useDetail(): Api {
  const v = useContext(Ctx);
  if (!v) throw new Error("useDetail fora do DetailProvider");
  return v;
}

function PickRow(props: {
  type: "radio" | "checkbox";
  name: string;
  checked: boolean;
  onChange: () => void;
  label: string;
  detail?: string;
  right: string;
}) {
  return (
    <label className={`pick${props.checked ? " is-on" : ""}`}>
      <input type={props.type} name={props.name} checked={props.checked} onChange={props.onChange} />
      <span className={`pick__mark pick__mark--${props.type}`} aria-hidden="true" />
      <span className="pick__text">
        <span className="pick__label">{props.label}</span>
        {props.detail && <span className="pick__detail">{props.detail}</span>}
      </span>
      <span className="pick__price">{props.right}</span>
    </label>
  );
}

function ProductSheet({ target, onClose }: { target: Target; onClose: () => void }) {
  const { index } = useData();
  const product = index.productIndex.get(target.productId)!;
  const { addLine, replace } = useCart();
  const ref = useRef<HTMLDialogElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const uid = useId();

  const [optionId, setOptionId] = useState(target.edit ? optionFromKey(target.edit.key) : (target.optionId ?? product.options[0]!.id));
  const [picks, setPicks] = useState<string[]>(target.edit?.picks ?? []);
  const [qty, setQty] = useState(target.edit?.qty ?? 1);
  const [note, setNote] = useState(target.edit?.note ?? "");
  const [tried, setTried] = useState(false);

  useEffect(() => {
    if (ref.current && !ref.current.open) ref.current.showModal();
    titleRef.current?.focus();
  }, []);

  const option = product.options.find((o) => o.id === optionId) ?? product.options[0]!;
  const groups = visibleGroups(product, option.id);
  const visibleKeys = useMemo(
    () => new Set(groups.flatMap((g) => g.choices.map((c) => picksKey(g.id, c.id)))),
    [groups],
  );
  const active = picks.filter((k) => visibleKeys.has(k));

  const countIn = (g: ChoiceGroup) => g.choices.filter((c) => active.includes(picksKey(g.id, c.id))).length;
  const missing = groups.filter((g) => g.required && countIn(g) === 0);

  const extrasTotal = groups.reduce(
    (n, g) => n + g.choices.reduce((m, c) => (active.includes(picksKey(g.id, c.id)) ? m + (c.price ?? 0) : m), 0),
    0,
  );
  const unit = option.price + extrasTotal;

  const toggle = (g: ChoiceGroup, choiceId: string) => {
    const k = picksKey(g.id, choiceId);
    setPicks((cur) => {
      const clean = cur.filter((x) => visibleKeys.has(x));
      if (g.multiple) return clean.includes(k) ? clean.filter((x) => x !== k) : [...clean, k];
      const others = g.choices.map((c) => picksKey(g.id, c.id));
      return [...clean.filter((x) => !others.includes(x)), k];
    });
  };

  const submit = () => {
    if (missing.length > 0) {
      setTried(true);
      document.getElementById(`${uid}-g-${missing[0]!.id}`)?.scrollIntoView({ block: "center", behavior: "smooth" });
      return;
    }
    const line = { productId: product.id, optionId: option.id, picks: active, qty, note: note.trim() };
    if (target.edit) replace(target.edit.key, line);
    else addLine(line);
    onClose();
  };

  return (
    <dialog
      ref={ref}
      className="sheet sheet--product"
      aria-labelledby={`${uid}-title`}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) ref.current?.close();
      }}
    >
      <div className="sheet__panel">
        <header className="sheet__head">
          <h2 id={`${uid}-title`} className="sheet__title sheet__title--sm" ref={titleRef} tabIndex={-1}>
            {product.name}
          </h2>
          <button type="button" className="icon-btn" onClick={() => ref.current?.close()} aria-label="Fechar">
            <X size={22} />
          </button>
        </header>

        <div className="sheet__body psheet">
          {(option.image ?? product.image) && (
            <img className="psheet__img" src={option.image ?? product.image} alt="" />
          )}
          {product.description && <p className="psheet__desc">{product.description}</p>}
          {product.includes && (
            <ul className="psheet__includes">
              {product.includes.map((i) => (
                <li key={i}>{i}</li>
              ))}
            </ul>
          )}

          {product.options.length > 1 && (
            <fieldset className="pgroup">
              <legend className="pgroup__title">
                {product.optionLabel ?? "Tamanho"} <span className="pgroup__tag">Escolha 1</span>
              </legend>
              {product.options.map((o) => (
                <PickRow
                  key={o.id}
                  type="radio"
                  name={`${uid}-opt`}
                  checked={o.id === option.id}
                  onChange={() => setOptionId(o.id)}
                  label={o.label}
                  detail={o.detail}
                  right={money(o.price)}
                />
              ))}
            </fieldset>
          )}

          {groups.map((g) => {
            const err = tried && g.required && countIn(g) === 0;
            return (
              <fieldset className={`pgroup${err ? " has-error" : ""}`} key={g.id} id={`${uid}-g-${g.id}`}>
                <legend className="pgroup__title">
                  {g.title}{" "}
                  <span className={`pgroup__tag${g.required ? " is-req" : ""}`}>
                    {g.required ? (g.multiple ? "Obrigatório, escolha 1 ou mais" : "Obrigatório") : "Opcional"}
                  </span>
                </legend>
                {g.hint && <p className="pgroup__hint">{g.hint}</p>}
                {err && (
                  <p className="pgroup__error" role="alert">
                    Escolha pelo menos uma opção.
                  </p>
                )}
                {g.choices.map((c) => (
                  <PickRow
                    key={c.id}
                    type={g.multiple ? "checkbox" : "radio"}
                    name={`${uid}-${g.id}`}
                    checked={active.includes(picksKey(g.id, c.id))}
                    onChange={() => toggle(g, c.id)}
                    label={c.label}
                    right={c.price ? `+ ${money(c.price)}` : g.required ? "" : "Incluso"}
                  />
                ))}
              </fieldset>
            );
          })}

          <div className="pgroup">
            <label className="pgroup__title" htmlFor={`${uid}-note`}>
              Recado <span className="pgroup__tag">Opcional</span>
            </label>
            <input
              id={`${uid}-note`}
              className="field"
              type="text"
              maxLength={140}
              placeholder={product.notePlaceholder ?? "Alguma observação?"}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </div>

        <footer className="sheet__foot psheet__foot">
          <div className="stepper" role="group" aria-label="Quantidade">
            <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Diminuir quantidade">
              <Minus size={16} strokeWidth={3} />
            </button>
            <output aria-live="polite">{qty}</output>
            <button type="button" onClick={() => setQty((q) => Math.min(99, q + 1))} aria-label="Aumentar quantidade">
              <Plus size={16} strokeWidth={3} />
            </button>
          </div>
          <button type="button" className="btn btn--add" onClick={submit}>
            <span>{target.edit ? "Salvar" : "Adicionar"}</span>
            <span className="btn__sum">{money(unit * qty)}</span>
          </button>
        </footer>
      </div>
    </dialog>
  );
}

function optionFromKey(key: string): string {
  return key.split("::")[1] ?? "";
}

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";
import { useData } from "./data/context";
import { isAvailable, picksKey, resolvePicks, type Index, type ResolvedPick } from "./data/model";
import type { CartLine, Option, Product } from "./types";

const STORE = "qibuxo-cart-v2";
const MAX_QTY = 99;

export interface NewLine {
  productId: string;
  optionId: string;
  picks: string[];
  qty: number;
  note: string;
}

type Action =
  | { t: "addLine"; line: NewLine }
  | { t: "replace"; oldKey: string; line: NewLine }
  | { t: "qty"; key: string; delta: number }
  | { t: "note"; key: string; note: string }
  | { t: "remove"; key: string }
  | { t: "clear" };

export const lineKey = (productId: string, optionId: string, picks: string[]) =>
  `${productId}::${optionId}::${[...picks].sort().join("|")}`;

function addLine(state: CartLine[], n: NewLine): CartLine[] {
  const key = lineKey(n.productId, n.optionId, n.picks);
  const found = state.find((l) => l.key === key);
  if (found) {
    return state.map((l) =>
      l.key === key ? { ...l, qty: Math.min(MAX_QTY, l.qty + n.qty), note: l.note || n.note } : l,
    );
  }
  return [
    ...state,
    { key, productId: n.productId, optionId: n.optionId, picks: [...n.picks], qty: Math.min(MAX_QTY, n.qty), note: n.note },
  ];
}

function reducer(state: CartLine[], a: Action): CartLine[] {
  switch (a.t) {
    case "addLine":
      return addLine(state, a.line);
    case "replace":
      return addLine(
        state.filter((l) => l.key !== a.oldKey),
        a.line,
      );
    case "qty":
      return state
        .map((l) => (l.key === a.key ? { ...l, qty: Math.min(MAX_QTY, l.qty + a.delta) } : l))
        .filter((l) => l.qty > 0);
    case "note":
      return state.map((l) => (l.key === a.key ? { ...l, note: a.note } : l));
    case "remove":
      return state.filter((l) => l.key !== a.key);
    case "clear":
      return [];
  }
}

function valid(index: Index, l: unknown): l is CartLine {
  if (!l || typeof l !== "object") return false;
  const x = l as CartLine;
  const p = index.productIndex.get(x.productId);
  if (!p || !p.options.some((o) => o.id === x.optionId)) return false;
  if (!Array.isArray(x.picks) || !x.picks.every((k) => typeof k === "string")) return false;
  const known = new Set((p.groups ?? []).flatMap((g) => g.choices.map((c) => picksKey(g.id, c.id))));
  return (
    x.picks.every((k) => known.has(k)) &&
    Number.isInteger(x.qty) &&
    x.qty > 0 &&
    x.qty <= MAX_QTY &&
    typeof x.note === "string" &&
    x.key === lineKey(x.productId, x.optionId, x.picks)
  );
}

function load(index: Index): CartLine[] {
  try {
    const raw = localStorage.getItem(STORE);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((l) => valid(index, l)) : [];
  } catch {
    return [];
  }
}

export interface ResolvedLine {
  line: CartLine;
  product: Product;
  option: Option;
  extras: ResolvedPick[];
  /** Preço de uma unidade com os extras pagos. */
  unit: number;
  subtotal: number;
  /** false = esgotado (ou tirado do catálogo) depois de entrar no carrinho. */
  available: boolean;
}

interface CartApi {
  lines: ResolvedLine[];
  count: number;
  total: number;
  addLine: (line: NewLine) => void;
  replace: (oldKey: string, line: NewLine) => void;
  setQty: (key: string, delta: number) => void;
  setNote: (key: string, note: string) => void;
  remove: (key: string) => void;
  clear: () => void;
}

const Ctx = createContext<CartApi | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const { index } = useData();
  const [raw, dispatch] = useReducer(reducer, index, load);

  useEffect(() => {
    try {
      localStorage.setItem(STORE, JSON.stringify(raw));
    } catch {
      /* storage blocked: cart still works for this visit */
    }
  }, [raw]);

  const lines = useMemo<ResolvedLine[]>(
    () =>
      raw.flatMap((line) => {
        const product = index.productIndex.get(line.productId);
        const option = product?.options.find((o) => o.id === line.optionId);
        if (!product || !option) return [];
        const extras = resolvePicks(product, line.picks);
        const unit = option.price + extras.reduce((n, e) => n + (e.choice.price ?? 0), 0);
        const cat = index.categoryOf.get(product.id);
        const available = isAvailable(product) && product.visible !== false && cat?.visible !== false;
        return [{ line, product, option, extras, unit, subtotal: unit * line.qty, available }];
      }),
    [raw, index],
  );

  const add = useCallback((line: NewLine) => dispatch({ t: "addLine", line }), []);
  const replace = useCallback((oldKey: string, line: NewLine) => dispatch({ t: "replace", oldKey, line }), []);
  const setQty = useCallback((key: string, delta: number) => dispatch({ t: "qty", key, delta }), []);
  const setNote = useCallback((key: string, note: string) => dispatch({ t: "note", key, note }), []);
  const remove = useCallback((key: string) => dispatch({ t: "remove", key }), []);
  const clear = useCallback(() => dispatch({ t: "clear" }), []);

  const value = useMemo<CartApi>(
    () => ({
      lines,
      count: lines.reduce((n, l) => n + l.line.qty, 0),
      total: lines.reduce((n, l) => n + l.subtotal, 0),
      addLine: add,
      replace,
      setQty,
      setNote,
      remove,
      clear,
    }),
    [lines, add, replace, setQty, setNote, remove, clear],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart(): CartApi {
  const v = useContext(Ctx);
  if (!v) throw new Error("useCart fora do CartProvider");
  return v;
}

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { CheckCircle2, AlertCircle } from "lucide-react";

export const money = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n).replace(/ /g, " ");

export const when = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "America/Fortaleza" }).format(new Date(iso));

export function ago(iso: string): string {
  const s = Math.max(0, (Date.now() - Date.parse(iso)) / 1000);
  if (s < 60) return "agora";
  if (s < 3600) return `${Math.floor(s / 60)} min`;
  if (s < 86400) return `${Math.floor(s / 3600)} h`;
  return `${Math.floor(s / 86400)} d`;
}

/* ---------- avisos ---------- */
interface Toast {
  id: number;
  text: string;
  kind: "ok" | "error";
}
const ToastCtx = createContext<(text: string, kind?: Toast["kind"]) => void>(() => undefined);
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [list, setList] = useState<Toast[]>([]);
  const n = useRef(0);
  const push = useCallback((text: string, kind: Toast["kind"] = "ok") => {
    const id = ++n.current;
    setList((l) => [...l, { id, text, kind }]);
    window.setTimeout(() => setList((l) => l.filter((t) => t.id !== id)), kind === "error" ? 6500 : 3200);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toasts" aria-live="polite">
        {list.map((t) => (
          <div key={t.id} className={`toast toast--${t.kind}`} role={t.kind === "error" ? "alert" : "status"}>
            {t.kind === "error" ? <AlertCircle size={18} aria-hidden="true" /> : <CheckCircle2 size={18} aria-hidden="true" />}
            {t.text}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

/* ---------- campos ---------- */
export function Field({
  label,
  hint,
  children,
  htmlFor,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  htmlFor?: string;
}) {
  return (
    <div className="afield">
      <label className="afield__label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {hint && <p className="afield__hint">{hint}</p>}
    </div>
  );
}

let uidn = 0;
export const useUid = () => {
  const r = useRef(`f${++uidn}`);
  return r.current;
};

export function TextField({
  label,
  hint,
  value,
  onChange,
  max,
  placeholder,
  multiline,
  inputMode,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  max?: number;
  placeholder?: string;
  multiline?: boolean;
  inputMode?: "text" | "tel" | "decimal" | "numeric";
}) {
  const id = useUid();
  return (
    <Field label={label} hint={hint} htmlFor={id}>
      {multiline ? (
        <textarea id={id} className="ainput" rows={3} maxLength={max} placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input id={id} className="ainput" type="text" inputMode={inputMode} maxLength={max} placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
      )}
    </Field>
  );
}

export function NumField({
  label,
  hint,
  value,
  onChange,
  step = 0.01,
  min = 0,
  max = 100000,
  prefix,
  compact,
}: {
  label: string;
  hint?: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
  prefix?: string;
  compact?: boolean;
}) {
  const id = useUid();
  const [text, setText] = useState(String(value));
  useEffect(() => {
    if (Number(text.replace(",", ".")) !== value) setText(String(value));
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps
  const input = (
    <div className="ainput-wrap">
      {prefix && <span className="ainput-prefix">{prefix}</span>}
      <input
        id={id}
        className={`ainput${prefix ? " has-prefix" : ""}`}
        type="text"
        inputMode="decimal"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          const n = Number(e.target.value.replace(",", "."));
          if (e.target.value.trim() !== "" && Number.isFinite(n)) onChange(Math.min(max, Math.max(min, Math.round(n / step) * step)));
          else if (e.target.value.trim() === "") onChange(0);
        }}
        onBlur={() => setText(String(value))}
      />
    </div>
  );
  return compact ? (
    <div className="afield afield--compact">
      <label className="sr-only" htmlFor={id}>
        {label}
      </label>
      {input}
    </div>
  ) : (
    <Field label={label} hint={hint} htmlFor={id}>
      {input}
    </Field>
  );
}

export function Toggle({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  const id = useUid();
  return (
    <div className="atoggle">
      <input id={id} type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <label htmlFor={id}>
        <span className="atoggle__label">{label}</span>
        {hint && <span className="afield__hint">{hint}</span>}
      </label>
    </div>
  );
}

export const minutesToTime = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
export const timeToMinutes = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};

export function move<T>(list: T[], i: number, d: -1 | 1): T[] {
  const j = i + d;
  if (j < 0 || j >= list.length) return list;
  const next = [...list];
  [next[i], next[j]] = [next[j]!, next[i]!];
  return next;
}

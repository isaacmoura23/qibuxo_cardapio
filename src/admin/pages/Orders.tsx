import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bell, BellOff, Bike, ChevronDown, Clipboard, MessageCircle, RefreshCw, ShoppingBag, Trash2 } from "lucide-react";
import { ORDER_STATUS, type Order, type OrderStatus } from "../../types";
import { api, ApiError } from "../api";
import { ago, money, useToast, when } from "../ui";

type Row = Order & { key: string };

function beep() {
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AC();
    [0, 0.22].forEach((t) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = 880;
      g.gain.setValueAtTime(0.0001, ctx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + 0.18);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + t);
      o.stop(ctx.currentTime + t + 0.2);
    });
    window.setTimeout(() => void ctx.close(), 800);
  } catch {
    /* sem áudio: tudo bem */
  }
}

export interface Feed {
  orders: Row[] | null;
  error: string | null;
  loading: boolean;
  reload: () => Promise<void>;
  patchLocal: (row: Row) => void;
  removeLocal: (key: string) => void;
  newCount: number;
  sound: boolean;
  setSound: (v: boolean) => void;
}

/** Carrega os pedidos e olha, a cada 30 s, se chegou algum novo. */
export function useOrdersFeed(onExpired: () => void): Feed {
  const toast = useToast();
  const [orders, setOrders] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sound, setSoundState] = useState(() => {
    try {
      return localStorage.getItem("qb-sound") !== "0";
    } catch {
      return true;
    }
  });
  const known = useRef<Set<string> | null>(null);
  const newest = useRef<string | null>(null);
  const soundRef = useRef(sound);
  soundRef.current = sound;

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.orders();
      if (known.current) {
        const fresh = r.orders.filter((o) => !known.current!.has(o.key) && o.status === "novo");
        if (fresh.length > 0) {
          toast(fresh.length === 1 ? `Novo pedido de ${fresh[0]!.customer.name}!` : `${fresh.length} novos pedidos!`);
          if (soundRef.current) beep();
        }
      }
      known.current = new Set(r.orders.map((o) => o.key));
      newest.current = r.orders[0]?.key ?? null;
      setOrders(r.orders);
      setError(null);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) onExpired();
      else setError(e instanceof Error ? e.message : "Erro ao carregar os pedidos");
    } finally {
      setLoading(false);
    }
  }, [toast, onExpired]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    const tick = async () => {
      if (document.hidden) return;
      try {
        const p = await api.peekOrders();
        if (p.newest !== newest.current) await reload();
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) onExpired();
      }
    };
    const id = window.setInterval(() => void tick(), 30_000);
    const vis = () => !document.hidden && void tick();
    document.addEventListener("visibilitychange", vis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", vis);
    };
  }, [reload, onExpired]);

  const setSound = (v: boolean) => {
    setSoundState(v);
    try {
      localStorage.setItem("qb-sound", v ? "1" : "0");
    } catch {
      /* ignore */
    }
    if (v) beep();
  };

  return {
    orders,
    error,
    loading,
    reload,
    patchLocal: (row) => setOrders((l) => l?.map((o) => (o.key === row.key ? row : o)) ?? l),
    removeLocal: (key) => setOrders((l) => l?.filter((o) => o.key !== key) ?? l),
    newCount: orders?.filter((o) => o.status === "novo").length ?? 0,
    sound,
    setSound,
  };
}

const FILTERS: ("todos" | OrderStatus)[] = ["todos", "novo", "preparo", "pronto", "entregue", "cancelado"];

const todayKey = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Fortaleza" }).format(new Date());
const dayOf = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Fortaleza" }).format(new Date(iso));

function waLink(o: Order): string | null {
  let d = o.customer.phone.replace(/\D/g, "");
  if (d.length < 10) return null;
  if (d.length <= 11) d = `55${d}`;
  const text = `Olá, ${o.customer.name}! Aqui é da Qi Buxo. Sobre o seu pedido ${o.number}: `;
  return `https://wa.me/${d}?text=${encodeURIComponent(text)}`;
}

function copyText(o: Order): string {
  const lines = [`Pedido ${o.number} (${when(o.createdAt)})`, `Cliente: ${o.customer.name}${o.customer.phone ? ` · ${o.customer.phone}` : ""}`];
  lines.push(`Receber por: ${o.mode === "entrega" ? "Entrega" : "Retirada"}${o.wantedDate ? ` · para ${o.wantedDate.split("-").reverse().join("/")}` : ""}`);
  if (o.mode === "entrega") lines.push(`Endereço: ${o.address}${o.reference ? ` (${o.reference})` : ""}`);
  lines.push(`Pagamento: ${o.payment}${o.change ? ` (troco para ${o.change})` : ""}`, "");
  for (const i of o.items) {
    lines.push(`${i.qty}x ${i.name}${i.option ? ` (${i.option})` : ""} - ${money(i.subtotal)}`);
    for (const e of i.extras) lines.push(`   ${e.group}: ${e.label}`);
    if (i.note) lines.push(`   Obs: ${i.note}`);
  }
  lines.push("", `Subtotal ${money(o.subtotal)}`);
  if (o.mode === "entrega") lines.push(`Entrega ${money(o.fee)}`);
  lines.push(`Total ${money(o.total)}`);
  if (o.notes) lines.push(`Recado: ${o.notes}`);
  return lines.join("\n");
}

export function OrdersPage({ feed, onExpired }: { feed: Feed; onExpired: () => void }) {
  const toast = useToast();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("todos");
  const [open, setOpen] = useState<string | null>(null);
  const orders = feed.orders;

  const stats = useMemo(() => {
    const list = orders ?? [];
    const today = list.filter((o) => dayOf(o.createdAt) === todayKey() && o.status !== "cancelado");
    return {
      novos: list.filter((o) => o.status === "novo").length,
      andamento: list.filter((o) => o.status === "preparo" || o.status === "pronto").length,
      hoje: today.length,
      faturamento: today.reduce((n, o) => n + o.total, 0),
    };
  }, [orders]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { todos: orders?.length ?? 0 };
    for (const o of orders ?? []) c[o.status] = (c[o.status] ?? 0) + 1;
    return c;
  }, [orders]);

  const shown = (orders ?? []).filter((o) => filter === "todos" || o.status === filter);

  const setStatus = async (o: Row, status: OrderStatus) => {
    if (o.status === status) return;
    const prev = o;
    feed.patchLocal({ ...o, status });
    try {
      const r = await api.updateOrder(o.key, { status });
      feed.patchLocal(r.order);
    } catch (e) {
      feed.patchLocal(prev);
      if (e instanceof ApiError && e.status === 401) onExpired();
      else toast(e instanceof Error ? e.message : "Não foi possível mudar o status.", "error");
    }
  };

  const saveNote = async (o: Row, internalNote: string) => {
    if ((o.internalNote ?? "") === internalNote) return;
    try {
      const r = await api.updateOrder(o.key, { internalNote });
      feed.patchLocal(r.order);
      toast("Anotação salva.");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Não foi possível salvar a anotação.", "error");
    }
  };

  const remove = async (o: Row) => {
    if (!window.confirm(`Apagar o pedido ${o.number} de ${o.customer.name}? Isso não pode ser desfeito.`)) return;
    try {
      await api.deleteOrder(o.key);
      feed.removeLocal(o.key);
      toast("Pedido apagado.");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Não foi possível apagar.", "error");
    }
  };

  return (
    <section aria-labelledby="orders-h">
      <div className="apagehead">
        <h1 id="orders-h" className="adisplay apagehead__title">
          Pedidos
        </h1>
        <div className="apagehead__acts">
          <button type="button" className="abtn abtn--ghost abtn--sm" onClick={() => feed.setSound(!feed.sound)} aria-pressed={feed.sound}>
            {feed.sound ? <Bell size={16} aria-hidden="true" /> : <BellOff size={16} aria-hidden="true" />} Som {feed.sound ? "ligado" : "desligado"}
          </button>
          <button type="button" className="abtn abtn--ghost abtn--sm" onClick={() => void feed.reload()} disabled={feed.loading}>
            <RefreshCw size={16} className={feed.loading ? "spin" : undefined} aria-hidden="true" /> Atualizar
          </button>
        </div>
      </div>

      <dl className="astats">
        <div className={stats.novos > 0 ? "is-hot" : undefined}>
          <dt>Novos</dt>
          <dd>{stats.novos}</dd>
        </div>
        <div>
          <dt>Em andamento</dt>
          <dd>{stats.andamento}</dd>
        </div>
        <div>
          <dt>Pedidos hoje</dt>
          <dd>{stats.hoje}</dd>
        </div>
        <div>
          <dt>Total hoje</dt>
          <dd>{money(stats.faturamento)}</dd>
        </div>
      </dl>

      <div className="afilters" role="group" aria-label="Filtrar por status">
        {FILTERS.map((f) => (
          <button key={f} type="button" className={`achip${filter === f ? " is-on" : ""}`} aria-pressed={filter === f} onClick={() => setFilter(f)}>
            {f === "todos" ? "Todos" : ORDER_STATUS[f]} <span className="achip__n">{counts[f] ?? 0}</span>
          </button>
        ))}
      </div>

      {feed.error && <p className="aerror" role="alert">{feed.error}</p>}
      {!orders && !feed.error && <p className="aempty">Carregando pedidos…</p>}
      {orders && shown.length === 0 && (
        <div className="aempty">
          <ShoppingBag size={36} aria-hidden="true" />
          <p>{orders.length === 0 ? "Nenhum pedido ainda. Quando um cliente enviar, ele aparece aqui na hora." : "Nenhum pedido com este status."}</p>
        </div>
      )}

      <ul className="aorders">
        {shown.map((o) => {
          const isOpen = open === o.key;
          const wa = waLink(o);
          return (
            <li key={o.key} className={`aorder aorder--${o.status}`}>
              <button type="button" className="aorder__sum" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : o.key)}>
                <span className="aorder__main">
                  <span className="aorder__num">{o.number}</span>
                  <span className={`astatus astatus--${o.status}`}>{ORDER_STATUS[o.status]}</span>
                </span>
                <span className="aorder__who">
                  {o.customer.name}
                  <span className="aorder__mode">
                    {o.mode === "entrega" ? <Bike size={14} aria-hidden="true" /> : <ShoppingBag size={14} aria-hidden="true" />}
                    {o.mode === "entrega" ? "Entrega" : "Retirada"}
                    {o.wantedDate ? ` · ${o.wantedDate.split("-").reverse().join("/")}` : ""}
                  </span>
                </span>
                <span className="aorder__tot">{money(o.total)}</span>
                <span className="aorder__time">{ago(o.createdAt)}</span>
                <ChevronDown size={18} className="aorder__chev" aria-hidden="true" />
              </button>

              {isOpen && (
                <div className="aorder__body">
                  <ul className="aitems">
                    {o.items.map((i, n) => (
                      <li key={n}>
                        <div className="aitems__row">
                          <span>
                            <strong>{i.qty}x</strong> {i.name}
                            {i.option ? <span className="amuted"> · {i.option}</span> : null}
                          </span>
                          <span>{money(i.subtotal)}</span>
                        </div>
                        {i.extras.map((e, k) => (
                          <p key={k} className="amuted aitems__sub">
                            {e.group}: {e.label}
                            {e.price ? ` (+${money(e.price)})` : ""}
                          </p>
                        ))}
                        {i.note && <p className="aitems__sub">Obs: {i.note}</p>}
                      </li>
                    ))}
                  </ul>

                  <dl className="adl">
                    <div>
                      <dt>Cliente</dt>
                      <dd>
                        {o.customer.name}
                        {o.customer.phone ? ` · ${o.customer.phone}` : ""}
                      </dd>
                    </div>
                    {o.mode === "entrega" && (
                      <div>
                        <dt>Endereço</dt>
                        <dd>
                          {o.address}
                          {o.reference ? ` (${o.reference})` : ""}
                        </dd>
                      </div>
                    )}
                    <div>
                      <dt>Pagamento</dt>
                      <dd>
                        {o.payment}
                        {o.change ? ` · troco para ${o.change}` : ""}
                      </dd>
                    </div>
                    <div>
                      <dt>Total</dt>
                      <dd>
                        {money(o.subtotal)}
                        {o.mode === "entrega" ? ` + entrega ${money(o.fee)}` : ""} = <strong>{money(o.total)}</strong>
                      </dd>
                    </div>
                    {o.notes && (
                      <div>
                        <dt>Recado</dt>
                        <dd>{o.notes}</dd>
                      </div>
                    )}
                    <div>
                      <dt>Recebido</dt>
                      <dd>{when(o.createdAt)}</dd>
                    </div>
                  </dl>

                  <div className="aorder__status" role="group" aria-label="Status do pedido">
                    {(Object.keys(ORDER_STATUS) as OrderStatus[]).map((s) => (
                      <button key={s} type="button" className={`achip achip--${s}${o.status === s ? " is-on" : ""}`} aria-pressed={o.status === s} onClick={() => void setStatus(o, s)}>
                        {ORDER_STATUS[s]}
                      </button>
                    ))}
                  </div>

                  <label className="afield__label" htmlFor={`note-${o.id}`}>
                    Anotação interna <span className="amuted">(só você vê)</span>
                  </label>
                  <textarea id={`note-${o.id}`} className="ainput" rows={2} maxLength={500} defaultValue={o.internalNote ?? ""} onBlur={(e) => void saveNote(o, e.target.value)} />

                  <div className="aorder__acts">
                    {wa && (
                      <a className="abtn abtn--wa" href={wa} target="_blank" rel="noopener noreferrer">
                        <MessageCircle size={18} aria-hidden="true" /> Falar com o cliente
                      </a>
                    )}
                    <button
                      type="button"
                      className="abtn abtn--ghost"
                      onClick={() => {
                        navigator.clipboard
                          .writeText(copyText(o))
                          .then(() => toast("Pedido copiado."))
                          .catch(() => toast("Não foi possível copiar.", "error"));
                      }}
                    >
                      <Clipboard size={18} aria-hidden="true" /> Copiar
                    </button>
                    {o.status === "cancelado" && (
                      <button type="button" className="abtn abtn--danger" onClick={() => void remove(o)}>
                        <Trash2 size={18} aria-hidden="true" /> Apagar
                      </button>
                    )}
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

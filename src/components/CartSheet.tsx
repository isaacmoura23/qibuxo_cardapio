import { useEffect, useId, useMemo, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, MessageCircle, Minus, Pencil, Plus, Trash2, X } from "lucide-react";
import { useCart } from "../cart";
import { useData } from "../data/context";
import { useDetail } from "../detail";
import { money, prettyDate } from "../format";
import {
  buildMesaBody,
  loadMesaMenu,
  MesaError,
  mesaTrackingUrl,
  sendMesaOrder,
  toMesaItems,
  type MesaItem,
  type MesaMenu,
} from "../mesa";
import { minDate } from "../store";
import { buildMessage, whatsappUrl, type OrderForm } from "../whatsapp";

interface Props {
  open: boolean;
  onClose: () => void;
}

const CUSTOMER = "qibuxo-customer-v1";
type Saved = Pick<OrderForm, "name" | "phone" | "address" | "number" | "neighborhood" | "reference" | "payment">;

/** Cidade padrão do endereço: a loja é em Ocara, CE. */
const CITY = "Ocara";

const emptyForm: OrderForm = {
  name: "",
  phone: "",
  mode: "retirada",
  address: "",
  number: "",
  neighborhood: "",
  reference: "",
  payment: "",
  change: "",
  date: "",
  notes: "",
};

function loadForm(): OrderForm {
  try {
    const raw = localStorage.getItem(CUSTOMER);
    if (!raw) return emptyForm;
    const s = JSON.parse(raw) as Partial<Saved>;
    const text = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");
    return {
      ...emptyForm,
      name: text(s.name, 80),
      phone: text(s.phone, 30),
      address: text(s.address, 240),
      number: text(s.number, 20),
      neighborhood: text(s.neighborhood, 120),
      reference: text(s.reference, 120),
      payment: text(s.payment, 24),
    };
  } catch {
    return emptyForm;
  }
}

type Errors = Partial<Record<"name" | "phone" | "address" | "number" | "neighborhood" | "payment" | "date" | "items" | "server", string>>;

/** Pedido enviado ao Mesa Fácil (acompanhamento) ou aberto no WhatsApp (bolos confeitados). */
type Done = { kind: "mesa"; url: string; number: string } | { kind: "whatsapp"; url: string; number: string | null };

export function CartSheet({ open, onClose }: Props) {
  const { lines, total: subtotal, count, setQty, setNote, remove, clear } = useCart();
  const { settings, leadDaysOf } = useData();
  const detail = useDetail();
  const ref = useRef<HTMLDialogElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [form, setForm] = useState<OrderForm>(loadForm);
  const [errors, setErrors] = useState<Errors>({});
  const [done, setDone] = useState<Done | null>(null);
  const [sending, setSending] = useState(false);
  const [menu, setMenu] = useState<MesaMenu | null>(null);
  /** Mesmo ID em novas tentativas do mesmo pedido: se a resposta se perder, o servidor não duplica. */
  const idemKey = useRef<string | null>(null);
  const uid = useId();

  const modes = useMemo(
    () => (["retirada", "entrega"] as const).filter((m) => (m === "entrega" ? settings.deliveryEnabled : settings.pickupEnabled)),
    [settings.deliveryEnabled, settings.pickupEnabled],
  );
  const mode = modes.includes(form.mode) ? form.mode : (modes[0] ?? "retirada");
  const payment = settings.payments.includes(form.payment) ? form.payment : "";

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      titleRef.current?.focus();
    }
    if (!open && d.open) d.close();
    if (open) {
      setDone(null);
      loadMesaMenu().then(setMenu);
    }
  }, [open]);

  const fee = mode === "entrega" ? settings.deliveryFee : 0;
  const total = subtotal + fee;
  const lead = useMemo(() => lines.reduce((n, l) => Math.max(n, leadDaysOf(l.product.id)), 0), [lines, leadDaysOf]);
  const earliest = minDate(lead);
  const unavailable = lines.filter((l) => !l.available);

  /** Todos os pedidos (inclusive bolos confeitados) vão ao Mesa Fácil; só caem no WhatsApp se algum item não casar com o menu de lá. */
  const mesaItems = useMemo<MesaItem[] | null>(() => {
    if (!menu || lines.length === 0) return null;
    return toMesaItems(lines, menu);
  }, [menu, lines]);
  const zoneId = menu?.settings.deliveryZones[0]?.id ?? null;
  const viaMesa = mesaItems !== null && (mode === "retirada" || zoneId !== null);

  const patch = (p: Partial<OrderForm>) => {
    setForm((f) => ({ ...f, ...p }));
    setErrors((e) => {
      const next = { ...e };
      for (const k of Object.keys(p)) delete next[k as keyof Errors];
      delete next.server;
      return next;
    });
  };

  /** Envia o pedido ao Mesa Fácil. Erro de regra mostra a mensagem; sem resposta, dá para tentar de novo. */
  const sendViaMesa = async (items: MesaItem[]) => {
    idemKey.current ??= crypto.randomUUID();
    setSending(true);
    try {
      const body = buildMesaBody(
        {
          mode,
          name: form.name,
          phone: form.phone,
          street: form.address,
          number: form.number,
          neighborhood: form.neighborhood,
          city: CITY,
          reference: form.reference,
          payment,
          change: form.change,
          date: form.date,
          notes: form.notes,
          items,
          zoneId,
        },
        idemKey.current,
      );
      const created = await sendMesaOrder(body);
      idemKey.current = null;
      setDone({ kind: "mesa", url: mesaTrackingUrl(created.publicCode), number: created.orderNumber });
    } catch (e) {
      // Resposta de regra (4xx): a tentativa foi recusada, então a próxima usa outra chave.
      if (e instanceof MesaError && e.status !== null && e.status >= 400 && e.status < 500) idemKey.current = null;
      setErrors({ server: e instanceof Error ? e.message : "Não foi possível enviar o pedido." });
    } finally {
      setSending(false);
    }
  };

  const send = async () => {
    if (sending) return;
    const err: Errors = {};
    if (unavailable.length > 0) err.items = "Remova os itens esgotados para enviar o pedido.";
    if (!form.name.trim()) err.name = "Informe seu nome para enviar o pedido.";
    if (mode === "entrega" && !form.address.trim()) err.address = "Informe a rua.";
    if (mode === "entrega" && !form.number.trim()) err.number = "Informe o número da casa.";
    if (mode === "entrega" && !form.neighborhood.trim()) err.neighborhood = "Informe o bairro.";
    if (viaMesa && form.phone.replace(/\D/g, "").length < 10) err.phone = "Informe seu WhatsApp com DDD para acompanhar o pedido.";
    if (!payment) err.payment = "Escolha a forma de pagamento.";
    if (form.date && form.date < earliest) err.date = `Para estes itens, escolha a partir de ${prettyDate(earliest)}.`;
    setErrors(err);
    const first = (["items", "name", "phone", "address", "number", "neighborhood", "payment", "date"] as const).find((k) => err[k]);
    if (first) {
      const el = document.getElementById(`${uid}-${first}`);
      el?.focus();
      el?.scrollIntoView({ block: "center" });
      return;
    }
    try {
      const s: Saved = {
        name: form.name,
        phone: form.phone,
        address: form.address,
        number: form.number,
        neighborhood: form.neighborhood,
        reference: form.reference,
        payment,
      };
      localStorage.setItem(CUSTOMER, JSON.stringify(s));
    } catch {
      /* sem armazenamento: tudo bem */
    }

    if (viaMesa && mesaItems) {
      await sendViaMesa(mesaItems);
      return;
    }

    const data: OrderForm = { ...form, mode, payment };
    setSending(true);
    let number: string | null = null;
    try {
      const ctl = new AbortController();
      const timer = window.setTimeout(() => ctl.abort(), 8000);
      const r = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: ctl.signal,
        body: JSON.stringify({
          items: lines.map((l) => ({
            productId: l.line.productId,
            optionId: l.line.optionId,
            picks: l.line.picks,
            qty: l.line.qty,
            note: l.line.note,
          })),
          customer: { name: data.name, phone: data.phone },
          mode: data.mode,
          address: data.address,
          reference: data.reference,
          wantedDate: data.date,
          payment: data.payment,
          change: data.change,
          notes: data.notes,
        }),
      }).finally(() => window.clearTimeout(timer));
      if (r.ok) {
        number = ((await r.json()) as { number?: string }).number ?? null;
      } else if (r.status === 400 || r.status === 409 || r.status === 429) {
        // O servidor recusou por regra de negócio (esgotado, data, limite): mostrar e não enviar.
        const msg = ((await r.json().catch(() => ({}))) as { error?: string }).error ?? "Não foi possível enviar o pedido.";
        setErrors({ server: msg });
        setSending(false);
        return;
      }
    } catch {
      /* sem conexão com o servidor: o pedido ainda segue pelo WhatsApp */
    }
    const url = whatsappUrl(buildMessage(lines, { subtotal, fee, total }, data, number ?? undefined), settings.whatsapp);
    window.open(url, "_blank", "noopener,noreferrer");
    setDone({ kind: "whatsapp", url, number });
    setSending(false);
  };

  const edit = (l: (typeof lines)[number]) => {
    onClose();
    detail.open(l.product.id, l.option.id, { key: l.line.key, picks: l.line.picks, qty: l.line.qty, note: l.line.note });
  };

  const editable = (l: (typeof lines)[number]) => l.product.options.length > 1 || (l.product.groups?.length ?? 0) > 0;

  return (
    <dialog
      ref={ref}
      className="sheet"
      aria-labelledby={`${uid}-title`}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="sheet__panel">
        <header className="sheet__head">
          <h2 id={`${uid}-title`} className="sheet__title" ref={titleRef} tabIndex={-1}>
            {done ? "Pedido pronto" : "Seu pedido"}
          </h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Fechar pedido">
            <X size={22} />
          </button>
        </header>

        {done ? (
          <div className="sheet__done" role="status">
            <CheckCircle2 size={56} strokeWidth={1.6} aria-hidden="true" />
            {done.kind === "mesa" ? (
              <>
                <p className="sheet__emptytitle">Pedido enviado</p>
                <p className="order-number">Pedido {done.number}</p>
                <p>A loja vai confirmar o seu pedido. Acompanhe cada etapa pelo link abaixo.</p>
              </>
            ) : (
              <>
                <p className="sheet__emptytitle">O WhatsApp abriu com o seu pedido</p>
                {done.number && <p className="order-number">Pedido {done.number}</p>}
                <p>É só tocar em enviar. A loja confirma a taxa de entrega e o valor dos extras por lá.</p>
              </>
            )}
            <a className="btn btn--wa" href={done.url} target="_blank" rel="noopener noreferrer">
              <MessageCircle size={20} aria-hidden="true" />
              {done.kind === "mesa" ? "Acompanhar pedido" : "Abrir o WhatsApp de novo"}
            </a>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => {
                clear();
                setDone(null);
                onClose();
              }}
            >
              Fazer um novo pedido
            </button>
            <button type="button" className="link-btn" onClick={onClose}>
              Fechar e manter o pedido
            </button>
          </div>
        ) : lines.length === 0 ? (
          <div className="sheet__empty">
            <img src="/img/marca-logo.webp" alt="" width={120} />
            <p className="sheet__emptytitle">Seu pedido está vazio</p>
            <p>Escolha os produtos no catálogo e toque em Adicionar.</p>
            <button type="button" className="btn btn--ghost" onClick={onClose}>
              Ver o catálogo
            </button>
          </div>
        ) : (
          <>
            <div className="sheet__body">
              {errors.items && (
                <p id={`${uid}-items`} className="form__error banner-error" role="alert" tabIndex={-1}>
                  {errors.items}
                </p>
              )}
              <ul className="lines">
                {lines.map((l) => {
                  const { line, product, option, extras, subtotal: sub, available } = l;
                  const grouped = new Map<string, string[]>();
                  for (const e of extras) {
                    const label = e.choice.price ? `${e.choice.label} (+${money(e.choice.price)})` : e.choice.label;
                    grouped.set(e.group.title, [...(grouped.get(e.group.title) ?? []), label]);
                  }
                  return (
                    <li key={line.key} className={`line${available ? "" : " is-off"}`}>
                      <div className="line__top">
                        <div>
                          <p className="line__name">{product.name}</p>
                          <p className="line__meta">
                            {[option.label, option.detail].filter(Boolean).join(" · ")} · {money(option.price)}
                          </p>
                          {[...grouped].map(([title, labels]) => (
                            <p className="line__meta" key={title}>
                              {title}: {labels.join(", ")}
                            </p>
                          ))}
                          {!available && (
                            <p className="line__off">
                              <AlertCircle size={14} aria-hidden="true" /> Esgotado no momento. Remova para enviar.
                            </p>
                          )}
                        </div>
                        <p className="line__sub">{money(sub)}</p>
                      </div>
                      <div className="line__ctl">
                        <div className="stepper" role="group" aria-label={`Quantidade de ${product.name}`}>
                          <button type="button" onClick={() => setQty(line.key, -1)} aria-label="Diminuir quantidade">
                            <Minus size={16} strokeWidth={3} />
                          </button>
                          <output aria-live="polite">{line.qty}</output>
                          <button type="button" onClick={() => setQty(line.key, 1)} aria-label="Aumentar quantidade">
                            <Plus size={16} strokeWidth={3} />
                          </button>
                        </div>
                        <div className="line__acts">
                          {editable(l) && available && (
                            <button type="button" className="link-btn" onClick={() => edit(l)}>
                              <Pencil size={16} aria-hidden="true" />
                              Editar
                            </button>
                          )}
                          <button type="button" className="link-btn" onClick={() => remove(line.key)}>
                            <Trash2 size={16} aria-hidden="true" />
                            Remover
                          </button>
                        </div>
                      </div>
                      <label className="sr-only" htmlFor={`${uid}-n-${line.key}`}>
                        Observação para {product.name}
                      </label>
                      <input
                        id={`${uid}-n-${line.key}`}
                        className="field field--sm"
                        type="text"
                        maxLength={140}
                        placeholder={product.notePlaceholder ?? "Observação (opcional)"}
                        value={line.note}
                        onChange={(e) => setNote(line.key, e.target.value)}
                      />
                    </li>
                  );
                })}
              </ul>

              <div className="form">
                <div className="form__row">
                  <label htmlFor={`${uid}-name`} className="form__label">
                    Seu nome <span className="form__opt">(obrigatório)</span>
                  </label>
                  <input
                    id={`${uid}-name`}
                    className={`field${errors.name ? " is-error" : ""}`}
                    type="text"
                    autoComplete="name"
                    maxLength={80}
                    aria-required="true"
                    aria-invalid={!!errors.name}
                    aria-describedby={errors.name ? `${uid}-name-err` : undefined}
                    value={form.name}
                    onChange={(e) => patch({ name: e.target.value })}
                  />
                  {errors.name && (
                    <p id={`${uid}-name-err`} className="form__error" role="alert">
                      {errors.name}
                    </p>
                  )}
                </div>

                <div className="form__row">
                  <label htmlFor={`${uid}-phone`} className="form__label">
                    Seu WhatsApp{" "}
                    <span className="form__opt">{viaMesa ? "(obrigatório, para acompanhar o pedido)" : "(opcional)"}</span>
                  </label>
                  <input
                    id={`${uid}-phone`}
                    className={`field${errors.phone ? " is-error" : ""}`}
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    maxLength={30}
                    placeholder="(85) 99999-9999"
                    aria-invalid={!!errors.phone}
                    value={form.phone}
                    onChange={(e) => patch({ phone: e.target.value })}
                  />
                  {errors.phone && (
                    <p className="form__error" role="alert">
                      {errors.phone}
                    </p>
                  )}
                </div>

                {modes.length > 1 && (
                  <fieldset className="form__row seg">
                    <legend className="form__label">Como quer receber?</legend>
                    {modes.map((m) => (
                      <label key={m} className={`seg__opt${mode === m ? " is-on" : ""}`}>
                        <input type="radio" name={`${uid}-mode`} checked={mode === m} onChange={() => patch({ mode: m })} />
                        {m === "retirada" ? "Retirada" : `Entrega (+ ${money(settings.deliveryFee)})`}
                      </label>
                    ))}
                  </fieldset>
                )}
                {modes.length === 1 && (
                  <p className="form__hint">
                    {modes[0] === "entrega" ? `Somente entrega (+ ${money(settings.deliveryFee)}).` : "Somente retirada na loja."}
                  </p>
                )}

                {mode === "entrega" && (
                  <>
                    <div className="form__row">
                      <label htmlFor={`${uid}-address`} className="form__label">
                        Endereço de entrega <span className="form__opt">(obrigatório)</span>
                      </label>
                      <input
                        id={`${uid}-address`}
                        className={`field${errors.address ? " is-error" : ""}`}
                        type="text"
                        maxLength={160}
                        autoComplete="address-line1"
                        placeholder="Rua"
                        aria-required="true"
                        aria-invalid={!!errors.address}
                        aria-describedby={errors.address ? `${uid}-address-err` : undefined}
                        value={form.address}
                        onChange={(e) => patch({ address: e.target.value })}
                      />
                      {errors.address && (
                        <p id={`${uid}-address-err`} className="form__error" role="alert">
                          {errors.address}
                        </p>
                      )}
                    </div>
                    <div className="form__row">
                      <label htmlFor={`${uid}-number`} className="form__label">
                        Número <span className="form__opt">(obrigatório)</span>
                      </label>
                      <input
                        id={`${uid}-number`}
                        className={`field${errors.number ? " is-error" : ""}`}
                        type="text"
                        inputMode="numeric"
                        maxLength={20}
                        aria-invalid={!!errors.number}
                        value={form.number}
                        onChange={(e) => patch({ number: e.target.value })}
                      />
                      {errors.number && (
                        <p className="form__error" role="alert">
                          {errors.number}
                        </p>
                      )}
                    </div>
                    <div className="form__row">
                      <label htmlFor={`${uid}-neighborhood`} className="form__label">
                        Bairro <span className="form__opt">(obrigatório)</span>
                      </label>
                      <input
                        id={`${uid}-neighborhood`}
                        className={`field${errors.neighborhood ? " is-error" : ""}`}
                        type="text"
                        maxLength={120}
                        autoComplete="address-level3"
                        aria-invalid={!!errors.neighborhood}
                        value={form.neighborhood}
                        onChange={(e) => patch({ neighborhood: e.target.value })}
                      />
                      {errors.neighborhood && (
                        <p className="form__error" role="alert">
                          {errors.neighborhood}
                        </p>
                      )}
                    </div>
                    <div className="form__row">
                      <label htmlFor={`${uid}-ref`} className="form__label">
                        Ponto de referência <span className="form__opt">(opcional)</span>
                      </label>
                      <input
                        id={`${uid}-ref`}
                        className="field"
                        type="text"
                        maxLength={120}
                        placeholder="Ex.: perto da praça, casa de muro azul"
                        value={form.reference}
                        onChange={(e) => patch({ reference: e.target.value })}
                      />
                    </div>
                  </>
                )}

                <div className="form__row">
                  <label htmlFor={`${uid}-date`} className="form__label">
                    Para qual dia? <span className="form__opt">(opcional)</span>
                  </label>
                  <input
                    id={`${uid}-date`}
                    className={`field${errors.date ? " is-error" : ""}`}
                    type="date"
                    min={earliest}
                    aria-invalid={!!errors.date}
                    aria-describedby={`${uid}-date-hint`}
                    value={form.date}
                    onChange={(e) => patch({ date: e.target.value })}
                  />
                  <p id={`${uid}-date-hint`} className={errors.date ? "form__error" : "form__hint"} role={errors.date ? "alert" : undefined}>
                    {errors.date ??
                      (lead > 0
                        ? `Os itens do seu pedido pedem ${lead} ${lead === 1 ? "dia" : "dias"} de antecedência.`
                        : "Sem antecedência mínima para estes itens.")}
                  </p>
                </div>

                <fieldset
                  className={`form__row seg${settings.payments.length === 3 ? " seg--3" : ""}`}
                  aria-describedby={errors.payment ? `${uid}-payment-err` : undefined}
                >
                  <legend className="form__label">
                    Pagamento <span className="form__opt">(obrigatório)</span>
                  </legend>
                  {settings.payments.map((p, i) => (
                    <label key={p} className={`seg__opt${payment === p ? " is-on" : ""}`}>
                      <input
                        id={i === 0 ? `${uid}-payment` : undefined}
                        type="radio"
                        name={`${uid}-pay`}
                        checked={payment === p}
                        onChange={() => patch({ payment: p })}
                      />
                      {p}
                    </label>
                  ))}
                  {errors.payment && (
                    <p id={`${uid}-payment-err`} className="form__error seg__err" role="alert">
                      {errors.payment}
                    </p>
                  )}
                </fieldset>

                {payment === "Dinheiro" && (
                  <div className="form__row">
                    <label htmlFor={`${uid}-change`} className="form__label">
                      Troco para quanto? <span className="form__opt">(opcional)</span>
                    </label>
                    <input
                      id={`${uid}-change`}
                      className="field"
                      type="text"
                      inputMode="decimal"
                      maxLength={30}
                      placeholder="Ex.: R$ 50,00"
                      value={form.change}
                      onChange={(e) => patch({ change: e.target.value })}
                    />
                  </div>
                )}

                <div className="form__row">
                  <label htmlFor={`${uid}-notes`} className="form__label">
                    Recado para a confeitaria <span className="form__opt">(opcional)</span>
                  </label>
                  <textarea
                    id={`${uid}-notes`}
                    className="field"
                    rows={3}
                    maxLength={400}
                    placeholder="Tema, cores, dedicatória no bolo…"
                    value={form.notes}
                    onChange={(e) => patch({ notes: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <footer className="sheet__foot">
              <dl className="sums">
                <div>
                  <dt>
                    Subtotal <span className="total__count">({count} {count === 1 ? "item" : "itens"})</span>
                  </dt>
                  <dd>{money(subtotal)}</dd>
                </div>
                {mode === "entrega" && (
                  <div>
                    <dt>Taxa de entrega</dt>
                    <dd>{money(fee)}</dd>
                  </div>
                )}
                <div className="sums__total">
                  <dt>Total</dt>
                  <dd>{money(total)}</dd>
                </div>
              </dl>
              {errors.server && (
                <p className="form__error banner-error" role="alert">
                  {errors.server}
                </p>
              )}
              <button type="button" className="btn btn--wa" onClick={send} disabled={sending} aria-busy={sending}>
                {sending ? <Loader2 size={20} className="spin" aria-hidden="true" /> : <MessageCircle size={20} aria-hidden="true" />}
                {sending ? "Enviando…" : "Enviar pedido"}
              </button>
              <p className="sheet__fine">
                {viaMesa
                  ? "O pedido vai direto para a loja, que confirma pelo painel de acompanhamento."
                  : "Não conseguimos enviar direto agora. O pedido segue pelo WhatsApp, para a loja confirmar os itens."}
              </p>
            </footer>
          </>
        )}
      </div>
    </dialog>
  );
}

import { useState } from "react";
import { Plus, X } from "lucide-react";
import type { DayHours, Settings } from "../../types";
import { useDraft } from "../draft";
import { NumField, TextField, Toggle, minutesToTime, timeToMinutes, useUid } from "../ui";

const DAYS: [number, string][] = [
  [1, "Segunda-feira"],
  [2, "Terça-feira"],
  [3, "Quarta-feira"],
  [4, "Quinta-feira"],
  [5, "Sexta-feira"],
  [6, "Sábado"],
  [0, "Domingo"],
];

export function SettingsPage() {
  const { draft, setDraft } = useDraft();
  const s = draft.settings;
  const set = (patch: Partial<Settings>) => setDraft((d) => ({ ...d, settings: { ...d.settings, ...patch } }));

  const setDay = (day: number, h: DayHours) => set({ hours: { ...s.hours, [String(day)]: h } });

  const [newDate, setNewDate] = useState("");
  const [newPay, setNewPay] = useState("");
  const dateId = useUid();
  const payId = useUid();

  return (
    <section aria-labelledby="loja-h" className="apage">
      <div className="apagehead">
        <h1 id="loja-h" className="adisplay apagehead__title">
          Loja
        </h1>
      </div>
      <p className="amuted apage__lead">As mudanças só aparecem no site depois de tocar em Publicar.</p>

      <div className="acard">
        <h2 className="acard__title">Abrir e fechar</h2>
        <Toggle
          label="Fechar a loja agora"
          hint="Mostra “Fechada” no site, mesmo dentro do horário. Os clientes ainda conseguem montar pedido."
          checked={s.forceClosed.on}
          onChange={(on) => set({ forceClosed: { ...s.forceClosed, on } })}
        />
        {s.forceClosed.on && (
          <TextField label="Mensagem (opcional)" value={s.forceClosed.message} max={160} placeholder="Ex.: Voltamos amanhã às 8h" onChange={(message) => set({ forceClosed: { ...s.forceClosed, message } })} />
        )}
      </div>

      <div className="acard">
        <h2 className="acard__title">Horário de funcionamento</h2>
        <ul className="ahours">
          {DAYS.map(([d, name]) => {
            const h = s.hours[String(d)];
            return (
              <li key={d} className="ahours__row">
                <Toggle label={name} checked={!!h} onChange={(on) => setDay(d, on ? [8 * 60, 18 * 60] : null)} />
                {h ? (
                  <div className="ahours__times">
                    <label className="sr-only" htmlFor={`o${d}`}>
                      {name}: abre
                    </label>
                    <input id={`o${d}`} className="ainput ainput--time" type="time" value={minutesToTime(h[0])} onChange={(e) => setDay(d, [timeToMinutes(e.target.value), h[1]])} />
                    <span aria-hidden="true">até</span>
                    <label className="sr-only" htmlFor={`c${d}`}>
                      {name}: fecha
                    </label>
                    <input id={`c${d}`} className="ainput ainput--time" type="time" value={minutesToTime(h[1])} onChange={(e) => setDay(d, [h[0], timeToMinutes(e.target.value)])} />
                  </div>
                ) : (
                  <span className="amuted">Fechado</span>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      <div className="acard">
        <h2 className="acard__title">Folgas e feriados</h2>
        <p className="amuted">Nestes dias o site mostra “Fechada”.</p>
        <div className="arow">
          <div className="afield afield--grow">
            <label className="afield__label" htmlFor={dateId}>
              Nova folga
            </label>
            <input id={dateId} className="ainput" type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
          </div>
          <button
            type="button"
            className="abtn abtn--primary"
            disabled={!newDate || s.closedDates.includes(newDate)}
            onClick={() => {
              set({ closedDates: [...s.closedDates, newDate].sort() });
              setNewDate("");
            }}
          >
            <Plus size={18} aria-hidden="true" /> Adicionar
          </button>
        </div>
        {s.closedDates.length > 0 ? (
          <ul className="atags">
            {s.closedDates.map((d) => (
              <li key={d} className="atag">
                {d.split("-").reverse().join("/")}
                <button type="button" aria-label={`Remover folga de ${d}`} onClick={() => set({ closedDates: s.closedDates.filter((x) => x !== d) })}>
                  <X size={14} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="amuted">Nenhuma folga cadastrada.</p>
        )}
      </div>

      <div className="acard">
        <h2 className="acard__title">Contato e endereço</h2>
        <div className="agrid">
          <TextField label="WhatsApp (com código do país e DDD)" hint="Só números. Exemplo: 5585999999999" value={s.whatsapp} inputMode="tel" max={20} onChange={(whatsapp) => set({ whatsapp: whatsapp.replace(/\D/g, "") })} />
          <TextField label="Instagram" hint="Só o nome de usuário, sem @" value={s.instagram} max={60} onChange={(instagram) => set({ instagram })} />
          <TextField label="Cidade" value={s.city} max={60} onChange={(city) => set({ city })} />
          <TextField label="Endereço" value={s.address} max={200} onChange={(address) => set({ address })} />
        </div>
      </div>

      <div className="acard">
        <h2 className="acard__title">Entrega e retirada</h2>
        <Toggle label="Aceitar retirada na loja" checked={s.pickupEnabled} onChange={(pickupEnabled) => set({ pickupEnabled })} />
        <Toggle label="Fazer entrega" checked={s.deliveryEnabled} onChange={(deliveryEnabled) => set({ deliveryEnabled })} />
        {s.deliveryEnabled && <NumField label="Taxa de entrega" prefix="R$" value={s.deliveryFee} max={500} onChange={(deliveryFee) => set({ deliveryFee })} />}
        {!s.pickupEnabled && !s.deliveryEnabled && <p className="aerror">Ative pelo menos uma das duas opções.</p>}
      </div>

      <div className="acard">
        <h2 className="acard__title">Formas de pagamento</h2>
        <ul className="atags">
          {s.payments.map((p) => (
            <li key={p} className="atag">
              {p}
              <button type="button" aria-label={`Remover ${p}`} onClick={() => set({ payments: s.payments.filter((x) => x !== p) })}>
                <X size={14} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
        <div className="arow">
          <div className="afield afield--grow">
            <label className="afield__label" htmlFor={payId}>
              Nova forma de pagamento
            </label>
            <input id={payId} className="ainput" type="text" maxLength={24} value={newPay} placeholder="Ex.: Transferência" onChange={(e) => setNewPay(e.target.value)} />
          </div>
          <button
            type="button"
            className="abtn abtn--primary"
            disabled={!newPay.trim() || s.payments.includes(newPay.trim()) || s.payments.length >= 8}
            onClick={() => {
              set({ payments: [...s.payments, newPay.trim()] });
              setNewPay("");
            }}
          >
            <Plus size={18} aria-hidden="true" /> Adicionar
          </button>
        </div>
        {s.payments.length === 0 && <p className="aerror">Informe pelo menos uma forma de pagamento.</p>}
      </div>

      <div className="acard">
        <h2 className="acard__title">Aviso no topo do site</h2>
        <Toggle label="Mostrar um aviso" hint="Aparece numa faixa vermelha acima do cabeçalho. Bom para feriados e recados." checked={s.banner.on} onChange={(on) => set({ banner: { ...s.banner, on } })} />
        {s.banner.on && <TextField label="Texto do aviso" value={s.banner.text} max={200} multiline placeholder="Ex.: Nesta semana não fazemos entregas no domingo." onChange={(text) => set({ banner: { ...s.banner, text } })} />}
      </div>
    </section>
  );
}

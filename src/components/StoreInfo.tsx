import { AtSign, Banknote, Clock, MapPin, MessageCircle, Package } from "lucide-react";
import { useData } from "../data/context";
import { money } from "../format";
import { DAY_NAMES, DAY_ORDER, hh, mapsUrl, phoneDisplay, useStoreStatus } from "../store";

export function StatusPill() {
  const s = useStoreStatus();
  return (
    <span className={`status${s.open ? " is-open" : ""}`}>
      <span className="status__dot" aria-hidden="true" />
      {s.label}
    </span>
  );
}

const leadLabel = (n: number) => (n === 0 ? "No dia" : n === 1 ? "1 dia" : `${n} dias`);

export function StoreInfo() {
  const s = useStoreStatus();
  const { settings, cats } = useData();
  const { hours: HOURS, address: ADDRESS, whatsapp: WHATSAPP_NUMBER, instagram: INSTAGRAM_HANDLE, payments: PAYMENTS, deliveryFee: DELIVERY_FEE } = settings;
  const leads = cats.map((c) => ({ name: c.name, days: c.leadDays ?? 0 }));
  return (
    <section id="loja" className="cat store" aria-labelledby="loja-h">
      <header className="cat__head">
        <h2 id="loja-h" className="display cat__title">
          Sobre a loja
        </h2>
        <p className="cat__blurb">Horário, endereço, pagamento e prazos de encomenda.</p>
      </header>

      <div className="store__grid">
        <div className="store__block">
          <h3 className="store__title">
            <Clock size={20} aria-hidden="true" /> Horário
          </h3>
          <p className={`store__now${s.open ? " is-open" : ""}`}>{s.label}</p>
          <ul className="hours">
            {DAY_ORDER.map((d) => {
              const h = HOURS[String(d)];
              return (
                <li key={d} className={d === s.today ? "is-today" : undefined}>
                  <span>{DAY_NAMES[d]}</span>
                  <span>{h ? `${hh(h[0])} às ${hh(h[1])}` : "Fechado"}</span>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="store__block">
          <h3 className="store__title">
            <MapPin size={20} aria-hidden="true" /> Endereço
          </h3>
          <p>{ADDRESS}</p>
          <a className="btn btn--ghost btn--sm" href={mapsUrl(ADDRESS)} target="_blank" rel="noopener noreferrer">
            Abrir no mapa
          </a>
          <h3 className="store__title store__title--next">
            <MessageCircle size={20} aria-hidden="true" /> Contato
          </h3>
          <ul className="store__links">
            {WHATSAPP_NUMBER && (
              <li>
                <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noopener noreferrer">
                  WhatsApp {phoneDisplay(WHATSAPP_NUMBER)}
                </a>
              </li>
            )}
            {INSTAGRAM_HANDLE && (
              <li>
                <a href={`https://www.instagram.com/${INSTAGRAM_HANDLE}/`} target="_blank" rel="noopener noreferrer">
                  <AtSign size={16} aria-hidden="true" /> {INSTAGRAM_HANDLE}
                </a>
              </li>
            )}
          </ul>
        </div>

        <div className="store__block">
          <h3 className="store__title">
            <Banknote size={20} aria-hidden="true" /> Pagamento e entrega
          </h3>
          <p>Aceitamos {PAYMENTS.join(", ").replace(/, ([^,]*)$/, " e $1")}.</p>
          <p>
            {settings.pickupEnabled && settings.deliveryEnabled
              ? `Retirada na loja ou entrega por ${money(DELIVERY_FEE)}.`
              : settings.deliveryEnabled
                ? `Entrega por ${money(DELIVERY_FEE)}.`
                : "Retirada na loja."}
          </p>
        </div>

        <div className="store__block">
          <h3 className="store__title">
            <Package size={20} aria-hidden="true" /> Encomendas
          </h3>
          <p>Antecedência mínima para cada tipo de produto:</p>
          <ul className="hours">
            {leads.map((l) => (
              <li key={l.name}>
                <span>{l.name}</span>
                <span>{leadLabel(l.days)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

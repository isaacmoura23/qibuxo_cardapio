import type { CatalogData, DayHours, Settings } from "../../src/types.js";
import { MESA, type MesaMenu } from "../../src/mesa.js";

/**
 * O Mesa Fácil é a fonte única de preços, disponibilidade e dados da loja (horário, "fechar a
 * loja agora", entrega, contato e aviso do topo). O catálogo guarda só a apresentação (fotos,
 * textos, kits, ordem). Produtos, tamanhos e adicionais são casados por nome; o que não casar
 * mantém o valor do catálogo. Se o Mesa Fácil não responder, o catálogo sai com os valores que
 * já tem. `MESA_SYNC=off` desliga tudo isto.
 */

const TIMEOUT_MS = 3_000;
const TTL_MS = 30_000;

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

/** "Sabores (doces tradicionais)" -> "sabores". */
const groupBase = (s: string) => norm(s.split(" (")[0]);

let cache: { at: number; menu: MesaMenu | null } | null = null;

async function fetchMenu(): Promise<MesaMenu | null> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.menu;
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  let menu: MesaMenu | null = null;
  try {
    const r = await fetch(`${MESA.baseUrl}/api/public/v1/restaurants/${MESA.slug}/menu`, { signal: ctl.signal });
    if (r.ok) {
      const json = (await r.json()) as { data?: MesaMenu };
      if (Array.isArray(json.data?.categories)) menu = json.data as MesaMenu;
    }
  } catch {
    menu = null;
  } finally {
    clearTimeout(timer);
  }
  // Falha curta (5 s) para não bater no Mesa Fácil a cada visita; sucesso vale TTL_MS.
  cache = { at: menu ? Date.now() : Date.now() - TTL_MS + 5_000, menu };
  return menu;
}

/** Centavos válidos (número finito e não negativo) em reais; qualquer outra coisa vira null e o valor do catálogo fica. */
const reais = (cents: unknown): number | null =>
  typeof cents === "number" && Number.isFinite(cents) && cents >= 0 ? cents / 100 : null;

/** Diferença de preço de um adicional: número finito (pode ser negativa); inválido vira null. */
const deltaReais = (cents: unknown): number | null =>
  typeof cents === "number" && Number.isFinite(cents) ? cents / 100 : null;

export interface MesaPriceReport {
  matched: number;
  unmatched: string[];
}

const toMinutes = (hhmm: unknown): number | null => {
  if (typeof hhmm !== "string") return null;
  const m = /^(\d{2}):(\d{2})/.exec(hhmm);
  if (!m) return null;
  const mins = Number(m[1]) * 60 + Number(m[2]);
  return mins >= 0 && mins <= 24 * 60 ? mins : null;
};

const text = (v: unknown, max: number): string => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** Data de hoje no fuso da loja (aaaa-mm-dd), para escolher o aviso do dia. */
const todayIn = (tz: string) => new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

/**
 * Dados da loja vindos do Mesa Fácil sobre as configurações do catálogo. Devolve uma cópia.
 * - horário: por dia da semana; com mais de um intervalo no dia, vale do primeiro ao último (o catálogo só guarda um).
 * - "fechar a loja agora": pedidos pausados no Mesa Fácil.
 * - folgas: exceções "fechado" do Mesa Fácil; exceções com horário próprio não são representadas aqui.
 * - entrega: taxa e disponibilidade da primeira região; retirada: se o Mesa Fácil oferece.
 * - contato: WhatsApp e endereço, se válidos.
 * - aviso do topo: aviso da vitrine do Mesa Fácil ou, sem ele, a descrição da exceção de hoje.
 */
export function applyMesaSettings(settings: Settings, menu: MesaMenu, timezone = "America/Fortaleza"): Settings {
  const s = structuredClone(settings);
  const ms = menu.settings;

  if (Array.isArray(ms.businessHours) && ms.businessHours.length > 0) {
    const hours: Record<string, DayHours> = { "0": null, "1": null, "2": null, "3": null, "4": null, "5": null, "6": null };
    let valid = 0;
    for (const h of ms.businessHours) {
      const open = toMinutes(h.opensAt);
      const close = toMinutes(h.closesAt);
      if (!Number.isInteger(h.weekday) || h.weekday < 0 || h.weekday > 6 || open === null || close === null || close <= open) continue;
      const cur = hours[String(h.weekday)];
      hours[String(h.weekday)] = cur ? [Math.min(cur[0], open), Math.max(cur[1], close)] : [open, close];
      valid++;
    }
    // Só troca se veio ao menos um intervalo válido (resposta estranha não pode fechar a loja de vez).
    if (valid > 0) s.hours = hours;
  }

  if (typeof ms.acceptsOrders === "boolean") {
    s.forceClosed = ms.acceptsOrders ? { on: false, message: "" } : { on: true, message: "Pedidos pausados no momento. Volte já já!" };
  }

  if (Array.isArray(ms.businessHourExceptions)) {
    s.closedDates = ms.businessHourExceptions.filter((e) => e.isClosed && /^\d{4}-\d{2}-\d{2}$/.test(e.date)).map((e) => e.date);
  }

  if (Array.isArray(ms.fulfillmentTypes)) {
    const zone = ms.deliveryZones.find((z) => Number.isFinite(z.feeCents) && (z.feeCents as number) >= 0);
    s.pickupEnabled = ms.fulfillmentTypes.includes("PICKUP");
    s.deliveryEnabled = ms.fulfillmentTypes.includes("DELIVERY") && zone !== undefined;
    if (zone) s.deliveryFee = (zone.feeCents as number) / 100;
  }

  const contact = menu.restaurant?.contact;
  const wa = typeof contact?.whatsapp === "string" ? contact.whatsapp.replace(/\D/g, "") : "";
  if (/^\d{10,15}$/.test(wa)) s.whatsapp = wa;
  const address = text(contact?.addressText, 240);
  if (address) s.address = address;

  if (menu.restaurant) {
    const notice = text(menu.restaurant.notice, 240);
    const today = todayIn(timezone);
    const exception = Array.isArray(ms.businessHourExceptions) ? ms.businessHourExceptions.find((e) => e.date === today && text(e.description, 240)) : undefined;
    const bannerText = notice || (exception ? text(exception.description, 240) : "");
    s.banner = bannerText ? { on: true, text: bannerText } : { on: false, text: "" };
  }
  return s;
}

/** Devolve uma cópia do catálogo com preços e disponibilidade do menu do Mesa Fácil. */
export function applyMesaPrices(catalog: CatalogData, menu: MesaMenu): { catalog: CatalogData; report: MesaPriceReport } {
  const out = structuredClone(catalog);
  const mesaProducts = menu.categories.flatMap((c) => c.products);
  const report: MesaPriceReport = { matched: 0, unmatched: [] };

  for (const cat of out.categories) {
    for (const group of cat.groups) {
      for (const p of group.products) {
        const found = mesaProducts.filter((m) => norm(m.name) === norm(p.name));
        if (found.length !== 1) {
          report.unmatched.push(p.name);
          continue;
        }
        const m = found[0];
        report.matched++;
        if (!m.isAvailable) p.available = false;

        for (const o of p.options) {
          if (m.variants.length > 0) {
            const label = norm(o.label);
            const withDetail = o.detail ? norm(`${o.label} (${o.detail})`) : null;
            const v = m.variants.find((x) => norm(x.name) === label || (withDetail !== null && norm(x.name) === withDetail));
            const price = v ? reais(v.priceCents) : null;
            if (price !== null) o.price = price;
          } else if (p.options.length === 1) {
            const price = reais(m.priceCents);
            if (price !== null) o.price = price;
          }
        }

        for (const g of p.groups ?? []) {
          const mg = m.modifierGroups.find((x) => groupBase(x.name) === norm(g.title));
          if (!mg) continue;
          for (const c of g.choices) {
            const mod = mg.modifiers.find((x) => norm(x.name) === norm(c.label));
            const delta = mod ? deltaReais(mod.priceDeltaCents) : null;
            if (mod && delta !== null && (c.price !== undefined || delta !== 0)) c.price = delta;
          }
        }
      }
    }
  }
  return { catalog: out, report };
}

/** Catálogo com preços e dados da loja do Mesa Fácil; sem resposta (ou desligado), o próprio catálogo. */
export async function withMesaData(catalog: CatalogData): Promise<CatalogData> {
  if (process.env.MESA_SYNC === "off") return catalog;
  const menu = await fetchMenu();
  if (!menu) return catalog;
  const { catalog: merged, report } = applyMesaPrices(catalog, menu);
  if (report.unmatched.length > 0) console.warn("mesa-sync: sem correspondência:", report.unmatched.join(", "));
  return { ...merged, settings: applyMesaSettings(merged.settings, menu) };
}

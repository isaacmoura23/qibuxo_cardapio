import type { ResolvedLine } from "./cart";

/**
 * Integração com o Mesa Fácil: o pedido do catálogo vai para a API pública do restaurante
 * (`/api/public/v1/restaurants/{slug}/orders`) em vez do WhatsApp.
 *
 * Os itens são casados por nome, tamanho e adicional com o menu que o Mesa Fácil publica.
 * Se qualquer item não casar (ou o preço divergir), `toMesaItems` devolve null e o pedido
 * segue pelo WhatsApp, em vez de ir com preço errado.
 */

export const MESA = {
  baseUrl: "https://mesa-facil-demo-kohl.vercel.app",
  slug: "qibuxo",
} as const;

const TIMEOUT_MS = 12_000;

interface MesaModifier {
  id: string;
  name: string;
  priceDeltaCents: number;
  isAvailable: boolean;
}

interface MesaGroup {
  id: string;
  name: string;
  modifiers: MesaModifier[];
}

interface MesaVariant {
  id: string;
  name: string;
  priceCents: number;
  isAvailable: boolean;
}

interface MesaProduct {
  id: string;
  name: string;
  priceCents: number;
  isAvailable: boolean;
  variants: MesaVariant[];
  modifierGroups: MesaGroup[];
}

export interface MesaMenu {
  settings: { deliveryZones: { id: string; name: string }[] };
  categories: { products: MesaProduct[] }[];
}

export interface MesaItem {
  productId: string;
  variantId?: string;
  quantity: number;
  modifierIds: string[];
  notes?: string;
}

/** Texto para comparar nomes: sem acento, minúsculo, espaços normalizados. */
const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

/** Nome do grupo sem o complemento entre parênteses: "Sabores (doces tradicionais)" -> "sabores". */
const groupBase = (s: string) => norm(s.split(" (")[0]);

let menuCache: Promise<MesaMenu | null> | null = null;

/** Busca o menu do Mesa Fácil uma vez por visita. Falha vira null (o pedido cai no WhatsApp). */
export function loadMesaMenu(): Promise<MesaMenu | null> {
  if (!menuCache) {
    menuCache = (async () => {
      const ctl = new AbortController();
      const timer = window.setTimeout(() => ctl.abort(), TIMEOUT_MS);
      try {
        const r = await fetch(`${MESA.baseUrl}/api/public/v1/restaurants/${MESA.slug}/menu`, { signal: ctl.signal });
        if (!r.ok) return null;
        const json = (await r.json()) as { data?: MesaMenu };
        return json.data ?? null;
      } catch {
        return null;
      } finally {
        window.clearTimeout(timer);
      }
    })();
    // Não guarda falha: a próxima abertura do carrinho tenta de novo.
    menuCache.then((m) => {
      if (!m) menuCache = null;
    });
  }
  return menuCache;
}

/** Converte uma linha do carrinho para o item da API. Null se algo não casar com o Mesa Fácil. */
export function toMesaItem(l: ResolvedLine, menu: MesaMenu): MesaItem | null {
  const products = menu.categories
    .flatMap((c) => c.products)
    .filter((p) => norm(p.name) === norm(l.product.name));
  if (products.length !== 1) return null;
  const product = products[0];
  if (!product.isAvailable) return null;

  let variantId: string | undefined;
  if (product.variants.length > 0) {
    const label = norm(l.option.label);
    const withDetail = l.option.detail ? norm(`${l.option.label} (${l.option.detail})`) : null;
    const variant = product.variants.find((v) => {
      const name = norm(v.name);
      return name === label || (withDetail !== null && name === withDetail);
    });
    if (!variant || !variant.isAvailable || variant.priceCents !== Math.round(l.option.price * 100)) return null;
    variantId = variant.id;
  } else {
    if (l.product.options.length !== 1) return null;
    if (product.priceCents !== Math.round(l.option.price * 100)) return null;
  }

  const modifierIds: string[] = [];
  for (const e of l.extras) {
    const group = product.modifierGroups.find((g) => groupBase(g.name) === norm(e.group.title));
    if (!group) return null;
    const mod = group.modifiers.find((m) => norm(m.name) === norm(e.choice.label));
    if (!mod || !mod.isAvailable) return null;
    if (mod.priceDeltaCents !== Math.round((e.choice.price ?? 0) * 100)) return null;
    modifierIds.push(mod.id);
  }

  return {
    productId: product.id,
    variantId,
    quantity: l.line.qty,
    modifierIds,
    notes: itemNotes(l),
  };
}

/** Limite de observação por item na API do Mesa Fácil. */
const MAX_ITEM_NOTES = 500;

/** Itens inclusos do kit (a cozinha não vê a lista do catálogo) + a observação do cliente. */
function itemNotes(l: ResolvedLine): string | undefined {
  const parts: string[] = [];
  if (l.product.includes && l.product.includes.length > 0) parts.push(`Inclui: ${l.product.includes.join(", ")}`);
  const note = l.line.note.trim();
  if (note) parts.push(note);
  return parts.length > 0 ? parts.join(" | ").slice(0, MAX_ITEM_NOTES) : undefined;
}

/** Todos os itens casam? Se sim, devolve a lista pronta para a API. */
export function toMesaItems(lines: ResolvedLine[], menu: MesaMenu): MesaItem[] | null {
  const items: MesaItem[] = [];
  for (const l of lines) {
    const item = toMesaItem(l, menu);
    if (!item) return null;
    items.push(item);
  }
  return items;
}

export type MesaPayment = "PIX" | "CASH" | "CARD";

export const MESA_PAYMENT: Record<string, MesaPayment> = {
  Pix: "PIX",
  Dinheiro: "CASH",
  Cartão: "CARD",
};

/** "50" ou "50,00" -> 5000 centavos. Null se vazio ou inválido. */
export function changeToCents(raw: string): number | null {
  const n = Number(raw.replace(/[^\d,.]/g, "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : null;
}

export interface MesaOrderInput {
  mode: "retirada" | "entrega";
  name: string;
  phone: string;
  street: string;
  number: string;
  neighborhood: string;
  city: string;
  reference: string;
  payment: string;
  change: string;
  date: string;
  notes: string;
  items: MesaItem[];
  zoneId: string | null;
}

export interface MesaOrderBody {
  fulfillmentType: "DELIVERY" | "PICKUP";
  items: MesaItem[];
  customer: { name: string; phone: string };
  address?: { street: string; number: string; neighborhood: string; city: string; instructions?: string };
  deliveryZoneId?: string;
  notes?: string;
  payment: { method: MesaPayment; changeForCents?: number };
  idempotencyKey: string;
}

/** Monta o corpo do pedido. A data desejada não existe na API, então vai para as observações. */
export function buildMesaBody(f: MesaOrderInput, idempotencyKey: string): MesaOrderBody {
  const method = MESA_PAYMENT[f.payment] ?? "PIX";
  const delivery = f.mode === "entrega";
  const parts: string[] = [];
  if (f.date) parts.push(`Para o dia: ${f.date.split("-").reverse().join("/")}`);
  if (f.notes.trim()) parts.push(f.notes.trim());
  const change = method === "CASH" ? changeToCents(f.change) : null;

  return {
    fulfillmentType: delivery ? "DELIVERY" : "PICKUP",
    items: f.items,
    customer: { name: f.name.trim(), phone: f.phone.replace(/\D/g, "") },
    ...(delivery && {
      address: {
        street: f.street.trim(),
        number: f.number.trim(),
        neighborhood: f.neighborhood.trim(),
        city: f.city.trim(),
        ...(f.reference.trim() && { instructions: f.reference.trim() }),
      },
      deliveryZoneId: f.zoneId ?? undefined,
    }),
    ...(parts.length > 0 && { notes: parts.join(" | ") }),
    payment: { method, ...(change !== null && { changeForCents: change }) },
    idempotencyKey,
  };
}

export interface MesaCreated {
  publicCode: string;
  orderNumber: string;
}

export class MesaError extends Error {
  constructor(
    message: string,
    public status: number | null,
  ) {
    super(message);
  }
}

/** Envia o pedido. Erro de regra vira MesaError com a mensagem do servidor; sem resposta, status null. */
export async function sendMesaOrder(body: MesaOrderBody): Promise<MesaCreated> {
  const ctl = new AbortController();
  const timer = window.setTimeout(() => ctl.abort(), TIMEOUT_MS);
  let r: Response;
  try {
    r = await fetch(`${MESA.baseUrl}/api/public/v1/restaurants/${MESA.slug}/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: ctl.signal,
    });
  } catch {
    throw new MesaError("Não conseguimos enviar o pedido agora. Tente de novo em instantes.", null);
  } finally {
    window.clearTimeout(timer);
  }
  const json = (await r.json().catch(() => ({}))) as {
    data?: { publicCode?: string; orderNumber?: string };
    error?: { message?: string };
    message?: string;
  };
  if (!r.ok) {
    throw new MesaError(json.error?.message ?? json.message ?? "Não foi possível enviar o pedido.", r.status);
  }
  const { publicCode, orderNumber } = json.data ?? {};
  if (!publicCode) throw new MesaError("Resposta inesperada do servidor.", r.status);
  return { publicCode, orderNumber: orderNumber ?? publicCode };
}

/** Link do painel de acompanhamento do Mesa Fácil. */
export const mesaTrackingUrl = (publicCode: string) => `${MESA.baseUrl}/r/${MESA.slug}/pedido/${publicCode}`;

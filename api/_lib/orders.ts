import { randomBytes } from "node:crypto";
import type { CatalogData, Order, OrderItem } from "../../src/types.js";
import { buildIndex, isAvailable, resolvePicks, unitPrice, visibleGroups, picksKey } from "../../src/data/model.js";
import { STORE_TZ } from "../../src/config.js";

export class OrderError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

export interface OrderInput {
  items?: { productId?: string; optionId?: string; picks?: string[]; qty?: number; note?: string }[];
  customer?: { name?: string; phone?: string };
  mode?: string;
  address?: string;
  reference?: string;
  wantedDate?: string;
  payment?: string;
  change?: string;
  notes?: string;
}

const clean = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const money = (n: number) => Math.round(n * 100) / 100;

/** Data de hoje no fuso da loja, aaaa-mm-dd, somando dias. */
export function storeDate(addDays = 0): string {
  const base = new Date(Date.now() + addDays * 86_400_000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: STORE_TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(base);
}

export function buildOrder(input: OrderInput, catalog: CatalogData): Order {
  const { settings } = catalog;
  const idx = buildIndex(catalog.categories);
  const rawItems = Array.isArray(input.items) ? input.items : [];
  if (rawItems.length === 0) throw new OrderError("O pedido está vazio.");
  if (rawItems.length > 60) throw new OrderError("Itens demais no pedido.");

  let lead = 0;
  const items: OrderItem[] = rawItems.map((raw) => {
    const product = idx.productIndex.get(String(raw.productId ?? ""));
    const category = idx.categoryOf.get(String(raw.productId ?? ""));
    if (!product || !category || category.visible === false || product.visible === false) {
      throw new OrderError("Um dos produtos não está mais no catálogo. Atualize a página e refaça o pedido.", 409);
    }
    if (!isAvailable(product)) throw new OrderError(`${product.name} está esgotado no momento.`, 409);
    const option = product.options.find((o) => o.id === raw.optionId);
    if (!option) throw new OrderError(`Opção inválida em ${product.name}. Atualize a página.`, 409);
    const qty = Math.round(Number(raw.qty));
    if (!Number.isFinite(qty) || qty < 1 || qty > 99) throw new OrderError("Quantidade inválida.");

    const groups = visibleGroups(product, option.id);
    const known = new Set(groups.flatMap((g) => g.choices.map((c) => picksKey(g.id, c.id))));
    const picks = (Array.isArray(raw.picks) ? raw.picks : []).filter((k): k is string => typeof k === "string" && known.has(k));
    for (const g of groups) {
      const n = g.choices.filter((c) => picks.includes(picksKey(g.id, c.id))).length;
      if (g.required && n === 0) throw new OrderError(`Escolha ${g.title.toLowerCase()} em ${product.name}.`);
      if (!g.multiple && n > 1) throw new OrderError(`Escolha apenas uma opção em ${g.title}.`);
    }
    const unit = unitPrice(product, option.id, picks) ?? option.price;
    lead = Math.max(lead, category.leadDays ?? 0);
    return {
      productId: product.id,
      name: product.name,
      option: [option.label, option.detail].filter(Boolean).join(", "),
      extras: resolvePicks(product, picks).map((e) => ({ group: e.group.title, label: e.choice.label, price: e.choice.price ?? 0 })),
      qty,
      unit: money(unit),
      subtotal: money(unit * qty),
      note: clean(raw.note, 140),
    };
  });

  const name = clean(input.customer?.name, 80);
  if (!name) throw new OrderError("Informe seu nome.");
  const mode = input.mode === "entrega" ? "entrega" : "retirada";
  if (mode === "entrega" && !settings.deliveryEnabled) throw new OrderError("Entrega indisponível no momento.");
  if (mode === "retirada" && !settings.pickupEnabled) throw new OrderError("Retirada indisponível no momento.");
  const address = clean(input.address, 240);
  if (mode === "entrega" && !address) throw new OrderError("Informe o endereço de entrega.");
  const payment = clean(input.payment, 24);
  if (!settings.payments.includes(payment)) throw new OrderError("Escolha uma forma de pagamento aceita.");
  const wantedDate = clean(input.wantedDate, 10);
  if (wantedDate) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(wantedDate)) throw new OrderError("Data inválida.");
    if (wantedDate < storeDate(lead)) throw new OrderError(`Para estes itens, escolha uma data a partir de ${storeDate(lead).split("-").reverse().join("/")}.`);
  }

  const subtotal = money(items.reduce((n, i) => n + i.subtotal, 0));
  const fee = mode === "entrega" ? settings.deliveryFee : 0;
  const now = new Date();
  const id = randomBytes(4).toString("hex");
  const number = `QB-${Math.floor(now.getTime() / 1000).toString(36).slice(-4).toUpperCase()}${id.slice(0, 2).toUpperCase()}`;
  return {
    id,
    number,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    status: "novo",
    customer: { name, phone: clean(input.customer?.phone, 30) },
    mode,
    address,
    reference: clean(input.reference, 120),
    wantedDate,
    payment,
    change: clean(input.change, 30),
    notes: clean(input.notes, 400),
    items,
    subtotal,
    fee,
    total: money(subtotal + fee),
  };
}

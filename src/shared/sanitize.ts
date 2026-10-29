// Validação e normalização do catálogo. Roda no servidor (nunca confie no que vem do navegador).
import type {
  CatalogData,
  Category,
  Choice,
  ChoiceGroup,
  DayHours,
  Group,
  Option,
  Product,
  Settings,
} from "../types";

export class ValidationError extends Error {}

const fail = (msg: string): never => {
  throw new ValidationError(msg);
};

export const newId = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-3)}`;

const obj = (v: unknown, where: string): Record<string, unknown> =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : fail(`${where}: formato inválido`);

const arr = (v: unknown, where: string, max: number): unknown[] => {
  if (v === undefined || v === null) return [];
  if (!Array.isArray(v)) return fail(`${where}: formato inválido`);
  if (v.length > max) fail(`${where}: itens demais (máximo ${max})`);
  return v;
};

const str = (v: unknown, max: number, where: string, required = false): string => {
  const s = typeof v === "string" ? v.trim() : "";
  if (required && !s) fail(`${where}: obrigatório`);
  if (s.length > max) fail(`${where}: máximo de ${max} caracteres`);
  return s;
};

const num = (v: unknown, min: number, max: number, where: string): number => {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n) || n < min || n > max) fail(`${where}: valor inválido`);
  return Math.round(n * 100) / 100;
};

const bool = (v: unknown, def: boolean) => (typeof v === "boolean" ? v : def);

const ID = /^[A-Za-z0-9_-]{1,64}$/;
const id = (v: unknown, where: string, taken: Set<string>, prefix: string): string => {
  let s = typeof v === "string" && ID.test(v) ? v : newId(prefix);
  if (taken.has(s)) s = newId(prefix);
  taken.add(s);
  void where;
  return s;
};

const IMAGE = /^(\/img\/[A-Za-z0-9._-]+|\/api\/media\?p=media\/[A-Za-z0-9._-]+)$/;
const image = (v: unknown, where: string): string | undefined => {
  if (v === undefined || v === null || v === "") return undefined;
  if (typeof v !== "string" || v.length > 200 || !IMAGE.test(v)) return fail(`${where}: imagem inválida`);
  return v;
};

function sanitizeOption(v: unknown, taken: Set<string>): Option {
  const o = obj(v, "opção");
  const out: Option = {
    id: id(o.id, "opção", taken, "o"),
    label: str(o.label, 40, "Nome da opção", true),
    price: num(o.price, 0, 100000, "Preço"),
  };
  const detail = str(o.detail, 40, "Detalhe da opção");
  if (detail) out.detail = detail;
  const img = image(o.image, "Imagem da opção");
  if (img) out.image = img;
  return out;
}

function sanitizeGroup(v: unknown, optionIds: Set<string>, taken: Set<string>): ChoiceGroup {
  const g = obj(v, "grupo de escolhas");
  const choiceIds = new Set<string>();
  const choices: Choice[] = arr(g.choices, "Escolhas", 40).map((c) => {
    const cc = obj(c, "escolha");
    const choice: Choice = { id: id(cc.id, "escolha", choiceIds, "c"), label: str(cc.label, 60, "Nome da escolha", true) };
    if (cc.price !== undefined && cc.price !== null && cc.price !== "" && Number(cc.price) !== 0) {
      choice.price = num(cc.price, 0, 100000, "Valor adicional");
    }
    return choice;
  });
  if (choices.length === 0) fail("Cada grupo de escolhas precisa de pelo menos uma escolha");
  const out: ChoiceGroup = {
    id: id(g.id, "grupo", taken, "g"),
    title: str(g.title, 60, "Título do grupo", true),
    required: bool(g.required, false),
    multiple: bool(g.multiple, false),
    choices,
  };
  const hint = str(g.hint, 160, "Dica do grupo");
  if (hint) out.hint = hint;
  const applies = arr(g.appliesTo, "Aplica-se a", 30).filter((x): x is string => typeof x === "string" && optionIds.has(x));
  if (applies.length > 0 && applies.length < optionIds.size) out.appliesTo = applies;
  return out;
}

function sanitizeProduct(v: unknown, taken: Set<string>): Product {
  const p = obj(v, "produto");
  const optionIds = new Set<string>();
  const options = arr(p.options, "Opções", 30).map((o) => sanitizeOption(o, optionIds));
  if (options.length === 0) fail("Cada produto precisa de pelo menos uma opção de preço");
  const groupIds = new Set<string>();
  const out: Product = {
    id: id(p.id, "produto", taken, "p"),
    name: str(p.name, 80, "Nome do produto", true),
    options,
    available: bool(p.available, true),
    visible: bool(p.visible, true),
  };
  const description = str(p.description, 300, "Descrição");
  if (description) out.description = description;
  const img = image(p.image, "Foto");
  if (img) out.image = img;
  if (p.art) {
    const a = obj(p.art, "ilustração");
    out.art = { kind: "tiers", tiers: Math.round(num(a.tiers, 1, 4, "Andares")), ...(a.square ? { square: true } : {}) };
  }
  const optionLabel = str(p.optionLabel, 30, "Rótulo das opções");
  if (optionLabel) out.optionLabel = optionLabel;
  const badge = str(p.badge, 40, "Selo");
  if (badge) out.badge = badge;
  const notePlaceholder = str(p.notePlaceholder, 80, "Texto do recado");
  if (notePlaceholder) out.notePlaceholder = notePlaceholder;
  const fine = str(p.fine, 200, "Observação");
  if (fine) out.fine = fine;
  const includes = arr(p.includes, "Itens do kit", 20).map((x) => str(x, 60, "Item do kit")).filter(Boolean);
  if (includes.length > 0) out.includes = includes;
  const groups = arr(p.groups, "Grupos de escolhas", 10).map((g) => sanitizeGroup(g, optionIds, groupIds));
  if (groups.length > 0) out.groups = groups;
  return out;
}

function sanitizeCategory(v: unknown, catIds: Set<string>, productIds: Set<string>, count: { n: number }): Category {
  const c = obj(v, "categoria");
  const groupIds = new Set<string>();
  const groups: Group[] = arr(c.groups, "Grupos", 20).map((gv) => {
    const g = obj(gv, "grupo");
    const products = arr(g.products, "Produtos", 150).map((p) => {
      count.n += 1;
      if (count.n > 600) fail("Produtos demais no catálogo");
      return sanitizeProduct(p, productIds);
    });
    const out: Group = { id: id(g.id, "grupo", groupIds, "gr"), products };
    const title = str(g.title, 60, "Título do grupo");
    if (title) out.title = title;
    const note = str(g.note, 240, "Observação do grupo");
    if (note) out.note = note;
    return out;
  });
  const out: Category = {
    id: id(c.id, "categoria", catIds, "cat"),
    name: str(c.name, 60, "Nome da categoria", true),
    blurb: str(c.blurb, 240, "Descrição da categoria"),
    leadDays: Math.round(num(c.leadDays ?? 0, 0, 60, "Antecedência")),
    visible: bool(c.visible, true),
    groups,
  };
  if (c.notice) {
    const n = obj(c.notice, "aviso");
    const title = str(n.title, 120, "Título do aviso");
    const text = str(n.text, 300, "Texto do aviso");
    const items = arr(n.items, "Itens do aviso", 20).map((x) => str(x, 40, "Item do aviso")).filter(Boolean);
    if (title || text || items.length) out.notice = { title, text, ...(items.length ? { items } : {}) };
  }
  return out;
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export function sanitizeSettings(v: unknown): Settings {
  const s = obj(v, "configurações");
  const whatsapp = String(s.whatsapp ?? "").replace(/\D/g, "");
  if (whatsapp && (whatsapp.length < 12 || whatsapp.length > 15)) fail("WhatsApp: use código do país e DDD (ex.: 5585999999999)");
  const instagram = String(s.instagram ?? "")
    .trim()
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, "")
    .replace(/^@/, "")
    .replace(/\/.*$/, "");
  if (instagram && !/^[A-Za-z0-9._]{1,30}$/.test(instagram)) fail("Instagram: usuário inválido");
  const hoursIn = obj(s.hours ?? {}, "horário");
  const hours: Record<string, DayHours> = {};
  for (let d = 0; d < 7; d++) {
    const h = hoursIn[String(d)];
    if (!h) {
      hours[String(d)] = null;
      continue;
    }
    if (!Array.isArray(h) || h.length !== 2) fail("Horário inválido");
    const open = Math.round(num((h as unknown[])[0], 0, 1440, "Horário de abertura"));
    const close = Math.round(num((h as unknown[])[1], 0, 1440, "Horário de fechamento"));
    if (close <= open) fail("O horário de fechamento precisa ser depois da abertura");
    hours[String(d)] = [open, close];
  }
  const closedDates = [...new Set(arr(s.closedDates, "Folgas", 400).map((x) => String(x)).filter((x) => DATE.test(x)))].sort();
  const force = obj(s.forceClosed ?? {}, "fechamento manual");
  const banner = obj(s.banner ?? {}, "aviso");
  const payments = [...new Set(arr(s.payments, "Pagamentos", 8).map((x) => str(x, 24, "Forma de pagamento")).filter(Boolean))];
  return {
    whatsapp,
    instagram,
    city: str(s.city, 60, "Cidade"),
    address: str(s.address, 200, "Endereço"),
    hours,
    closedDates,
    forceClosed: { on: bool(force.on, false), message: str(force.message, 160, "Mensagem de fechamento") },
    deliveryFee: num(s.deliveryFee ?? 0, 0, 500, "Taxa de entrega"),
    deliveryEnabled: bool(s.deliveryEnabled, true),
    pickupEnabled: bool(s.pickupEnabled, true),
    payments,
    banner: { on: bool(banner.on, false), text: str(banner.text, 200, "Texto do aviso") },
  };
}

export function sanitizeCatalog(v: unknown, previousVersion = 0): CatalogData {
  const d = obj(v, "catálogo");
  const catIds = new Set<string>();
  const productIds = new Set<string>();
  const count = { n: 0 };
  const categories = arr(d.categories, "Categorias", 30).map((c) => sanitizeCategory(c, catIds, productIds, count));
  if (categories.length === 0) fail("O catálogo precisa de pelo menos uma categoria");
  const settings = sanitizeSettings(d.settings);
  if (!settings.deliveryEnabled && !settings.pickupEnabled) fail("Ative pelo menos retirada ou entrega");
  if (settings.payments.length === 0) fail("Informe pelo menos uma forma de pagamento");
  return { version: previousVersion + 1, updatedAt: new Date().toISOString(), settings, categories };
}

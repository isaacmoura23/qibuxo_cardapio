export interface Option {
  id: string;
  label: string;
  detail?: string;
  price: number;
  image?: string;
}

export type ArtKind = "tiers";

/** Uma escolha dentro de um grupo (sabor, recheio, extra pago). */
export interface Choice {
  id: string;
  label: string;
  /** Valor adicional por unidade; sem valor = incluso. */
  price?: number;
}

export interface ChoiceGroup {
  id: string;
  title: string;
  hint?: string;
  required: boolean;
  multiple: boolean;
  /** Só aparece para estas opções (ids de Option). Sem isso, vale para todas. */
  appliesTo?: string[];
  choices: Choice[];
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  image?: string;
  art?: { kind: ArtKind; tiers: number; square?: boolean };
  optionLabel?: string;
  options: Option[];
  groups?: ChoiceGroup[];
  badge?: string;
  notePlaceholder?: string;
  /** Kit: items included, shown as a list instead of a photo. */
  includes?: string[];
  fine?: string;
  /** false = esgotado: aparece, mas não dá para pedir. */
  available?: boolean;
  /** false = escondido do catálogo. */
  visible?: boolean;
}

export interface Group {
  id?: string;
  title?: string;
  note?: string;
  products: Product[];
}

export interface Category {
  id: string;
  name: string;
  blurb: string;
  notice?: { title: string; text: string; items?: string[] };
  /** Antecedência mínima da encomenda, em dias. */
  leadDays?: number;
  /** false = escondida do catálogo. */
  visible?: boolean;
  groups: Group[];
}

export interface CartLine {
  key: string;
  productId: string;
  optionId: string;
  /** "grupo:escolha" de cada item marcado. */
  picks: string[];
  qty: number;
  note: string;
}

/** Horário de um dia, em minutos desde 00:00. null = fechado. */
export type DayHours = [open: number, close: number] | null;

export interface Settings {
  whatsapp: string;
  instagram: string;
  city: string;
  address: string;
  /** Chaves "0".."6" (domingo..sábado). */
  hours: Record<string, DayHours>;
  /** Datas de folga, aaaa-mm-dd. */
  closedDates: string[];
  /** Fecha a loja manualmente, independente do horário. */
  forceClosed: { on: boolean; message: string };
  deliveryFee: number;
  deliveryEnabled: boolean;
  pickupEnabled: boolean;
  payments: string[];
  /** Aviso fixo no topo do site. */
  banner: { on: boolean; text: string };
}

export interface CatalogData {
  version: number;
  updatedAt: string;
  settings: Settings;
  categories: Category[];
}

export type OrderStatus = "novo" | "preparo" | "pronto" | "entregue" | "cancelado";

export const ORDER_STATUS: Record<OrderStatus, string> = {
  novo: "Novo",
  preparo: "Em preparo",
  pronto: "Pronto",
  entregue: "Entregue",
  cancelado: "Cancelado",
};

export interface OrderItem {
  productId: string;
  name: string;
  option: string;
  extras: { group: string; label: string; price: number }[];
  qty: number;
  unit: number;
  subtotal: number;
  note: string;
}

export interface Order {
  id: string;
  number: string;
  createdAt: string;
  updatedAt: string;
  status: OrderStatus;
  customer: { name: string; phone: string };
  mode: "retirada" | "entrega";
  address: string;
  reference: string;
  wantedDate: string;
  payment: string;
  change: string;
  notes: string;
  items: OrderItem[];
  subtotal: number;
  fee: number;
  total: number;
  /** Anotação interna do dono. */
  internalNote?: string;
}

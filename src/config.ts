// Valores INICIAIS do catálogo. Depois da primeira publicação, tudo isto é editado no painel (/admin).
import type { Settings } from "./types";

export const SITE_URL = "https://qibuxo-catalogo.vercel.app";
export const STORE_TZ = "America/Fortaleza";

// ---- VALORES FICTÍCIOS iniciais (a pedido do cliente): trocar no painel ----
/** Valor adicional de cada extra dos bolos confeitados, em reais. */
export const EXTRA_PRICES: Record<string, number> = {
  glitter: 15,
  flores: 20,
  topo3d: 25,
  metal: 15,
  frutas: 20,
  doces: 30,
};

/** Antecedência mínima da encomenda, em dias, por categoria. */
export const LEAD_DAYS: Record<string, number> = {
  kits: 3,
  confeitados: 3,
  especiais: 2,
  caseirinhos: 1,
  tortas: 2,
  tortinhas: 1,
  doces: 2,
  salgados: 1,
  sobremesas: 0,
};

export const SEED_SETTINGS: Settings = {
  whatsapp: "5585994084103",
  instagram: "confeitariaqibuxo",
  city: "Ocara, CE",
  address: "R. Maria Joaquina, Ocara - CE, 62755-000",
  hours: {
    "0": [9 * 60, 12 * 60],
    "1": [8 * 60, 18 * 60],
    "2": [8 * 60, 18 * 60],
    "3": [8 * 60, 18 * 60],
    "4": [8 * 60, 18 * 60],
    "5": [8 * 60, 18 * 60],
    "6": [8 * 60, 18 * 60],
  },
  closedDates: [],
  forceClosed: { on: false, message: "" },
  deliveryFee: 2, // FICTÍCIO
  deliveryEnabled: true,
  pickupEnabled: true,
  payments: ["Pix", "Dinheiro", "Cartão"],
  banner: { on: false, text: "" },
};

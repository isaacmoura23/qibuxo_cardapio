import type { CatalogData } from "../../src/types.js";
import { MESA, type MesaMenu } from "../../src/mesa.js";

/**
 * Preços e disponibilidade vêm do Mesa Fácil (fonte única). O catálogo guarda só a
 * apresentação (fotos, textos, kits, ordem). Produtos, tamanhos e adicionais são casados
 * por nome; o que não casar mantém o valor do catálogo. Se o Mesa Fácil não responder, o
 * catálogo sai com os valores que já tem. `MESA_PRICES=off` desliga tudo isto.
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

/** Catálogo com os preços do Mesa Fácil; sem resposta (ou desligado), o próprio catálogo. */
export async function withMesaPrices(catalog: CatalogData): Promise<CatalogData> {
  if (process.env.MESA_PRICES === "off") return catalog;
  const menu = await fetchMenu();
  if (!menu) return catalog;
  const { catalog: merged, report } = applyMesaPrices(catalog, menu);
  if (report.unmatched.length > 0) console.warn("mesa-prices: sem correspondência:", report.unmatched.join(", "));
  return merged;
}

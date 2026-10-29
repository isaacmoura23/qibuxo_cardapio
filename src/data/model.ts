import type { Category, Choice, ChoiceGroup, Product } from "../types";

export const picksKey = (groupId: string, choiceId: string) => `${groupId}:${choiceId}`;

/** Grupos de escolha que valem para a opção selecionada. */
export const visibleGroups = (product: Product, optionId: string): ChoiceGroup[] =>
  (product.groups ?? []).filter((g) => !g.appliesTo || g.appliesTo.length === 0 || g.appliesTo.includes(optionId));

export interface ResolvedPick {
  group: ChoiceGroup;
  choice: Choice;
}

export function resolvePicks(product: Product, picks: string[]): ResolvedPick[] {
  const out: ResolvedPick[] = [];
  for (const g of product.groups ?? []) {
    for (const c of g.choices) if (picks.includes(picksKey(g.id, c.id))) out.push({ group: g, choice: c });
  }
  return out;
}

export interface Index {
  productIndex: Map<string, Product>;
  categoryOf: Map<string, Category>;
}

export function buildIndex(categories: Category[]): Index {
  const productIndex = new Map<string, Product>();
  const categoryOf = new Map<string, Category>();
  for (const c of categories) {
    for (const g of c.groups) {
      for (const p of g.products) {
        productIndex.set(p.id, p);
        categoryOf.set(p.id, c);
      }
    }
  }
  return { productIndex, categoryOf };
}

export const isAvailable = (p: Product) => p.available !== false;

/** Categorias e produtos que o cliente pode ver. */
export function publicCategories(categories: Category[]): Category[] {
  return categories
    .filter((c) => c.visible !== false)
    .map((c) => ({
      ...c,
      groups: c.groups
        .map((g) => ({ ...g, products: g.products.filter((p) => p.visible !== false) }))
        .filter((g) => g.products.length > 0),
    }))
    .filter((c) => c.groups.length > 0);
}

/** Preço de uma linha: opção + extras pagos marcados. */
export function unitPrice(product: Product, optionId: string, picks: string[]): number | null {
  const option = product.options.find((o) => o.id === optionId);
  if (!option) return null;
  const visible = new Set(
    visibleGroups(product, optionId).flatMap((g) => g.choices.map((c) => picksKey(g.id, c.id))),
  );
  const extras = resolvePicks(product, picks.filter((k) => visible.has(k)));
  return option.price + extras.reduce((n, e) => n + (e.choice.price ?? 0), 0);
}

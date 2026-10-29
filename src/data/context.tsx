import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { CatalogData, Category, Settings } from "../types";
import { buildIndex, publicCategories, type Index } from "./model";
import { seedData } from "./seed";

interface DataApi {
  data: CatalogData;
  settings: Settings;
  /** Só o que o cliente pode ver. */
  cats: Category[];
  index: Index;
  leadDaysOf: (productId: string) => number;
}

const Ctx = createContext<DataApi | null>(null);

async function fetchCatalog(): Promise<CatalogData | null> {
  const ctl = new AbortController();
  const timer = window.setTimeout(() => ctl.abort(), 4500);
  try {
    const r = await fetch("/api/catalog", { signal: ctl.signal, cache: "no-cache", headers: { Accept: "application/json" } });
    if (!r.ok) return null;
    const d = (await r.json()) as CatalogData;
    return d && Array.isArray(d.categories) && d.settings ? d : null;
  } catch {
    return null;
  } finally {
    window.clearTimeout(timer);
  }
}

function Splash() {
  return (
    <div className="splash" role="status" aria-live="polite">
      <img src="/img/marca-logo.webp" alt="" width={96} />
      <p>Carregando o cardápio…</p>
    </div>
  );
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<CatalogData | null>(null);

  useEffect(() => {
    let alive = true;
    fetchCatalog().then((d) => alive && setData(d ?? seedData));
    return () => {
      alive = false;
    };
  }, []);

  const api = useMemo<DataApi | null>(() => {
    if (!data) return null;
    const index = buildIndex(data.categories);
    return {
      data,
      settings: data.settings,
      cats: publicCategories(data.categories),
      index,
      leadDaysOf: (id) => index.categoryOf.get(id)?.leadDays ?? 0,
    };
  }, [data]);

  if (!api) return <Splash />;
  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useData(): DataApi {
  const v = useContext(Ctx);
  if (!v) throw new Error("useData fora do DataProvider");
  return v;
}

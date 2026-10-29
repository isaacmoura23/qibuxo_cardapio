import { BlobPreconditionFailedError, del, get, list, put } from "@vercel/blob";
import type { CatalogData } from "../../src/types.js";
import { seedData } from "../../src/data/seed.js";

export { BlobPreconditionFailedError };

export interface Stored<T> {
  data: T;
  etag: string;
}

export async function readJson<T>(pathname: string): Promise<Stored<T> | null> {
  const r = await get(pathname, { access: "private", useCache: false });
  if (!r || r.statusCode !== 200 || !r.stream) return null;
  const data = (await new Response(r.stream).json()) as T;
  // get() devolve ETag fraco (W/"..."); put(ifMatch) exige o forte.
  return { data, etag: r.blob.etag.replace(/^W\//, "") };
}

export async function writeJson(pathname: string, data: unknown, ifMatch?: string): Promise<string> {
  const r = await put(pathname, JSON.stringify(data), {
    access: "private",
    contentType: "application/json",
    allowOverwrite: true,
    addRandomSuffix: false,
    cacheControlMaxAge: 60,
    ...(ifMatch ? { ifMatch } : {}),
  });
  return (r as { etag?: string }).etag ?? "";
}

export const CATALOG_PATH = "catalog.json";

let cache: { at: number; data: CatalogData } | null = null;

/** Catálogo publicado (ou o inicial, se ainda não houve publicação). Cache curto na memória da função. */
export async function getCatalog(fresh = false): Promise<CatalogData> {
  if (!fresh && cache && Date.now() - cache.at < 15_000) return cache.data;
  const stored = await readJson<CatalogData>(CATALOG_PATH);
  const data = stored?.data ?? seedData;
  cache = { at: Date.now(), data };
  return data;
}

export const dropCatalogCache = () => {
  cache = null;
};

export { del, get, list, put };

import type { CatalogData, Order, OrderStatus } from "../types";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

async function call<T>(action: string, init: { method?: string; body?: unknown; raw?: BodyInit; headers?: Record<string, string>; qs?: string } = {}): Promise<T> {
  const method = init.method ?? "GET";
  const headers: Record<string, string> = { Accept: "application/json", ...init.headers };
  if (method !== "GET") headers["x-qb"] = "1";
  let body: BodyInit | undefined;
  if (init.raw !== undefined) body = init.raw;
  else if (init.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(init.body);
  }
  const r = await fetch(`/api/admin?a=${action}${init.qs ?? ""}`, { method, headers, body, credentials: "same-origin" });
  const data = (await r.json().catch(() => ({}))) as { error?: string } & T;
  if (!r.ok) throw new ApiError(data.error ?? "Algo deu errado. Tente de novo.", r.status);
  return data;
}

export const api = {
  login: (password: string) => call<{ ok: true }>("login", { method: "POST", body: { password } }),
  logout: () => call<{ ok: true }>("logout", { method: "POST" }),
  me: () => call<{ ok: true }>("me"),
  getCatalog: () => call<{ data: CatalogData; etag: string | null; seeded: boolean }>("catalog"),
  saveCatalog: (data: CatalogData, etag: string | null) =>
    call<{ data: CatalogData; etag: string | null }>("catalog", { method: "PUT", body: { data, etag } }),
  uploadImage: (blob: Blob) => call<{ url: string }>("upload", { method: "POST", raw: blob, headers: { "Content-Type": "application/octet-stream" } }),
  orders: () => call<{ orders: (Order & { key: string })[] }>("orders"),
  peekOrders: () => call<{ newest: string | null; count: number }>("orders", { qs: "&peek=1" }),
  updateOrder: (key: string, patch: { status?: OrderStatus; internalNote?: string }) =>
    call<{ order: Order & { key: string } }>("orders", { method: "PATCH", body: { key, ...patch } }),
  deleteOrder: (key: string) => call<{ ok: true }>("orders", { method: "DELETE", body: { key } }),
  changePassword: (current: string, next: string) => call<{ ok: true }>("password", { method: "POST", body: { current, next } }),
};

/** Reduz a foto no navegador (máx. 1400 px, WebP) antes de enviar. */
export async function shrinkImage(file: File, max = 1400): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * scale);
  const h = Math.round(bmp.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Seu navegador não conseguiu preparar a foto.");
  ctx.drawImage(bmp, 0, 0, w, h);
  const out = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/webp", 0.85));
  if (!out) throw new Error("Não foi possível preparar a foto.");
  return out;
}

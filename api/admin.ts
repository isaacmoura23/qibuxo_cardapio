import { randomBytes } from "node:crypto";
import { ORDER_STATUS, type CatalogData, type OrderStatus } from "../src/types.js";
import { sanitizeCatalog, ValidationError } from "../src/shared/sanitize.js";
import { seedData } from "../src/data/seed.js";
import { CATALOG_PATH, dropCatalogCache, put, readJson, writeJson } from "./_lib/blob.js";
import { COOKIE, checkPassword, clearSessionCookie, createSessionCookie, isAuthenticated, lockedFor, recordLogin, setPassword } from "./_lib/auth.js";
import { body, hasCsrfHeader, query, send, type Req, type Res } from "./_lib/http.js";
import { OrderError, deleteOrder, isOrderKey, listOrders, peekOrders, updateOrder } from "./_lib/orders.js";

const MAX_UPLOAD = 3 * 1024 * 1024;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Confere o conteúdo real do arquivo, não só o tipo declarado. */
function sniffImage(buf: Buffer): { ext: string; type: string } | null {
  if (buf.length > 12 && buf.subarray(0, 4).toString() === "RIFF" && buf.subarray(8, 12).toString() === "WEBP") return { ext: "webp", type: "image/webp" };
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { ext: "jpg", type: "image/jpeg" };
  if (buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { ext: "png", type: "image/png" };
  return null;
}

/** API do painel. Tudo, exceto login, exige sessão. */
export default async function handler(req: Req, res: Res) {
  const a = query(req, "a");
  try {
    if (a === "login") {
      if (req.method !== "POST") return send(res, 405, { error: "Método não permitido" });
      const wait = await lockedFor();
      if (wait > 0) return send(res, 429, { error: `Muitas tentativas. Tente de novo em ${wait} min.` });
      await sleep(400);
      const ok = await checkPassword(String(body<{ password?: string }>(req).password ?? ""));
      await recordLogin(ok);
      if (!ok) return send(res, 401, { error: "Senha incorreta." });
      return send(res, 200, { ok: true }, { "Set-Cookie": createSessionCookie() });
    }
    if (a === "logout") return send(res, 200, { ok: true }, { "Set-Cookie": clearSessionCookie() });

    if (!isAuthenticated(req)) return send(res, 401, { error: "Sessão expirada. Entre de novo." });
    if (req.method !== "GET" && !hasCsrfHeader(req)) return send(res, 403, { error: "Requisição recusada." });

    switch (a) {
      case "me":
        return send(res, 200, { ok: true });

      case "catalog": {
        if (req.method === "GET") {
          const stored = await readJson<CatalogData>(CATALOG_PATH);
          return send(res, 200, stored ? { data: stored.data, etag: stored.etag, seeded: false } : { data: seedData, etag: null, seeded: true });
        }
        if (req.method === "PUT") {
          const input = body<{ data?: unknown; etag?: string | null }>(req);
          const stored = await readJson<CatalogData>(CATALOG_PATH);
          if (stored && input.etag !== stored.etag) {
            return send(res, 409, { error: "O catálogo foi alterado em outro lugar. Recarregue a página para ver a versão mais nova." });
          }
          const next = sanitizeCatalog(input.data, stored?.data.version ?? 0);
          await writeJson(CATALOG_PATH, next, stored?.etag);
          dropCatalogCache();
          const fresh = await readJson<CatalogData>(CATALOG_PATH);
          return send(res, 200, { data: fresh?.data ?? next, etag: fresh?.etag ?? null, seeded: false });
        }
        return send(res, 405, { error: "Método não permitido" });
      }

      case "upload": {
        if (req.method !== "POST") return send(res, 405, { error: "Método não permitido" });
        const buf = req.body;
        if (!Buffer.isBuffer(buf) || buf.length === 0) return send(res, 400, { error: "Arquivo não recebido." });
        if (buf.length > MAX_UPLOAD) return send(res, 413, { error: "Foto grande demais (máximo 3 MB)." });
        const kind = sniffImage(buf);
        if (!kind) return send(res, 400, { error: "Envie uma foto em WebP, JPEG ou PNG." });
        const name = `media/${randomBytes(9).toString("hex")}.${kind.ext}`;
        await put(name, buf, { access: "private", contentType: kind.type, addRandomSuffix: false, cacheControlMaxAge: 31536000 });
        return send(res, 201, { url: `/api/media?p=${name}` });
      }

      case "orders": {
        if (req.method === "GET") {
          if (query(req, "peek")) return send(res, 200, await peekOrders());
          return send(res, 200, { orders: await listOrders(60) });
        }
        const input = body<{ key?: string; status?: string; internalNote?: string }>(req);
        if (!isOrderKey(input.key)) return send(res, 400, { error: "Pedido inválido." });
        if (req.method === "PATCH") {
          if (input.status && !(input.status in ORDER_STATUS)) return send(res, 400, { error: "Status inválido." });
          const order = await updateOrder(input.key, { status: input.status as OrderStatus | undefined, internalNote: input.internalNote });
          return send(res, 200, { order: { ...order, key: input.key } });
        }
        if (req.method === "DELETE") {
          await deleteOrder(input.key);
          return send(res, 200, { ok: true });
        }
        return send(res, 405, { error: "Método não permitido" });
      }

      case "password": {
        if (req.method !== "POST") return send(res, 405, { error: "Método não permitido" });
        const { current, next } = body<{ current?: string; next?: string }>(req);
        if (!(await checkPassword(String(current ?? "")))) return send(res, 401, { error: "Senha atual incorreta." });
        const pw = String(next ?? "");
        if (pw.length < 8 || pw.length > 100) return send(res, 400, { error: "A nova senha precisa ter de 8 a 100 caracteres." });
        await setPassword(pw);
        return send(res, 200, { ok: true });
      }

      default:
        return send(res, 404, { error: "Ação desconhecida." });
    }
  } catch (e) {
    if (e instanceof ValidationError) return send(res, 400, { error: e.message });
    if (e instanceof OrderError) return send(res, e.status, { error: e.message });
    const name = (e as { name?: string }).name;
    if (name === "BlobPreconditionFailedError") return send(res, 409, { error: "Alguém alterou este item ao mesmo tempo. Recarregue e tente de novo." });
    console.error("admin", a, e);
    return send(res, 500, { error: "Erro no servidor." });
  }
}

export { COOKIE };

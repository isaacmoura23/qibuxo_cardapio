import { Readable } from "node:stream";
import { get } from "@vercel/blob";
import { query, type Req, type Res } from "./_lib/http.js";

/** Fotos enviadas pelo painel (ficam no armazenamento privado; só esta função as serve). */
export default async function handler(req: Req, res: Res) {
  if (req.method !== "GET") return res.status(405).end();
  const p = query(req, "p");
  if (!/^media\/[A-Za-z0-9._-]{1,120}$/.test(p)) return res.status(400).end();
  try {
    const ifNoneMatch = typeof req.headers["if-none-match"] === "string" ? req.headers["if-none-match"] : undefined;
    const r = await get(p, { access: "private", ...(ifNoneMatch ? { ifNoneMatch } : {}) });
    if (!r) return res.status(404).end();
    res.setHeader("ETag", r.blob.etag);
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    res.setHeader("X-Content-Type-Options", "nosniff");
    if (r.statusCode === 304 || !r.stream) return res.status(304).end();
    res.setHeader("Content-Type", r.blob.contentType);
    res.status(200);
    Readable.fromWeb(r.stream as never).pipe(res);
  } catch (e) {
    console.error("media", e);
    res.status(500).end();
  }
}

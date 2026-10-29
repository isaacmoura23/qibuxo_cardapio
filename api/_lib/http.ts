import type { VercelRequest, VercelResponse } from "@vercel/node";

export type Req = VercelRequest;
export type Res = VercelResponse;

export function send(res: Res, status: number, body: unknown, headers: Record<string, string> = {}) {
  res.setHeader("Cache-Control", "no-store");
  for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
  res.status(status).json(body);
}

export function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of (header ?? "").split(";")) {
    const i = part.indexOf("=");
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

export function clientIp(req: Req): string {
  const fwd = req.headers["x-forwarded-for"];
  const raw = Array.isArray(fwd) ? fwd[0] : fwd;
  return (raw ?? req.socket?.remoteAddress ?? "unknown").split(",")[0]!.trim();
}

export const query = (req: Req, key: string): string => {
  const v = req.query[key];
  return Array.isArray(v) ? (v[0] ?? "") : (v ?? "");
};

/** Pedidos de escrita do painel precisam do cabeçalho x-qb (navegadores não o enviam entre sites sem permissão). */
export const hasCsrfHeader = (req: Req) => req.headers["x-qb"] === "1";

export const body = <T = Record<string, unknown>>(req: Req): T => {
  const b = req.body;
  if (b && typeof b === "object" && !Buffer.isBuffer(b)) return b as T;
  if (typeof b === "string") {
    try {
      return JSON.parse(b) as T;
    } catch {
      return {} as T;
    }
  }
  return {} as T;
};

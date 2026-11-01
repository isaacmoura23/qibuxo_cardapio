import { createHash } from "node:crypto";
import { getCatalog, readJson, writeJson } from "./_lib/blob.js";
import { withMesaData } from "./_lib/mesa-sync.js";
import { body, clientIp, send, type Req, type Res } from "./_lib/http.js";
import { OrderError, buildOrder, type OrderInput } from "./_lib/orders.js";

const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 6;

/** Limite simples por IP para o formulário público não virar spam no painel. */
async function allowed(ip: string): Promise<boolean> {
  const key = `rl/${createHash("sha256").update(ip).digest("hex").slice(0, 32)}.json`;
  const now = Date.now();
  const cur = (await readJson<{ t: number[] }>(key))?.data.t ?? [];
  const recent = cur.filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_PER_WINDOW) return false;
  await writeJson(key, { t: [...recent, now] });
  return true;
}

/** Reserva (Mesa Fácil fora do ar): valida e recalcula o pedido no servidor e devolve o número; o pedido segue pelo WhatsApp. Nada é gravado. */
export default async function handler(req: Req, res: Res) {
  if (req.method !== "POST") return send(res, 405, { error: "Método não permitido" });
  try {
    const input = body<OrderInput & { website?: string }>(req);
    if (input.website) return send(res, 200, { ok: true, number: "QB-OK", id: "x", total: 0 }); // isca para robôs
    if (!(await allowed(clientIp(req)))) return send(res, 429, { error: "Muitos pedidos em pouco tempo. Tente de novo em alguns minutos." });
    const catalog = await withMesaData(await getCatalog());
    const order = buildOrder(input, catalog);
    return send(res, 201, { ok: true, number: order.number, id: order.id, total: order.total, fee: order.fee });
  } catch (e) {
    if (e instanceof OrderError) return send(res, e.status, { error: e.message });
    console.error("orders", e);
    return send(res, 500, { error: "Não foi possível registrar o pedido." });
  }
}

import { getCatalog } from "./_lib/blob.js";
import { withMesaData } from "./_lib/mesa-sync.js";
import type { Req, Res } from "./_lib/http.js";

/** Catálogo público (somente leitura). */
export default async function handler(req: Req, res: Res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Método não permitido" });
  try {
    const data = await withMesaData(await getCatalog(true));
    // Navegador sempre revalida; só a rede da Vercel guarda por 10 s (as mudanças do painel aparecem rápido).
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Vercel-CDN-Cache-Control", "max-age=10");
    return res.status(200).json(data);
  } catch (e) {
    console.error("catalog", e);
    return res.status(500).json({ error: "Catálogo indisponível" });
  }
}

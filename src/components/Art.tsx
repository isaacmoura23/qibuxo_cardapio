import type { Product } from "../types";

export function Heart({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className="heart">
      <path
        d="M12 21s-7.5-4.6-9.6-9.2C.9 8.3 2.6 4.8 6 4.5c2.2-.2 3.9.9 6 3.1 2.1-2.2 3.8-3.3 6-3.1 3.4.3 5.1 3.8 3.6 7.3C19.5 16.4 12 21 12 21z"
        fill="currentColor"
      />
    </svg>
  );
}

/** Ilustração de bolo em andares, usada onde não há foto do produto. */
export function TierCake({ tiers, square }: { tiers: number; square?: boolean }) {
  const th = Math.min(46, 84 / tiers);
  const baseW = 118;
  const step = tiers > 1 ? 74 / (tiers * 1.0) / 2 + 4 : 0;
  const layers = Array.from({ length: tiers }, (_, i) => {
    const w = baseW - i * (step * 2);
    const y = 104 - th * (i + 1);
    return { w, x: 80 - w / 2, y, i };
  });
  const top = layers[layers.length - 1];
  const rx = square ? 3 : 10;
  const vbTop = Math.max(0, top.y - 24);
  return (
    <svg viewBox={`0 ${vbTop} 160 ${118 - vbTop}`} role="img" aria-label={`Ilustração de bolo de ${tiers} ${tiers === 1 ? "andar" : "andares"}`} className="tiercake">
      <ellipse cx="80" cy="108" rx="66" ry="6" className="tc-plate" />
      {layers.map((l) => (
        <g key={l.i}>
          <rect x={l.x} y={l.y} width={l.w} height={th} rx={rx} className="tc-body" />
          <path
            d={`M${l.x + 6} ${l.y + th * 0.34} q${(l.w - 12) / 8} ${th * 0.28} ${(l.w - 12) / 4} 0 t${(l.w - 12) / 4} 0 t${(l.w - 12) / 4} 0 t${(l.w - 12) / 4} 0`}
            className="tc-drip"
          />
        </g>
      ))}
      <g transform={`translate(80 ${layers[0]!.y + th / 2 + 4}) scale(${th > 30 ? 1.2 : 0.8})`}>
        <path d="M0 9 C-14 0 -12 -10 -6 -10 C-3 -10 -1 -8 0 -6 C1 -8 3 -10 6 -10 C12 -10 14 0 0 9z" className="tc-heart" />
      </g>
      {[-24, 0, 24].map((dx) => (
        <g key={dx} transform={`translate(${80 + dx} ${top.y - 7})`}>
          <path d="M0 -7 C6 -7 8 0 0 8 C-8 0 -6 -7 0 -7z" className="tc-berry" />
          <path d="M-3 -8 L0 -12 L3 -8z" className="tc-leaf" />
        </g>
      ))}
    </svg>
  );
}

export function ProductMedia({ product, image }: { product: Product; image?: string }) {
  if (product.art) return <TierCake tiers={product.art.tiers} square={product.art.square} />;
  return <img src={image ?? product.image} alt={product.name} loading="lazy" decoding="async" />;
}

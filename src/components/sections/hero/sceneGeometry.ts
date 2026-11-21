/**
 * Deterministic geometry for the illustrated hero scene.
 * Seeded, so server and client markup are identical (no hydration drift).
 * Coordinates live in a 1600×1000 viewBox with the horizon at y=690.
 */

export const VIEWBOX = "0 0 1600 1000";
export const HORIZON = 690;
export const SUN = { x: 1236, y: HORIZON + 22, r: 92 };

function rng(seed: number) {
  return () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
}

const r1 = (n: number) => Math.round(n * 10) / 10;

export type Block = { x: number; w: number; h: number; spire: boolean };

/** Skyline band. `tall` raises a downtown cluster between the given x bounds. */
export function skyline(seed: number, opts: { min: number; max: number; tall?: [number, number, number] }): Block[] {
  const rand = rng(seed);
  const out: Block[] = [];
  for (let x = -10; x < 1610; ) {
    const w = 10 + Math.floor(rand() * 30);
    const inTall = opts.tall && x > opts.tall[0] && x < opts.tall[1];
    const h = inTall ? opts.max * 0.4 + rand() * opts.tall![2] : opts.min + rand() * (opts.max - opts.min);
    out.push({ x, w, h, spire: inTall === true && rand() > 0.8 });
    x += w + Math.floor(rand() * 3);
  }
  return out;
}

/** Buildings as one path: fewer DOM nodes, crisp silhouette. */
export function skylinePath(blocks: Block[]): string {
  return blocks
    .map((b) => {
      const top = HORIZON - b.h;
      const spire = b.spire ? `L${b.x + b.w / 2 - 1} ${top} L${b.x + b.w / 2} ${top - b.h * 0.25} L${b.x + b.w / 2 + 1} ${top} ` : "";
      return `M${b.x} ${HORIZON + 2} L${b.x} ${top} ${spire}L${b.x + b.w} ${top} L${b.x + b.w} ${HORIZON + 2}Z`;
    })
    .join("");
}

/** Sparse lit windows. */
export function windows(blocks: Block[], seed: number, density: number): { x: number; y: number }[] {
  const rand = rng(seed);
  const out: { x: number; y: number }[] = [];
  for (const b of blocks) {
    if (b.h < 22) continue;
    const n = Math.floor((b.h / 14) * density);
    for (let i = 0; i < n; i++) {
      if (rand() > 0.55) continue;
      out.push({ x: r1(b.x + 3 + rand() * (b.w - 6)), y: r1(HORIZON - b.h + 6 + rand() * (b.h - 10)) });
    }
  }
  return out;
}

/** Sun glitter on water: short strokes that widen and scatter with distance (perspective). */
export function glitter(seed: number): { x: number; y: number; w: number; h: number; o: number }[] {
  const rand = rng(seed);
  const out = [];
  for (let k = 0; k < 34; k++) {
    const y = HORIZON + 4 + Math.pow(k, 1.6) * 1.5 + rand() * 3;
    const spread = 14 + k * 3.2;
    const segments = 1 + Math.floor(rand() * 3);
    for (let s = 0; s < segments; s++) {
      const w = (8 + rand() * 46) * (1 - k / 60);
      out.push({
        x: r1(SUN.x - w / 2 + (rand() - 0.5) * spread * 1.6),
        y: r1(y + (rand() - 0.5) * 2),
        w: r1(w),
        h: r1(1 + k * 0.05),
        o: Math.round(Math.max(0.05, 0.6 * (1 - k / 34)) * (0.5 + rand() * 0.5) * 100) / 100,
      });
    }
  }
  return out;
}

/**
 * Palm frond in local space: origin at the crown, pointing +x, drooping under gravity.
 * Returns the rachis (midrib) and all leaflets as two path strings.
 */
export function frond(length: number, seed: number): { rachis: string; leaves: string } {
  const rand = rng(seed);
  const P0 = { x: 0, y: 0 };
  const C = { x: length * 0.46, y: -length * 0.16 };
  const P1 = { x: length, y: length * 0.24 };
  const at = (t: number) => ({
    x: (1 - t) ** 2 * P0.x + 2 * (1 - t) * t * C.x + t * t * P1.x,
    y: (1 - t) ** 2 * P0.y + 2 * (1 - t) * t * C.y + t * t * P1.y,
  });
  const tangent = (t: number) => ({
    x: 2 * (1 - t) * (C.x - P0.x) + 2 * t * (P1.x - C.x),
    y: 2 * (1 - t) * (C.y - P0.y) + 2 * t * (P1.y - C.y),
  });

  let leaves = "";
  const count = 32;
  for (let i = 0; i < count; i++) {
    const t = 0.1 + (0.88 * i) / (count - 1);
    const p = at(t);
    const d = tangent(t);
    const a = Math.atan2(d.y, d.x);
    const len = length * 0.3 * Math.pow(Math.sin(Math.PI * Math.min(t * 1.1, 0.98)), 0.75) * (0.8 + rand() * 0.35);
    for (const side of [1, -1]) {
      const spread = 0.55 + rand() * 0.2; // leaflets sweep toward the tip
      let vx = Math.cos(a + side * spread);
      let vy = Math.sin(a + side * spread) + 0.4; // gravity
      const m = Math.hypot(vx, vy);
      vx /= m;
      vy /= m;
      const ex = p.x + vx * len;
      const ey = p.y + vy * len;
      const cx = p.x + vx * len * 0.5;
      const cy = p.y + vy * len * 0.5 - len * 0.12;
      leaves += `M${r1(p.x)} ${r1(p.y)}Q${r1(cx)} ${r1(cy)} ${r1(ex)} ${r1(ey)}`;
    }
  }
  return { rachis: `M0 0Q${r1(C.x)} ${r1(C.y)} ${r1(P1.x)} ${r1(P1.y)}`, leaves };
}

/** Tapered, slightly curved trunk from crown (x,y) to ground (bx, 1000). */
export function trunk(x: number, y: number, bx: number, scale: number): string {
  const top = 5 * scale;
  const bottom = 11 * scale;
  const mx = x + (bx - x) * 0.25 + 18 * scale;
  const my = y + (1000 - y) * 0.5;
  return `M${r1(x - top)} ${y} Q${r1(mx - (top + bottom) / 2)} ${r1(my)} ${r1(bx - bottom)} 1000 L${r1(bx + bottom)} 1000 Q${r1(mx + (top + bottom) / 2)} ${r1(my)} ${r1(x + top)} ${y}Z`;
}

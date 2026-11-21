import type { AssetId } from "@/config/payments";
import { cn } from "@/lib/utils";

/**
 * Simple original coin marks: brand colour + recognisable glyph. Not official logos.
 * Decorative: always paired with the ticker in text.
 */
const COINS: Record<AssetId, { bg: string; fg: string; glyph: string }> = {
  USDT: { bg: "#26A17B", fg: "#fff", glyph: "₮" },
  USDC: { bg: "#2775CA", fg: "#fff", glyph: "$" },
  BTC: { bg: "#F7931A", fg: "#fff", glyph: "₿" },
  ETH: { bg: "#627EEA", fg: "#fff", glyph: "Ξ" },
  BNB: { bg: "#F3BA2F", fg: "#1e1e1e", glyph: "◆" },
  SOL: { bg: "linear-gradient(135deg,#9945FF,#14F195)", fg: "#fff", glyph: "≡" },
  TRX: { bg: "#EF0027", fg: "#fff", glyph: "▼" },
  LTC: { bg: "#345D9D", fg: "#fff", glyph: "Ł" },
  POL: { bg: "#8247E5", fg: "#fff", glyph: "∞" },
};

export function CoinIcon({ asset, className }: { asset: AssetId; className?: string }) {
  const c = COINS[asset];
  return (
    <span
      aria-hidden
      className={cn("grid size-9 shrink-0 place-items-center rounded-full text-[0.95em] leading-none font-bold shadow-[inset_0_-2px_0_rgb(0_0_0/0.18)]", className)}
      style={{ background: c.bg, color: c.fg }}
    >
      {c.glyph}
    </span>
  );
}

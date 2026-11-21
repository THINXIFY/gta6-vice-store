import Image from "next/image";
import type { MediaItem } from "@/config/types";
import { cn } from "@/lib/utils";

type MediaFrameProps = {
  item: MediaItem;
  /** Responsive `sizes` hint for next/image. */
  sizes?: string;
  priority?: boolean;
  /** Fill the parent (full-bleed) instead of locking the asset's aspect ratio. */
  cover?: boolean;
  className?: string;
};

/**
 * Aspect-locked media slot. Renders the configured asset, or original
 * placeholder art (pure CSS, no third-party imagery) when `src` is empty.
 */
export function MediaFrame({ item, sizes = "100vw", priority = false, cover = false, className }: MediaFrameProps) {
  return (
    <div
      className={cn("overflow-hidden bg-midnight", cover ? "absolute inset-0" : "relative", className)}
      style={cover ? undefined : { aspectRatio: `${item.width} / ${item.height}` }}
    >
      {item.src ? (
        <Image src={item.src} alt={item.alt} fill sizes={sizes} priority={priority} className="object-cover" />
      ) : (
        <div role="img" aria-label={`${item.alt} (placeholder)`} className="absolute inset-0 bg-dusk">
          <div className="absolute inset-0 bg-sunset-glow" />
          <div className="absolute inset-x-0 bottom-[38%] h-px bg-linear-to-r from-transparent via-sunset/60 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-[38%] bg-linear-to-b from-obsidian/40 to-obsidian" />
        </div>
      )}
    </div>
  );
}

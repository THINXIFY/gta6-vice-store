"use client";

import { Expand, ExternalLink, X, ZoomIn, ZoomOut } from "lucide-react";
import { useRef, useState } from "react";

/** Payment screenshot with a fullscreen viewer (native dialog: Esc closes, focus is trapped). */
export function ScreenshotViewer({ src, alt, meta }: { src: string; alt: string; meta: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [actual, setActual] = useState(false);
  const open = () => {
    setActual(false);
    dialog.current?.showModal();
  };

  return (
    <>
      <button type="button" onClick={open} className="group relative block overflow-hidden rounded-lg border border-line focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vice">
        {/* eslint-disable-next-line @next/next/no-img-element -- private, session-protected route; must not go through the public image optimizer */}
        <img src={src} alt={alt} className="max-h-[28rem] w-auto" />
        <span className="absolute right-2 bottom-2 inline-flex items-center gap-1.5 rounded-md bg-obsidian/80 px-2 py-1 text-xs font-semibold text-warm opacity-90 backdrop-blur group-hover:opacity-100">
          <Expand aria-hidden className="size-3.5" />
          View fullscreen
        </span>
      </button>
      <p className="mt-2 text-xs text-warm/45">{meta}</p>

      <dialog
        ref={dialog}
        aria-label={alt}
        onClick={(e) => e.target === dialog.current && dialog.current?.close()}
        className="m-0 h-dvh max-h-none w-screen max-w-none bg-obsidian/95 p-0 text-warm backdrop:bg-obsidian/80"
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
            <p className="truncate text-sm font-medium">{alt}</p>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => setActual((v) => !v)} className="inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm hover:bg-warm/10">
                {actual ? <ZoomOut aria-hidden className="size-4" /> : <ZoomIn aria-hidden className="size-4" />}
                {actual ? "Fit to screen" : "Actual size"}
              </button>
              <a href={src} target="_blank" rel="noopener" className="inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm hover:bg-warm/10">
                <ExternalLink aria-hidden className="size-4" />
                <span className="max-sm:sr-only">Open in new tab</span>
              </a>
              <button type="button" onClick={() => dialog.current?.close()} className="grid size-9 place-items-center rounded-lg hover:bg-warm/10" autoFocus>
                <X aria-hidden className="size-5" />
                <span className="sr-only">Close</span>
              </button>
            </div>
          </div>
          <div data-lenis-prevent className={`flex min-h-0 flex-1 overflow-auto p-4 ${actual ? "items-start justify-start" : "items-center justify-center"}`}>
            {/* eslint-disable-next-line @next/next/no-img-element -- see above */}
            <img src={src} alt="" className={actual ? "max-w-none" : "max-h-full max-w-full object-contain"} />
          </div>
        </div>
      </dialog>
    </>
  );
}

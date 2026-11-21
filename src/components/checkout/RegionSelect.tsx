"use client";

import { Check, ChevronDown, Globe, Search } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { accountRegions } from "@/config/payments";
import { cn } from "@/lib/utils";

type Region = (typeof accountRegions)[number];

/** Case- and accent-insensitive text for matching ("turkiye" finds Türkiye). */
const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
/** Common short names people type. */
const ALIASES: Record<string, string> = { usa: "us", america: "us", uk: "uk", britain: "uk", england: "uk", uae: "ae", emirates: "ae", ksa: "sa", korea: "kr", holland: "nl", czech: "cz" };

/**
 * Console account country picker: a button that opens a searchable listbox.
 * Keyboard: Enter/Space/↓ opens; type to filter; ↑/↓/Home/End move; Enter picks; Esc closes.
 * The search field keeps focus and points at the active option (aria-activedescendant).
 */
export function RegionSelect({
  value,
  onChange,
  labelId,
  invalid,
  describedBy,
  className,
}: {
  value: string;
  onChange: (id: string) => void;
  labelId: string;
  invalid?: boolean;
  describedBy?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const uid = useId();
  const selected = accountRegions.find((r) => r.id === value);

  const filtered: Region[] = useMemo(() => {
    const q = fold(query.trim());
    if (!q) return [...accountRegions];
    const alias = ALIASES[q];
    const starts = accountRegions.filter((r) => fold(r.label).startsWith(q) || r.id === alias);
    const contains = accountRegions.filter((r) => !starts.includes(r) && fold(r.label).includes(q));
    return [...starts, ...contains];
  }, [query]);
  const optionId = (id: string) => `${uid}-opt-${id}`;

  const close = (refocus = true) => {
    setOpen(false);
    setQuery("");
    if (refocus) trigger.current?.focus();
  };
  const pick = (r: Region) => {
    onChange(r.id);
    close();
  };
  const openList = () => {
    setActive(Math.max(0, accountRegions.findIndex((r) => r.id === value)));
    setOpen(true);
  };

  // Focus the search field on open; close on a click outside.
  useEffect(() => {
    if (!open) return;
    search.current?.focus();
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  // Keep the active option in view.
  const activeId = open && filtered[active] ? optionId(filtered[active].id) : undefined;
  useEffect(() => {
    if (activeId) document.getElementById(activeId)?.scrollIntoView({ block: "nearest" });
  }, [activeId]);

  const onSearchKey = (e: KeyboardEvent<HTMLInputElement>) => {
    const n = filtered.length;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (n) setActive((i) => (e.key === "ArrowDown" ? (i + 1) % n : (i - 1 + n) % n));
    } else if (e.key === "Home" || e.key === "End") {
      e.preventDefault();
      setActive(e.key === "Home" ? 0 : Math.max(0, n - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const r = filtered[active];
      if (r) pick(r);
    } else if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "Tab") {
      close(false);
    }
  };

  return (
    <div ref={root} className={cn("relative", className)}>
      <button
        ref={trigger}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={`${labelId} ${uid}-value`}
        aria-describedby={describedBy}
        data-region-trigger
        onClick={() => (open ? close() : openList())}
        onKeyDown={(e) => {
          if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
            e.preventDefault();
            openList();
          }
        }}
        className={cn(
          "flex h-13 w-full items-center gap-3 rounded-xl border bg-obsidian/60 px-4 text-left text-[0.9375rem] transition-colors focus:outline-none focus-visible:border-sunset/70",
          open ? "border-sunset/70" : invalid ? "border-vice/70" : "border-warm/14 hover:border-warm/30",
        )}
      >
        <Globe aria-hidden className={cn("size-4 shrink-0", selected ? "text-sunset" : "text-warm/40")} />
        <span id={`${uid}-value`} className={cn("min-w-0 flex-1 truncate", !selected && "text-warm/45")}>
          {selected ? selected.label : "Choose your country"}
        </span>
        <ChevronDown aria-hidden className={cn("size-4 shrink-0 text-warm/50 transition-transform duration-300", open && "rotate-180")} />
      </button>

      {open && (
        <div className="swap-in absolute inset-x-0 top-[calc(100%+0.5rem)] z-30 overflow-hidden rounded-xl border border-warm/12 bg-panel shadow-[0_24px_60px_-12px_rgb(0_0_0/0.75)]">
          <div className="flex items-center gap-2.5 border-b border-warm/10 px-4">
            <Search aria-hidden className="size-4 shrink-0 text-warm/45" />
            <input
              ref={search}
              type="text"
              role="combobox"
              aria-expanded
              aria-controls={`${uid}-list`}
              aria-activedescendant={activeId}
              aria-autocomplete="list"
              aria-label="Search countries"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(0);
              }}
              onKeyDown={onSearchKey}
              placeholder="Search countries"
              autoComplete="off"
              spellCheck={false}
              className="h-12 w-full bg-transparent text-sm text-warm placeholder:text-warm/40 focus:outline-none"
            />
          </div>
          <ul id={`${uid}-list`} role="listbox" aria-labelledby={labelId} data-lenis-prevent className="max-h-[min(20rem,50vh)] overflow-y-auto overscroll-contain p-1.5">
            {filtered.length === 0 && <li className="px-3 py-6 text-center text-sm text-warm/50">No match. Try another spelling, or choose “Another country or region”.</li>}
            {filtered.map((r, i) => {
              const isSelected = r.id === value;
              return (
                <li
                  key={r.id}
                  id={optionId(r.id)}
                  role="option"
                  aria-selected={isSelected}
                  onPointerMove={() => setActive(i)}
                  onClick={() => pick(r)}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                    i === active ? "bg-warm/[0.07] text-warm" : "text-warm/80",
                    isSelected && "font-semibold text-warm",
                  )}
                >
                  <span className="min-w-0 flex-1 truncate">{r.label}</span>
                  {isSelected && <Check aria-hidden className="size-4 shrink-0 text-sunset" strokeWidth={2.5} />}
                </li>
              );
            })}
          </ul>
          <p className="hidden border-t border-warm/10 px-4 py-2 text-xs text-warm/40 sm:block">Type to search, use the arrow keys to move and Enter to choose.</p>
        </div>
      )}
    </div>
  );
}

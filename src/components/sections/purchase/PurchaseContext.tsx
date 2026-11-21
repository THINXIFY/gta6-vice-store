"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { defaultEdition, defaultPlatform } from "@/config/product";
import type { Edition, EditionId, Platform, PlatformId, Price } from "@/config/types";
import { catalogPlatforms, pricedEditions, type Catalog } from "@/lib/catalog";

type PurchaseState = {
  platformId: PlatformId;
  editionId: EditionId;
  platform: Platform;
  edition: Edition;
  price: Price | undefined;
  /** Editions with live prices from the database. */
  editions: Edition[];
  /** Verified platforms with live availability. */
  platforms: Platform[];
  setPlatform: (id: PlatformId) => void;
  setEdition: (id: EditionId) => void;
};

const PurchaseContext = createContext<PurchaseState | null>(null);

/** Shared selection (and live catalog) for the configurator, comparison and purchase bar. */
export function PurchaseProvider({ catalog, children }: { catalog: Catalog; children: ReactNode }) {
  const editions = useMemo(() => pricedEditions(catalog), [catalog]);
  const platforms = useMemo(() => catalogPlatforms(catalog), [catalog]);
  const [platformId, setPlatform] = useState<PlatformId>(() => (platforms.find((p) => p.id === defaultPlatform && p.available) ?? platforms.find((p) => p.available) ?? platforms[0]!).id);
  const [editionId, setEdition] = useState<EditionId>(defaultEdition);

  const value = useMemo<PurchaseState>(() => {
    const platform = platforms.find((p) => p.id === platformId) ?? platforms[0]!;
    const edition = editions.find((e) => e.id === editionId) ?? editions[0]!;
    return { platformId, editionId, platform, edition, price: edition.prices[platformId], editions, platforms, setPlatform, setEdition };
  }, [platformId, editionId, editions, platforms]);

  return <PurchaseContext.Provider value={value}>{children}</PurchaseContext.Provider>;
}

export function usePurchase(): PurchaseState {
  const ctx = useContext(PurchaseContext);
  if (!ctx) throw new Error("usePurchase must be used inside <PurchaseProvider>");
  return ctx;
}

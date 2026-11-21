"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Catalog } from "@/lib/catalog";

const CatalogContext = createContext<Catalog | null>(null);

/** Makes the live catalogue (from the root layout) available to every client component. */
export function CatalogProvider({ catalog, children }: { catalog: Catalog; children: ReactNode }) {
  return <CatalogContext.Provider value={catalog}>{children}</CatalogContext.Provider>;
}

export function useCatalog(): Catalog {
  const c = useContext(CatalogContext);
  if (!c) throw new Error("useCatalog must be used inside <CatalogProvider>");
  return c;
}

"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { PageId } from "@/config/site";
import type { Copy } from "@/lib/content";
import { pageHref, type Published } from "@/lib/pages";

type Value = { copy: Copy; published: Published };
const ContentContext = createContext<Value | null>(null);

/**
 * This client's section wording and page publish state (from the root layout) for client
 * components. Only public wording travels here; FAQ and policy drafts stay on the server.
 */
export function ContentProvider({ copy, published, children }: Value & { children: ReactNode }) {
  return <ContentContext.Provider value={{ copy, published }}>{children}</ContentContext.Provider>;
}

function useValue(): Value {
  const v = useContext(ContentContext);
  if (!v) throw new Error("useCopy/usePageHref must be used inside <ContentProvider>");
  return v;
}

export const useCopy = () => useValue().copy;
export function usePageHref() {
  const { published } = useValue();
  return (id: PageId) => pageHref(id, published);
}

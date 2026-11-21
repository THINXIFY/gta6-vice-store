"use client";

import { AlertTriangle } from "lucide-react";

/** Unexpected failure inside an admin page. Details stay in the server logs. */
export default function AdminError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div role="alert" className="grid justify-items-start gap-3 rounded-2xl border border-vice/25 bg-vice/[0.06] p-6">
      <AlertTriangle aria-hidden className="size-5 text-danger-soft" />
      <h1 className="text-lg font-semibold">This page could not load</h1>
      <p className="text-sm text-warm/65">Nothing was changed. Try again, and if it keeps failing check the server logs.</p>
      <button onClick={reset} className="h-9 rounded-lg bg-warm px-4 text-sm font-semibold text-obsidian hover:bg-white">
        Try again
      </button>
    </div>
  );
}

import { ArrowDown, ArrowUp, ExternalLink, Lock, RotateCcw } from "lucide-react";
import { Button, Card, Flash, input, PageHeader } from "@/components/admin/ui";
import { BLOCKS, navFrom } from "@/lib/blocks";
import { cn } from "@/lib/utils";
import { requireAdmin } from "@/server/auth";
import { getHome } from "@/server/home";
import { homeBlockAction, moveHomeBlockAction, resetHomeAction } from "../../actions";

export const metadata = { title: "Homepage" };

const iconButton = "grid size-9 place-items-center rounded-lg border border-line-strong bg-panel-2 text-warm/70 transition-colors hover:border-lavender/35 hover:text-warm disabled:pointer-events-none disabled:opacity-30";

/**
 * Admin → Homepage (WL-3): which blocks the home page shows, in what order, and which appear in
 * the menu. The outline on the right previews the result, dividers and menu included.
 */
export default async function Homepage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  await requireAdmin("owner");
  const [blocks, flash] = await Promise.all([getHome(), searchParams]);
  const nav = navFrom(blocks);
  const shown = blocks.filter((b) => b.enabled);

  return (
    <div className="grid gap-5">
      <PageHeader
        title="Homepage"
        description="Choose the sections your home page shows, their order and the menu. Changes go live immediately."
        actions={
          <div className="flex gap-2">
            <a href="/" target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center gap-2 rounded-lg border border-line-strong px-4 text-sm font-semibold text-warm/80 hover:text-warm">
              View site <ExternalLink aria-hidden className="size-4" />
            </a>
            <form action={resetHomeAction}>
              <Button variant="secondary">
                <RotateCcw aria-hidden className="size-4" /> Reset to default
              </Button>
            </form>
          </div>
        }
      />
      <Flash ok={flash.ok} error={flash.error} />

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <Card title="Sections" actions={<span className="text-xs text-warm/45">Top to bottom, as on the page</span>}>
          <ol className="grid gap-2.5">
            {blocks.map((b, i) => {
              const meta = BLOCKS[b.id];
              const first = b.id === "hero";
              return (
                <li key={b.id} data-block={b.id} className={cn("flex flex-wrap items-center gap-3 rounded-xl border p-3 transition-colors sm:flex-nowrap", b.enabled ? "border-line bg-panel-2/50" : "border-line/60 border-dashed bg-transparent")}>
                  <span aria-hidden className={cn("grid size-8 shrink-0 place-items-center rounded-lg font-mono text-xs", b.enabled ? "bg-sunset/15 text-sunset" : "bg-warm/5 text-warm/35")}>
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className={cn("flex items-center gap-2 text-sm font-semibold", !b.enabled && "text-warm/50")}>
                      {meta.name}
                      {meta.required && (
                        <span className="inline-flex items-center gap-1 text-[0.6875rem] font-medium text-warm/40">
                          <Lock aria-hidden className="size-3" /> Always on
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-warm/45">{meta.description}</p>
                  </div>

                  <form action={homeBlockAction} className="flex items-center gap-2.5">
                    <input type="hidden" name="id" value={b.id} />
                    <input name="nav" defaultValue={b.nav} placeholder="Not in menu" aria-label={`${meta.name} menu label`} className={`${input} h-9 w-32`} />
                    <label className="flex items-center gap-1.5 text-xs text-warm/70">
                      <input type="checkbox" name="enabled" defaultChecked={b.enabled} disabled={meta.required} aria-label={`Show ${meta.name}`} className="size-4 accent-sunset" />
                      Show
                    </label>
                    {meta.required && <input type="hidden" name="enabled" value="true" />}
                    <Button variant="secondary" className="h-9 px-3">
                      Save
                    </Button>
                  </form>

                  <div className="flex gap-1.5">
                    {(["up", "down"] as const).map((dir) => {
                      const blocked = first || (dir === "up" ? i <= 1 : i === blocks.length - 1);
                      return (
                        <form key={dir} action={moveHomeBlockAction}>
                          <input type="hidden" name="id" value={b.id} />
                          <input type="hidden" name="direction" value={dir} />
                          <button disabled={blocked} aria-label={`Move ${meta.name} ${dir}`} className={iconButton}>
                            {dir === "up" ? <ArrowUp aria-hidden className="size-4" /> : <ArrowDown aria-hidden className="size-4" />}
                          </button>
                        </form>
                      );
                    })}
                  </div>
                </li>
              );
            })}
          </ol>
        </Card>

        {/* Live outline: what visitors get, top to bottom, with the resulting menu. */}
        <aside className="grid gap-5 xl:sticky xl:top-6">
          <Card title="Menu">
            {nav.length ? (
              <ul aria-label="Menu preview" className="flex flex-wrap gap-1.5 rounded-full border border-line bg-well p-1.5">
                {nav.map((n, i) => (
                  <li key={n.href} className={cn("rounded-full px-3 py-1.5 text-xs font-medium", i === 0 ? "bg-panel-2 text-warm" : "text-warm/65")}>
                    {n.label}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-warm/50">No menu items. Add a label to a section to show it in the menu.</p>
            )}
            <p className="mt-3 text-xs text-warm/45">Up to 7 items. Hidden sections drop out of the menu automatically.</p>
          </Card>
          <Card title="Page outline">
            <ol aria-label="Page outline" className="grid gap-1">
              {shown.map((b, i) => {
                const prev = shown[i - 1];
                const divider = prev && prev.id !== "hero" && BLOCKS[prev.id].group !== BLOCKS[b.id].group;
                return (
                  <li key={b.id}>
                    {divider && <span aria-hidden className="mx-auto my-1.5 block h-px w-2/3 bg-[linear-gradient(90deg,transparent,var(--color-vice),var(--color-lavender),transparent)] opacity-60" />}
                    <span className={cn("flex items-center justify-between gap-2 rounded-md px-2.5 py-2 text-xs", b.id === "hero" ? "bg-[linear-gradient(100deg,color-mix(in_oklab,var(--color-vice)_22%,transparent),color-mix(in_oklab,var(--color-sunset)_14%,transparent))] font-semibold text-warm" : "bg-panel-2 text-warm/75")}>
                      {BLOCKS[b.id].name}
                      {b.nav && <span className="text-[0.625rem] text-warm/40">in menu</span>}
                    </span>
                  </li>
                );
              })}
              <li className="mt-1 rounded-md border border-dashed border-line px-2.5 py-2 text-xs text-warm/40">Footer</li>
            </ol>
          </Card>
        </aside>
      </div>
    </div>
  );
}

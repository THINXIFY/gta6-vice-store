import { ArrowDown, ArrowUp, ChevronDown, ExternalLink, Plus, RotateCcw, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { Button, Card, Flash, input, label, PageHeader, Segmented, select } from "@/components/admin/ui";
import { pendingItems } from "@/config/legal";
import { faqGroups, type FaqItem } from "@/config/policies";
import { site, type PageId } from "@/config/site";
import { COPY_SECTIONS, copyFields, type Copy } from "@/lib/content";
import { sectionsToText } from "@/lib/legal-text";
import { cn } from "@/lib/utils";
import { requireAdmin } from "@/server/auth";
import { getContent } from "@/server/content";
import { copyAction, deleteFaqAction, deleteNoteAction, faqAction, moveFaqAction, noteAction, pageAction, publishAction, resetCopyAction } from "../../actions";

export const metadata = { title: "Content" };

type Tab = "text" | "faq" | "notes" | "pages";
const TABS: { id: Tab; label: string }[] = [
  { id: "text", label: "Section text" },
  { id: "faq", label: "FAQ" },
  { id: "notes", label: "Purchase notes" },
  { id: "pages", label: "Pages" },
];

const textarea = `${input} h-auto min-h-20 py-2 leading-relaxed`;
const check = "size-4 accent-sunset";

function Editor({ summary, children, open, id }: { summary: ReactNode; children: ReactNode; open?: boolean; id?: string }) {
  return (
    <details id={id} open={open} className="group scroll-mt-24 rounded-xl border border-line bg-panel-2/40 open:bg-panel-2/70">
      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
        <div className="min-w-0 flex-1">{summary}</div>
        <ChevronDown aria-hidden className="size-4 shrink-0 text-warm/45 transition-transform group-open:rotate-180" />
      </summary>
      <div className="border-t border-line px-4 py-4">{children}</div>
    </details>
  );
}

function Pill({ tone, children }: { tone: "good" | "draft" | "warn" | "muted"; children: ReactNode }) {
  const tones = { good: "bg-success/12 text-success-soft", draft: "bg-warm/8 text-warm/55", warn: "bg-warning/12 text-warning-soft", muted: "bg-lavender/12 text-lavender" };
  return <span className={cn("rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold whitespace-nowrap", tones[tone])}>{children}</span>;
}

/**
 * Admin → Content (WL-4): the store's wording. Section text, FAQ, purchase-panel notes and the
 * information pages, all stored as changes over the defaults so "Reset" always works.
 */
export default async function ContentPage({ searchParams }: { searchParams: Promise<{ tab?: string; at?: string; ok?: string; error?: string }> }) {
  await requireAdmin("owner");
  const [content, q] = await Promise.all([getContent(), searchParams]);
  const tab: Tab = TABS.some((t) => t.id === q.tab) ? (q.tab as Tab) : "text";

  return (
    <div className="grid gap-5">
      <PageHeader
        title="Content"
        description="Your store's wording. Changes go live immediately; drafts never show on the live site."
        actions={
          <a href="/" target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center gap-2 rounded-lg border border-line-strong px-4 text-sm font-semibold text-warm/80 hover:text-warm">
            View site <ExternalLink aria-hidden className="size-4" />
          </a>
        }
      />
      <Segmented label="Content" options={TABS.map((t) => ({ href: `/admin/content?tab=${t.id}`, label: t.label, active: t.id === tab }))} />
      <Flash ok={q.ok} error={q.error} />

      {tab === "text" && <SectionText copy={content.copy} overrides={content.copyOverrides} at={q.at} />}
      {tab === "faq" && <FaqEditor faq={content.faq} />}
      {tab === "notes" && <Notes notes={content.notes} />}
      {tab === "pages" && <Pages content={content} at={q.at} />}
    </div>
  );
}

function SectionText({ copy, overrides, at }: { copy: Copy; overrides: Record<string, string>; at?: string }) {
  const fields = copyFields(copy);
  const defaults = new Map(copyFields().map((f) => [f.path, f.value]));
  return (
    <div className="grid gap-3">
      <p className="text-sm text-warm/55">Clear a field and save to go back to the default text. Changed fields are marked.</p>
      {(Object.keys(COPY_SECTIONS) as (keyof Copy)[]).map((section) => {
        const own = fields.filter((f) => f.section === section);
        const changed = own.filter((f) => f.path in overrides).length;
        return (
          <Editor
            key={section}
            id={`copy-${section}`}
            open={at === section}
            summary={
              <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="font-medium">{COPY_SECTIONS[section]}</span>
                <span className="text-xs text-warm/45">{own.length} {own.length === 1 ? "text" : "texts"}</span>
                {changed > 0 && <Pill tone="muted">{changed} changed</Pill>}
              </span>
            }
          >
            <form action={copyAction} className="grid gap-4 sm:grid-cols-2">
              <input type="hidden" name="section" value={section} />
              {own.map((f) => {
                const long = (defaults.get(f.path) ?? "").length > 70;
                return (
                  <label key={f.path} className={cn(label, long && "sm:col-span-2")}>
                    <span className="flex items-center gap-2">
                      {f.label}
                      {f.path in overrides && <Pill tone="muted">Changed</Pill>}
                    </span>
                    {long ? (
                      <textarea name={`f:${f.path}`} defaultValue={f.value} rows={2} placeholder={defaults.get(f.path)} className={textarea} />
                    ) : (
                      <input name={`f:${f.path}`} defaultValue={f.value} placeholder={defaults.get(f.path)} className={input} />
                    )}
                  </label>
                );
              })}
              <div className="flex gap-2 sm:col-span-2">
                <Button>Save {COPY_SECTIONS[section].toLowerCase()}</Button>
              </div>
            </form>
            {changed > 0 && (
              <form action={resetCopyAction} className="mt-3">
                <input type="hidden" name="section" value={section} />
                <Button variant="secondary" className="h-9 px-3 text-xs">
                  <RotateCcw aria-hidden className="size-3.5" /> Reset this section
                </Button>
              </form>
            )}
          </Editor>
        );
      })}
    </div>
  );
}

function FaqForm({ item }: { item?: FaqItem }) {
  return (
    <form action={faqAction} className="grid gap-4 sm:grid-cols-[1fr_12rem]">
      {item && <input type="hidden" name="id" value={item.id} />}
      <label className={label}>
        Question
        <input name="question" required defaultValue={item?.question} className={input} />
      </label>
      <label className={label}>
        Topic
        <select name="group" defaultValue={item?.group ?? "buying"} className={select}>
          {faqGroups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.label}
            </option>
          ))}
        </select>
      </label>
      <label className={cn(label, "sm:col-span-2")}>
        Answer (lead with the direct answer)
        <textarea name="answer" required defaultValue={item?.answer} rows={4} className={textarea} />
      </label>
      <label className={cn(label, "sm:col-span-2")}>
        Source (optional, shown under the answer)
        <input name="source" defaultValue={item?.source} placeholder="e.g. rockstargames.com/VI" className={input} />
      </label>
      <div className="flex flex-wrap items-center gap-5 sm:col-span-2">
        <label className="flex items-center gap-2 text-sm text-warm/75">
          <input type="checkbox" name="published" defaultChecked={item ? item.status === "verified" : false} className={check} /> Published
        </label>
        <label className="flex items-center gap-2 text-sm text-warm/75">
          <input type="checkbox" name="checkoutOnly" defaultChecked={item?.requires === "checkout"} className={check} /> Only while checkout is open
        </label>
        <Button className="ml-auto">{item ? "Save question" : "Add question"}</Button>
      </div>
    </form>
  );
}

function FaqEditor({ faq }: { faq: FaqItem[] }) {
  return (
    <Card title={`Questions (${faq.length})`} actions={<span className="text-xs text-warm/45">Drafts show only in local preview. Published answers also feed search results.</span>}>
      <div className="grid gap-2.5">
        {faq.map((f, i) => (
          <div key={f.id} data-faq={f.id} className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <Editor
                summary={
                  <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="font-medium">{f.question}</span>
                    {f.status === "verified" ? <Pill tone="good">Published</Pill> : <Pill tone="draft">Draft</Pill>}
                    <span className="text-xs text-warm/45">{faqGroups.find((g) => g.id === f.group)?.label}</span>
                    {f.requires === "checkout" && <span className="text-xs text-warm/45">Checkout only</span>}
                  </span>
                }
              >
                <FaqForm item={f} />
                <form action={deleteFaqAction} className="mt-3">
                  <input type="hidden" name="id" value={f.id} />
                  <Button variant="danger" className="h-9 px-3 text-xs">
                    <Trash2 aria-hidden className="size-3.5" /> Remove question
                  </Button>
                </form>
              </Editor>
            </div>
            <div className="flex flex-col gap-1.5 pt-1">
              {(["up", "down"] as const).map((dir) => (
                <form key={dir} action={moveFaqAction}>
                  <input type="hidden" name="id" value={f.id} />
                  <input type="hidden" name="direction" value={dir} />
                  <button
                    disabled={dir === "up" ? i === 0 : i === faq.length - 1}
                    aria-label={`Move "${f.question}" ${dir}`}
                    className="grid size-8 place-items-center rounded-lg border border-line-strong bg-panel-2 text-warm/70 hover:text-warm disabled:opacity-30"
                  >
                    {dir === "up" ? <ArrowUp aria-hidden className="size-3.5" /> : <ArrowDown aria-hidden className="size-3.5" />}
                  </button>
                </form>
              ))}
            </div>
          </div>
        ))}
        <Editor
          summary={
            <span className="inline-flex items-center gap-2 text-sm font-medium text-sunset">
              <Plus aria-hidden className="size-4" /> Add a question
            </span>
          }
        >
          <FaqForm />
        </Editor>
      </div>
    </Card>
  );
}

type Note = { id: string; title: string; body: string; status: string };

function NoteForm({ n }: { n?: Note }) {
  return (
    <form action={noteAction} className="grid gap-4">
      {n && <input type="hidden" name="id" value={n.id} />}
      <label className={label}>
        Title (for you)
        <input name="title" required defaultValue={n?.title} className={input} />
      </label>
      <label className={label}>
        Text shown under the buy button
        <textarea name="body" required defaultValue={n?.body} rows={2} className={textarea} />
      </label>
      <div className="flex items-center gap-5">
        <label className="flex items-center gap-2 text-sm text-warm/75">
          <input type="checkbox" name="published" defaultChecked={n ? n.status === "verified" : false} className={check} /> Published
        </label>
        <Button className="ml-auto">{n ? "Save note" : "Add note"}</Button>
      </div>
    </form>
  );
}

function Notes({ notes }: { notes: Note[] }) {
  return (
    <Card title="Purchase notes" actions={<span className="text-xs text-warm/45">Short facts under the buy button. Publish only what is confirmed.</span>}>
      <div className="grid gap-2.5">
        {notes.map((n) => (
          <Editor
            key={n.id}
            summary={
              <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="font-medium">{n.title}</span>
                {n.status === "verified" ? <Pill tone="good">Published</Pill> : <Pill tone="draft">Draft</Pill>}
                <span className="truncate text-xs text-warm/45">{n.body}</span>
              </span>
            }
          >
            <NoteForm n={n} />
            <form action={deleteNoteAction} className="mt-3">
              <input type="hidden" name="id" value={n.id} />
              <Button variant="danger" className="h-9 px-3 text-xs">
                <Trash2 aria-hidden className="size-3.5" /> Remove note
              </Button>
            </form>
          </Editor>
        ))}
        <Editor
          summary={
            <span className="inline-flex items-center gap-2 text-sm font-medium text-sunset">
              <Plus aria-hidden className="size-4" /> Add a note
            </span>
          }
        >
          <NoteForm />
        </Editor>
        <p className="mt-1 text-xs text-warm/45">The platform note is shown elsewhere on the page and is skipped here.</p>
      </div>
    </Card>
  );
}

function Pages({ content, at }: { content: Awaited<ReturnType<typeof getContent>>; at?: string }) {
  const ids = Object.keys(site.pages) as PageId[];
  return (
    <div className="grid gap-3">
      <p className="text-sm text-warm/55">
        A page goes live only when you publish it, and it can be published only once every <span className="rounded bg-warning/12 px-1 text-warning-soft">To confirm</span> item is replaced with your real details.
      </p>
      {ids.map((id) => {
        const page = content.pages[id];
        const pending = pendingItems(page);
        const live = content.published[id];
        return (
          <Editor
            key={id}
            id={`page-${id}`}
            open={at === id}
            summary={
              <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="font-medium">{site.pages[id].label}</span>
                {live ? <Pill tone="good">Published</Pill> : <Pill tone="draft">Draft</Pill>}
                {pending.length > 0 && <Pill tone="warn">{pending.length} to confirm</Pill>}
                <span className="text-xs text-warm/45">{site.pages[id].href}</span>
              </span>
            }
          >
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-well px-4 py-3">
              <div className="text-sm">
                {pending.length ? (
                  <>
                    <p className="font-medium text-warning-soft">Still to confirm before publishing:</p>
                    <ul className="mt-1.5 flex flex-wrap gap-1.5">
                      {[...new Set(pending)].map((p) => (
                        <li key={p} className="rounded bg-warning/10 px-1.5 py-0.5 text-xs text-warning-soft">
                          {p}
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <p className="text-success-soft">{live ? "Live on your site." : "Ready to publish."}</p>
                )}
              </div>
              <form action={publishAction}>
                <input type="hidden" name="id" value={id} />
                <input type="hidden" name="publish" value={live ? "false" : "true"} />
                <Button variant={live ? "secondary" : "success"} disabled={!live && pending.length > 0}>
                  {live ? "Unpublish" : "Publish page"}
                </Button>
              </form>
            </div>

            <form action={pageAction} className="grid gap-4 sm:grid-cols-2">
              <input type="hidden" name="id" value={id} />
              <label className={label}>
                Browser title (60 max)
                <input name="title" required maxLength={60} defaultValue={page.title} className={input} />
              </label>
              <label className={label}>
                Page heading
                <input name="heading" required defaultValue={page.heading} className={input} />
              </label>
              <label className={cn(label, "sm:col-span-2")}>
                Search description (160 max)
                <input name="description" maxLength={160} defaultValue={page.description} className={input} />
              </label>
              <label className={cn(label, "sm:col-span-2")}>
                Introduction
                <textarea name="intro" defaultValue={page.intro} rows={3} className={textarea} />
              </label>
              <label className={cn(label, "sm:col-span-2")}>
                <span>
                  Page text: <code className="text-warm/80">## Heading</code> starts a section, a blank line starts a new paragraph, lines starting with <code className="text-warm/80">- </code> make a list. Replace each{" "}
                  <code className="text-warm/80">{"{{…}}"}</code> with your real details.
                </span>
                <textarea name="sections" defaultValue={sectionsToText(page.sections)} rows={18} spellCheck className={`${textarea} font-mono text-[0.8125rem]`} />
              </label>
              <div className="flex flex-wrap items-end gap-4 sm:col-span-2">
                <label className={label}>
                  Last updated (YYYY-MM-DD)
                  <input name="updated" defaultValue={page.updated ?? ""} placeholder="2026-11-21" className={`${input} w-40 font-mono`} />
                </label>
                <Button className="ml-auto">Save page</Button>
              </div>
            </form>
          </Editor>
        );
      })}
    </div>
  );
}

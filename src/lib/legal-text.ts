import type { Block, Section } from "@/config/legal";

/**
 * Plain-text format for editing information pages in admin:
 *
 *   ## Section heading
 *   A paragraph (lines join up until a blank line).
 *
 *   - A list item
 *   - Another item
 *
 * {{markers}} stay as written and show as "To confirm" until replaced.
 */
const slug = (t: string) =>
  t
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "section";

export function sectionsToText(sections: Section[]): string {
  return sections
    .map((s) => [`## ${s.heading}`, ...s.body.map((b) => (typeof b === "string" ? b : b.list.map((i) => `- ${i}`).join("\n")))].join("\n\n"))
    .join("\n\n");
}

export function textToSections(text: string): Section[] {
  const sections: Section[] = [];
  const used = new Set<string>();
  let current: Section | null = null;
  for (const chunk of text.replace(/\r/g, "").split(/\n\s*\n/)) {
    const lines = chunk.split("\n").map((l) => l.trim()).filter(Boolean);
    if (!lines.length) continue;
    if (lines[0]!.startsWith("## ")) {
      const heading = lines.shift()!.slice(3).trim();
      let id = slug(heading);
      while (used.has(id)) id += "-2";
      used.add(id);
      current = { id, heading, body: [] };
      sections.push(current);
      if (!lines.length) continue;
    }
    if (!current) {
      current = { id: "details", heading: "Details", body: [] };
      sections.push(current);
    }
    const block: Block = lines.every((l) => l.startsWith("- ")) ? { list: lines.map((l) => l.slice(2).trim()) } : lines.join(" ");
    current.body.push(block);
  }
  return sections;
}

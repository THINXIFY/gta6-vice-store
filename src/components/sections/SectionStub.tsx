import { Container, Display, Section } from "@/components/ui/Layout";

/** Anchor target for a section that is not built yet, so nav links never dead-end. */
export function SectionStub({ id, title, tone = "obsidian" }: { id: string; title: string; tone?: "obsidian" | "midnight" }) {
  return (
    <Section id={id} tone={tone} aria-labelledby={`${id}-title`}>
      <Container>
        <Display id={`${id}-title`} size="md">{title}</Display>
        <p className="mt-4 text-warm/56">This section is being built.</p>
      </Container>
    </Section>
  );
}

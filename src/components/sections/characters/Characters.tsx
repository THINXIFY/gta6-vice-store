import Image from "next/image";
import { Container } from "@/components/ui/Layout";
import { Glow } from "@/components/ui/Atmosphere";
import { getCopy } from "@/server/content";
import { characterArt } from "@/config/media";
import { characters } from "@/config/product";
import { isUsable } from "@/lib/media";
import { cn } from "@/lib/utils";
import { CharactersMotion } from "./CharactersMotion";

type Character = (typeof characters)[number];

const accent = { jason: "bg-lavender", lucia: "bg-vice" } as const;

function Bio({ c, align }: { c: Character; align: "start" | "end" }) {
  return (
    <article data-bio={c.id} aria-labelledby={`character-${c.id}`} className={cn("max-w-[24rem]", align === "end" && "xl:ml-auto xl:text-right")}>
      <span aria-hidden className={cn("block h-1 w-12 rounded-full", accent[c.id], align === "end" && "xl:ml-auto")} />
      <h3 id={`character-${c.id}`} className="mt-5 font-display leading-[0.82] font-extrabold uppercase">
        <span className="block text-[clamp(3.5rem,1.5rem+4vw,6rem)]">{c.firstName}</span>{" "}
        <span className="mt-[0.08em] block text-[clamp(2rem,1.2rem+2.6vw,4rem)] text-warm/35">{c.lastName}</span>
      </h3>
      <p className="mt-5 leading-relaxed text-warm/72">{c.bio}</p>
    </article>
  );
}

/** One slice of the shared key art, showing source pixels [x0, x1) at full height. */
function Slice({ id, range }: { id: "jason" | "lucia"; range: [number, number] }) {
  const [x0, x1] = range;
  const { image } = characterArt;
  return (
    <div
      data-slice={id}
      className="relative h-full overflow-hidden"
      style={{ aspectRatio: `${x1 - x0} / ${image.height}` }}
    >
      <Image
        src={image.src}
        alt=""
        width={image.width}
        height={image.height}
        sizes="(min-width: 64rem) 1280px, 180vw"
        className="absolute top-0 h-full w-auto max-w-none"
        style={{ left: `${(-x0 / (x1 - x0)) * 100}%` }}
      />
    </div>
  );
}

/**
 * Jason and Lucia: two slices of one key-art frame that start apart and close into a
 * single picture on scroll (two lives, one story). Without usable art, the bios stand
 * alone in the same layout.
 */
export async function Characters() {
  // Wording from Admin → Content (defaults in src/config/content.ts).
  const copy = await getCopy();
  const charactersCopy = copy.characters;
  const [jason, lucia] = characters;
  const art = isUsable(characterArt.image);

  return (
    <CharactersMotion>
      <section id="characters" aria-labelledby="characters-title" className="relative isolate overflow-hidden bg-dusk py-section">
        <Glow tone="lavender" className="left-[4%] top-[28%] size-[42rem]" strength={0.24} speed={0.55} />
        <Glow tone="vice" className="right-[4%] top-[38%] size-[42rem]" strength={0.22} speed={0.35} />
        <div aria-hidden className="bg-sunset-glow pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-2/3 opacity-40" />
        <Container>
          <h2 id="characters-title" data-reveal-heading className="text-center font-display text-display-lg font-extrabold tracking-[-0.005em] text-balance">
            {charactersCopy.heading}
          </h2>

          <div className="mt-14 grid items-end gap-x-10 gap-y-12 md:grid-cols-2 lg:mt-20 xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] xl:gap-x-16">
            <div className="order-2 xl:order-1 xl:pb-10">
              <Bio c={jason} align="end" />
            </div>

            {art ? (
              <div
                role="img"
                aria-label={characterArt.image.alt}
                className="order-1 mx-auto flex aspect-[742/720] w-full max-w-[40rem] justify-center md:col-span-2 xl:order-2 xl:col-span-1 xl:aspect-auto xl:h-[min(72vh,44rem)] xl:w-auto xl:max-w-none"
              >
                <Slice id="jason" range={characterArt.slices.jason} />
                <Slice id="lucia" range={characterArt.slices.lucia} />
              </div>
            ) : (
              <div aria-hidden className="order-1 hidden xl:order-2 xl:block xl:w-px xl:self-stretch xl:bg-warm/15" />
            )}

            <div className="order-3 xl:pb-10">
              <Bio c={lucia} align="start" />
            </div>
          </div>
          {art && <p className="mt-10 text-center text-xs text-warm/40">Key art: {characterArt.image.credit}</p>}
        </Container>
      </section>
    </CharactersMotion>
  );
}

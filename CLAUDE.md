# VICE STORE storefront

Independent retailer landing page + storefront for Grand Theft Auto VI. Creative direction: "VICE — Cinematic Commerce" (cinematic Vice City storytelling + Apple-clean purchasing).

## Hard rules
- **Original design only.** Never clone Rockstar's site, copy its layout/copy, or imply official affiliation. The owner removed the on-site "Not affiliated" notice (2026-11-21); the credits page keeps the trademark attribution.
- **No unverified facts.** Prices, contents, dates, availability, delivery claims live in `src/config/*` with `verified` flags. Unconfirmed price = `amount: null`. Never invent reviews, discounts, endorsements or stock.
- **Media.** All site images live in git-ignored `public/media/` (neutral file names) and render whenever `src` is set (`isUsable` in `lib/media.ts`); no licence gating (owner decision 2026-11-24). `npm run media:package` packs them for the VPS. Never use the Rockstar logo itself. Trailers play via YouTube embed (`trailerEmbeds` switch), never rehosted. Empty `src` → original drawn art.
- **Checkout switch**: `commerce.checkoutEnabled` = `NEXT_PUBLIC_CHECKOUT_ENABLED=true` (opt-in, build time; on in local `.env.local`, off on the VPS until launch safeguards are confirmed, GTA-DEPLOY-01) and never in the isolated e2e build (`NEXT_PUBLIC_CHECKOUT_TEST_MODE=1`, distDir `.next-e2e`, refused for `.next`). Payment methods: exactly five pairs in `config/payments.ts` (USDT BEP20/TRC20, BTC, ETH ERC20, BNB BEP20); live addresses also in Admin → Wallets.
- **Lean deps.** Don't add libraries, MCP servers or plugins without approval. Rejected: Motion (overlaps GSAP), Swiper (use CSS scroll-snap; Embla only if needed), clsx/tailwind-merge (`cn` in `lib/utils`).
- Work in phases; stop for approval at the end of each.

## Stack
Next.js 16 App Router · React 19 · TypeScript 6 (strict) · Tailwind CSS 4 (tokens in `src/app/globals.css` `@theme`) · GSAP + ScrollTrigger · Lenis · Lucide · Playwright. Node 24.

## Structure
```
src/app/            routes, layout (fonts, metadata, skip link), globals.css (design tokens)
src/components/ui/  Button, Container/Section/Display/Lead (Layout.tsx), Price, MediaFrame
src/components/motion/  SmoothScroll (Lenis↔GSAP ticker), Reveal
src/components/layout/    Header (scroll state, native <dialog> mobile menu)
src/components/sections/  hero/ (Hero, HeroArt = licensed <picture> or fallback, HeroScene + sceneGeometry = original seeded SVG scene, HeroMotion = intro/ken-burns/scroll depth/pointer parallax via `data-depth`, HeroParticles = canvas neon motes, off under reduced motion), purchase/ (PurchaseContext = shared platform/edition selection, PurchaseSection = art + configurator `#editions`, CompareEditions `#compare`, StickyPurchaseBar, EditionArt = licensed `editionArt` or drawn per-edition art, BuyButton = disabled until checkoutEnabled), explore/Explore + ExploreMotion (oversized LEONIDA title, scrubbed full-bleed scene, official regions, night portrait; stub without usable media), characters/Characters + CharactersMotion (Jason/Lucia slices of one key-art frame that join on scroll), trailers/Trailers (click-to-load youtube-nocookie player + playlist), gallery/Gallery + Lightbox (detail crops, native-dialog viewer), faq/Faq (native details accordion; drafts only with NEXT_PUBLIC_CONTENT_PREVIEW=1), purchase/ClosingCta, seo/StructuredData (VideoGame + FAQPage from verified data only), assurance/Assurance (steps publish only when all verified; verified reassurances), SectionStub (anchor target for unbuilt sections). layout/Footer (configured links only; base="/" off the home page). app/credits (media credits from `mediaCredits`)
review/             design-review screenshots per phase
src/config/         product.ts (game, platforms, editions, prices), site.ts (brand/seller/nav), content.ts (copy), media.ts, types.ts
src/lib/            pricing.ts, utils.ts (cn), motion/{gsap.ts, useGsap.ts, presets.ts}
tests/e2e/          Playwright (desktop + mobile projects)
```

## White-label (one copy per client)
- Client-specific identity lives in `src/brand/` (brand.ts, fonts.ts, fonts/*.woff) + env; see docs/white-label.md. Never hard-code a colour, name or font in components: use tokens (`success*`, `warning*`, `danger-*`, `blend`, admin surfaces) and `site`/`brand`. Icons, share image and email colours are generated from brand.ts. Translucent brand colours as `color-mix(in_oklab,var(--color-x)_N%,transparent)`, never RGB triplets.
- Catalogue (WL-2): read editions, platforms, prices and contents only via `getCatalog()` (server) or `useCatalog()`/`usePurchase()` (client), never from `config/product.ts` (seed only). Ids are free-form slugs (`EditionId`/`PlatformId` = string); hide, never delete.
- Home page (WL-3): sections are blocks (`src/lib/blocks.ts`), order/visibility/menu from `getHome()` (Admin → Homepage, seed `src/brand/home.ts`). The menu is `getNav()`, never a hard-coded list; a new section needs a block id, an anchor and a group. Links into a block must disappear when it is off.
- Content (WL-4): section wording via `getCopy()` (server) / `useCopy()` (client), FAQ/notes/pages via `getContent()` (server only: drafts never reach the client), page links via `pageHref(id, published)` / `usePageHref()`. Never import copy from config/content.ts in components (defaults only). Pages publish only with zero `{{…}}` markers.
- Payments (WL-5): `config/payments.ts` = supported coins/networks only. Offered methods and addresses live only in `payment_methods` (Admin → Wallets; starting list `src/brand/payments.ts`), reach the client as `catalog.methods`. Never put an address in code. Email sender name/reply-to/alert recipients in Admin → Emails (`emailIdentity()`); SMTP and From address stay in env.
- Launch (WL-6): Admin → Launch checklist (`src/server/launch.ts`) is the source of truth for go-live readiness; add a check there for any new launch requirement. `/api/health` (DB ping), `npm run db:backup`, `npm run new-client`, Dockerfile + docker-compose.yml (untested here: no Docker on this machine), docs/deploy.md. Production Postgres runs the same idempotent seed on first use.

## Design system
- Colors (this client): obsidian #08080D, midnight #171020, vice #FF579A, sunset #FF9B62, lavender #B28CFF, warm #FFF4EB, set in `src/brand/brand.ts` and injected by layout.tsx (globals.css `@theme` holds defaults only). Use opacity modifiers (`text-warm/72`) for hierarchy.
- Type: `font-display` Big Shoulders (uppercase, extrabold, `text-display-{xl,lg,md}`), `font-sans` Hanken Grotesk (`text-title`, `text-lead`).
- Rhythm: `px-gutter`, `py-section`, `max-w-content`, `max-w-measure`. Radii: `rounded-control` (pills), `rounded-media`.
- The header (`glass-bar`, `nav-pill` in globals.css) is the only glass surface; keep glassmorphism out of everything else.
- Gradients only on large surfaces (`bg-dusk`, `bg-sunset-glow`, `text-sunset`). Avoid: glassmorphism, neon borders, card grids everywhere, all-caps eyebrow labels, motion on every element.
- Project skill `.claude/skills/frontend-design` applies to all UI work.
- `Button variant="sunset"` is the signature purchase CTA — header, hero and the closing CTA only. Film grain via the `grain` utility.
- Hero art: set `heroArt.desktop/mobile.src` (usable assets only) to replace the drawn scene; `focus` sets object-position per crop; `includesLogo` hides the drawn VI.

## Motion
- Import gsap only from `@/lib/motion/gsap`. Animate via `useGsap` (scoped, auto-reverted, skipped when reduced motion is preferred) and `presets.ts`.
- One orchestrated moment per section. Content must be fully visible without JS / with reduced motion. `Reveal` is for below-the-fold only.
- Lenis is off under `prefers-reduced-motion`. Add `data-lenis-prevent` to inner scroll areas. In-page nav uses `scrollToHash`; call `getLenis()?.start()` before scrolling if Lenis may be stopped.
- Above-the-fold intros: an inline script adds `html.motion-ok` before paint; CSS hides `[data-hero-intro]` until GSAP adds `html.hero-ready` (3s CSS failsafe).
- Hero scroll story (HeroMotion): desktop pins a block wrapper `[data-hero-pin]` inside a server-rendered `[data-hero-spacer]` with `pinSpacing: false`; the scroll distance is `[data-hero-pin-distance]` (85vh in globals.css, must match `end: "+=85%"`). Never let ScrollTrigger add spacing or wrap the hero (it shifted layout, moved scroll and lost clicks). Animate transforms/opacity only; no SVG/CSS filters on repainting content. "VI" hand-off: `[data-handoff-anchor]` → `[data-handoff-target]`.
- Show facts only when `verified` (e.g. the hero hides the release date until it is confirmed).
- Backend: Drizzle + Postgres (`src/db/schema.ts`, `drizzle/`, `src/server/*` server-only). Admin dashboard at `/admin` (auth in `src/server/auth.ts`; every page/action calls `requireAdmin()` itself). CSP nonce via `src/proxy.ts`. Local/tests use PGlite (`.data/`). Never import `src/server/*` from client code. See docs/checkout-architecture.md.
- 09C: rates `src/server/rates.ts` (server-only, locked 30 min), QR `src/lib/qr.ts` + `lib/orders/paymentUri.ts` (no deps), admin TOTP `src/server/totp.ts` (`ADMIN_REQUIRE_2FA`), screenshot retention (`SCREENSHOT_RETENTION_DAYS`, purge-only trigger). Never run `next build` while a dev server holds the PGlite DB (enforced by `scripts/pglite-lock.mjs`).
- 09D email: `src/server/email/*` (own SMTP client, templates, `notifyOrder` after commit, `email_messages` dedupe log, no bodies stored). `EMAIL_MODE=test` default (redirect to `EMAIL_TEST_RECIPIENT`); live only with checkoutEnabled. Game-ready email links with a 30-day release key, never the code. `npm run test:email`; Playwright uses a fake inbox (`tests/e2e/mail-sink.ts`).
- Brand/SEO (GTA-BRAND-01/11B): brand, tagline, title and domain live in `site.ts` (`<Wordmark>` renders `brand.logo`, built from `src/brand/assets/` by `npm run brand:assets`, else VICE + sunset STORE); domain only via `NEXT_PUBLIC_SITE_URL` (never Rockstar/Take-Two marks). Indexing is on by default (`lib/seo.ts`; `NEXT_PUBLIC_INDEXABLE=false` closes robots/sitemap and adds noindex for staging). JSON-LD is one gated `@graph` (Organization = brand name/URL/logo, legalName and email only once confirmed; Product/Offer only when checkout open + policies published). `next build` never opens PGlite. Strategy and audit: docs/seo-strategy.md.
- Info pages (GTA-11A): content in server-only `config/legal.ts`, publish flags in `site.pages`; support in `server/support.ts` → Admin → Support.
- Admin (GTA-10): live/test stats never mixed; orders list sort/filter/pagination; CSV export owner-only + audited; /admin/emails. Correlated subqueries must use `ORDER_ID` (qualified), not `${s.orders.id}`.
- Checkout: `src/config/payments.ts` (assets, networks, wallet slots: offered only when validated + address), `src/lib/orders/*` (types + admin transitions, Payment IDs, quotes, `orderStore` boundary). Reachable only with checkoutEnabled or content preview. Redemption codes never in frontend config.
- Policy/commercial copy (steps, assurances, FAQ) lives in server-only `src/config/policies.ts`: never import it from a "use client" file. Drafts render only with NEXT_PUBLIC_CONTENT_PREVIEW=1 (marked `data-status="draft"`).
- Edition comparison renders `editionContents` (verified from the rendered Rockstar store) and never `earlyPurchaseBonuses` until verified for this channel; FAQ shows only `status: "verified"` answers live; purchase details and reassurance likewise (`purchaseDetails`, `reassurance` in product.ts).

## Commands
`npm run dev` · `npm run check` (typecheck + lint + build) · `npm run db:backup` · `npm run new-client -- --name …` · `npm run test:e2e` (builds its own test-mode copy in .next-e2e, serves on :3100, test DB .data/pglite-test) · `npm run test:db` (migrations + constraints) · `npm run test:email` (SMTP client) · `npm run db:migrate`

## Conventions
Server components by default; `"use client"` only for interaction/motion. Copy in sentence case, plain verbs, CTAs say what happens. Mobile-first; verify at 360px. Prices in minor units.

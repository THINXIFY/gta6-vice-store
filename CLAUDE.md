# VICE storefront

Independent retailer landing page + storefront for Grand Theft Auto VI. Creative direction: "VICE — Cinematic Commerce" (cinematic Vice City storytelling + Apple-clean purchasing).

## Hard rules
- **Original design only.** Never clone Rockstar's site, copy its layout/copy, or imply official affiliation. Keep `site.disclaimer` visible in the footer and near checkout.
- **No unverified facts.** Prices, contents, dates, availability, delivery claims live in `src/config/*` with `verified` flags. Unconfirmed price = `amount: null`. Never invent reviews, discounts, endorsements or stock.
- **Media rights.** Live site renders only `license: "original" | "licensed"` assets (gate: `isUsable` in `lib/media.ts`). Unlicensed supplied files live in `media-pending/` (git-ignored, outside `public/`) with `license: "pending"`; `scripts/sync-preview-media.mjs` (predev/prebuild) copies them to git-ignored `public/preview-media/` only when `NEXT_PUBLIC_MEDIA_PREVIEW=1` (local `.env.local`; marked by `main[data-media-preview]`, no visible notice) and deletes that folder otherwise; it refuses preview + `NEXT_PUBLIC_INDEXABLE=true`. Licensed files go in `public/media/`. flip an asset to `"licensed"` only with written permission on file. Never use the Rockstar logo. Trailers play via YouTube embed (`trailerEmbeds` switch), never rehosted. Empty/unusable `src` → original drawn art.
- **Frontend first.** No DB, payments, email, admin until the frontend is approved. `commerce.checkoutEnabled` stays `false`.
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

## Design system
- Colors: obsidian #08080D, midnight #171020, vice #FF579A, sunset #FF9B62, lavender #B28CFF, warm #FFF4EB. Use opacity modifiers (`text-warm/72`) for hierarchy.
- Type: `font-display` Big Shoulders (uppercase, extrabold, `text-display-{xl,lg,md}`), `font-sans` Hanken Grotesk (`text-title`, `text-lead`).
- Rhythm: `px-gutter`, `py-section`, `max-w-content`, `max-w-measure`. Radii: `rounded-control` (pills), `rounded-media`.
- Gradients only on large surfaces (`bg-dusk`, `bg-sunset-glow`, `text-sunset`). Avoid: glassmorphism, neon borders, card grids everywhere, all-caps eyebrow labels, motion on every element.
- Project skill `.claude/skills/frontend-design` applies to all UI work.
- `Button variant="sunset"` is the signature purchase CTA — header, hero and the closing CTA only. Film grain via the `grain` utility.
- Hero art: set `heroArt.desktop/mobile.src` (usable assets only) to replace the drawn scene; `focus` sets object-position per crop; `includesLogo` hides the drawn VI.

## Motion
- Import gsap only from `@/lib/motion/gsap`. Animate via `useGsap` (scoped, auto-reverted, skipped when reduced motion is preferred) and `presets.ts`.
- One orchestrated moment per section. Content must be fully visible without JS / with reduced motion. `Reveal` is for below-the-fold only.
- Lenis is off under `prefers-reduced-motion`. Add `data-lenis-prevent` to inner scroll areas. In-page nav uses `scrollToHash`; call `getLenis()?.start()` before scrolling if Lenis may be stopped.
- Above-the-fold intros: an inline script adds `html.motion-ok` before paint; CSS hides `[data-hero-intro]` until GSAP adds `html.hero-ready` (3s CSS failsafe).
- Show facts only when `verified` (e.g. the hero hides the release date until it is confirmed).
- Backend: Drizzle + Postgres (`src/db/schema.ts`, `drizzle/`, `src/server/*` server-only). Admin dashboard at `/admin` (auth in `src/server/auth.ts`; every page/action calls `requireAdmin()` itself). CSP nonce via `src/proxy.ts`. Local/tests use PGlite (`.data/`). Never import `src/server/*` from client code. See docs/checkout-architecture.md.
- 09C: rates `src/server/rates.ts` (server-only, locked 30 min), QR `src/lib/qr.ts` + `lib/orders/paymentUri.ts` (no deps), admin TOTP `src/server/totp.ts` (`ADMIN_REQUIRE_2FA`), screenshot retention (`SCREENSHOT_RETENTION_DAYS`, purge-only trigger). Never run `next build` while a dev server holds the PGlite DB (enforced by `scripts/pglite-lock.mjs`).
- 09D email: `src/server/email/*` (own SMTP client, templates, `notifyOrder` after commit, `email_messages` dedupe log, no bodies stored). `EMAIL_MODE=test` default (redirect to `EMAIL_TEST_RECIPIENT`); live only with checkoutEnabled. Game-ready email links with a 30-day release key, never the code. `npm run test:email`; Playwright uses a fake inbox (`tests/e2e/mail-sink.ts`).
- Admin (GTA-10): live/test stats never mixed; orders list sort/filter/pagination; CSV export owner-only + audited; /admin/emails. Correlated subqueries must use `ORDER_ID` (qualified), not `${s.orders.id}`.
- Checkout: `src/config/payments.ts` (assets, networks, wallet slots: offered only when validated + address), `src/lib/orders/*` (types + admin transitions, Payment IDs, quotes, `orderStore` boundary). Reachable only with checkoutEnabled or content preview. Redemption codes never in frontend config.
- Policy/commercial copy (steps, assurances, FAQ) lives in server-only `src/config/policies.ts`: never import it from a "use client" file. Drafts render only with NEXT_PUBLIC_CONTENT_PREVIEW=1 (marked `data-status="draft"`).
- Edition comparison renders `editionContents` (verified from the rendered Rockstar store) and never `earlyPurchaseBonuses` until verified for this channel; FAQ shows only `status: "verified"` answers live; purchase details and reassurance likewise (`purchaseDetails`, `reassurance` in product.ts).

## Commands
`npm run dev` · `npm run check` (typecheck + lint + build) · `npm run test:e2e` (needs a build; serves on :3100, test DB .data/pglite-test) · `npm run test:db` (migrations + constraints) · `npm run test:email` (SMTP client) · `npm run db:migrate`

## Conventions
Server components by default; `"use client"` only for interaction/motion. Copy in sentence case, plain verbs, CTAs say what happens. Mobile-first; verify at 360px. Prices in minor units.

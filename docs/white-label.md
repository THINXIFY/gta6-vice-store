# White-label: one copy per client

Each client gets their own copy of this codebase, deployment and database. The code stays identical
between copies; only the **client files** below and the **environment** differ. Keep client files out
of shared commits so updates can be pulled into every copy without conflicts.

Status: **WL-1 to WL-6 done.** To set up a new client: run `npm run new-client`, follow the
checklist below, deploy with [deploy.md](deploy.md), then work through Admin → Launch checklist.

## Client files (edit these for a new client)

| File | What it controls |
| --- | --- |
| `src/brand/brand.ts` | Store name, wordmark, monogram, tagline, page title, description, locale, seller and support details, the nine brand colours, font names |
| `src/brand/fonts.ts` | The two web fonts (swap the `next/font/google` imports and calls; keep the `variable` names) |
| `src/brand/assets/logo.png`, `favicon.png` | Logo and favicon sources (`npm run brand:assets` builds every size) |
| `src/brand/fonts/display.woff`, `sans.woff` | The same fonts as static files, for the share image and icons |
| `src/config/product.ts` | The **starting** catalogue only (seeds a new database; admin wins afterwards), plus game facts |
| `src/brand/home.ts` | The **starting** home page layout: block order, visibility and menu labels (admin wins afterwards) |
| `src/brand/payments.ts` | The **starting** payment methods (coin/network pairs, as test methods; never addresses) |
| `.env` (per deployment) | Domain (`NEXT_PUBLIC_SITE_URL`), database, email, indexing, admin bootstrap |

Everything else is generated from these:

- **Theme**: `src/brand/theme.ts` turns the nine colours into every Tailwind token (tints, status
  colours, admin surfaces, the gradient midpoint) and `layout.tsx` injects them. Tailwind names stay
  as before (`obsidian`=base, `midnight`=surface, `vice`=primary, `sunset`=secondary,
  `lavender`=accent, `warm`=text, plus `success*`, `warning*`, `danger-*`, `blend`). Translucent
  brand colours are written as `color-mix(in_oklab,var(--color-vice)_12%,transparent)`, never as
  fixed RGB values.
- **Logo and icons**: put the client's logo and favicon in `src/brand/assets/` (`logo.png`, `favicon.png`,
  transparent PNGs) and run `npm run brand:assets`. It writes `public/brand/logo.{png,webp}` (header,
  footer, admin, emails, share card via `brand.logo`), `src/app/favicon.ico`, `icon.png`,
  `apple-icon.png` and the PWA icons in `public/brand/` (`src/app/manifest.ts`). With `brand.logo: null`
  the typeset wordmark is used instead.
- **Share image**: `src/app/opengraph-image.tsx` (and `twitter-image.tsx`) render the logo, tagline,
  title and domain over a brand-coloured horizon (1200×630).
- **Emails**: colours and font names come from `emailPalette` and `brand.fonts`.

## Catalogue (managed in admin)

Admin → **Catalogue** (`/admin/pricing`) holds the product title, editions (name, short line,
summary, order, recommended, on sale), prices per platform, platforms (name, short name, order,
redeem button, link and steps) and "what each edition includes". The storefront, checkout, order
pages, emails and admin all read it from the database (`src/server/catalog.ts`, shared with client
components through `<CatalogProvider>`).

- `src/config/product.ts` only seeds a new database; after that, admin wins. Empty fields added by
  later migrations are filled once from it.
- Ids are stable slugs made from the name when an edition or platform is added. Editions and
  platforms are hidden, never deleted, so past orders keep their names.
- An edition shows on a platform only when it has a price there that is on sale.
- The comparison orders editions from most to least complete. Editions without supplied artwork get
  the drawn artwork.
- Lines that describe the catalogue (hero "from" price, "Good to know" card, comparison intro,
  accepted coins) are generated from it, so they never go stale.

## Home page blocks (managed in admin)

Admin → **Homepage** (`/admin/homepage`) sets which blocks the home page shows, their order and
their menu labels, with a live outline and menu preview. Blocks (`src/lib/blocks.ts`): hero,
editions, comparison, game world, characters, trailers, gallery, good to know, FAQ, closing CTA.

- Hero and editions are always on (the purchase flow needs them); the hero always opens the page.
- The header and footer menus are built from enabled blocks that have a label (up to 7), so a
  hidden section never leaves a dead link. Links into hidden blocks disappear too (the hero's
  "Watch trailer" without trailers, "Compare editions" without the comparison).
- A divider separates blocks of different kinds (buying, world, media, trust), so any order keeps
  a clean rhythm.
- "Reset to default" restores `src/brand/home.ts`.
- Content-heavy blocks (game world, characters, trailers, gallery) are this client's showcase: a
  client without that material switches them off.

## Content (managed in admin)

Admin → **Content** (`/admin/content`) holds the store's wording, stored as changes over the
defaults in `src/config/content.ts`, `policies.ts` and `legal.ts` (table `site_content`):

- **Section text**: every text on the home page sections and the delivery note, grouped by
  section. Clearing a field or "Reset this section" returns to the default. Link targets are not
  editable.
- **FAQ**: questions and answers with topic, published or draft, "only while checkout is open"
  and an optional source. Published answers also feed the FAQ structured data.
- **Purchase notes**: the short facts under the buy button.
- **Pages** (About, Contact, Terms, Privacy, Refund, Cookies): title, heading, search description,
  intro and the page text in a plain format (`## Heading`, blank line = new paragraph, `- ` =
  list). A page can be published only when no `{{…}}` "To confirm" item is left; saving text that
  adds one takes a published page back to draft.

Drafts (FAQ, notes, policy text) are read only on the server, so they never reach the browser of
the live site. Public wording reaches client components through `<ContentProvider>`.

## Payments (managed in admin)

`src/config/payments.ts` lists what the code SUPPORTS (coins, networks, explorers, hash formats).
What a store OFFERS, and every receiving address, lives only in the database: Admin → **Wallets**.

- Add a method from the supported list; it starts as a test method with a sample address.
- Enter the address, tick **Live**, send yourself a small test transfer, then tick **Validated**.
  Addresses are checked for format and, where the network has one, checksum (TRON, Bitcoin and
  Litecoin base58check, bech32/bech32m, Solana key length), so a typo is refused.
- Live checkout offers enabled, live, validated methods only; local preview offers enabled test
  methods. Order creation applies the same rule. Switched-off methods stay for order history.

## Email (admin + environment)

- Admin → **Emails** → Sender: display name, reply-to and admin alert recipients.
- Environment only (secrets and deliverability): `SMTP_*`, the From address in `EMAIL_FROM`
  (must belong to the mail server's domain for SPF/DKIM), `EMAIL_MODE` and `EMAIL_TEST_RECIPIENT`.
- Domain: `NEXT_PUBLIC_SITE_URL` per deployment (canonical URLs, emails, sitemap).

## New client checklist

1. Copy the repository (or fork) for the client.
2. Run `npm run new-client -- --name "STORE NAME" --primary "#3d8bff" --secondary "#2de2c4"` (see the
   script header for every option), or edit `src/brand/brand.ts` by hand: identity, seller, colours, monogram. Check contrast: `text` on `base`
   and `base` on `primary` (button labels) should both reach WCAG AA (4.5:1).
3. Choose fonts: edit `src/brand/fonts.ts` and replace the two `.woff` files (Latin subset,
   licensed for web and embedding, e.g. SIL Open Font License from Google Fonts).
4. Catalogue: either edit the seed in `src/config/product.ts` before the first start, or set it all
   up in Admin → Catalogue after the first start.
5. Home page: set the default layout in `src/brand/home.ts`, or arrange it in Admin → Homepage.
6. Content: rewrite the defaults in `src/config/content.ts`, `policies.ts` and `legal.ts` for the
   client, or edit everything in Admin → Content; publish the pages once every item is confirmed.
7. Payments: set the starting methods in `src/brand/payments.ts`, then enter the client's addresses in
   Admin → Wallets (never in code). Email: SMTP and EMAIL_FROM in the environment, sender name and
   reply-to in Admin → Emails.
8. Set the environment for their deployment (`.env.example` lists every variable).
9. Run `npm run check` and `npm run test:e2e`, open `/`, `/checkout`, `/icon`, `/opengraph-image`.
10. Deploy ([deploy.md](deploy.md)) and work through **Admin → Launch checklist** until every required
    item is ready.


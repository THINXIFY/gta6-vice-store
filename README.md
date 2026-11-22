# VICE STORE

A cinematic storefront for Grand Theft Auto VI with manual crypto checkout and an admin dashboard.
It is built as a white-label platform: each client gets their own copy, branding, database and
deployment.

## What's inside

- **Storefront**: a scroll-driven hero (night turns to morning), editions and prices per platform,
  edition comparison, game world, characters, trailers (YouTube embeds), gallery and FAQ.
- **Checkout**: the customer picks an edition and a coin/network. The checkout shows a locked rate,
  the amount, the address and a QR code. The customer submits the transaction hash and a
  screenshot. The order is paid only after an admin confirms the payment by hand.
- **Admin** (`/admin`): orders, fulfilment, catalogue and prices, homepage layout, content and
  pages, wallets, emails, support messages, settings, two-factor sign-in, and a launch checklist.
- **Email**: order and delivery emails over your own SMTP. Delivery sends a download link, never
  the code itself.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · GSAP + ScrollTrigger · Lenis ·
Drizzle ORM with Postgres (PGlite locally) · Playwright. Node 24 recommended (20.9+ required).

## Getting started

```bash
npm install
cp .env.example .env.local   # then fill in the values you need
npm run db:migrate
npm run dev                  # http://localhost:3000
```

Locally, the database is an embedded PGlite in `.data/`, so you don't need a Postgres server.
Sign in to `/admin` with `ADMIN_BOOTSTRAP_EMAIL` / `ADMIN_BOOTSTRAP_PASSWORD` from your env file.

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run check` | Type check, lint and production build |
| `npm run test:e2e` | Full Playwright suite (desktop + mobile) in its own isolated build on :3100 |
| `npm run test:db` | Migrations and database constraints |
| `npm run test:email` | SMTP client |
| `npm run db:migrate` | Apply database migrations |
| `npm run db:backup` | Back up the database |
| `npm run new-client -- --name "STORE"` | Start a new client copy (brand, colours) |

Don't run `next build` while the dev server is running: both would open the same local database.

## Configuration

All settings are environment variables. `.env.example` lists and explains each one. The main ones:

- `NEXT_PUBLIC_SITE_URL`: the store's domain.
- `DATABASE_URL`: production Postgres. Leave it empty to use local PGlite.
- `SMTP_*`, `EMAIL_FROM`, `EMAIL_MODE`: email. Test mode sends every email to `EMAIL_TEST_RECIPIENT`.
- `NEXT_PUBLIC_INDEXABLE`: set to `true` only when the store should appear in search engines.
- `ADMIN_BOOTSTRAP_*`: the first admin account.

Wallet addresses are never stored in code. Enter them in Admin → Wallets.

## Media

The live site shows only original or licensed images. Supplied images without a licence go in
`media-pending/` (not committed) and appear only in local preview (`NEXT_PUBLIC_MEDIA_PREVIEW=1`).
Licensed images go in `public/media/`. Without usable images, the site uses its own drawn artwork.

## Documentation

- [docs/white-label.md](docs/white-label.md): setting up a new client copy
- [docs/deploy.md](docs/deploy.md): deployment, database, backups and health check
- [docs/checkout-architecture.md](docs/checkout-architecture.md): orders, payments and fulfilment
- [docs/seo-strategy.md](docs/seo-strategy.md): SEO and structured data

## Going live

Work through **Admin → Launch checklist** on the deployed site. It lists every remaining
requirement, such as email, wallets, published policy pages and the domain.

## License

Private and proprietary. All rights reserved.

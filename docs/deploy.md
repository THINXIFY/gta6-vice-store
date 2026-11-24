# Deploying a client store

One client = one copy of the code, one deployment, one PostgreSQL database
(see [white-label.md](white-label.md) for what to customise first). This guide takes a copy from
"customised" to "taking real orders".

## 1. What you need

- A domain with HTTPS (the store's own name; never a Rockstar or Take-Two trademark).
- **PostgreSQL 15+** (managed, e.g. Neon, Supabase, RDS, DigitalOcean, or the one in
  `docker-compose.yml`). The embedded database (PGlite) is for local development only.
- An SMTP account for order emails, with SPF and DKIM set up for the sending domain.
- A server or container host that runs Node 24 (a long-running process, not serverless functions:
  rate limits and the database pool assume one persistent server).

## 2. Server settings

Copy `.env.example` into the host's environment and fill it in. The ones that matter:

| Setting | Value |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | `https://www.client-domain.com` (no trailing slash). **Build time.** |
| `NEXT_PUBLIC_INDEXABLE` | Indexing is on by default; `false` only for a staging copy. **Build time.** |
| `NEXT_PUBLIC_CHECKOUT_ENABLED` | `true` only once the launch checklist passes; empty = non-transactional preview. **Build time.** |
| `NEXT_PUBLIC_CONTENT_PREVIEW` | Leave **empty** on every deployed site. |
| `DATABASE_URL` | `postgres://user:password@host:5432/db` |
| `IP_HASH_SALT` | Long random string: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `FULFILLMENT_KEY` | Encrypts game codes: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`. **Back it up**: codes cannot be read without it. |
| `TRUST_PROXY` | `1` behind a proxy or load balancer that sets `X-Forwarded-For`. |
| `ADMIN_BOOTSTRAP_EMAIL`, `ADMIN_BOOTSTRAP_PASSWORD` | First owner (12+ characters). Remove both after the first sign-in. |
| `ADMIN_REQUIRE_2FA` | Optional. Leave empty; set `1` only to require an authenticator app for every admin. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURITY`, `SMTP_USER`, `SMTP_PASS` | The mail server. |
| `EMAIL_FROM` | `"Store <orders@client-domain.com>"` (address on the SMTP domain). |
| `EMAIL_MODE` | `live` once checkout is open (`test` redirects every email to `EMAIL_TEST_RECIPIENT`). |

`NEXT_PUBLIC_*` values are compiled into the site: change them, rebuild. Everything else is read
at run time.

## 3a. Deploy with Docker (app + PostgreSQL)

```bash
cp .env.example .env.production          # fill in section 2 (leave DATABASE_URL out: compose sets it)
export POSTGRES_PASSWORD="$(node -e "console.log(require('crypto').randomBytes(24).toString('hex'))")"
SITE_URL=https://www.client-domain.com docker compose up -d --build
```

The container applies database migrations on start, then serves on port 3000. Put a TLS proxy
(Caddy, nginx, or the host's load balancer) in front of it and set `TRUST_PROXY=1`.
The image has a health check on `/api/health`.

## 3b. Deploy on a plain server (Node 24)

```bash
npm ci
NEXT_PUBLIC_SITE_URL=https://www.client-domain.com npm run build   # with the section 2 settings
npm run db:migrate                                                  # applies migrations to DATABASE_URL
npm start -- -p 3000                                                # behind a TLS proxy
```

Keep it running with your process manager (systemd, pm2). On every update: `git pull`, `npm ci`,
`npm run build`, `npm run db:migrate`, restart.

## 4. First start

1. Open `/admin/login` and sign in with the bootstrap owner, set up two-factor in Settings, then
   remove `ADMIN_BOOTSTRAP_*` from the environment.
2. Work through **Admin → Launch checklist** until every required item is ready:
   business details, published Terms/Privacy/Refund pages, something on sale, live validated
   wallets, game codes in stock, live email, domain, database and secrets.
3. Place one real order end to end with a small amount on each payment method before announcing.

## 5. Backups

Payment screenshots and encrypted game codes are stored in the database, so a database backup
covers the whole store (plus the `FULFILLMENT_KEY`, kept separately and safely).

- Managed PostgreSQL: turn on the provider's daily backups with point-in-time recovery.
- Self-hosted: `npm run db:backup` runs `pg_dump` (needs the PostgreSQL client tools) into
  `.data/backups` (or `--dir`), keeping the newest 14 (`--keep`). Schedule it daily with cron and
  copy the folder off the server. Restore:
  `pg_restore --clean --if-exists --no-owner -d "$DATABASE_URL" <file>.dump`.
- Local development: `npm run db:backup` copies the PGlite folder (stop the dev server first).

## 6. Health and monitoring

- `GET /api/health` → `200 {"ok":true}` when the app can reach its database, `503` otherwise.
  Point an uptime monitor at it.
- Admin → Emails shows every email and failures with a retry button; Admin → Overview shows
  orders waiting for review.

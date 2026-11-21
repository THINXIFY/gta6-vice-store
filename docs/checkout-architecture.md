# Manual crypto checkout: architecture

## Flow
1. `/checkout`: guest picks edition, platform, email, account region, asset and network. `orderStore.create()` stores the order with a locked quote and returns a Payment ID.
2. `/checkout/payment?id=VICE-…`: invoice (exact amount, receiving address, network warning, QR) and TXID submission. `orderStore.submitPayment()` moves the order `awaiting_payment → payment_submitted`.
3. `/order-status`: lookup by Payment ID **and** email. Timeline, status detail, and game access once `game_ready`.

## Backend (GTA-09A, implemented)
- **Database:** PostgreSQL via Drizzle ORM. `DATABASE_URL` set → postgres.js; unset → embedded PGlite at `.data/pglite` (dev/tests; migrations + seed run at server start via `src/instrumentation.ts`). Schema: `src/db/schema.ts`; migrations: `drizzle/` (`npm run db:generate`, `npm run db:migrate`, `npm run test:db`).
- **API** (`src/app/api/orders/*`, logic in `src/server/orders.ts`): `POST /api/orders` (create), `/view` (Payment ID + access key), `/status` (Payment ID + email → progress only; the key unlocks details), `/submit` (TXID). `POST /api/test/orders/status` is the test-mode admin stand-in: 404 in live builds, and its UI is compiled out of live bundles.
- **Access:** each order gets a 256-bit access key, returned once and stored only as SHA-256. The browser keeps it in localStorage and in a private link (`/order-status?id=…#key=…`; the fragment is never sent to servers). Payment ID + email never reveal the address, TXID or fulfillment.
- **Integrity:** prices, amounts, addresses and Payment IDs are decided server-side. Transitions follow `transitions` with a status-conditioned UPDATE inside a transaction (row locks); every change writes `order_status_history` + `audit_logs` in the same transaction. DB triggers make identity/price/quote columns immutable and history, audit and submissions append-only; orders cannot be deleted. Duplicate TXIDs are blocked by a unique (network, lower(txid)) index.
- **Abuse controls:** per-IP fixed-window rate limits, same-origin check, 4 KB JSON bodies, strict allow-list validation, generic 500 errors.
- **Test data:** all seeded payment methods are `is_test` with sample addresses; orders are `is_test`; test orders can only receive test inventory. Live orders are refused until real methods, live quotes and fulfillment exist.

## Payment proof (GTA-09B)
- `POST /api/orders/submit` (multipart): TXID, amount sent (exact decimal), optional message, optional screenshot (PNG/JPG/WebP ≤ 5 MB, type detected from file bytes). Screenshot, submission and status change are saved in one transaction. Screenshots live in `payment_screenshots` (bytea, never editable) and are served only to signed-in admins at `/admin/screenshots/[id]` with a sandboxing CSP.

## Admin dashboard (GTA-09B, implemented)
- **Auth:** `src/server/auth.ts`. scrypt password hashes; random 256-bit session tokens stored as SHA-256; cookie `vice_admin` (httpOnly, Secure, SameSite=Strict, path `/admin`, 8 h). Login rate-limited per IP and per email; constant-time behaviour for unknown emails. First owner from `ADMIN_BOOTSTRAP_EMAIL`/`ADMIN_BOOTSTRAP_PASSWORD` when no admin exists. Roles: **owner** (everything) and **reviewer** (orders only). Every admin page, route and Server Action checks the session itself (never the layout alone).
- **Pages:** Overview, Orders & Payments (search by Payment ID/reference/email/TXID, status filters), order detail (all fields, screenshot, explorer link, history, audit), Wallets, Products & Pricing, Game Fulfillment, Settings.
- **Review:** approval requires all six on-chain checks (network, asset, recipient, amount, confirmations, unique TXID) and a verified amount ≥ the expected amount; request-info and reject need a customer message; release assigns one encrypted inventory item (AES-256-GCM, `FULFILLMENT_KEY`) and moves the order to `game_ready`. Every action writes order history and the audit log. Nothing is approved automatically; elapsed time never confirms a payment.
- **Wallets:** per-network address format validation; refuses anything resembling a private key or seed phrase; live/test, enabled and validated flags.
- **Pricing:** cents stored exactly; the storefront and checkout read prices and platform availability from the database (`src/server/catalog.ts`).

## Platform security
- Content Security Policy with a per-request script nonce (`src/proxy.ts`); all pages render dynamically.
- Rate limits are shared across instances (PostgreSQL `rate_limits`, atomic upsert).

## Rules
- Redemption codes and any fulfillment URLs live only in the backend and are returned only after approval. Never in frontend config or bundles.
- Only legitimately sourced platform codes (PlayStation Store / Microsoft Store). No third-party installers.
- Never request private keys or recovery phrases.

## GTA-09C additions

- **Rates**: `src/server/rates.ts` fetches USD rates server-side (CoinGecko, Coinbase fallback), caches 60 s, refuses stale (>5 min), non-positive or off-peg stablecoin rates. `createOrder` locks the rate and the exact amount (`cryptoAmount`, integer maths, rounded up) for 30 minutes and records `rate_source`. `RATES_MODE=fixed` (tests) uses preview rates, flagged preview, never valid for live orders. `GET /api/rates` serves indicative rates for the checkout estimate only.
- **QR**: `src/lib/qr.ts` (dependency-free encoder, verified against an independent decoder for versions 1 to 20). `paymentUri` builds BIP-21 (BTC, LTC), EIP-681 with chain ID (native ETH, BNB, POL) and Solana Pay (SOL) links; tokens and TRX encode the address only.
- **Proof**: email and Payment ID prefilled; amount, TXID and screenshot required (client and server).
- **Review**: address explorer links, locked rate, quote-window and TXID-reuse facts; release is owner-only; a live order with a preview rate can never be approved.
- **Admin 2FA**: TOTP (RFC 6238) in `src/server/totp.ts`, secrets sealed with the vault, replay-proof (`totp_last_step`). `ADMIN_REQUIRE_2FA=1` forces enrollment. Recovery: owner reset in Settings or `scripts/admin-reset-2fa.mjs`.
- **Retention**: screenshots of closed orders older than `SCREENSHOT_RETENTION_DAYS` (default 90) can be purged by an owner. The DB trigger allows only that one change (bytes emptied, size and hash kept) and forbids deletes.

## GTA-09D: transactional email

- **Sending**: `src/server/email/smtp.ts` is a dependency-free SMTP submission client. STARTTLS is required on port 587 (no credentials in clear text); implicit TLS on 465. Unencrypted mode is allowed only for localhost. Bodies are base64 MIME (text + HTML), and header injection is refused.
- **Templates**: `src/server/email/templates.ts` renders branded, table-based HTML with a plain-text alternative for these events: order created, payment submitted (about 30 minutes to verify), approved, rejected (with the reason), information required, game ready, an admin alert for new submissions, and a test email. Every value is escaped. Owners can preview each template at `/admin/emails/preview/<kind>`.
- **Events**: `notifyOrder` runs after the database transaction commits, from `createOrder`, `submitPayment` and admin `review()`. It never throws into order processing.
- **Once only**: `email_messages.dedupe_key` is unique (keyed per order, or per submission for resubmissions), so retries never send twice. The log keeps recipient, subject, status (sent, failed or skipped), error and provider ID. It never stores bodies, because they carry private links. Log rows cannot be deleted.
- **Game ready**: the email never contains the code. It links to the order page with a second, time-limited key: `orders.release_key_hash`, valid 30 days, stored as SHA-256 only.
- **Modes** (`EMAIL_MODE`):
  - `test` (default): nothing reaches customers. Every email is redirected to `EMAIL_TEST_RECIPIENT` and marked as a test; without one, emails are only logged.
  - `live`: honoured only while live checkout is open.
  - `off`: emails are logged only.
- **Settings**: `ADMIN_NOTIFY_EMAIL` sets who gets admin alerts (all owners if empty). The SMTP and from-address variables are listed in `.env.example`.
- **Tests**:
  - `npm run test:email` exercises the SMTP client against an in-process fake server.
  - Playwright runs a fake inbox (`tests/e2e/mail-sink.ts`). The end-to-end tests read delivered mail and open the game-ready link from it.

## GTA-10: admin dashboard

- **Overview**: statistics for live and test orders separately (`?data=`), a review queue with oldest first, recent activity, and stock awaiting fulfillment.
- **Orders**: search (Payment ID, reference, email or TXID), filters (status, data set, coin), sorting (priority, newest, oldest, price) and counted pagination. Columns show expected, reported and verified amounts. Phones get a stacked list.
- **CSV export**: `/admin/orders/export` uses the same filters as the list. It is owner-only, rate-limited, audited and `no-store`, and neutralises spreadsheet formulas.
- **Order detail**: the three amounts side by side, a fullscreen screenshot viewer, and the email log. Approval still requires the on-chain checklist.
- **Emails page**: configuration, an owner-only test email, template previews and the delivery log.
- **Embedded database lock**: PGlite is single-process. `scripts/pglite-lock.mjs` places a PID lock next to the data folder, used by the app and the scripts. A second process gets a clear error instead of corrupting the database.
- **Password rotation**: `scripts/admin-rotate-password.mjs <email>` sets a random password, ends sessions, writes an audit entry and saves the password to a git-ignored file in `.data/`.

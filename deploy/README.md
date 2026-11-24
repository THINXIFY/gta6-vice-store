# VPS deployment (Ubuntu/Debian, Nginx, PostgreSQL, systemd)

The store runs as the `vicestore` user from `/srv/vice-store/app`, on `127.0.0.1:5300`, behind
Nginx with Let's Encrypt. Secrets live only in `/etc/vice-store/env` (never in Git).

## Layout

| Path | What |
| --- | --- |
| `/srv/vice-store/app` | Git checkout of `main` (owned by `vicestore`) |
| `/srv/vice-store/backups` | Daily `pg_dump` files (newest 14 kept) |
| `/etc/vice-store/env` | Environment: `root:vicestore`, mode `640` |
| `/etc/systemd/system/vice-store.service` | From `deploy/vice-store.service` |
| `/etc/nginx/sites-available/DOMAIN` | From `deploy/nginx.conf.template` |

## Production environment (`/etc/vice-store/env`)

```
NODE_ENV=production
NEXT_PUBLIC_SITE_URL=https://www.DOMAIN
NEXT_PUBLIC_INDEXABLE=            # empty until launch is approved
NEXT_PUBLIC_CHECKOUT_ENABLED=     # empty = non-transactional preview
NEXT_PUBLIC_MEDIA_PREVIEW=        # always empty on a server
NEXT_PUBLIC_CONTENT_PREVIEW=      # always empty on a server
DATABASE_URL=postgres://vicestore:<generated>@127.0.0.1:5432/vicestore
IP_HASH_SALT=<generated>
FULFILLMENT_KEY=<generated, back it up off the server>
TRUST_PROXY=1
ADMIN_REQUIRE_2FA=1
ADMIN_BOOTSTRAP_EMAIL=<owner>
ADMIN_BOOTSTRAP_PASSWORD=<generated, remove after first sign-in>
EMAIL_MODE=test
```

`NEXT_PUBLIC_*` values are compiled in: change them, then rebuild.

## Update

```bash
sudo -u vicestore bash -c 'cd /srv/vice-store/app && git pull --ff-only && npm ci && set -a && . /etc/vice-store/env && npm run build && npm run db:migrate'
sudo systemctl restart vice-store
curl -fsS http://127.0.0.1:5300/api/health
```

## Logs and status

`systemctl status vice-store` · `journalctl -u vice-store -f` · `/var/log/nginx/error.log`

## Going transactional

Only after every item in Admin → Launch checklist is ready: set `NEXT_PUBLIC_CHECKOUT_ENABLED=true`
(and `EMAIL_MODE=live` with SMTP settings), rebuild, restart. `NEXT_PUBLIC_INDEXABLE=true` the same way.

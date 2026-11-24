# VICE STORE: VPS deployment guide

Copy-paste commands for a shared Ubuntu/Debian VPS. Run them **as root**, in order.
Everything is isolated: its own Linux user, folder, Node runtime, database, Nginx site file,
systemd service and log files. No existing config, database or service is changed.

| | |
| --- | --- |
| Domain | `vicestoregaming.com` (`www` redirects to it) |
| App | `127.0.0.1:5300` (localhost only, behind Nginx) |
| Folder | `/srv/vice-store` (`app/`, `node/`, `backups/`) |
| Secrets | `/etc/vice-store/env` (never in Git) |
| Service | `vice-store` (systemd) |
| Database | PostgreSQL database `vicestore`, owned by role `vicestore` |

The site goes live as a **non-transactional preview**: checkout off, search indexing off, only
licensed media (unlicensed files are not in Git, so they never reach the server).

---

## 0. Check the server (read-only)

```bash
uname -m                                   # expect x86_64
free -h                                    # the build needs about 2 GB free memory
nginx -v; psql --version; certbot --version
ss -ltnp | grep ':5300' || echo "port 5300 free"
grep -rl "vicestoregaming" /etc/nginx/ 2>/dev/null || echo "no existing site for this domain"
ufw status | head -5
```

You need Nginx, PostgreSQL **15 or newer** and Certbot. Install only what is missing:
`apt install -y nginx` · `apt install -y postgresql` · `apt install -y certbot`.
Port 5300 must be free. If a site for the domain already exists, stop and check it first.

## 1. User, folders and Node 24 (private to this app)

```bash
useradd --system --home /srv/vice-store --shell /usr/sbin/nologin vicestore
mkdir -p /srv/vice-store/node /srv/vice-store/backups /var/www/letsencrypt
curl -fsSL https://nodejs.org/dist/v24.21.0/node-v24.21.0-linux-x64.tar.xz \
  | tar -xJ -C /srv/vice-store/node --strip-components=1
chown -R vicestore:vicestore /srv/vice-store
/srv/vice-store/node/bin/node -v           # v24.21.0
```

## 2. Code

```bash
sudo -u vicestore git clone https://github.com/THINXIFY/gta6-vice-store.git /srv/vice-store/app
```

If the repository is private, add a read-only deploy key (GitHub → repo → Settings → Deploy
keys) for the `vicestore` user, or clone with a fine-grained access token.

## 3. Database (its own role and database)

```bash
DB_PASS=$(openssl rand -hex 24)
sudo -u postgres psql -v ON_ERROR_STOP=1 <<SQL
CREATE ROLE vicestore LOGIN PASSWORD '$DB_PASS';
CREATE DATABASE vicestore OWNER vicestore;
REVOKE ALL ON DATABASE vicestore FROM PUBLIC;
SQL
```

Keep this shell open: `DB_PASS` is used in the next step.

## 4. Environment and secrets

```bash
ADMIN_EMAIL="you@example.com"            # ← change to your admin email first
mkdir -p /etc/vice-store
ADMIN_PASS=$(openssl rand -base64 18)
cat > /etc/vice-store/env <<EOF
NEXT_PUBLIC_SITE_URL=https://vicestoregaming.com
NEXT_PUBLIC_INDEXABLE=
NEXT_PUBLIC_CHECKOUT_ENABLED=
NEXT_PUBLIC_MEDIA_PREVIEW=
NEXT_PUBLIC_CONTENT_PREVIEW=
DATABASE_URL=postgres://vicestore:$DB_PASS@127.0.0.1:5432/vicestore
IP_HASH_SALT=$(openssl rand -hex 32)
FULFILLMENT_KEY=$(openssl rand -base64 32)
TRUST_PROXY=1
ADMIN_REQUIRE_2FA=1
ADMIN_BOOTSTRAP_EMAIL=$ADMIN_EMAIL
ADMIN_BOOTSTRAP_PASSWORD=$ADMIN_PASS
EMAIL_MODE=test
EOF
chown root:vicestore /etc/vice-store/env && chmod 640 /etc/vice-store/env
echo "First admin password: $ADMIN_PASS"
```

- Save the admin password in a password manager.
- Back up `FULFILLMENT_KEY` off the server: game codes can't be decrypted without it.
- Email settings (`SMTP_*`, `EMAIL_FROM`) can be added later; see `.env.example`.

## 5. Build and migrate

```bash
sudo -u vicestore bash -c 'cd /srv/vice-store/app && export PATH=/srv/vice-store/node/bin:$PATH \
  && set -a && . /etc/vice-store/env && set +a \
  && npm ci && npm run build && npm run db:migrate'
```

If the build runs out of memory, add `export NODE_OPTIONS=--max-old-space-size=2048 &&` after `PATH`.

## 6. Service (auto-start on boot, restart on crash)

```bash
cp /srv/vice-store/app/deploy/vice-store.service /etc/systemd/system/vice-store.service
systemctl daemon-reload
systemctl enable --now vice-store
sleep 5; curl -fsS http://127.0.0.1:5300/api/health      # {"ok":true}
```

## 7. Nginx and HTTPS (Let's Encrypt)

First an HTTP-only site so Let's Encrypt can verify the domain:

```bash
cat > /etc/nginx/sites-available/vicestoregaming.com <<'EOF'
server {
    listen 80;
    server_name vicestoregaming.com www.vicestoregaming.com;
    location ^~ /.well-known/acme-challenge/ { root /var/www/letsencrypt; }
    location / { return 503; }
}
EOF
ln -s /etc/nginx/sites-available/vicestoregaming.com /etc/nginx/sites-enabled/vicestoregaming.com
nginx -t && systemctl reload nginx

certbot certonly --webroot -w /var/www/letsencrypt \
  -d vicestoregaming.com -d www.vicestoregaming.com \
  --deploy-hook "systemctl reload nginx"
```

Then the full HTTPS site:

```bash
sed 's/DOMAIN/vicestoregaming.com/g' /srv/vice-store/app/deploy/nginx.conf.template \
  > /etc/nginx/sites-available/vicestoregaming.com
nginx -t && systemctl reload nginx
```

`nginx -t` checks every site before the reload, so a mistake never takes other sites down.
Certificates renew automatically (certbot's timer, then the reload hook).

**Firewall:** port 5300 is bound to localhost and needs no rule. Ports 80/443 are usually open
already for your other sites. If `ufw status` shows them closed: `ufw allow 'Nginx Full'`.

## 8. Verify

```bash
curl -sI http://vicestoregaming.com | head -3          # 301 → https://vicestoregaming.com/
curl -sI https://www.vicestoregaming.com | head -3     # 301 → https://vicestoregaming.com/
curl -sI https://vicestoregaming.com | head -1         # HTTP/2 200
curl -s  https://vicestoregaming.com/api/health        # {"ok":true}
curl -s  https://vicestoregaming.com/robots.txt        # search engines disallowed
systemctl is-enabled vice-store && systemctl is-active vice-store
```

In a browser:
1. Open `https://vicestoregaming.com` and check the padlock and the logo.
2. Open `/admin/login` and sign in with the bootstrap account.
3. Set up two-factor sign-in in Settings.
4. Remove the two `ADMIN_BOOTSTRAP_*` lines from `/etc/vice-store/env` and run `systemctl restart vice-store`.

## 9. Daily backups (03:30, newest 14 kept)

```bash
echo '30 3 * * * cd /srv/vice-store/app && set -a && . /etc/vice-store/env && /srv/vice-store/node/bin/node scripts/db-backup.mjs --dir /srv/vice-store/backups' \
  | crontab -u vicestore -
sudo -u vicestore bash -c 'cd /srv/vice-store/app && set -a && . /etc/vice-store/env && /srv/vice-store/node/bin/node scripts/db-backup.mjs --dir /srv/vice-store/backups'
ls -lh /srv/vice-store/backups
```

Copy the backups off the server regularly. Restore:
`pg_restore --clean --if-exists --no-owner -d "$DATABASE_URL" <file>.dump`.

---

## Day-to-day

**Update to the latest `main`:**

```bash
sudo -u vicestore bash -c 'cd /srv/vice-store/app && export PATH=/srv/vice-store/node/bin:$PATH \
  && set -a && . /etc/vice-store/env && set +a \
  && git pull --ff-only && npm ci && npm run build && npm run db:migrate'
systemctl restart vice-store && sleep 5 && curl -fsS http://127.0.0.1:5300/api/health
```

**Restart, status and logs:**

```bash
systemctl restart vice-store
systemctl status vice-store --no-pager
journalctl -u vice-store -n 100 --no-pager      # app log (add -f to follow)
tail -n 50 /var/log/nginx/vice-store.error.log
```

**Changing a `NEXT_PUBLIC_*` setting** (domain, indexing, checkout): edit `/etc/vice-store/env`,
then run the update command (a rebuild is required), then restart.

**Going transactional (later):** only when every item in Admin → Launch checklist is ready, set
`NEXT_PUBLIC_CHECKOUT_ENABLED=true`, `EMAIL_MODE=live` and the SMTP settings, then rebuild and
restart. Set `NEXT_PUBLIC_INDEXABLE=true` the same way when the store should appear in search.

**Remove completely** (touches nothing else):

```bash
systemctl disable --now vice-store && rm /etc/systemd/system/vice-store.service && systemctl daemon-reload
rm /etc/nginx/sites-enabled/vicestoregaming.com /etc/nginx/sites-available/vicestoregaming.com && nginx -t && systemctl reload nginx
crontab -u vicestore -r
sudo -u postgres psql -c 'DROP DATABASE vicestore;' -c 'DROP ROLE vicestore;'
rm -rf /srv/vice-store /etc/vice-store && userdel vicestore
```

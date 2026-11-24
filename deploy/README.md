# VICE STORE: VPS deployment guide

Copy-paste commands for a shared Ubuntu/Debian VPS. Run them **as root**, in order.
Everything is isolated: its own Linux user, folder, database, Nginx site file, systemd service
and log files. It uses the server's Node.js. No existing config, database or service is changed.

| | |
| --- | --- |
| Domain | `vicestoregaming.com` (`www` redirects to it) |
| Project | `/srv/vice-store` (the Git checkout) |
| Node.js | `/usr/bin/node` (20.9 or newer; 24 recommended) |
| App | `127.0.0.1:5300` (localhost only, behind Nginx) |
| Service | `vice-store` (systemd, user `vicestore`) |
| Secrets | `/etc/vice-store/env` (never in Git) |
| Database | PostgreSQL database `vicestore`, owned by role `vicestore` |
| Backups | `/srv/vice-store/.data/backups` (git-ignored) |
| Licensed artwork | `/srv/vice-store/public/media` (git-ignored, from the media package) |

The site goes live **indexable** (sitemap at `/sitemap.xml`) with checkout off. Images
are not in Git: they are sent with the media package (see *Images* below).

---

## 0. Check the server (read-only)

```bash
uname -m                                   # expect x86_64
free -h                                    # the build needs about 2 GB free memory
/usr/bin/node -v                           # v20.9 or newer
nginx -v; psql --version; certbot --version
ss -ltnp | grep ':5300' || echo "port 5300 free"
grep -rl "vicestoregaming" /etc/nginx/ 2>/dev/null || echo "no existing site for this domain"
ufw status | head -5
```

You need Nginx, PostgreSQL **15 or newer** and Certbot. Install only what is missing:
`apt install -y nginx` · `apt install -y postgresql` · `apt install -y certbot`.
Port 5300 must be free. If a site for the domain already exists, stop and check it first.

## 1. User and folder

```bash
useradd --system --create-home --home-dir /var/lib/vicestore --shell /usr/sbin/nologin vicestore
install -d -o vicestore -g vicestore /srv/vice-store
mkdir -p /var/www/letsencrypt
```

The user's home (`/var/lib/vicestore`) holds the npm cache, outside the project.

## 2. Code

```bash
sudo -u vicestore git clone https://github.com/THINXIFY/gta6-vice-store.git /srv/vice-store
```

`/srv/vice-store` must be empty for the clone. If the repository is private, add a read-only
deploy key (GitHub → repo → Settings → Deploy keys) for the `vicestore` user, or clone with a
fine-grained access token.

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
NEXT_PUBLIC_CHECKOUT_ENABLED=
NEXT_PUBLIC_CONTENT_PREVIEW=
DATABASE_URL=postgres://vicestore:$DB_PASS@127.0.0.1:5432/vicestore
IP_HASH_SALT=$(openssl rand -hex 32)
FULFILLMENT_KEY=$(openssl rand -base64 32)
TRUST_PROXY=1
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
- Two-factor sign-in is optional: it stays available in Admin → Settings. To make it mandatory for
  every admin, add `ADMIN_REQUIRE_2FA=1` and restart.
- One `KEY=value` per line, no inline comments (systemd would read them as part of the value).

## 5. Build and migrate

```bash
sudo -u vicestore bash -c 'cd /srv/vice-store && set -a && . /etc/vice-store/env && set +a \
  && npm ci && npm run build && npm run db:migrate'
```

If the build runs out of memory, insert `export NODE_OPTIONS=--max-old-space-size=2048 &&`
right after `cd /srv/vice-store &&`.

## 6. Service (auto-start on boot, restart on crash)

```bash
cp /srv/vice-store/deploy/vice-store.service /etc/systemd/system/vice-store.service
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
sed 's/DOMAIN/vicestoregaming.com/g' /srv/vice-store/deploy/nginx.conf.template \
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
3. Optionally set up two-factor sign-in in Settings (recommended, not required).
4. Remove the two `ADMIN_BOOTSTRAP_*` lines from `/etc/vice-store/env` and run `systemctl restart vice-store`.

## 9. Daily backups (03:30, newest 14 kept)

```bash
echo '30 3 * * * cd /srv/vice-store && set -a && . /etc/vice-store/env && /usr/bin/node scripts/db-backup.mjs --dir /srv/vice-store/.data/backups' \
  | crontab -u vicestore -
sudo -u vicestore bash -c 'cd /srv/vice-store && set -a && . /etc/vice-store/env && /usr/bin/node scripts/db-backup.mjs --dir /srv/vice-store/.data/backups'
ls -lh /srv/vice-store/.data/backups
```

Copy the backups off the server regularly. Restore:
`pg_restore --clean --if-exists --no-owner -d "$DATABASE_URL" <file>.dump`.

---

## Day-to-day

**Update to the latest `main`:**

```bash
sudo -u vicestore bash -c 'cd /srv/vice-store && set -a && . /etc/vice-store/env && set +a \
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

**Images** (hero, sunrise, editions, characters, regions, gallery, closing backdrop): they live
in `public/media/` on your PC and travel outside Git. After adding or changing images:

On Windows (PowerShell, in the project folder):

```powershell
npm run media:package          # builds deploy-packageice-store-media.tar.gz (all images, with checksums)
scp deploy-package\vice-store-media.tar.gz root@2.25.169.72:/tmp/
```

On the VPS (as root):

```bash
install -d -o vicestore -g vicestore /srv/vice-store/public/media
tar -xzf /tmp/vice-store-media.tar.gz -C /srv/vice-store/public/media
chown -R vicestore:vicestore /srv/vice-store/public/media
(cd /srv/vice-store/public/media && sha256sum -c SHA256SUMS) && rm /tmp/vice-store-media.tar.gz
```

Then run the update command above (pull, build, restart). A rebuild is required: Next.js serves
only files present at build time.
Check one image: `curl -sI https://vicestoregaming.com/media/vice-city-aerial.png | head -1` → 200.

**Changing a `NEXT_PUBLIC_*` setting** (domain, indexing, checkout): edit `/etc/vice-store/env`,
then run the update command (a rebuild is required), then restart.

**Going transactional (later):** only when every item in Admin → Launch checklist is ready, set
`NEXT_PUBLIC_CHECKOUT_ENABLED=true`, `EMAIL_MODE=live` and the SMTP settings, then rebuild and
restart. Search indexing is on by default; add `NEXT_PUBLIC_INDEXABLE=false` only to hide a staging copy.

**Remove completely** (touches nothing else):

```bash
systemctl disable --now vice-store && rm /etc/systemd/system/vice-store.service && systemctl daemon-reload
rm /etc/nginx/sites-enabled/vicestoregaming.com /etc/nginx/sites-available/vicestoregaming.com && nginx -t && systemctl reload nginx
crontab -u vicestore -r
sudo -u postgres psql -c 'DROP DATABASE vicestore;' -c 'DROP ROLE vicestore;'
rm -rf /srv/vice-store /etc/vice-store && userdel -r vicestore
```

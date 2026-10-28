#!/usr/bin/env bash
# One-time (idempotent) server setup for BetFriend on sports-db. Run with sudo from a release folder:
#   sudo bash deploy/setup-server.sh
# It never touches sports-panel (sports_dev / sports_prod / sports_app) or the firewall.
set -euo pipefail
HERE=$(cd "$(dirname "$0")" && pwd)

# 1. Packages: Node 24 (NodeSource) and Caddy (official repo).
if ! command -v node >/dev/null || ! node -v | grep -q '^v24'; then
  curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
  apt-get install -y nodejs
fi
if ! command -v caddy >/dev/null; then
  apt-get install -y debian-keyring debian-archive-keyring apt-transport-https curl gnupg
  curl -1sLf https://dl.cloudsmith.io/public/caddy/stable/gpg.key | gpg --batch --yes --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt > /etc/apt/sources.list.d/caddy-stable.list
  apt-get update && apt-get install -y caddy
fi

# 2. Service user and folders.
id betfriend >/dev/null 2>&1 || useradd --system --create-home --home-dir /var/lib/betfriend --shell /usr/sbin/nologin betfriend
mkdir -p /opt/betfriend/releases /var/lib/betfriend/uploads /var/backups/betfriend /etc/betfriend
chown -R betfriend:betfriend /var/lib/betfriend /var/backups/betfriend
chown root:betfriend /etc/betfriend; chmod 750 /etc/betfriend /var/backups/betfriend

# 3. Database + role (localhost only; pg_hba already allows 127.0.0.1 with scram-sha-256).
if ! sudo -u postgres psql -Atc "select 1 from pg_roles where rolname='betfriend_app'" | grep -q 1; then
  PW=$(openssl rand -hex 24)
  sudo -u postgres psql -qc "create role betfriend_app login password '$PW'"
  sudo -u postgres createdb -O betfriend_app betfriend
  sudo -u postgres psql -qc "revoke all on database betfriend from public"
  SS=$(openssl rand -hex 32)
  printf 'NODE_ENV=production\nPORT=4400\nHOST=127.0.0.1\nDATABASE_URL=postgres://betfriend_app:%s@127.0.0.1:5432/betfriend\nSESSION_SECRET=%s\nUPLOAD_DIR=/var/lib/betfriend/uploads\nCOOKIE_SECURE=auto\nADMIN_USER=admin\nADMIN_PASSWORD_HASH=\n' "$PW" "$SS" > /etc/betfriend/betfriend.env
  chown root:betfriend /etc/betfriend/betfriend.env; chmod 640 /etc/betfriend/betfriend.env
fi

# 4. systemd service, Caddy, nightly backup.
install -m 644 "$HERE/betfriend.service" /etc/systemd/system/betfriend.service
systemctl daemon-reload
systemctl enable betfriend >/dev/null
install -m 755 "$HERE/backup.sh" /usr/local/bin/betfriend-backup
echo '30 3 * * * betfriend /usr/local/bin/betfriend-backup >> /var/lib/betfriend/backup.log 2>&1' > /etc/cron.d/betfriend-backup
chmod 644 /etc/cron.d/betfriend-backup
install -m 644 "$HERE/Caddyfile" /etc/caddy/Caddyfile
caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile >/dev/null
systemctl reload caddy || systemctl restart caddy
echo "setup ok"

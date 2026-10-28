#!/usr/bin/env bash
# Runs on the server (with sudo) after deploy.mjs has unpacked a release.
# Usage: sudo bash /opt/betfriend/releases/<id>/deploy/activate.sh <id>
set -euo pipefail
ID="$1"
BASE=/opt/betfriend
REL="$BASE/releases/$ID"
[ -d "$REL" ] || { echo "no release $REL"; exit 1; }

chown -R betfriend:betfriend "$REL"
cd "$REL"
if [ -f package-lock.json ]; then
  sudo -u betfriend -H npm ci --omit=dev --no-audit --no-fund --loglevel=error
fi
if [ -f server/migrate.mjs ]; then
  sudo -u betfriend bash -c 'set -a; . /etc/betfriend/betfriend.env; set +a; node server/migrate.mjs'
fi

PREV=$(readlink -f "$BASE/current" || true)
ln -sfn "$REL" "$BASE/current.new" && mv -T "$BASE/current.new" "$BASE/current"
systemctl restart betfriend

# Health check; roll back to the previous release if the new one doesn't come up.
for i in $(seq 1 20); do
  if curl -fsS -o /dev/null http://127.0.0.1:4400/healthz; then echo "release $ID is live"; break; fi
  sleep 1
  if [ "$i" = 20 ]; then
    echo "health check failed"
    if [ -n "$PREV" ] && [ -d "$PREV" ]; then ln -sfn "$PREV" "$BASE/current"; systemctl restart betfriend; echo "rolled back to $PREV"; fi
    exit 1
  fi
done

# Keep the 5 newest releases.
ls -1dt "$BASE"/releases/* | tail -n +6 | xargs -r rm -rf

#!/usr/bin/env bash
# Nightly BetFriend backup: database dump + uploaded images. Keeps 14 days.
# Installed to /etc/cron.d/betfriend-backup by deploy/setup-server.sh (runs as the betfriend user).
set -euo pipefail
set -a; . /etc/betfriend/betfriend.env; set +a
DEST=/var/backups/betfriend
STAMP=$(date +%Y-%m-%d_%H%M)
umask 077
pg_dump --format=custom --no-owner --dbname="$DATABASE_URL" --file="$DEST/db_$STAMP.dump"
tar -czf "$DEST/uploads_$STAMP.tar.gz" -C "$UPLOAD_DIR" .
find "$DEST" -type f \( -name 'db_*.dump' -o -name 'uploads_*.tar.gz' \) -mtime +14 -delete
echo "backup ok $STAMP"

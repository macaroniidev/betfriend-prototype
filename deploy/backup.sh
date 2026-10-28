#!/usr/bin/env bash
# Nightly BetFriend backup: database dump + uploaded images. Keeps 14 days.
# Installed to /etc/cron.d/betfriend-backup by deploy/setup-server.sh (runs as the betfriend user).
set -euo pipefail
cd /
# Read settings without sourcing the file (values such as the password hash contain "$").
envval() { grep -E "^$1=" /etc/betfriend/betfriend.env | head -1 | cut -d= -f2-; }
DATABASE_URL=$(envval DATABASE_URL); UPLOAD_DIR=$(envval UPLOAD_DIR)
DEST=/var/backups/betfriend
STAMP=$(date +%Y-%m-%d_%H%M)
umask 077
# Connection details via the environment, so the password never shows up in the process list.
re='^postgres(ql)?://([^:]+):([^@]+)@([^:/]+):?([0-9]*)/(.+)$'
[[ "$DATABASE_URL" =~ $re ]] || { echo "DATABASE_URL not understood"; exit 1; }
PGUSER="${BASH_REMATCH[2]}" PGPASSWORD="${BASH_REMATCH[3]}" PGHOST="${BASH_REMATCH[4]}" PGPORT="${BASH_REMATCH[5]:-5432}" PGDATABASE="${BASH_REMATCH[6]}"   pg_dump --format=custom --no-owner --file="$DEST/db_$STAMP.dump"
tar -czf "$DEST/uploads_$STAMP.tar.gz" -C "$UPLOAD_DIR" .
find "$DEST" -type f \( -name 'db_*.dump' -o -name 'uploads_*.tar.gz' \) -mtime +14 -delete
echo "backup ok $STAMP"

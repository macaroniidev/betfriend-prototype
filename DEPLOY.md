# Deploying BetFriend

BetFriend runs on **sports-db** (`178.63.164.227`, Ubuntu 22.04), next to whiper01's sports-panel databases.
It is fully separate from sports-panel: its own system user, database, role, service and folders. Nothing
here touches `sports_dev`, `sports_prod`, `sports_app` or their configs.

## What runs where

| Piece | Where |
|---|---|
| Web server (HTTPS, certificates) | Caddy, `/etc/caddy/Caddyfile` (copied from `deploy/Caddyfile`) |
| BetFriend app | systemd service `betfriend`, Node 24, listens on `127.0.0.1:4400` only |
| Code releases | `/opt/betfriend/releases/<timestamp>`, `/opt/betfriend/current` points at the live one (last 5 kept) |
| Settings and secrets | `/etc/betfriend/betfriend.env` (root:betfriend, 640). Never committed |
| Database | Postgres 16 on the same box: database `betfriend`, role `betfriend_app`, localhost only |
| Test database | `betfriend_dev`, role `betfriend_dev` (for local development over an SSH tunnel) |
| Uploaded images | `/var/lib/betfriend/uploads` |
| Backups | `/var/backups/betfriend`, nightly at 03:30 server time, 14 days kept |
| Logs | `journalctl -u betfriend` (app), `journalctl -u caddy` (web server), `/var/lib/betfriend/backup.log` |

Firewall: ports 22, 80 and 443 are open (`/etc/iptables/rules.v4`, already saved). The app port 4400 is never
exposed. Don't flush iptables; add rules before `COMMIT` and reload (see sports-panel's CLAUDE.md).

## Deploy a new version

From this folder on your computer (needs the SSH key that's allowed on the server, and `VPS_SSH_USER` in `.env`):

```
node deploy/deploy.mjs
```

It packs the code (no `.env`, no `node_modules`, no screenshots), uploads it as a new release, installs
dependencies, runs database migrations, switches over and checks `/healthz`. If the new version doesn't come
up within 20 seconds it switches back to the previous release automatically.

Your editor content (text, layout, prices, images, history) lives in the database and uploads folder, so a
deploy never changes or loses it.

First-time setup of a fresh server: `node deploy/deploy.mjs --setup` (installs Node, Caddy, the service, the
database and the backup job; safe to run again).

## Domain and HTTPS

Point these DNS records at the server:

| Type | Name | Value |
|---|---|---|
| A | `betfriend.bet` (`@`) | `178.63.164.227` |
| A | `www` | `178.63.164.227` |

Caddy requests the Let's Encrypt certificate by itself as soon as the records resolve (usually a few minutes),
and renews it automatically. Until then the site answers on `http://178.63.164.227`.

## Admin login

- URL: `/admin` (for example `https://betfriend.bet/admin`).
- Username: `ADMIN_USER` in `/etc/betfriend/betfriend.env` (default `admin`).
- The password is stored only as a scrypt hash in `ADMIN_PASSWORD_HASH`.

Change the password:

```
ssh macaroni@178.63.164.227
cd /opt/betfriend/current
read -rs PW && printf %s "$PW" | node server/hash-password.mjs --stdin   # prints the new hash
sudo nano /etc/betfriend/betfriend.env      # paste it after ADMIN_PASSWORD_HASH=
sudo systemctl restart betfriend
```

(`node server/hash-password.mjs` with no arguments generates a strong password and its hash.)

Sessions last 12 hours at most and end after 2 hours without activity. Five wrong passwords from one address
lock login for 15 minutes.

## Backups and restore

Nightly files: `db_<date>.dump` (database) and `uploads_<date>.tar.gz` (images). Run one now:
`sudo -u betfriend /usr/local/bin/betfriend-backup`.

Restore (this replaces the current content):

```
sudo systemctl stop betfriend
sudo -u postgres pg_restore --clean --if-exists --no-owner --role=betfriend_app -d betfriend /var/backups/betfriend/db_<date>.dump
sudo tar -xzf /var/backups/betfriend/uploads_<date>.tar.gz -C /var/lib/betfriend/uploads
sudo chown -R betfriend:betfriend /var/lib/betfriend/uploads
sudo systemctl start betfriend
```

To undo one bad publish you don't need a backup: use **History → Restore** in the editor.

## Useful commands

```
systemctl status betfriend            # is it running?
journalctl -u betfriend -n 100        # recent app logs
sudo systemctl restart betfriend
ls -1t /opt/betfriend/releases        # releases, newest first
```

Roll back the code by hand: `sudo ln -sfn /opt/betfriend/releases/<older> /opt/betfriend/current && sudo systemctl restart betfriend`.

## Local development

```
npm install
npm run tunnel        # terminal 1: SSH tunnel to the test database (betfriend_dev)
node server.mjs       # terminal 2: http://127.0.0.1:4400  (editor at /admin)
```

`.env` (git-ignored) holds `DATABASE_URL` for the tunnel and a local `ADMIN_PASSWORD_HASH`. Without
`DATABASE_URL` the site still runs, just without the admin editor.

QA: `node qa/check.mjs` (every screen), `node qa/shots.mjs` (brand audit + screenshots),
`BF_PW_FILE=<file with the admin password> node qa/editor-walkthrough.mjs` (full editor test; it resets the
drafts, publishes test edits and then restores the version that was live before, so don't run it with
unpublished work in the editor).

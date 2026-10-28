// Owner login: scrypt password hashes, server-side sessions in Postgres, httpOnly cookies,
// login rate limiting. No password is ever stored or logged in plain text.
import { scrypt as scryptCb, randomBytes, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
import { q } from './db.mjs';

const scrypt = promisify(scryptCb);
const N = 2 ** 15, R = 8, P = 1, KEYLEN = 64, MAXMEM = 128 * N * R * 2;

export const COOKIE = 'bf_admin';
const IDLE_MS = 2 * 3600e3;      // signed out after 2 hours without activity
const ABSOLUTE_MS = 12 * 3600e3; // and always after 12 hours

/** "scrypt$N$r$p$salt$hash" (base64). */
export async function hashPassword(password) {
  const salt = randomBytes(16);
  const key = await scrypt(password.normalize('NFKC'), salt, KEYLEN, { N, r: R, p: P, maxmem: MAXMEM });
  return `scrypt$${N}$${R}$${P}$${salt.toString('base64')}$${key.toString('base64')}`;
}

export async function verifyPassword(password, stored) {
  const parts = String(stored || '').split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const [, n, r, p, salt, hash] = parts;
  const expected = Buffer.from(hash, 'base64');
  const key = await scrypt(String(password).normalize('NFKC'), Buffer.from(salt, 'base64'), expected.length,
    { N: Number(n), r: Number(r), p: Number(p), maxmem: 128 * Number(n) * Number(r) * 2 });
  return key.length === expected.length && timingSafeEqual(key, expected);
}

const sha = (s) => createHash('sha256').update(s).digest('hex');

/** Make sure the admin from the environment exists with the current hash (one owner today; table allows more). */
export async function syncAdminFromEnv() {
  const user = (process.env.ADMIN_USER || 'admin').trim().toLowerCase();
  const hash = (process.env.ADMIN_PASSWORD_HASH || '').trim();
  if (!hash) { console.warn('ADMIN_PASSWORD_HASH is empty: admin login is disabled until it is set.'); return; }
  await q(`insert into bf_admins (username, password_hash) values ($1, $2)
           on conflict (username) do update set password_hash = excluded.password_hash
           where bf_admins.password_hash is distinct from excluded.password_hash`, [user, hash]);
}

// ---- rate limiting (in memory; one server process) ----
const fails = new Map(); // key -> [timestamps]
const WINDOW = 15 * 60e3;
function recent(key) {
  const now = Date.now();
  const list = (fails.get(key) || []).filter((t) => now - t < WINDOW);
  fails.set(key, list);
  return list;
}
export function loginBlocked(ip, user) {
  const a = recent(`ip:${ip}`), b = recent(`user:${user}`);
  if (a.length >= 5) return Math.ceil((WINDOW - (Date.now() - a[0])) / 1000);
  if (b.length >= 20) return Math.ceil((WINDOW - (Date.now() - b[0])) / 1000);
  return 0;
}
export function noteFailure(ip, user) { recent(`ip:${ip}`).push(Date.now()); recent(`user:${user}`).push(Date.now()); }
export function clearFailures(ip) { fails.delete(`ip:${ip}`); }

// ---- sessions ----
export async function login(username, password, { ip, userAgent }) {
  const user = String(username || '').trim().toLowerCase();
  const { rows } = await q('select id, username, password_hash from bf_admins where username = $1', [user]);
  // Always run a hash check so response time doesn't reveal whether the user exists.
  const ok = await verifyPassword(password, rows[0]?.password_hash || 'scrypt$32768$8$1$AAAAAAAAAAAAAAAAAAAAAA==$' + 'A'.repeat(86) + '==');
  if (!rows[0] || !ok) return null;
  const token = randomBytes(32).toString('base64url');
  await q(`insert into bf_sessions (token_hash, admin_id, expires_at, ip, user_agent) values ($1, $2, now() + $3::interval, $4, $5)`,
    [sha(token), rows[0].id, `${ABSOLUTE_MS / 1000} seconds`, ip, String(userAgent || '').slice(0, 200)]);
  await q('delete from bf_sessions where expires_at < now() or last_seen < now() - $1::interval', [`${IDLE_MS / 1000} seconds`]);
  return { token, admin: { id: rows[0].id, username: rows[0].username } };
}

export async function sessionFromToken(token) {
  if (!token || token.length > 100) return null;
  const { rows } = await q(`select s.token_hash, s.last_seen, a.id, a.username from bf_sessions s join bf_admins a on a.id = s.admin_id
    where s.token_hash = $1 and s.expires_at > now() and s.last_seen > now() - $2::interval`, [sha(token), `${IDLE_MS / 1000} seconds`]);
  if (!rows[0]) return null;
  if (Date.now() - new Date(rows[0].last_seen).getTime() > 60e3) {
    q('update bf_sessions set last_seen = now() where token_hash = $1', [rows[0].token_hash]).catch(() => {});
  }
  return { id: rows[0].id, username: rows[0].username };
}

export async function logout(token) {
  if (token) await q('delete from bf_sessions where token_hash = $1', [sha(token)]);
}

export function readCookie(req, name) {
  const raw = req.headers.cookie || '';
  for (const part of raw.split(';')) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim());
  }
  return null;
}

export function isHttps(req) {
  const mode = process.env.COOKIE_SECURE || 'auto';
  if (mode === 'true') return true;
  if (mode === 'false') return false;
  return (req.headers['x-forwarded-proto'] || '').split(',')[0].trim() === 'https';
}

export function sessionCookie(req, token, maxAgeSec = ABSOLUTE_MS / 1000) {
  return `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAgeSec}${isHttps(req) ? '; Secure' : ''}`;
}
export const clearCookie = (req) => `${COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${isHttps(req) ? '; Secure' : ''}`;

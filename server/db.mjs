// Postgres connection + schema. Content and history live here; uploaded images live in UPLOAD_DIR.
import pg from 'pg';

let pool;
export function db() {
  if (!pool) {
    pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 8, idleTimeoutMillis: 30_000 });
    pool.on('error', (err) => console.error('db pool error', err.message));
  }
  return pool;
}
export const q = (text, params) => db().query(text, params);

export const SCHEMA = `
create table if not exists bf_admins (
  id serial primary key,
  username text unique not null,
  password_hash text not null,
  created_at timestamptz not null default now()
);
create table if not exists bf_sessions (
  token_hash text primary key,
  admin_id int not null references bf_admins(id) on delete cascade,
  created_at timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  expires_at timestamptz not null,
  ip text,
  user_agent text
);
create index if not exists bf_sessions_admin on bf_sessions(admin_id);
-- One row per editable document ("landing", "app"): the working draft and the live version.
create table if not exists bf_pages (
  page text primary key,
  draft jsonb,
  published jsonb,
  draft_updated_at timestamptz,
  published_at timestamptz
);
-- Every publish (and restore) is kept, so any earlier version can be brought back.
create table if not exists bf_versions (
  id serial primary key,
  page text not null,
  content jsonb not null,
  note text,
  created_by text,
  created_at timestamptz not null default now()
);
create index if not exists bf_versions_page on bf_versions(page, id desc);
create table if not exists bf_uploads (
  id serial primary key,
  file text unique not null,
  mime text not null,
  size int not null,
  original_name text,
  created_by text,
  created_at timestamptz not null default now()
);
create table if not exists bf_audit (
  id bigserial primary key,
  at timestamptz not null default now(),
  who text,
  action text not null,
  detail jsonb,
  ip text
);
`;

export async function migrate() {
  await q(SCHEMA);
}

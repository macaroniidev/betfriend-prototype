// Deploy BetFriend to the server in one command:  node deploy/deploy.mjs   (add --setup the first time)
// Packs this folder (no secrets, no node_modules, no QA screenshots), uploads it as a new release,
// installs dependencies, runs database migrations, switches over and health-checks (auto rollback).
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const env = Object.fromEntries(
  readFileSync(join(root, '.env'), 'utf8').split(/\r?\n/)
    .filter(l => /^[A-Z_]+=/.test(l)).map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]),
);
const host = `${env.VPS_SSH_USER || 'macaroni'}@${env.VPS_HOST || '178.63.164.227'}`;
const id = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
const rel = `/opt/betfriend/releases/${id}`;
const ssh = ['-o', 'BatchMode=yes', host];

const run = (cmd, args, opts = {}) => new Promise((ok, fail) => {
  const p = spawn(cmd, args, { stdio: 'inherit', ...opts });
  p.on('exit', c => (c === 0 ? ok() : fail(new Error(`${cmd} exited ${c}`))));
});

const exclude = ['.env', '.env.*', 'node_modules', 'qa/*.png', 'qa/landing-crops-before', 'qa/shots', '.git', 'uploads', '*.log'];
console.log(`Deploying release ${id} to ${host}`);
await run('ssh', [...ssh, `sudo mkdir -p ${rel} && sudo chown $USER ${rel}`]);
await new Promise((ok, fail) => {
  const tar = spawn('tar', ['-czf', '-', ...exclude.flatMap(e => ['--exclude', e]), '.'], { cwd: root, stdio: ['ignore', 'pipe', 'inherit'] });
  const up = spawn('ssh', [...ssh, `tar -xzf - -C ${rel}`], { stdio: ['pipe', 'inherit', 'inherit'] });
  tar.stdout.pipe(up.stdin);
  up.on('exit', c => (c === 0 ? ok() : fail(new Error('upload failed'))));
});
if (process.argv.includes('--setup')) await run('ssh', [...ssh, `sudo bash ${rel}/deploy/setup-server.sh`]);
await run('ssh', [...ssh, `sudo bash ${rel}/deploy/activate.sh ${id}`]);
console.log('Done.');

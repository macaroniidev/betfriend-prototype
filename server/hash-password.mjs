// Hash an admin password for ADMIN_PASSWORD_HASH.
//   node server/hash-password.mjs              -> generates a strong password, prints "password<TAB>hash"
//   echo -n 'my password' | node server/hash-password.mjs --stdin   -> prints the hash only
import { randomBytes } from 'node:crypto';
import { hashPassword } from './auth.mjs';

if (process.argv.includes('--stdin')) {
  let input = '';
  for await (const c of process.stdin) input += c;
  const pw = input.replace(/\r?\n$/, '');
  if (pw.length < 12) { console.error('Use at least 12 characters.'); process.exit(1); }
  console.log(await hashPassword(pw));
} else {
  // 4 groups of 5 from an unambiguous alphabet: easy to type, ~100 bits.
  const A = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const bytes = randomBytes(20);
  const pw = [...bytes].map((b) => A[b % A.length]).join('').match(/.{5}/g).join('-');
  console.log(`${pw}\t${await hashPassword(pw)}`);
}

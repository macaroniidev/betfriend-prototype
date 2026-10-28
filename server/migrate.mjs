// Creates/updates the BetFriend tables. Run by deploy/activate.sh on every release (idempotent).
import { migrate, db } from './db.mjs';

await migrate();
await db().end();
console.log('migrations ok');

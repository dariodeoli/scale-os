import {readFile} from 'node:fs/promises';
import {migrationOrder} from './migration-order.mjs';
// Older focused fixtures deliberately replay a subset of historical migrations.
// Bring them to the canonical schema before exercising the new financial paths.
export async function economicFixtureSchema(pg){
 const additions=['20261018_economic_history.sql','20261018_commercial_same_month_revisions.sql'];
 for(const name of [...migrationOrder.filter(name=>!additions.includes(name)),...additions])await pg.exec(await readFile(new URL('../migrations/'+name,import.meta.url),'utf8'));
}

import assert from 'node:assert/strict';
import {daysUntil} from '../app/client-format';

function main(){
 const now=new Date('2026-09-18T15:00:00Z');
 assert.equal(daysUntil('2026-10-18',now),30);
 assert.equal(daysUntil('2026-09-18',now),0);
 assert.equal(daysUntil('2026-09-15',now),-3);
 assert.equal(daysUntil('2026-10-18T15:00:00Z',now),30);
 assert.equal(daysUntil(null,now),null);
 assert.equal(daysUntil(undefined,now),null);
 assert.equal(daysUntil('',now),null);
 assert.equal(daysUntil('invalid',now),null);
 console.log('PASS: daysUntil counts Asunción calendar days for dates and timestamps, returns negatives for past dates and null for missing/invalid input');
}
void main();

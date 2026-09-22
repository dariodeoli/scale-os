import assert from 'node:assert/strict';
import {daysUntil,todayAsuncion} from '../app/client-format';

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
 // Asunción fija UTC-3: el día del dominio no depende del reloj del dispositivo.
 assert.equal(todayAsuncion(new Date('2026-09-22T15:00:00Z')),'2026-09-22');
 assert.equal(todayAsuncion(new Date('2026-09-23T02:00:00Z')),'2026-09-22');
 assert.equal(todayAsuncion(new Date('2027-01-15T02:00:00Z')),'2027-01-14');
 console.log('PASS: daysUntil counts Asunción calendar days for dates and timestamps, returns negatives for past dates and null for missing/invalid input; todayAsuncion is the single domain day source');
}
void main();

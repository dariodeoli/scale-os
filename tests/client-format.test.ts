import assert from 'node:assert/strict';
import {daysUntil,todayAsuncion,moneyKpi} from '../app/client-format';
import {money} from '../app/money-format';

function main(){
 const now=new Date('2026-09-18T15:00:00Z');
 // Un dato, un formato: el agregado de KPI comparte el formateador de las filas
 // y conserva los centavos de toda moneda no-PYG.
 assert.equal(moneyKpi(1234.56,'USD'),money(1234.56,'USD'));
 assert.equal(moneyKpi(1234.56,'USD'),'USD\u00a01.234,56');
 assert.equal(moneyKpi(3500000,'PYG'),'Gs.\u00a03.500.000');
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

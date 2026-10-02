import assert from 'node:assert/strict';
import {clientDateSummary,clientSince,daysUntil,todayAsuncion,moneyKpi} from '../app/client-format';
import {money} from '../app/money-format';

function main(){
 const now=new Date('2026-09-18T15:00:00Z');
 // Un dato, un formato: el agregado de KPI comparte el formateador de las filas
 // y conserva los centavos de toda moneda no-PYG.
 assert.equal(moneyKpi(1234.56,'USD'),money(1234.56,'USD'));
 assert.equal(moneyKpi(1234.56,'USD'),'USD\u00a01.234,56');
 assert.equal(moneyKpi(3500000,'PYG'),'Gs.\u00a03.500.000');
 assert.equal(money('3000000.00','PYG'),'Gs.\u00a03.000.000','un importe crudo del API se formatea sin decimales en PYG');
 assert.equal(money('3000000.00','USD'),'USD\u00a03.000.000,00','y con dos decimales en el resto');
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
 // #145: «Cliente desde» es un solo dato en listado y ficha (etiqueta de la
 // librería, huso de la empresa) y la relación real sólo aparece si difiere.
 assert.equal(clientSince('2026-04-01T02:30:00Z'),'mar. 2026','el listado usa el día de Asunción, no el de UTC');
 assert.deepEqual(clientDateSummary({createdAt:'2026-04-01T02:30:00Z',relationshipStartedOn:'2026-03-15'}),{since:'31 mar 26',relationship:'15 mar 26'},'una fecha de relación distinta se muestra aparte');
 assert.deepEqual(clientDateSummary({createdAt:'2026-04-01T02:30:00Z',relationshipStartedOn:'2026-03-31'}),{since:'31 mar 26',relationship:null},'si la relación coincide con el alta no se repite');
 assert.deepEqual(clientDateSummary({createdAt:'2026-04-01T12:00:00Z',relationshipStartedOn:null}),{since:'01 abr 26',relationship:null},'una fecha de calendario no se desplaza');
 assert.deepEqual(clientDateSummary({createdAt:null,relationshipStartedOn:'2026-03-01'}),{since:null,relationship:'01 mar 26'},'sin alta, la relación sigue siendo un dato propio');
 assert.deepEqual(clientDateSummary({createdAt:null,relationshipStartedOn:null}),{since:null,relationship:null});
 assert.deepEqual(clientDateSummary({createdAt:'invalid',relationshipStartedOn:'invalid'}),{since:null,relationship:null},'un dato inválido no inventa fecha');
 console.log('PASS: daysUntil counts Asunción calendar days for dates and timestamps, returns negatives for past dates and null for missing/invalid input; todayAsuncion is the single domain day source; «Cliente desde» (clientDateSummary) is one labeled date shared by listado y ficha (#145)');
}
void main();

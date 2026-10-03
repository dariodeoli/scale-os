import assert from 'node:assert/strict';
import {humanHours,hoursSummary,hoursText} from '../app/hours-format';

// #151: las horas del API (numeric/`3.00`) se muestran humanas; nunca decimales vacíos.
assert.equal(humanHours('3.00'),'3','3.00 no arrastra decimales vacíos');
assert.equal(humanHours(3),'3');
assert.equal(humanHours('2.50'),'2,5','los medios se muestran con coma');
assert.equal(humanHours('12.25'),'12,25','hasta dos decimales reales');
assert.equal(humanHours('0'),'0','cero es un dato, no un vacío');
assert.equal(humanHours(''),null);
assert.equal(humanHours(null),null);
assert.equal(humanHours(undefined),null);
assert.equal(humanHours('abc'),null,'un valor inválido no inventa horas');
assert.equal(hoursText('3.00'),'3 h');
assert.equal(hoursText(null),null);
assert.equal(hoursSummary('3.00','2.50'),'3 h est. · 2,5 h reales');
assert.equal(hoursSummary('4.00',null),'4 h est.');
assert.equal(hoursSummary(null,'1.00'),'1 h reales');
assert.equal(hoursSummary(null,null),null);

console.log('PASS: horas humanas — sin decimales vacíos, coma es-PY y vacío honesto (#151).');

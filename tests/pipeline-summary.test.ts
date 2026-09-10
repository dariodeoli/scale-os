import assert from 'node:assert/strict';
import {pipelineSummary} from '../app/pipeline-summary';
import {childSections,sectionPath} from '../app/navigation';
const result=pipelineSummary([{stage:'lead',amount:3000000,currency:'PYG',notes:'Origen: landing Scale OS. Autorizó contacto.'},{stage:'proposal',amount:1200,currency:'USD'},{stage:'won',amount:100,currency:'USD'},{stage:'lost',amount:200,currency:'USD'}]);
assert.deepEqual(result,{open:2,won:1,web:1,amounts:{PYG:3000000,USD:1200}});
assert.deepEqual(childSections('Pipeline'),['Pipeline']);assert.equal(sectionPath('Métricas'),'/pipeline');
assert.deepEqual(pipelineSummary([]),{open:0,won:0,web:0,amounts:{}});
console.log('PASS: unified Pipeline, open/won/web counts and isolated currency totals');

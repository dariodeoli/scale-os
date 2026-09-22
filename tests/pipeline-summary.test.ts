import assert from 'node:assert/strict';
import {pipelineSummary,stageTotals} from '../app/pipeline-summary';
import {childSections,sectionPath} from '../app/navigation';
const result=pipelineSummary([{stage:'lead',amount:3000000,currency:'PYG',notes:'Origen: landing Scale OS. Autorizó contacto.'},{stage:'proposal',amount:1200,currency:'USD'},{stage:'won',amount:100,currency:'USD'},{stage:'lost',amount:200,currency:'USD'}]);
assert.deepEqual(result,{open:2,won:1,web:1,amounts:{PYG:3000000,USD:1200}});
assert.deepEqual(pipelineSummary([]),{open:0,won:0,web:0,amounts:{}});

// Totales por columna del tablero (spec #43 §2): ponderado y abierto por moneda.
const stages=[{slug:'lead',label:'Lead',position:0,active:true,kind:'open' as const},{slug:'proposal',label:'Propuesta',position:1,active:true,kind:'open' as const},{slug:'won',label:'Ganado',position:2,active:true,kind:'won' as const}];
const totals=stageTotals([
 {id:'1',stage:'lead',amount:1000,currency:'USD',probability:50},
 {id:'2',stage:'lead',amount:2000,currency:'USD',probability:25},
 {id:'3',stage:'lead',amount:300000,currency:'PYG',probability:10},
 {id:'4',stage:'proposal',amount:500,currency:'USD',probability:100},
 {id:'5',stage:'historica',amount:100,currency:'USD',probability:0},
],stages);
assert.deepEqual(totals.find(entry=>entry.stage==='lead'),{stage:'lead',label:'Lead',count:3,weighted:{USD:1000,PYG:30000},open:{USD:3000,PYG:300000}});
assert.deepEqual(totals.find(entry=>entry.stage==='proposal'),{stage:'proposal',label:'Propuesta',count:1,weighted:{USD:500},open:{USD:500}});
assert.deepEqual(totals.find(entry=>entry.stage==='won'),{stage:'won',label:'Ganado',count:0,weighted:{},open:{}},'las etapas sin filas reservan su lugar');
assert.deepEqual(totals.find(entry=>entry.stage==='historica'),{stage:'historica',label:'historica',count:1,weighted:{USD:0},open:{USD:100}},'las etapas desconocidas usan el slug como label');
assert.deepEqual(stageTotals([{stage:'',amount:999}],stages).find(entry=>entry.stage==='lead')?.count,0,'las filas sin etapa no entran');

assert.deepEqual(childSections('Pipeline'),['Pipeline']);assert.equal(sectionPath('Métricas'),'/pipeline');
console.log('PASS: unified Pipeline, open/won/web counts, isolated currency totals and per-stage weighted/open totals');

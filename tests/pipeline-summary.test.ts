import assert from 'node:assert/strict';
import {pipelineSummary,stageTotals} from '../app/pipeline-summary';
import {boardColumnWindow} from '../app/pipeline-board-window';
import {childSections,legacyDestination,sectionPath} from '../app/navigation';
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

assert.deepEqual(childSections('Pipeline'),['Pipeline','Métricas'],'Métricas es el tab de Pipeline en la única fuente');
assert.equal(sectionPath('Métricas'),'/pipeline/metricas','Métricas tiene URL propia (deep link sin redirect muerto)');
assert.equal(legacyDestination('metricas'),'/pipeline/metricas','el slug legacy apunta al tab real');

// Ventana visible del tablero (#140): cuántas columnas quedan fuera de vista y
// a cada lado; lógica pura para que el indicador se pueda testear sin DOM.
const columns=[{start:0,size:240},{start:252,size:240},{start:504,size:240},{start:756,size:240}];
assert.deepEqual(boardColumnWindow(columns,0,500),{from:0,to:1,total:4,hiddenBefore:0,hiddenAfter:2,hiddenTotal:2},'con el tablero al inicio se ven las dos primeras');
assert.deepEqual(boardColumnWindow(columns,500,240),{from:2,to:2,total:4,hiddenBefore:2,hiddenAfter:1,hiddenTotal:3},'una columna parcialmente asomada cuenta como visible');
assert.deepEqual(boardColumnWindow(columns,1000,500),{from:3,to:3,total:4,hiddenBefore:3,hiddenAfter:0,hiddenTotal:3},'al final quedan las anteriores fuera');
assert.deepEqual(boardColumnWindow([],0,500),{from:0,to:0,total:0,hiddenBefore:0,hiddenAfter:0,hiddenTotal:0},'sin etapas no hay ventana');
assert.deepEqual(boardColumnWindow(columns,0,0),{from:0,to:0,total:4,hiddenBefore:0,hiddenAfter:0,hiddenTotal:0},'sin ancho medible el indicador no afirma nada');
assert.deepEqual(boardColumnWindow(columns,Number.NaN,500),{from:0,to:0,total:4,hiddenBefore:0,hiddenAfter:0,hiddenTotal:0},'un scroll inválido no rompe el conteo');
assert.deepEqual(boardColumnWindow(columns,-10,500),{from:0,to:1,total:4,hiddenBefore:0,hiddenAfter:2,hiddenTotal:2},'el scroll negativo se ancla al inicio');
console.log('PASS: unified Pipeline, open/won/web counts, isolated currency totals, per-stage weighted/open totals and board window');

import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
const read=(path:string)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const pre=read('app/financial-forecast.tsx'),informes=read('app/reports-workspace.tsx'),weekly=read('app/weekly-automatic.tsx'),treasury=read('app/daily-controls.tsx');
const uiV2=read('app/ui-v2.tsx');

// ── Contrato v2 de FIN (campaña #41, spec #45): Tailwind + owncoding-ui +
// primitivas de app/ui-v2.tsx. Reemplaza al contrato del rediseño anterior.
for(const [name,source] of [['previsión',pre],['informes',informes],['producción semanal',weekly],['conciliación',treasury]] as const){
 assert.match(source,/from 'owncoding-ui'/,'${name} usa objetos de la librería'.replace('${name}',name));
 assert.doesNotMatch(source,/-forecast\.css'/,'no quedan hojas de componente en el módulo');
}
assert(!existsSync(new URL('../app/financial-forecast.css',import.meta.url)),'la hoja plana de la previsión se retiró');

// ── Un solo chip, un solo KPI y una sola carga.
assert.match(uiV2,/export function StateChip/);assert.match(uiV2,/export function Kpi\b/);assert.match(uiV2,/export function LoadingBlock/);
assert.match(pre,/StateChip/);assert.match(treasury,/StateChip/);
assert.match(pre,/LoadingBlock/);assert.match(informes,/KpiStrip/);assert.match(informes,/LoadingBlock/);
for(const source of [pre,informes,weekly,treasury])assert.doesNotMatch(source,/kpi-card|state-chip|class(Name)?="metric/,'no se recrean chips ni KPIs por pantalla');

// ── Estados: vacío, error, carga y aviso con datos reales.
for(const [name,source] of [['previsión',pre],['informes',informes],['producción semanal',weekly],['conciliación',treasury]] as const){
 for(const primitive of ['EmptyState','ErrorState','LoadingBlock','Aviso|Nota']){
  assert.match(source,new RegExp(primitive),`${name} usa ${primitive}`);
 }
}

// ── Listas: una sola plantilla por lista, compartida entre encabezado y filas,
// sin tracks `auto` que desalineen, con scroll horizontal silencioso.
for(const cols of ['PERSON_COLS','CONTRACT_COLS','EXPENSE_COLS','PLANNED_COLS']){
 assert.match(pre,new RegExp(`const ${cols}='grid-cols-`),`${cols} declara la plantilla de la lista`);
 assert.match(pre,new RegExp(`cn\\(LIST_HEAD,${cols}\\)`),`el encabezado de ${cols} comparte la plantilla`);
 assert.match(pre,new RegExp(`cn\\(LIST_ROW,${cols}`),`las filas de ${cols} comparten la plantilla`);
}
assert.match(treasury,/const STATEMENT_COLS='grid-cols-/);
assert.match(treasury,/const STATEMENT_HEAD=/);assert.match(treasury,/const STATEMENT_ROW=/);
assert.match(treasury,/cn\(STATEMENT_HEAD,STATEMENT_COLS\)/);assert.match(treasury,/cn\(STATEMENT_ROW,STATEMENT_COLS\)/);
for(const [name,source,cols] of [['previsión',pre,['PERSON_COLS','CONTRACT_COLS','EXPENSE_COLS','PLANNED_COLS']],['conciliación',treasury,['STATEMENT_COLS']]] as const){
 for(const col of cols){
  const match=source.match(new RegExp(`const ${col}='([^']+)'`));
  assert(match,`${col} está declarada en ${name}`);
  assert(!match![1].includes('_auto'),`${name}: ${col} no usa tracks auto (encabezado y filas alinean)`);
 }
}
assert.equal((pre.match(/overflow-x-auto/g)||[]).length>=4,true,'cada lista de la previsión scrollea en silencio');
assert.match(treasury,/min-w-0 overflow-x-auto/,'el extracto scrollea en silencio');
assert.match(pre,/const LIST_ROW='grid min-h-11 items-center gap-x-2/,'las filas finitas de la previsión conservan 44 px');
assert.match(treasury,/const STATEMENT_ROW='grid min-h-11 items-center gap-x-2/,'la fila del extracto conserva 44 px');

// ── Nada de elipsis sobre montos, fechas, códigos ni nombres.
for(const [name,source] of [['previsión',pre],['informes',informes],['producción semanal',weekly],['conciliación',treasury]] as const){
 assert.doesNotMatch(source,/truncate|line-clamp/,'${name} no recorta con elipsis'.replace('${name}',name));
}
assert.match(pre,/whitespace-nowrap[^>]*tabular-nums|tabular-nums[^>]*whitespace-nowrap/,'las cifras de la previsión no se cortan');
assert.match(informes,/whitespace-nowrap/,'el histórico y la comparativa no cortan cifras ni meses');

// ── Montos por contexto y fechas por list-format.
assert.match(pre,/formatWholeMoney/);assert.match(pre,/formatSignedMoney/);
assert.match(informes,/reportMoney/);
assert.match(treasury,/\bmoney\(/);
for(const [name,source] of [['previsión',pre],['informes',informes],['producción semanal',weekly],['conciliación',treasury]] as const){
 assert.match(source,/listDate(Short|Full)/,'${name} usa list-format'.replace('${name}',name));
 assert.doesNotMatch(source,/toLocaleString|toLocaleDateString/,'${name} no formatea fechas a mano'.replace('${name}',name));
}

// ── Anchos de campo por tipo.
assert.match(pre,/className="w-44"/);assert.match(informes,/className="w-44"/);assert.match(treasury,/className="w-40"/);

console.log('PASS: contrato v2 FIN — librería + primitivas, estados, una plantilla por lista sin `auto`, sin elipsis, montos por contexto, fechas por list-format y anchos por tipo');

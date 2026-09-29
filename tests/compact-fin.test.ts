import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {sectionSource} from './workspace-source';

// Compactación desktop (#95): más contenido útil arriba del pliegue sin tocar
// funciones ni primitivas. Fija la estructura que se movió en cada pantalla.
const read=(path:string)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const finanzas=sectionSource('finanzas.tsx');
const mora=sectionSource('mora.tsx');
const comisiones=sectionSource('comisiones.tsx');
const pre=read('app/financial-forecast.tsx');
const informes=read('app/reports-workspace.tsx');

// ── Finanzas: KPIs y «Salarios» en franja; cuentas sin bloques altos.
const salariosIndex=finanzas.indexOf('<SalariosPanel navigate={navigate}/>');
const cuentasIndex=finanzas.indexOf('finance-accounts-title');
assert(salariosIndex>0&&salariosIndex<cuentasIndex,'Salarios va antes de Cuentas: la franja queda junto a los KPIs');
assert.match(finanzas,/rows\.length \? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">/,'las monedas de Salarios van en una sola fila');
assert.doesNotMatch(finanzas,/min-h-\[200px\]/,'las cuentas ya no reservan 200 px de alto');
assert.match(finanzas,/grid-cols-\[auto_minmax\(0,1fr\)\] items-baseline/,'las filas de la cuenta acotan la columna del valor');
assert.match(finanzas,/min-w-0 flex-1 truncate text-right text-fore/,'los datos secundarios de la cuenta recortan con tooltip');

// ── Mora: header con título completo + toolbar compacta en su fila (#89).
assert.match(mora,/<FilterToolbar summary=\{`\$\{visible\.length\} de \$\{paymentStatuses\.length\}`\}>/,'la toolbar de cobranza vive en su fila compacta');
assert.doesNotMatch(mora,/<PageHeader[\s\S]{0,400}<SegmentedField/,'los filtros no recortan el título del header');

// ── Previsión: mes y horizonte en el header; sin caja de toolbar ni nota suelta.
assert.match(pre,/<PageHeader[\s\S]{0,1200}id="forecast-month"[\s\S]{0,1200}Horizonte de proyección[\s\S]{0,300}\/>/,'mes y horizonte viven en el header');
assert.doesNotMatch(pre,/bg-ink-900\/60 px-3 py-2\.5/,'la caja de la toolbar se retiró');
assert.doesNotMatch(pre,/<Nota tono="neutro">Planificación mensual/,'la nota de alcance pasa al subtítulo');

// ── Informes: el corte vive en el header; export en franja; widget al final.
assert.match(informes,/<PageHeader[\s\S]{0,2000}id="reports-month"[\s\S]{0,2000}Meses de histórico[\s\S]{0,2000}Moneda[\s\S]{0,300}\/>/,'el corte (mes, histórico y moneda) vive en el header');
assert.doesNotMatch(informes,/Período y moneda/,'la tarjeta «Período y moneda» se retiró');
assert.doesNotMatch(informes,/sm:grid-cols-\[minmax\(0,1fr\)_auto\] sm:items-center sm:p-4/,'la exportación dejó de ser una tarjeta alta');
assert(informes.indexOf('<LiveVisitorsWidget/>')>informes.indexOf('Resumen del período'),'los visitantes en vivo cierran la pantalla, no empujan el informe');

// ── Comisiones: cada header de panel en una línea (descripción con tooltip).
for(const id of ['commissions-settlement-title','commissions-list-title','commissions-discounts-title','commissions-payouts-title']){
  assert.match(comisiones,new RegExp(`id="${id}"[\\s\\S]{0,260}min-w-0 truncate text-xs text-mute`),`${id}: la descripción recorta con tooltip`);
}

console.log('PASS compactación FIN: Salarios en franja, headers en una fila, informes sin bloques altos y paneles densos (#95)');

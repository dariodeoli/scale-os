import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {sectionSource} from './workspace-source';

// Densidad integral (#101), alcance SOS-FIN: menos espacio muerto, una sola
// toolbar, ayudas en tooltip/acordeón y render único en las listas.
const read=(path:string)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const finanzas=sectionSource('finanzas.tsx');
const mora=sectionSource('mora.tsx');
const comisiones=sectionSource('comisiones.tsx');
const pre=read('app/financial-forecast.tsx');
const informes=read('app/reports-workspace.tsx');
const controls=read('app/daily-controls.tsx');

// ── Finanzas: transferencias finitas sin scroll permanente y ayudas en tooltip.
assert.match(finanzas,/const TRANSFER_TEMPLATE = 'grid-cols-\[minmax\(12rem,1fr\)_6\.5rem_minmax\(9rem,1fr\)\]'/,'la transferencia declara 3 columnas');
assert.match(finanzas,/minWidthClass="min-w-\[30rem\]"/,'la lista de transferencias entra en media pantalla');
assert.doesNotMatch(finanzas,/min-w-\[64rem\]/,'sin scroll horizontal permanente en transferencias');
assert.match(finanzas,/const detail = \[row\.reference \|\| 'Sin referencia', actor, row\.notes\]/,'actor y referencia viajan inline con el detalle en el title');
for(const id of ['finance-accounts-title','finance-transfers-title','finance-invoices-title','finance-payments-title']){
  assert.match(finanzas,new RegExp(`id="${id}"[\\s\\S]{0,160}title="`),`${id}: la ayuda del panel vive en el tooltip`);
}

// ── Mora: sin la grilla duplicada de buckets; antigüedad como chips.
assert.match(mora,/aria-label="Antigüedad de la mora"/,'la antigüedad es una franja de chips');
assert.match(mora,/MORA_AGE_LABELS\[bucket\.key\]/,'los chips conservan el tramo de antigüedad');
assert.doesNotMatch(mora,/label=\{bucket\.label\}/,'los buckets dejaron de ser una grilla de KPIs');
assert.match(mora,/\{kpis\.sinFactura\} sin factura/,'«sin factura» pasa a chip en vez de KPI duplicado');

// ── Comisiones: subtabs, sin título duplicado y base de cálculo en tooltip.
assert.match(comisiones,/<Subtabs[\s\S]{0,900}items=\{\[\[.liquidacion., `Liquidación · \$\{monthLabel\}`/,'las secciones viven en subtabs con contador');
assert.match(comisiones,/const \[section, setSection\] = useState</,'el subtab activo es estado de la pantalla');
assert.doesNotMatch(comisiones,/rounded-full text-\[17px\] font-semibold[^>]*>Comisiones y referidos</,'el panel no repite el título de la pantalla');
assert.match(comisiones,/title=\{commissionBasisText\(commission/,'la base de cálculo va en el tooltip del importe');
assert.match(comisiones,/label: 'Importe fijo'/,'el diálogo de comisión usa etiquetas cortas');

// ── Previsión: pares en 2 columnas ≥1440, definition en tooltips y render único.
assert.match(pre,/min-\[1440px\]:grid-cols-2/,'los pares de tarjetas usan 2 columnas desde 1440');
assert.equal((pre.match(/min-\[1440px\]:grid-cols-2/g)||[]).length,2,'dos pares: ingresos/resumen y contratos/salarios');
assert.match(pre,/title=\{\`\$\{data\.definition\.issued\} \$\{data\.definition\.accepted_uninvoiced\}\`\}/,'la definición de ingresos viaja en el tooltip');
assert.match(pre,/title=\{data\.definition\.planned_expenses\}/,'la definición de gastos planificados viaja en el tooltip');
assert.doesNotMatch(pre,/md:hidden/,'las listas de la previsión ya no duplican ramas por breakpoint');

// ── Informes: exportaciones en el header, ayudas en acordeón y tabla ajustada.
assert.match(informes,/<PageHeader[\s\S]{0,2200}downloadReportsCsv\(data!,selectedCurrency\)[\s\S]{0,1200}printReportsPdf\(/,'las exportaciones viven en el header');
assert.equal((informes.match(/<details/g)||[]).length,1,'las ayudas largas se agrupan en un acordeón');
assert.match(informes,/Cómo leer el informe/,'el acordeón se rotula');
assert.match(informes,/title=\{`Datos al \$\{listDateFull\(data\.asOf\)/,'la cobertura completa queda en el tooltip del corte');
assert.doesNotMatch(informes,/label:'Fechas conocidas'/,'la tabla de evolución ya no tiene la columna de fechas conocidas');
assert.doesNotMatch(informes,/label:'Clientes facturados'/,'la tabla de evolución ya no tiene la columna de clientes facturados');
assert.match(informes,/label:'Facturas · clientes'/,'las dos cifras comparten columna con tooltip');
assert.match(informes,/label:'Antigüedad \(días · con fecha\)'/,'la antigüedad y la cobertura comparten columna');

// ── Popups y paneles: ayuda del extracto en tooltip.
assert.match(controls,/id="finance-salaries-title"|Conciliación por extracto/,'el dominio conserva sus paneles');
assert.match(controls,/title="Compará el extracto con los movimientos registrados/,'la explicación de conciliación pasa al tooltip');

console.log('PASS densidad FIN: una toolbar, chips por señal, subtabs, pares 2×1440, render único y ayudas en tooltip (#101)');

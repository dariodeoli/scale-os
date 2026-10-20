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
const balance=read('app/finance-balance.tsx'),clients=read('app/finance-clients.tsx'),personnel=read('app/finance-personnel.tsx'),balanceCss=read('app/finance-balance.css');

// ── Finanzas: transferencias finitas sin scroll permanente y ayudas en tooltip.
assert.match(finanzas,/const TRANSFER_TEMPLATE = 'grid-cols-\[minmax\(12rem,1fr\)_6\.5rem_minmax\(15rem,1fr\)\]'/,'la transferencia declara 3 columnas');
assert.match(finanzas,/minWidthClass="min-w-\[35rem\]"/,'la lista de transferencias entra en media pantalla');
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

// ── Previsión: ingresos/resumen en 2 columnas ≥1440; detalle operativo único en Balance (#238).
assert.match(pre,/min-\[1440px\]:grid-cols-\[minmax\(0,1fr\)_minmax\(0,1fr\)\]/,'los pares de tarjetas usan 2 columnas desde 1440');
assert.equal((pre.match(/min-\[1440px\]:grid-cols-\[minmax\(0,1fr\)_minmax\(0,1fr\)\]/g)||[]).length,1,'Previsión conserva el par ingresos/resumen; no duplica las listas de Balance');
assert.match(pre,/title=\{\`\$\{data\.definition\.issued\} \$\{data\.definition\.accepted_uninvoiced\}\`\}/,'la definición de ingresos viaja en el tooltip');
assert.match(pre,/title=\{data\.definition\.planned_expenses\}/,'la definición de gastos planificados viaja en el tooltip');
assert.doesNotMatch(pre,/md:hidden/,'las listas de la previsión ya no duplican ramas por breakpoint');
assert.match(balance,/<FinanceClientsSection/,'Balance monta el detalle de clientes');
assert.match(balance,/<FinancePersonnelSection/,'Balance monta el detalle de salarios');
assert.doesNotMatch(pre,/<FinanceClientsSection|<FinancePersonnelSection|forecast-person-row/,'el detalle no se replica en la proyección');
assert.match(balanceCss,/\.finance-balance-columns\{[^}]*grid-template-columns:minmax\(0,1fr\)/,'en móvil los paneles se apilan');
assert.match(balanceCss,/@media\(min-width:1024px\)\{\.finance-balance-columns\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/,'en escritorio las dos mitades son iguales');
assert.match(balanceCss,/grid-template-rows:subgrid/,'las tablas comparten filas incluso con distinta cantidad de monedas');
for(const [source,template,identity] of [[clients,'CLIENT_FINANCE_COLUMNS','ClientIdentity'],[personnel,'PERSONNEL_COLUMNS','PersonContainer']]){
 assert.match(source,new RegExp(`<ListGrid[^>]*template=\\{${template}\\}`),'encabezado y filas usan la misma plantilla');
 assert.match(source,new RegExp(`<ListRow template=\\{${template}\\}`),'las filas comparten la plantilla del encabezado');
 assert.match(source,new RegExp(`<${identity}\\b`),'cada tipo de fila conserva su identidad visual canónica');
 assert.doesNotMatch(source,/md:hidden/,'una sola lista sirve para móvil y escritorio');
 assert.match(source,/MoneyText/,'los montos usan el formateador común');
}
assert.match(clients,/<ClientIdentity[^>]*logo=\{client\.client_logo_url\}/,'el cliente conserva su logo mediante la identidad canónica compartida');
assert.match(balanceCss,/\.finance-detail-amount\{[^}]*white-space:nowrap[^}]*text-align:right[^}]*tabular-nums/,'los importes alinean y conservan la cifra completa');
assert.match(balanceCss,/\.finance-client-table>div\{min-width:max\(/,'las columnas grandes crecen en el scroll de la tabla, no en la página');
assert.match(balanceCss,/\.finance-personnel-table>div\{min-width:max\(/,'personal mantiene sus columnas al reducir la pantalla');

// ── Informes: exportaciones en el header, ayudas en acordeón y tabla ajustada.
assert.match(informes,/<ListPage [\s\S]{0,2200}primaryAction=\{<>[\s\S]{0,2200}downloadReportsCsv\(data!,selectedCurrency\)[\s\S]{0,1200}printReportsPdf\(/,'las exportaciones viven en el header');
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

console.log('PASS densidad FIN: una toolbar, chips, subtabs, proyección 2×1440 y detalle único de Balance con columnas alineadas e importes completos (#101 #238)');

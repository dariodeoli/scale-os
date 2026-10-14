import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=path=>readFileSync(new URL(`../app/${path}`,import.meta.url),'utf8');
const inventory=source('inventory-workspace.tsx'),studio=source('studio-workspace.tsx');
// Static, module-local contracts only: not a browser cascade/layout engine.
// Inventario y estudio se rediseñaron con Tailwind + owncoding-ui (campaña #41):
// su contrato mobile ya no vive en una hoja propia, se declara en el módulo.
for(const width of [360,768]){
 assert.match(inventory,/grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3/,'la cuadrícula de equipos arranca en una columna');
 assert.match(inventory,/grid gap-4 sm:grid-cols-2/,'el formulario de equipo usa una columna en mobile y dos desde sm');
 assert.match(inventory,/data-agenda-day/,'hasta 768 el calendario es una agenda por día (lista de una columna)');
 assert.match(inventory,/data-calendar-month className="hidden gap-1 min-\[769px\]:grid"/,'la grilla mensual de 7 columnas solo se muestra desde 769');
 assert.match(inventory,/grid grid-cols-7 items-start gap-1/,'la grilla mensual usa 7 columnas con celdas que no se estiran');
 assert.match(inventory,/overflow-x-auto/,'la lista y el pipeline scrollean en silencio en vez de romper el layout');
 assert.match(inventory,/min-w-\[67\.5rem\]/,'las columnas de la lista reservan su ancho para no colapsar');
 assert.match(inventory,/break-words/,'nombres y categorías largas envuelven');
 // El texto largo de la fila se recorta con elipsis + title (AGENTS.md); los
 // montos, fechas, códigos y seriales van nowrap y nunca se truncan.
 for(const line of inventory.split('\n'))if(line.includes('truncate'))assert(line.includes('title='),'cada texto recortado ofrece el valor completo en title');
 assert.doesNotMatch(inventory,/truncate[^>]*(CeldaMoneda|SerialTexto|listDate)/,'montos, fechas y seriales no se recortan');
 assert.match(inventory,/shrink-0 whitespace-nowrap font-mono/,'el código va nowrap y sin recortar');
 assert.match(inventory,/whitespace-nowrap tabular-nums/,'las fechas de la lista van nowrap');
 assert.match(studio,/grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3/,'los espacios arrancan en una columna');
 assert.match(studio,/grid grid-cols-2 gap-1 sm:grid-cols-3 min-\[769px\]:grid-cols-7/,'el calendario del estudio usa 2 columnas en mobile, 3 desde sm y la semana de 7 desde 769');
 assert.match(studio,/<Editor label="Guardar reserva"/,'la reserva usa el Editor canónico (columnas y secciones responsivas del primitivo)');
 assert.match(studio,/section:'/,'los campos de la reserva se agrupan en secciones');
 for(const line of studio.split('\n'))if(line.includes('truncate'))assert(line.includes('title='),'el estudio ofrece el valor completo en title');
 assert.match(studio,/whitespace-nowrap tabular-nums/,'el horario del estudio va nowrap');
}
// Los campos de la librería mantienen el alto táctil y el ancho completo del contenedor.
assert.match(inventory,/className="w-36"|className="w-44"|className="w-28"|className="w-52"/,'los campos cortos usan ancho por tipo');
assert.match(studio,/className="w-44"/,'el mes del estudio usa el ancho de fecha');
// Previsión e Informes (FIN, refs #45) también viven en Tailwind + primitivas v2:
// se verifica la fuente del módulo, no una hoja plana.
const forecast=source('financial-forecast.tsx'),informes=source('reports-workspace.tsx');
assert(!/financial-forecast\.css/.test(forecast),'la previsión ya no depende de una hoja plana');
assert(/className="w-44[ "]/.test(forecast),'el mes de la previsión usa ancho de fecha por tipo');
assert(/min-h-11/.test(forecast),'las filas finitas de la previsión conservan 44 px');
const v2=source('ui-v2.tsx');
assert(/<ListGrid/.test(forecast)&&/silent-scroll relative min-w-0 overflow-x-auto/.test(v2),'las listas de la previsión usan ListGrid, que scrollea en silencio cuando no entran');
assert(/overflow-x-auto/.test(informes),'el gráfico de informes conserva su scroll horizontal');
assert(/tabular-nums/.test(forecast)&&/tabular-nums/.test(informes),'montos y cifras van tabulares en Previsión e Informes');
console.log('PASS 360/768: contratos mobile de inventario y estudio (una columna, calendario semanal, scroll silencioso, sin elipsis) + Previsión/Informes en Tailwind.');

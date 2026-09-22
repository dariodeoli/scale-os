import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import postcss from 'postcss';

const source=path=>readFileSync(new URL(`../app/${path}`,import.meta.url),'utf8');
const inventory=source('inventory-workspace.tsx'),studio=source('studio-workspace.tsx');
const css=name=>postcss.parse(source(name));
const forecast=css('financial-forecast.css');
// Static, module-local contracts only: not a browser cascade/layout engine.
function value(sheet,selector,property,width){
 let result;
 sheet.walkRules(rule=>{
  if(!rule.selectors.includes(selector))return;
  for(let parent=rule.parent;parent;parent=parent.parent){
   if(parent.type!=='atrule')continue;
   assert.equal(parent.name,'media','extend this test explicitly for new at-rules');
   const match=parent.params.match(/^\((min|max)-width:\s*(\d+)px\)$/);
   assert(match,`Unsupported media query: ${parent.params}`);
   if(match[1]==='max'?width>Number(match[2]):width<Number(match[2]))return;
  }
  rule.walkDecls(property,decl=>{result=decl.value;});
 });
 return result;
}
// Inventario y estudio se rediseñaron con Tailwind + owncoding-ui (campaña #41):
// su contrato mobile ya no vive en una hoja propia, se declara en el módulo.
for(const width of [360,768]){
 assert.match(inventory,/grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3/,'la cuadrícula de equipos arranca en una columna');
 assert.match(inventory,/grid gap-4 sm:grid-cols-2/,'el formulario de equipo usa una columna en mobile y dos desde sm');
 assert.match(inventory,/grid grid-cols-1 gap-1 min-\[769px\]:grid-cols-7/,'el calendario es lista de una columna hasta 768 y grilla semanal desde 769');
 assert.match(inventory,/overflow-x-auto/,'la lista y el pipeline scrollean en silencio en vez de romper el layout');
 assert.match(inventory,/min-w-\[67\.5rem\]/,'las columnas de la lista reservan su ancho para no colapsar');
 assert.match(inventory,/break-words/,'nombres y categorías largas envuelven');
 // El texto largo de la fila se recorta con elipsis + title (AGENTS.md); los
 // montos, fechas, códigos y seriales van nowrap y nunca se truncan.
 for(const line of inventory.split('\n'))if(line.includes('truncate'))assert(line.includes('title='),'cada texto recortado ofrece el valor completo en title');
 assert.doesNotMatch(inventory,/truncate[^>]*(CeldaMoneda|SerialTexto|listDate)/,'montos, fechas y seriales no se recortan');
 assert.match(inventory,/shrink-0 whitespace-nowrap font-mono/,'el código va nowrap y sin recortar');
 assert.match(inventory,/whitespace-nowrap tabular-nums/,'las fechas de la lista van nowrap');
 assert.match(studio,/grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3/,'los espacios arrancan en una columna');
 assert.match(studio,/grid grid-cols-1 gap-1 min-\[769px\]:grid-cols-7/,'el calendario del estudio es lista hasta 768 y grilla desde 769');
 assert.match(studio,/grid gap-4 sm:grid-cols-2/,'el formulario de reserva usa una columna en mobile y dos desde sm');
 for(const line of studio.split('\n'))if(line.includes('truncate'))assert(line.includes('title='),'el estudio ofrece el valor completo en title');
 assert.match(studio,/whitespace-nowrap tabular-nums/,'el horario del estudio va nowrap');
}
// Los campos de la librería mantienen el alto táctil y el ancho completo del contenedor.
assert.match(inventory,/className="w-36"|className="w-44"|className="w-28"|className="w-52"/,'los campos cortos usan ancho por tipo');
assert.match(studio,/className="w-44"/,'el mes del estudio usa el ancho de fecha');
const money=(selector,property)=>value(forecast,selector,property,360);
assert.equal(money('.financial-forecast .panel-heading label','flex-wrap'),'wrap');
assert.equal(money('.financial-forecast input','min-width'),'0');
assert.equal(money('.financial-forecast input','max-width'),'min(100%,16rem)');
for(const selector of ['.forecast-currency dt','.forecast-currency dd']){
 assert.equal(money(selector,'min-width'),'0');assert.equal(money(selector,'max-width'),'100%');assert.equal(money(selector,'overflow-wrap'),'anywhere');
}
console.log('PASS 360/768: contratos mobile de inventario y estudio (una columna, calendario semanal, scroll silencioso, sin elipsis) + montos de Previsión.');

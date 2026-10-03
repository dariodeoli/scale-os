import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {sections} from '../app/navigation';
import {moduleHelp} from '../app/module-help-data';
import {COMMAND_RECORD_LIMIT,commandActions,commandNavigation,commandRecords,filterCommands} from '../app/workspace-search';
import {ventanaDeLista} from 'owncoding-ui';

// ADOPCION-V2 P2–P4 (#135): la paleta ⌘K, la ayuda por módulo y la ventana de
// listas largas usan los objetos de la biblioteca; la app aporta catálogo,
// textos y medición. Estos contratos fijan esa frontera sin renderizar la UI.

const file=(path:string)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('#135 P2: la ayuda de cada módulo es de la biblioteca y conserva /status',()=>{
 for(const [label] of sections){
  const help=moduleHelp(label);
  assert(help.titulo,`${label} declara título`);
  assert(help.resumen.length>20,`${label} explica el módulo`);
  assert(help.puntos.length>=1&&help.puntos.length<=5,`${label}: 3–5 puntos de la ayuda`);
  assert(help.enlaces.some(link=>link.href==='/status'),`${label} conserva el estado del sistema`);
  assert(help.enlaces.some(link=>link.href==='/privacidad'),`${label} conserva privacidad y derechos`);
 }
 // Un módulo fuera del catálogo también recibe ayuda útil (nunca un diálogo vacío).
 const fallback=moduleHelp('Módulo inventado');
 assert.equal(fallback.titulo,'Módulo inventado');
 assert(fallback.resumen.includes('Scale OS')&&fallback.enlaces.some(link=>link.href==='/status'));
 const guide=file('app/workspace-guide.tsx');
 assert.match(guide,/import \{AyudaModulo\} from 'owncoding-ui'/,'la ayuda por módulo sale del objeto de la biblioteca');
 assert.match(guide,/moduleHelp\(active\)/,'los textos por módulo vienen de la fuente única');
 assert.match(guide,/variant==='help'[\s\S]{0,400}?<AyudaModulo/,'la variante de ayuda migra al objeto');
 assert.match(guide,/etiquetaBoton="Guía del panel"/,'el botón conserva la etiqueta del marco');
 assert.match(guide,/title="Empezar y descubrir funciones"/,'la guía de primeros pasos sigue disponible en la tarjeta');
});

test('#135 P2: la paleta ofrece destinos y acciones reales del shell con el tope de registros',()=>{
 const actions=commandActions('Presupuestos',true);
 assert(actions.some(item=>item.titulo==='Crear un presupuesto'&&item.datos.accion==='crear'));
 assert(actions.some(item=>item.titulo==='Ayuda de Presupuestos'&&item.datos.accion==='ayuda'));
 assert(actions.some(item=>item.titulo==='Estado del sistema'&&item.datos.accion==='status'));
 assert(!commandActions('Presupuestos',false).some(item=>item.datos.accion==='crear'),'sin capacidad no se ofrece crear');
 // Navegación por rol: sale del NAV real y respeta `visibleModule`.
 const visitante=commandNavigation('viewer').map(item=>item.titulo);
 assert(visitante.includes('Clientes'),'el rol ve los módulos sin capacidad restringida');
 assert(!visitante.includes('Configuración'),'los módulos con permiso no aparecen para quien no lo tiene');
 assert(commandNavigation('owner').map(item=>item.titulo).includes('Configuración'));
 // Registros: tipo canónico para agrupar y acción de registro.
 const records=commandRecords([{id:'1',name:'Órbita',context:'Cliente',kind:'clients'},{id:'2',name:'Reel',context:'Pieza',kind:'work-orders'}]);
 assert.deepEqual(records.map(item=>item.tipo),['cliente','pieza']);
 // Tope: comandos y destinos completos; registros acotados al límite declarado.
 const accion=commandActions('Resumen',true);
 const destinos=commandNavigation('owner');
 const muchos=commandRecords(Array.from({length:COMMAND_RECORD_LIMIT+15},(_,index)=>({id:String(index),name:`Zeta ${index}`,context:'Directorio',kind:'clients' as const})));
 const filtrados=filterCommands([...accion,...destinos,...muchos],'zeta');
 assert.equal(filtrados.length,COMMAND_RECORD_LIMIT,'los registros se acotan al tope');
 assert(filtrados.every(item=>item.tipo==='cliente'),'sin comandos que coincidan quedan sólo registros');
 const conAccion=filterCommands([...accion,...destinos,...muchos],'a');
 assert(conAccion.some(item=>item.datos.accion==='ayuda'),'la ayuda no se recorta');
 assert.equal(filterCommands([...accion,...destinos,...muchos],'').length,0,'sin término no se lista el catálogo');
 const search=file('app/workspace-search.tsx');
 assert.match(search,/import \{PaletaComandos\} from 'owncoding-ui'/,'el buscador global es el objeto de la biblioteca');
 assert.doesNotMatch(search,/SearchField|search-result-assignees|search-results/,'no quedó la copia local del buscador');
 assert.doesNotMatch(search,/addEventListener\('keydown'/,'el atajo ⌘K lo maneja el objeto, no un listener propio');
});

test('#135 P4: ventanaDeLista acota el montaje y las listas largas la adoptan',()=>{
 // Medición base: 350 filas de 50 px, viewport de 900 px, margen de 2 filas.
 const arriba=ventanaDeLista({total:350,scrollTop:0,altoVista:900,altoFila:50,margen:2});
 assert.deepEqual(arriba,{inicio:0,fin:20},'350 filas → 20 nodos montados arriba (18 visibles + margen)');
 const medio=ventanaDeLista({total:350,scrollTop:5000,altoVista:900,altoFila:50,margen:2});
 assert.equal(medio.fin-medio.inicio,22,'el tramo montado se mantiene acotado al scrollear (visible + margen de 2 a cada lado)');
 assert(medio.inicio>=98&&medio.fin<=350,'el rango acompaña el scroll sin salir del total');
 assert.deepEqual(ventanaDeLista({total:0,scrollTop:0,altoVista:900,altoFila:50}),{inicio:0,fin:0});
 assert.deepEqual(ventanaDeLista({total:12,scrollTop:0,altoVista:0,altoFila:0}),{inicio:0,fin:12},'sin medición no se esconde nada');
 const windowSource=file('app/list-window.ts');
 assert.match(windowSource,/import \{ventanaDeLista\} from 'owncoding-ui'/,'el rango lo decide el objeto de la biblioteca');
 assert.match(windowSource,/export function useFilasVisibles/,'la app aporta la medición del contenedor');
 for(const path of ['app/sections/clientes.tsx','app/sections/presupuestos.tsx']){
  const source=file(path);
  assert.match(source,/useFilasVisibles\(tableRef/,`${path} mide su tabla densa`);
  assert.match(source,/filasVisibles\.inicio > 0 \? <div role="row" aria-hidden="true"/,`${path} rellena el extremo superior`);
  assert.match(source,/\.slice\(filasVisibles\.inicio, filasVisibles\.fin\)/,`${path} monta sólo el tramo visible`);
  assert.match(source,/filasVisibles\.fin < (mountedLive|budgets)\.length \? <div role="row" aria-hidden="true"/,`${path} rellena el extremo inferior`);
 }
});

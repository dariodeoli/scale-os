import React from 'react';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {act,create,type ReactTestInstance,type ReactTestRenderer} from 'react-test-renderer';
require.extensions['.css']=()=>{};
Object.assign(globalThis,{React});
// `MenuDesplegable` engancha listeners de `document` al abrir: el entorno de
// test no tiene DOM real, así que se stubea con un `EventTarget` (mismo patrón
// que tests/inventory-workspace.test.tsx).
const documentEvents=Object.assign(new EventTarget(),{});
Object.defineProperty(globalThis,'document',{configurable:true,value:documentEvents});
const {
  ActionMenu,CardGridSkeleton,CardSkeleton,CompactCard,CompactQuickAction,DashboardSkeleton,
  EmptyCompact,Kpi,KpiStrip,TableSkeleton,menuFocusIndex,runMenuItem,tableSkeletonTemplate,
}=require('../app/ui-v2') as typeof import('../app/ui-v2');
const file=(path:string)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const plain=(node:any):string=>!node?'':typeof node==='string'?node:Array.isArray(node)?node.map(plain).join(''):plain(node.children);
let renderer:ReactTestRenderer;

// ── Menú ⋯ ─────────────────────────────────────────────────────────────────

test('#138 menú ⋯: contrato de teclado puro y confirmación sin DOM',()=>{
  assert.equal(menuFocusIndex('ArrowDown',-1,3),0,'ArrowDown entra por el primero');
  assert.equal(menuFocusIndex('ArrowDown',2,3),0,'ArrowDown da la vuelta');
  assert.equal(menuFocusIndex('ArrowUp',-1,3),2,'ArrowUp entra por el último');
  assert.equal(menuFocusIndex('ArrowUp',0,3),2,'ArrowUp da la vuelta');
  assert.equal(menuFocusIndex('Home',2,3),0,'Home va al primero');
  assert.equal(menuFocusIndex('End',0,3),2,'End va al último');
  assert.equal(menuFocusIndex('Enter',0,3),null,'Enter no mueve el foco');
  assert.equal(menuFocusIndex('ArrowDown',0,0),null,'sin ítems no hay foco');
  // La confirmación es parte del contrato: un ítem con `confirm` NO ejecuta su
  // acción hasta que se confirma; uno común ejecuta de una.
  let ran=0,confirmed='';
  const common={id:'edit',label:'Editar pieza',onClick:()=>{ran+=1;}};
  assert.equal(runMenuItem(common,()=>{confirmed='common';}),true);
  assert.equal(ran,1);
  const danger={id:'remove',label:'Mover a la papelera',peligro:true,onClick:()=>{ran+=1;},confirm:{title:'Mover a la papelera'}};
  assert.equal(runMenuItem(danger,item=>{confirmed=item.id;}),false);
  assert.equal(ran,1,'la acción peligrosa espera la confirmación');
  assert.equal(confirmed,'remove','la confirmación recibe el ítem completo');
});

test('#138 menú ⋯: disparador rotulado, ítems reales y acción que corre',async()=>{
  let edits=0;
  await act(async()=>{renderer=create(<ActionMenu label="Acciones de la pieza: Reel" items={[
    {id:'edit',label:'Editar pieza',icono:'edit',onClick:()=>{edits+=1;}},
    {id:'archive',label:'Mover a la papelera',icono:'trash',peligro:true,disabled:true,onClick:()=>{}},
  ]}/>);});
  const triggers=renderer.root.findAll(node=>node.props['aria-haspopup']==='menu');
  assert.equal(triggers.length,1,'un solo disparador ⋯');
  assert.equal(triggers[0].props['aria-expanded'],false,'arranca cerrado');
  assert.match(plain(triggers[0]),/Acciones de la pieza: Reel/,'el botón se anuncia con el registro (texto oculto, no solo el glifo)');
  assert.equal(renderer.root.findAll(node=>node.props.role==='menuitem').length,0,'el menú no se dibuja cerrado');
  act(()=>{triggers[0].props.onClick();});
  const items=renderer.root.findAll(node=>node.props.role==='menuitem');
  assert.equal(items.length,2,'los ítems aparecen al abrir');
  assert.match(plain(items[0]),/Editar pieza/,'el texto visible nombra la acción exacta');
  const peligro=items[1].props.className as string;
  assert.match(peligro,/text-bad/, 'la acción peligrosa usa el tono de peligro');
  assert.equal(items[1].props.disabled,true,'el ítem deshabilitado no se puede accionar');
  act(()=>{items[0].props.onClick();});
  assert.equal(edits,1,'el ítem ejecuta su acción');
});

// ── Tarjeta compacta ───────────────────────────────────────────────────────

test('#138 tarjeta compacta: título, contexto, vencimiento, responsable y avance',async()=>{
  let opened=0,quick=0;
  await act(async()=>{renderer=create(<CompactCard
    title="Reel de lanzamiento"
    onOpen={()=>{opened+=1;}}
    context={<span>ACME · Campaña de verano</span>}
    due={<span>Entrega 30-nov · faltan 5 días</span>}
    responsible={<span>Ana y Luis</span>}
    chips={<span>En edición</span>}
    quickAction={<CompactQuickAction label="Ver pieza: Reel de lanzamiento" icon={<span>o</span>} onClick={()=>{quick+=1;}}/>}
    progress={{value:3,max:5,label:'3/5 pasos'}}
    actions={[{id:'edit',label:'Editar pieza',onClick:()=>{}}]}
  />);});
  const copy=plain(renderer.toJSON());
  for(const dato of ['Reel de lanzamiento','ACME · Campaña de verano','Entrega 30-nov · faltan 5 días','Ana y Luis','En edición','3/5 pasos']) assert(copy.includes(dato),`la tarjeta muestra ${dato}`);
  const markup=JSON.stringify(renderer.toJSON());
  assert(markup.includes('data-compact-card'),'la tarjeta expone el hook del sistema');
  assert(markup.includes('flex min-w-0 flex-col gap-2.5'),'usa el contenedor canónico');
  const title=renderer.root.findByProps({'aria-label':'Abrir Reel de lanzamiento'});
  act(()=>{title.props.onClick();});
  assert.equal(opened,1,'el título abre el detalle');
  const quickAction=renderer.root.findByProps({'aria-label':'Ver pieza: Reel de lanzamiento'});
  act(()=>{quickAction.props.onClick();});
  assert.equal(quick,1,'la acción rápida visible corre sin abrir el menú');
  const bar=renderer.root.findByProps({role:'progressbar'});
  assert.equal(bar.props['aria-valuenow'],60,'el avance se refleja en la barra');
  assert.equal(bar.props['aria-label'],'3/5 pasos','la barra se anuncia con el texto del avance');
  assert.equal(renderer.root.findAll(node=>node.props['aria-haspopup']==='menu').length,1,'las secundarias viven en el ⋯');
});

// ── Esqueletos ─────────────────────────────────────────────────────────────

test('#138 esqueletos: forma real de tarjetas, tablas y dashboard sin cifras',async()=>{
  await act(async()=>{renderer=create(<CardGridSkeleton count={3} label="Cargando tarjetas…"/>);});
  assert.equal(renderer.root.findAll(node=>node.props['data-card-skeleton']).length,3,'un hueco por tarjeta');
  assert.equal(renderer.root.findAll(node=>node.props.role==='status')[0].props['aria-label'],'Cargando tarjetas…');
  assert(!/\d/.test(plain(renderer.toJSON())),'el esqueleto no dibuja cifras');

  await act(async()=>{renderer=create(<TableSkeleton rows={4} columns={3} label="Cargando la lista…"/>);});
  assert.equal(renderer.root.findByProps({role:'status'}).props['aria-label'],'Cargando la lista…');
  const pulses=renderer.root.findAll(node=>typeof node.props.className==='string'&&node.props.className.includes('animate-pulse'));
  assert.equal(pulses.length,3+4*3,'encabezado + una barra por celda de cada fila');
  assert(!/\d/.test(plain(renderer.toJSON())),'la tabla esqueleto tampoco inventa datos');
  assert.equal(tableSkeletonTemplate(3),'grid-cols-[minmax(11rem,1.6fr)_minmax(8rem,1fr)_7rem]','la plantilla de 3 columnas es literal (Tailwind la genera)');
  assert.equal(tableSkeletonTemplate(99),tableSkeletonTemplate(6),'más de 6 columnas recorta a la plantilla máxima');
  await act(async()=>{renderer=create(<CardSkeleton/>);});
  assert.equal(renderer.root.findAll(node=>node.props['data-card-skeleton']).length,1,'la tarjeta sola también expone su forma');

  await act(async()=>{renderer=create(<DashboardSkeleton label="Cargando el panel…" kpis={3} cards={2}/>);});
  const labels=renderer.root.findAll(node=>node.props['aria-label']==='Cargando el panel…');
  assert(labels.length>=2,'KPIs y tarjetas anuncian el mismo bloque');
  assert.equal(renderer.root.findAll(node=>node.props['data-card-skeleton']).length,2,'el dashboard reserva sus tarjetas');
  const kpiStrip=renderer.root.findAll(node=>typeof node.props.className==='string'&&node.props.className.includes('ui-kpi-strip'));
  assert(kpiStrip.length>=1,'la tira de KPIs conserva la grilla del sistema');
});

// ── Vacío compacto ─────────────────────────────────────────────────────────

test('#138 vacío compacto: una línea, acción y descarte cuando aplica',async()=>{
  let acted=0,dismissed=0;
  await act(async()=>{renderer=create(<EmptyCompact message="No hay pedidos para este filtro." action={<button type="button" onClick={()=>{acted+=1;}}>Quitar filtro</button>} onDismiss={()=>{dismissed+=1;}} icon={<span>i</span>}/>);});
  assert.equal(renderer.root.findByProps({role:'status'}).props.role,'status','el vacío se anuncia');
  assert(plain(renderer.toJSON()).includes('No hay pedidos para este filtro.'));
  const action=renderer.root.findAll(node=>node.type==='button').find(node=>plain(node).includes('Quitar filtro'))!;
  act(()=>{action.props.onClick();});
  assert.equal(acted,1,'la acción del vacío resuelve el trabajo pendiente');
  const close=renderer.root.findByProps({'aria-label':'Ocultar aviso'});
  act(()=>{close.props.onClick();});
  assert.equal(dismissed,1,'el descarte avisa a la pantalla para persistirlo');
  await act(async()=>{renderer=create(<EmptyCompact message="Sin datos"/>);});
  assert.equal(renderer.root.findAll(node=>node.props['aria-label']==='Ocultar aviso').length,0,'sin onDismiss no hay botón de descarte');
});

// ── KPIs compactos y adopción en el shell ──────────────────────────────────

test('#138 kpis compactos: la tira declara la densidad y no pierde el hint',async()=>{
  await act(async()=>{renderer=create(<KpiStrip compact><Kpi label="A" valor={1} hint="Explicación"/><Kpi label="B" valor={2}/></KpiStrip>);});
  const grid=JSON.stringify(renderer.toJSON());
  assert(grid.includes('ui-kpi-strip-compact'),'la tira compacta expone su hook');
  assert(grid.includes('ui-kpi'),'los KPIs siguen siendo el objeto del sistema');
  const css=file('app/ui-system.css');
  assert.match(css,/\.control-shell \.ui-kpi-strip-compact \.ui-kpi\{display:grid;grid-template-columns:minmax\(0,1fr\) auto/,'en mobile el KPI compacto es una fila');
  assert.match(css,/\.control-shell \.ui-kpi-strip-compact \.ui-kpi>div:nth-child\(3\)\{grid-column:1\/-1/,'el hint queda en una segunda línea, no se oculta');
});

test('#138 adopción: kit ⋯, esqueleto del Resumen, vacío compacto y KPIs de Preferencias',()=>{
  const suite=file('app/suite.tsx');
  assert.match(suite,/import \{EmptyBlock,LoadingBlock,ActionMenu,type RecordMenuItem\} from '\.\/ui-v2';/,'el kit importa el menú canónico');
  assert.match(suite,/<ActionMenu label=\{`Acciones: \$\{name\|\|kind\}`\} items=\{menuItems\}\/>/,'el editor de registros usa el ⋯ del sistema');
  assert.doesNotMatch(suite,/rowMenuTrigger|MenuDesplegable/,'no queda una variante paralela del menú');
  assert.match(suite,/export type \{RecordMenuItem\} from '\.\/ui-v2';/,'el tipo del ítem se reexporta desde la fuente única');

  const resumen=file('app/sections/resumen.tsx');
  assert.match(resumen,/return <DashboardSkeleton label="Cargando el panel…" kpis=\{4\} cards=\{3\}\/>/,'el arranque del Resumen muestra la forma real');
  assert.match(resumen,/variant="cards"/,'los chunks diferidos muestran tarjetas, no líneas genéricas');
  assert.doesNotMatch(resumen,/LoadingBlock/,'no queda el loader genérico en el arranque');

  const control=file('app/control-center.tsx');
  assert.match(control,/<Skeleton className="h-6 w-24"\/>/,'los montos del panel se reservan con esqueleto');
  assert.doesNotMatch(control,/Cargando…/,'no queda texto de carga en los widgets financieros');

  const workHistory=file('app/work-history.tsx');
  assert.match(workHistory,/<CompactCard key=\{r\.id\} title=\{str\(r,'title'\)\|\|'Tarea interna'\}/,'los pendientes internos usan la tarjeta compacta');
  assert.match(workHistory,/actions=\{canEdit\?\[\{id:'edit',label:'Editar tarea'/,'editar vive en el ⋯');
  assert.match(workHistory,/<EmptyCompact message="No hay pendientes internos cargados\."/,'el vacío es de una línea y accionable');
  assert.doesNotMatch(workHistory,/<p>\{str\(r,'description'\)\}<\/p>/,'la descripción salió de la tarjeta (vive en el detalle)');

  const preferencias=file('app/sections/preferencias.tsx');
  assert.match(preferencias,/<KpiStrip compact>/,'Preferencias apila KPIs compactos en mobile');
});

console.log('PASS: patrones #138 — tarjeta compacta, menú ⋯, esqueletos, vacío compacto y adopción en el shell');

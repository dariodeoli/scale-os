// Pase de densidad de listas (Clientes, Proyectos, Inventario): las primitivas
// nuevas (`KpiStrip dense`, `AssignedPeople compact`) y las reglas de fila fina
// que viven en CSS compartido. Contrato en DESIGN-SYSTEM.md §Densidad de listas.
import React from 'react';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {create} from 'react-test-renderer';
Object.assign(globalThis,{React});
require.extensions['.css']=()=>{};
const {KpiStrip,KpiStripSkeleton}=require('../app/ui-v2') as typeof import('../app/ui-v2');
const {AssignedPeople}=require('../app/assigned-people') as typeof import('../app/assigned-people');
const read=(path:string)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

// KPIs densos: opt-in, 2×2 en mobile; la tira por defecto no cambia.
const dense=create(<KpiStrip dense><span>a</span></KpiStrip>).toJSON() as unknown as {props:{className:string}};
assert.match(dense.props.className,/ui-kpi-strip-dense grid-cols-2/,'la tira densa va 2×2 en mobile');
const strip=(count:number)=>(create(<KpiStrip>{Array.from({length:count},(_,i)=><span key={i}>{i}</span>)}</KpiStrip>).toJSON() as unknown as {props:{className:string}}).props.className;
assert.doesNotMatch(strip(4),/ui-kpi-strip-dense/,'la tira por defecto no es densa');
assert.match(strip(4),/grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4/,'cuatro KPIs conservan 1/2/4');
// Columnas de escritorio según la cantidad: sin medias filas vacías.
assert.match(strip(1),/sm:grid-cols-1 xl:grid-cols-1/);
assert.match(strip(2),/sm:grid-cols-2 xl:grid-cols-2/);
assert.match(strip(3),/sm:grid-cols-2 xl:grid-cols-3/);
assert.match(strip(6),/sm:grid-cols-2 xl:grid-cols-4/,'5 o más envuelven en filas de 4');
const skeleton=JSON.stringify(create(<KpiStripSkeleton dense count={2}/>).toJSON());
assert.match(skeleton,/h-\[60px\]/,'el esqueleto denso tiene el alto de la tira densa');

// Responsables compactos: una línea, principal primero, «+N» y detalle en title.
const people=[{id:'2',full_name:'Luis Pérez',is_primary:false},{id:'1',full_name:'Ana Gómez',is_primary:true},{id:'3',full_name:'Eva Ríos',is_primary:false}];
const compact=create(<AssignedPeople people={people} compact/>);
const section=compact.root.findByType('section');
assert.match(String(section.props.className),/assigned-people-compact/);
assert.equal(section.props.title,'Ana Gómez (principal), Luis Pérez, Eva Ríos','el title lista a todos, el principal primero');
const text=JSON.stringify(compact.toJSON());
assert.match(text,/"Ana Gómez"/,'se ve el nombre del principal');
assert.match(text,/\+2/,'el resto se resume en «+N»');
assert.equal(compact.root.findAllByType('li').length,0,'la variante compacta no dibuja chips');
assert.match(JSON.stringify(create(<AssignedPeople people={[]} compact/>).toJSON()),/Sin responsables/);
assert.match(JSON.stringify(create(<AssignedPeople people={undefined} compact/>).toJSON()),/Responsables no disponibles/,'sin dato no afirma «sin responsables»');

// Fila fina: íconos de 32 px y disparador ⋯ sin el min-h-11 de la librería (escritorio).
const ui=read('app/ui-system.css');
assert.match(ui,/@media\(min-width:768px\)\{\n \.control-shell \.list-row \.list-actions :where\(button\.icon-button\)\{width:32px;min-width:32px;height:32px;min-height:32px\}/,'acciones de ícono de 32 px en la fila');
assert.match(ui,/@media\(min-width:768px\) and \(hover:hover\) and \(pointer:fine\)\{\n :is\(\.control-shell,\.unified-dialog\) button\.toque-44\[aria-haspopup="menu"\]\{min-width:32px;min-height:32px;justify-content:center\}/,'el ⋯ mide 32 px en escritorio y 44 en táctil');
assert.match(ui,/\.control-shell \.ui-kpi-strip-dense \.ui-kpi\{display:grid;/,'la tira densa define su grilla');

// Pantallas: adoptan las primitivas y el orden por importancia.
const clientes=read('app/sections/clientes.tsx'),proyectos=read('app/sections/proyectos.tsx'),inventario=read('app/inventory-workspace.tsx'),shell=read('app/scale-workspace.tsx');
assert.match(clientes,/<KpiStrip dense>/);assert.match(proyectos,/<KpiStrip dense /);assert.match(inventario,/<KpiStrip dense>/);
assert.match(clientes,/\{key: 'client'[\s\S]*?\{key: 'status'[\s\S]*?\{key: 'billing'[\s\S]*?\{key: 'activity'[\s\S]*?\{key: 'facts'[\s\S]*?\{key: 'actions'/,'Clientes: identidad → estado → cobros → actividad → datos → acciones');
assert.match(clientes,/<span className="client-action-slot">\{tel \?/,'WhatsApp reserva su ranura aunque falte');
assert.match(shell,/<AssignedPeople people=\{project\.assignees\} compact\/>/,'la fila de proyecto usa responsables compactos');
assert.match(shell,/<ListActions className="flex items-center justify-end gap-1">/,'la fila de proyecto fija sus acciones');
assert.match(proyectos,/minWidthClass="min-w-\[60rem\]" pinnedActions/,'la lista de proyectos fija la columna de acciones');
assert.doesNotMatch(inventario,/\{view!=='reservations'&&!loading&&!error\?<Card/,'los equipos no viven en una card contenedora');
console.log('PASS: densidad de listas — KPIs densos, responsables compactos, fila fina de 32 px y orden por importancia.');

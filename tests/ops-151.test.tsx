import React from 'react';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import {act,create} from 'react-test-renderer';
require.extensions['.css']=()=>{};
Object.assign(globalThis,{React});
const {isTechnicalDemoEmail,personDisplayName}=require('../app/actor-identity') as typeof import('../app/actor-identity');
const {DueDate}=require('../app/due-date') as typeof import('../app/due-date');
const {EquipmentPhoto}=require('../app/equipment-photo') as typeof import('../app/equipment-photo');
const read=(path:string)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const asuncionDay=(date:Date)=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Asuncion',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
const day=(offset:number)=>asuncionDay(new Date(Date.now()+offset*86_400_000));
const plain=(node:any):string=>!node?'':typeof node==='string'?node:Array.isArray(node)?node.map(plain).join(''):plain(node.children);

test('#151 correos técnicos del demo: nunca una identidad visible',()=>{
 assert.equal(isTechnicalDemoEmail('persona-8-4@demo.example.invalid'),true);
 assert.equal(isTechnicalDemoEmail('visitante-abc@demo.example.invalid'),true);
 assert.equal(isTechnicalDemoEmail('persona0@scale-demo.example.invalid'),true);
 assert.equal(isTechnicalDemoEmail('lucia.acosta@horizonte.example'),false,'un correo humano no se toca');
 assert.equal(isTechnicalDemoEmail('ana@agencia.com'),false);
 assert.equal(isTechnicalDemoEmail(''),false);
 assert.equal(personDisplayName('persona-8-4@demo.example.invalid'),'Persona del demo');
 assert.equal(personDisplayName('Valentina Sol'),'Valentina Sol');
 assert.equal(personDisplayName('','Integrante sin nombre'),'Integrante sin nombre');
 assert.equal(personDisplayName(null,'Sin responsables'),'Sin responsables');
});

test('#151 vencido vs. aprobado/publicado: la pieza terminada no grita «venció»',async()=>{
 let renderer:any;
 await act(async()=>{renderer=create(<DueDate value={day(-4)} compact/>);});
 assert.match(plain(renderer.toJSON()),/venció hace 4 días/,'una pieza abierta sigue avisando el atraso');
 assert.equal(renderer.root.findAllByProps({className:'due-date overdue compact'}).length,1);
 await act(async()=>{renderer.update(<DueDate value={day(-4)} compact done/>);});
 const donePast=plain(renderer.toJSON());
 assert.match(donePast,/entregada/,'terminada y pasada se lee como entregada');
 assert.doesNotMatch(donePast,/venció|overdue/);
 assert.equal(renderer.root.findAllByProps({className:'due-date done compact'}).length,1);
 await act(async()=>{renderer.update(<DueDate value={day(4)} compact done/>);});
 assert.doesNotMatch(plain(renderer.toJSON()),/falta|vencerá/,'terminada y futura no arrastra cuenta regresiva');
 await act(async()=>{renderer.update(<DueDate value={null} done/>);});
 assert.equal(renderer.toJSON(),null,'sin fecha no hay chip');
});

test('#151 foto rota: el ícono roto cae al placeholder de la casa',async()=>{
 let renderer:any;
 await act(async()=>{renderer=create(<EquipmentPhoto nombre="Batería Sony" foto="https://qa-151.invalid/foto-rota.jpg" icono="battery-charging" size="row"/>);});
 assert.equal(renderer.root.findAllByType('img').length,1,'con enlace carga la imagen');
 await act(async()=>{renderer.root.findByType('img').props.onError();});
 assert.equal(renderer.root.findAllByType('img').length,0,'la imagen caída no queda quebrada');
 assert.ok(renderer.root.findByProps({'aria-label':'Sin foto: Batería Sony'}),'el fallback conserva identidad y categoría');
 assert.equal(renderer.root.findAllByProps({title:'Sin foto'}).length,1);
});

test('#151 contrato de las superficies de Producción, pieza e Inventario',()=>{
 const board=read('app/production-board.tsx');
 const planner=read('app/productivity-ui.tsx');
 const checklist=read('app/work-checklist.tsx');
 const photo=read('app/equipment-photo.tsx');
 const inventory=read('app/inventory-workspace.tsx');
 // Producción: los campos vacíos no se anuncian y la terminada no queda en rojo.
 assert.match(board,/\{order\.urgency \? <UrgencyBadge value=\{order\.urgency\}\/> : null\}/,'sin urgencia no se dibuja «Sin definir»');
 assert.match(board,/\{order\.work_type \? <StateChip tone="info">\{workTypeLabel\(order\.work_type\)\}<\/StateChip> : null\}/,'sin tipo no se dibuja «Sin clasificar»');
 assert.match(board,/done=\{order\.status==='approved'\|\|order\.status==='published'\}/,'el tablero marca las terminadas');
 assert.match(board,/hoursSummary\(/,'las horas del tablero pasan por el formato humano');
 // Planificador: mismo formato, sin chip de tipo vacío y sin alerta en terminadas.
 assert.match(planner,/data-tone=\{hasDueWarning\(o\.due_date\)&&!\['approved','published'\]\.includes\(o\.status\)\?/,'el planificador no alerta piezas terminadas');
 assert.match(planner,/hoursSummary\(o\.estimated_hours,o\.actual_hours\)\|\|'—'/,'las horas del planificador son humanas');
 assert.doesNotMatch(planner,/workTypeLabels\[String\(o\.work_type\|\|''\)\]\|\|'Sin clasificar'/,'el planificador ya no escribe «Sin clasificar»');
 assert.match(planner,/hoursText\(order\.estimated_hours\)\?\?'—'/,'el detalle usa el formato humano');
 // Checklist: terminado sin registro y «por» con nombre, nunca un correo crudo.
 assert.match(checklist,/Completado<span className="work-checklist-muted"> · sin registro<\/span>/,'el completado sin datos muestra su vacío honesto');
 assert.match(checklist,/personDisplayName\(item\.completed_by_name\)/,'la atribución pasa por la identidad visible');
 assert.match(checklist,/personDisplayName\(item\.actor_name\)/,'quién agregó pasa por la identidad visible');
 assert.doesNotMatch(checklist,/ActorIdentity/,'el checklist no vuelve a esconder el nombre en el avatar');
 // Inventario: la identidad tiene el mayor `fr` y un mínimo que no corta temprano.
 const template=inventory.match(/const EQUIPMENT_COLS='\[--eq-cols:([^']+)'/)![1];
 const identity=template.split('_').find(column=>column.startsWith('minmax('));
 assert.equal(identity,'minmax(11rem,1.8fr)','la columna Artículo prioriza el nombre');
 assert.match(photo,/onError=\{\(\)=>setFallo\(true\)\}/,'la foto del equipo cae al placeholder al fallar');
 assert.match(photo,/useEffect\(\(\)=>setFallo\(false\),\[source\]\)/,'cambiar de foto reintenta la carga');
});

console.log('PASS: #151 — chips vacíos fuera, horas humanas, terminadas sin «venció», identidad demo visible, checklist honesto y foto con fallback.');

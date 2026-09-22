import React from 'react';
import assert from 'node:assert/strict';
import {act,create,type ReactTestInstance,type ReactTestRenderer} from 'react-test-renderer';

Object.assign(globalThis,{React});
require.extensions['.css']=()=>{};
const {WeeklyAutomatic,weekMonday}=require('../app/weekly-automatic') as typeof import('../app/weekly-automatic');
assert.equal(weekMonday('2026-09-13'),'2026-09-07');
assert.equal(weekMonday('2026-09-14'),'2026-09-14');
assert.equal(weekMonday('2026-09-24'),'2026-09-21');
assert.equal(weekMonday('2026-02-30'),'');
assert.equal(weekMonday('no-fecha'),'');
const teamPayload={week:'2026-09-14',scope:'team',automatic:[
 {user_id:'1',actor_name:'Ana López',actor_verified:true,orders:4,projects:[{project_id:11,project_name:'Tienda Norte',count:2,orders:3},{project_id:12,project_name:null,count:1,orders:0}],counts:{video:2,reedicion:0,foto:1,produccion:0,entregable:0,untyped:1}},
 {user_id:'2',actor_name:'Bruno',actor_verified:true,orders:0,projects:[],counts:{video:0,reedicion:1,foto:0,produccion:2,entregable:0,untyped:0}},
]};
const ownPayload={week:'2026-09-14',scope:'own',automatic:[{user_id:'1',actor_name:'Ana López',actor_verified:true,orders:4,projects:[{project_id:11,project_name:'Tienda Norte',count:2,orders:3}],counts:{video:2,reedicion:0,foto:1,produccion:0,entregable:0,untyped:1}}]};
const requests:{path:string}[]=[];
let mode:'ok'|'fail'='ok';
globalThis.fetch=async(input)=>{
 const path=String(input);requests.push({path});
 if(mode==='fail')return new Response(JSON.stringify({error:'No se pudo cargar la producción semanal'}),{status:500,headers:{'Content-Type':'application/json'}});
 return Response.json(path.includes('scope=team')?teamPayload:ownPayload);
};
const text=(renderer:ReactTestRenderer)=>JSON.stringify(renderer.toJSON());
function instanceText(node:ReactTestInstance|string|number):string{if(typeof node!=='object')return String(node);return node.children.map(instanceText).join('');}
let renderer!:ReactTestRenderer;
async function mount(role:string){await act(async()=>{renderer=create(<WeeklyAutomatic role={role}/>);});}

async function main(){
 // AR-3 team scope: per-collaborator rows with finished counts by type, orders and per-project lines.
 await mount('owner');
 assert.match(requests[0].path,/^\/core-api\/api\/agency\/weekly-reports\?week=\d{4}-\d{2}-\d{2}&scope=team$/);
 assert.match(text(renderer),/Ana López/);assert.match(text(renderer),/Bruno/);
 const teamRows=renderer.root.findAllByType('tbody').at(-1)!.findAllByType('tr');
 assert.equal(teamRows.length,2,'una fila por colaborador');
 const counts=(row:ReactTestInstance)=>row.findAllByType('td').slice(1,7).map(cell=>cell.children.join(''));
 assert.deepEqual(counts(teamRows[0]),['2','0','1','0','0','1'],'finished counts render per collaborator and type');
 assert.equal(teamRows[0].findAllByType('td')[7].children.join(''),'4','entry orders render in their own column');
 assert.equal(/Tienda Norte · 2 · 3 órdenes/.test(instanceText(teamRows[0].findAllByType('td')[8])),true,'project line shows name, finished count and worked orders');
 assert.equal(/Proyecto eliminado · 1/.test(instanceText(teamRows[0].findAllByType('td')[8])),true,'missing project names fall back instead of breaking');
 assert.deepEqual(counts(teamRows[1]),['0','1','0','2','0','0']);
 assert.equal(instanceText(teamRows[1].findAllByType('td')[8]),'—','no project lines renders a dash');
 assert.match(text(renderer),/Videos/);assert.match(text(renderer),/Reediciones/);assert.match(text(renderer),/Entregables/);assert.match(text(renderer),/Sin tipo/);
 assert.match(text(renderer),/Órdenes/);assert.match(text(renderer),/Proyectos/);
 assert.match(text(renderer),/Sin horas/,'read-only section states no hours');
 assert.doesNotMatch(text(renderer),/Horas declaradas|declared_hours|Horas de trabajo/,'no hour fields render');
 // Week picker snaps to the Monday of the chosen week.
 await act(async()=>renderer.root.findAllByType('input').find(i=>i.props.type==='date')!.props.onChange({target:{value:'2026-09-24'}}));
 assert.match(requests.at(-1)!.path,/week=2026-09-21&scope=team$/,'any picked day is normalized to its Monday');
 renderer.unmount();
 // Own scope: single row for the viewing collaborator.
 await mount('admin');
 assert.match(requests.at(-1)!.path,/scope=own$/);
 assert.doesNotMatch(text(renderer),/Bruno/,'own scope never shows other collaborators');
 const ownRow=renderer.root.findAllByType('tbody').at(-1)!.findAllByType('tr')[0];
 assert.deepEqual(ownRow.findAllByType('td').slice(1,7).map(cell=>cell.children.join('')),['2','0','1','0','0','1']);
 assert.equal(ownRow.findAllByType('td')[7].children.join(''),'4');
 assert.equal(/Tienda Norte · 2 · 3 órdenes/.test(instanceText(ownRow.findAllByType('td')[8])),true);
 renderer.unmount();
 // Empty week renders an empty state instead of a table.
 globalThis.fetch=async()=>Response.json({week:'2026-09-14',scope:'own',automatic:[]});
 await mount('admin');
 assert.match(text(renderer),/Sin piezas terminadas/);
 assert.equal(renderer.root.findAllByType('table').length,0);
 renderer.unmount();
 // Error state exposes a retry that reloads the data.
 globalThis.fetch=async(input)=>{
  const path=String(input);
  if(mode==='fail')return new Response(JSON.stringify({error:'No se pudo cargar la producción semanal'}),{status:500,headers:{'Content-Type':'application/json'}});
  return Response.json(path.includes('scope=team')?teamPayload:ownPayload);
 };
 mode='fail';
 await mount('owner');
 assert.match(text(renderer),/No se pudo cargar la producción semanal/);
 mode='ok';
 await act(async()=>renderer.root.findByType('button').props.onClick());
 assert.match(text(renderer),/Ana López/,'retry reloads the automatic section');
 renderer.unmount();
  console.log('PASS: weekly automatic section renders audit-derived type counts per collaborator, orders and per-project lines, own/team scope, Monday normalization, empty state, retry and no hour fields');
}
void main().catch(error=>{console.error(error);process.exitCode=1;});

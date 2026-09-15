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
let renderer!:ReactTestRenderer;
async function mount(role:string){await act(async()=>{renderer=create(<WeeklyAutomatic role={role}/>);});}

async function main(){
 // AR-3 team scope: per-collaborator rows with finished counts by type, orders and per-project lines.
 await mount('owner');
 assert.match(requests[0].path,/^\/core-api\/api\/agency\/weekly-reports\?week=\d{4}-\d{2}-\d{2}&scope=team$/);
 assert.match(text(renderer),/Ana López/);assert.match(text(renderer),/Bruno/);
 const teamCells=renderer.root.findAllByType('td');
 assert.equal(teamCells.length,16,'two extra columns per row: Órdenes and Proyectos');
 assert.deepEqual(teamCells.slice(0,6).map(cell=>cell.children.join('')),['2','0','1','0','0','1'],'finished counts render per collaborator and type');
 assert.equal(teamCells[6].children.join(''),'4','entry orders render in their own column');
 assert.equal(teamCells[7].children.length,2,'one compact line per project under the collaborator');
 assert.equal((teamCells[7].children[0] as ReactTestInstance).children.join(''),'Tienda Norte · 2 · 3 órdenes','project line shows name, finished count and worked orders');
 assert.equal((teamCells[7].children[1] as ReactTestInstance).children.join(''),'Proyecto eliminado · 1','missing project names fall back instead of breaking');
 assert.deepEqual(teamCells.slice(8,14).map(cell=>cell.children.join('')),['0','1','0','2','0','0']);
 assert.equal(teamCells[14].children.join(''),'0');assert.equal(teamCells[15].children.join(''),'—','no project lines renders a dash');
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
 const ownCells=renderer.root.findAllByType('td');
 assert.equal(ownCells.length,8);
 assert.equal(ownCells[6].children.join(''),'4');
 assert.equal((ownCells[7].children[0] as ReactTestInstance).children.join(''),'Tienda Norte · 2 · 3 órdenes');
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

import React from 'react';
import assert from 'node:assert/strict';
import {act,create,type ReactTestRenderer} from 'react-test-renderer';
import type {RecordAssigneesProps} from '../app/record-assignees';
import type {AssigneeSnapshot} from '../app/assignee-picker';

Object.assign(globalThis,{React});
require.extensions['.css']=()=>{};
const {RecordAssignees}=require('../app/record-assignees') as typeof import('../app/record-assignees');
const {AssigneePicker}=require('../app/assignee-picker') as typeof import('../app/assignee-picker');
Object.defineProperty(globalThis,'window',{configurable:true,value:new EventTarget()});
type Pending={url:string;init:RequestInit;resolve:(response:Response)=>void};
const requests:Pending[]=[];
globalThis.fetch=(url,init={})=>new Promise<Response>(resolve=>requests.push({url:String(url),init,resolve}));
const initial:AssigneeSnapshot={assigned_user_ids:['1'],assigned_user_id:'1',assignee_version:'7'};
const people={people:[{id:'1',full_name:'Ana',email:'ana@example.invalid'},{id:'2',full_name:'Bruno',email:'bruno@example.invalid'}]};
let renderer!:ReactTestRenderer,refreshes=0;
const refresh=async()=>{refreshes++;};
const props:RecordAssigneesProps={kind:'work-orders',id:'42',role:'editor',organizationId:'one',refresh};
const json=()=>JSON.stringify(renderer.toJSON());
const button=(label:string)=>renderer.root.findAllByType('button').find(node=>String(node.children).includes(label))!;
async function mount(p:RecordAssigneesProps=props){await act(async()=>{renderer=create(<RecordAssignees {...p}/>);});}
async function respond(p:Pending,data:unknown,status=200){await act(async()=>p.resolve(new Response(JSON.stringify(data),{status})));}
async function loaded(start:number,snapshot=initial){await respond(requests[start],snapshot);await respond(requests[start+1],people);}
function openEditor(){if(!renderer.root.findAllByType(AssigneePicker).length)act(()=>button('Cambiar responsables').props.onClick());}
function change(){openEditor();act(()=>renderer.root.findByType(AssigneePicker).props.onChange({assigned_user_ids:['1','2'],assigned_user_id:'2'}));}
async function click(label:string){await act(async()=>{button(label).props.onClick();});}

async function run(){
 await mount({...props,role:'unknown'});assert.equal(renderer.toJSON(),null);assert.equal(requests.length,0);act(()=>renderer.unmount());
 await mount();assert.equal(requests.length,2,'snapshot and people start in parallel');
 assert.match(requests[0].url,/work-orders\/42\/assignees$/);assert.match(requests[1].url,/productivity\/people$/);
 assert.equal(requests[0].init.cache,'no-store');assert.match(json(),/Cargando responsables/);
 await loaded(0);assert.equal(button('Guardar responsables'),undefined);
 assert.equal(renderer.root.findAllByType(AssigneePicker).length,0,'full picker is not mounted by default');
 assert.match(json(),/Ana/);assert.doesNotMatch(json(),/Bruno|Buscar integrante/,'summary shows selected people only');
 assert.equal(button('Cambiar responsables').props['aria-expanded'],false);
 openEditor();assert.equal(button('Guardar responsables').props.disabled,true);
 assert.equal(button('Cambiar responsables').props['aria-expanded'],true);
 change();await click('Cancelar');assert.equal(requests.length,2,'cancel makes no mutation');
 assert.equal(renderer.root.findAllByType(AssigneePicker).length,0);
 openEditor();assert.equal(button('Guardar responsables').props.disabled,true,'cancel restores the saved selection');
 change();assert.equal(button('Guardar responsables').props.disabled,false);
 await act(async()=>{button('Guardar responsables').props.onClick();button('Guardar responsables').props.onClick();});
 assert.equal(requests.length,3,'a double click produces one PATCH');
 assert.equal(requests[2].init.method,'PATCH');
 assert.deepEqual(JSON.parse(String(requests[2].init.body)),{assigned_user_ids:['1','2'],assigned_user_id:'2',expected_version:'7'});
 const updated:AssigneeSnapshot={assigned_user_ids:['2','1'],assigned_user_id:'2',assignee_version:'8'};
 await respond(requests[2],updated);assert.equal(refreshes,1);assert.match(json(),/Responsables guardados/);
 assert.equal(button('Guardar responsables'),undefined,'successful save collapses the editor');
 assert.equal(renderer.root.findAllByType(AssigneePicker).length,0);
 assert.match(json(),/Bruno/,'saved secondary appears in the compact summary');
 openEditor();assert.equal(button('Guardar responsables').props.disabled,true,'successful save resets dirty state');
 act(()=>renderer.root.findByType(AssigneePicker).props.onChange({assigned_user_ids:['1'],assigned_user_id:'1'}));
 await click('Guardar responsables');assert.equal(JSON.parse(String(requests[3].init.body)).expected_version,'8');
 await respond(requests[3],{error:'Los responsables cambiaron.'},409);
 assert.match(json(),/Otra persona cambió/);assert.equal(button('Guardar responsables').props.disabled,true);
 assert.equal(renderer.root.findByType(AssigneePicker).props.disabled,true);
 assert.deepEqual(renderer.root.findByType(AssigneePicker).props.value.assigned_user_ids,['1'],'conflict retains draft until explicit reload');
 await click('Recargar responsables');assert.equal(requests.length,6);
 await loaded(4,{...initial,assignee_version:'9'});change();await click('Guardar responsables');
 assert.equal(JSON.parse(String(requests[6].init.body)).expected_version,'9');
 await respond(requests[6],{error:'No se pudo guardar'},500);assert.match(json(),/No se pudo guardar/);
 assert.equal(button('Guardar responsables').props.disabled,false,'ordinary failure preserves an editable draft');
 await click('Guardar responsables');await respond(requests[7],{...updated,assignee_version:'10'});assert.equal(refreshes,2);
 const start=requests.length;
 await act(async()=>renderer.update(<RecordAssignees {...props} id="43" organizationId="two"/>));
 assert.match(json(),/Cargando responsables/);assert.doesNotMatch(json(),/ana@example.invalid/,'record/tenant transition clears names immediately');
 const stale=requests[start];
 await act(async()=>renderer.update(<RecordAssignees {...props} id="44" organizationId="three"/>));
 assert.equal(stale.init.signal?.aborted,true);
 await loaded(start);assert.match(json(),/Cargando responsables/,'stale response cannot replace the new record');
 await loaded(start+2);
 change();await click('Guardar responsables');const pendingSave=requests.at(-1)!;
 act(()=>renderer.unmount());assert.equal(pendingSave.init.signal?.aborted,true);
 await respond(pendingSave,updated);assert.equal(refreshes,2,'late save result does not refresh another record');
 let readStart=requests.length;await mount({...props,kind:'projects',role:'editor'});await loaded(readStart);
 assert.equal(renderer.root.findAllByType(AssigneePicker).length,0);assert.equal(button('Cambiar responsables'),undefined,'editor cannot edit project assignees');assert.match(json(),/Ana/,'readonly users see the summary');
 act(()=>renderer.unmount());
 readStart=requests.length;await mount({...props,refresh:async()=>{throw Error('Parent failed');}});await loaded(readStart);change();await click('Guardar responsables');
 await respond(requests.at(-1)!,updated);assert.match(json(),/Responsables guardados. No se pudo actualizar/);assert.equal(button('Guardar responsables'),undefined,'parent refresh failure does not reopen the saved assignment');
 act(()=>renderer.unmount());
 readStart=requests.length;await mount();await respond(requests[readStart],{error:'Sin acceso'},403);await respond(requests[readStart+1],people);
 assert.match(json(),/Sin acceso/);assert.equal(button('Guardar responsables'),undefined);
 await click('Reintentar carga');await loaded(readStart+2);assert.ok(button('Cambiar responsables'));
 act(()=>renderer.unmount());
 // Detail mode has exactly one save and sends both drafts atomically.
 let detailSave!:(details:Record<string,string>)=>Promise<void>;
 readStart=requests.length;
 await mount({...props,updatedAt:'2026-09-11T12:00:00.000Z',children:save=>{detailSave=save;return <div>Details editor</div>;}});
 await assert.rejects(detailSave({title:'Draft title'}),/Esperá/);
 await loaded(readStart);change();
 assert.equal(button('Guardar responsables'),undefined,'detail mode removes separate save');
 let saving!:Promise<void>;
 await act(async()=>{saving=detailSave({title:'Draft title'});});
 assert.match(requests.at(-1)!.url,/work-orders\/42$/);
 assert.deepEqual(JSON.parse(String(requests.at(-1)!.init.body)),{title:'Draft title',expected_updated_at:'2026-09-11T12:00:00.000Z',assignees:{assigned_user_ids:['1','2'],assigned_user_id:'2',expected_version:'7'}});
 const rejected=assert.rejects(saving,/No se pudo guardar/);
 await respond(requests.at(-1)!,{error:'No se pudo guardar'},500);await rejected;
 assert.deepEqual(renderer.root.findByType(AssigneePicker).props.value.assigned_user_ids,['1','2'],'failed combined save retains assignment draft');
 await act(async()=>{saving=detailSave({title:'Draft title'});});
 await respond(requests.at(-1)!,{record:{title:'Draft title'},assignees:updated});await saving;
 assert.match(json(),/Bruno/);act(()=>renderer.unmount());
 readStart=requests.length;
 await mount({...props,updatedAt:'2026-09-11T12:00:00.000Z',refresh:async()=>{throw Error('Refresh unavailable');},children:save=>{detailSave=save;return <div>Details editor</div>;}});
 await loaded(readStart);change();
 await act(async()=>{saving=detailSave({title:'Confirmed title'});});
 await respond(requests.at(-1)!,{record:{title:'Confirmed title'},assignees:updated});await saving;
 assert.equal(requests.length,readStart+3,'refresh failure never retries a confirmed unified mutation');
 assert.match(json(),/No se pudo actualizar/,'post-save refresh failure remains visible');
 openEditor();
 assert.deepEqual(renderer.root.findByType(AssigneePicker).props.value.assigned_user_ids,['2','1'],'confirmed assignment remains saved despite refresh failure');
 assert.equal(button('Guardar responsables'),undefined,'detail mode retains a single save action');
 act(()=>renderer.unmount());
 console.log('PASS: compact summary, unified atomic payload, retained drafts on failure, loading guard, versioned save, conflict, tenant isolation and refresh failure');
}
void run();

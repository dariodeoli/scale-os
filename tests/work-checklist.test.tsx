import React from 'react';
import assert from 'node:assert/strict';
import {act,create,type ReactTestRenderer} from 'react-test-renderer';
import type {WorkChecklistProps,WorkChecklistSnapshot} from '../app/work-checklist';

Object.assign(globalThis,{React});
require.extensions['.css']=()=>{};
const {WorkChecklist}=require('../app/work-checklist') as typeof import('../app/work-checklist');
const empty=():WorkChecklistSnapshot=>({version:'0',items:[],total:0,completed:0,max_items:100});
let saved=empty(),nextId=1,failStatus=0,failNetwork=false;
const requests:{path:string;method:string;payload:Record<string,unknown>|null;signal?:AbortSignal|null}[]=[];
let deferGet:((value:Response)=>void)|null=null,holdGet=false;
const response=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
globalThis.fetch=async(input,init)=>{
 const path=String(input),method=init?.method||'GET',payload=init?.body?JSON.parse(String(init.body)):null;
 requests.push({path,method,payload,signal:init?.signal});
 assert.equal(init?.credentials,'include');assert.equal(init?.cache,'no-store');
 if(method==='GET'){
  if(holdGet){holdGet=false;return new Promise<Response>(resolve=>{deferGet=resolve;});}
  return response(saved);
 }
 assert.equal((init?.headers as Record<string,string>)['Content-Type'],'application/json');
 if(failStatus){const status=failStatus;failStatus=0;return response({error:'El checklist cambió. Recargá para revisar.'},status);}
 assert.equal(payload.expected_version,saved.version,'each mutation uses the last fetched revision');
 const id=path.split('/').at(-1);
 if(method==='POST')saved.items.push({id:String(nextId++),text:payload.text,completed:false});
 if(method==='PATCH')saved.items=saved.items.map(item=>item.id===id?{...item,...('text'in payload?{text:payload.text}:{}),...('completed'in payload?(payload.completed?{completed:true,completed_at:'2026-09-14T12:00:00Z',completed_by_name:'Editora QA',completed_by_verified:true}:{completed:false,completed_at:null,completed_by_name:null}):{})}:item);
 if(method==='DELETE')saved.items=saved.items.filter(item=>item.id!==id);
 saved={...saved,version:String(Number(saved.version)+1),total:saved.items.length,completed:saved.items.filter(item=>item.completed).length};
 if(failNetwork){failNetwork=false;throw Error('Conexión interrumpida');}
 return response(saved);
};
let renderer!:ReactTestRenderer,refreshes=0;
let props:WorkChecklistProps={id:'41',organizationId:'7',role:'editor',refresh:()=>{refreshes++;}};
const tree=()=>JSON.stringify(renderer.toJSON());
const button=(text:string)=>renderer.root.findAllByType('button').find(b=>b.children.join('')===text)!;
const addInput=()=>renderer.root.findByProps({placeholder:'Escribí una tarea concreta'});
const editingInput=()=>renderer.root.findAllByType('input').find(i=>String(i.props.id||'').endsWith('-edit'))!;
const writeCount=()=>requests.filter(r=>r.method!=='GET').length;
async function click(text:string){await act(async()=>{button(text).props.onClick();});}
async function mount(){await act(async()=>{renderer=create(<WorkChecklist {...props}/>);});}
async function main(){
await mount();
assert.equal(requests.length,1);assert.match(tree(),/Todavía no hay ítems/);assert.equal(writeCount(),0);
assert.equal(renderer.root.findByType('progress').props.value,0);assert.equal(renderer.root.findByType('progress').props.max,1);
assert.equal(button('Agregar ítem').props.disabled,true);
act(()=>addInput().props.onChange({target:{value:'  Revisar guion  '}}));
await click('Agregar ítem');
assert.equal(saved.items[0].text,'Revisar guion');assert.equal(addInput().props.value,'');assert.equal(refreshes,1);
assert.equal(requests.at(-1)?.path,'/core-api/api/agency/work-orders/41/checklist/items');
await act(async()=>renderer.root.findByProps({type:'checkbox'}).props.onChange({target:{checked:true}}));
assert.equal(saved.items[0].completed,true);assert.equal(renderer.root.findByType('progress').props.value,1);
assert.match(tree(),/1 de 1|"1"," de ","1"|1," de ",1/);
assert.match(tree(),/Completado por/,'completed items show the completion actor and timestamp');
assert.match(tree(),/Editora QA/);
await act(async()=>renderer.root.findByProps({type:'checkbox'}).props.onChange({target:{checked:false}}));
assert.equal(saved.items[0].completed_by_name,null);assert.doesNotMatch(tree(),/Completado por/,'unchecking clears the completion attribution');
await act(async()=>renderer.root.findByProps({type:'checkbox'}).props.onChange({target:{checked:true}}));
assert.match(tree(),/Completado por/);
await act(async()=>renderer.root.findByProps({'aria-label':'Editar ítem: Revisar guion'}).props.onClick());
act(()=>editingInput().props.onChange({target:{value:'Validar guion'}}));
await click('Guardar ítem');assert.equal(saved.items[0].text,'Validar guion');assert.equal(saved.items[0].completed,true);
// Opening or cancelling the inline confirmation never deletes anything.
const beforeConfirmation=writeCount();
await act(async()=>renderer.root.findByProps({'aria-label':'Quitar ítem: Validar guion'}).props.onClick());
assert.equal(writeCount(),beforeConfirmation);assert.ok(renderer.root.findByProps({'aria-label':'Confirmar eliminación del ítem'}));
await click('Conservar ítem');assert.equal(writeCount(),beforeConfirmation);
await act(async()=>renderer.root.findByProps({'aria-label':'Quitar ítem: Validar guion'}).props.onClick());
await click('Sí, quitar ítem');assert.equal(saved.total,0);assert.equal(writeCount(),beforeConfirmation+1);
assert.equal(requests.at(-1)?.method,'DELETE');

// A stale editor keeps both its edit and add drafts; reload never auto-retries.
act(()=>addInput().props.onChange({target:{value:'Texto original'}}));await click('Agregar ítem');
await act(async()=>renderer.root.findByProps({'aria-label':'Editar ítem: Texto original'}).props.onClick());
act(()=>editingInput().props.onChange({target:{value:'Mi edición pendiente'}}));
act(()=>addInput().props.onChange({target:{value:'Mi nuevo ítem pendiente'}}));
saved={...saved,version:String(Number(saved.version)+1),items:saved.items.map(item=>({...item,text:'Edición de otra persona'}))};
failStatus=409;await click('Guardar ítem');
assert.ok(renderer.root.findByProps({role:'alert'}));assert.equal(button('Guardar ítem').props.disabled,true);
const afterConflict=writeCount();await click('Guardar ítem');assert.equal(writeCount(),afterConflict);
assert.equal(editingInput().props.value,'Mi edición pendiente');assert.equal(addInput().props.value,'Mi nuevo ítem pendiente');
await click('Recargar checklist');assert.equal(writeCount(),afterConflict);assert.match(tree(),/Edición de otra persona/);
assert.equal(editingInput().props.value,'Mi edición pendiente');assert.equal(addInput().props.value,'Mi nuevo ítem pendiente');
await click('Guardar ítem');assert.equal(saved.items[0].text,'Mi edición pendiente');
// Ambiguous network failure after commit requires a reload and never duplicates automatically.
failNetwork=true;await click('Agregar ítem');assert.match(tree(),/Conexión interrumpida/);
const afterNetwork=writeCount(),countAfterNetwork=saved.total;
await click('Agregar ítem');assert.equal(writeCount(),afterNetwork);
await click('Recargar checklist');assert.equal(writeCount(),afterNetwork);assert.equal(saved.total,countAfterNetwork);

// If another person removed the edited item, the local text remains available.
await act(async()=>renderer.root.findByProps({'aria-label':'Editar ítem: Mi edición pendiente'}).props.onClick());
act(()=>editingInput().props.onChange({target:{value:'No perder este texto'}}));
saved={...saved,version:String(Number(saved.version)+1),items:saved.items.slice(1)};
failStatus=409;await click('Guardar ítem');await click('Recargar checklist');
assert.equal(renderer.root.findByType('textarea').props.value,'No perder este texto');
await click('Descartar texto pendiente');

for(const role of ['viewer','finance','sales']){
 const before=writeCount();props={...props,role};await act(async()=>renderer.update(<WorkChecklist {...props}/>));
 assert.equal(renderer.root.findAllByType('button').length,0);
 for(const checkbox of renderer.root.findAllByProps({type:'checkbox'})){
  assert.equal(checkbox.props.disabled,true);
  await act(async()=>checkbox.props.onChange({target:{checked:true}}));
 }
 assert.equal(writeCount(),before);
}
props={...props,role:'collaborator'};await act(async()=>renderer.update(<WorkChecklist {...props}/>));
assert(renderer.root.findAllByType('button').length>0,'collaborator edits the checklist with checklists.edit');
// 100 item cap, forms, Enter prevention and single-flight saves.
saved={...empty(),items:Array.from({length:100},(_,i)=>({id:String(i+1),text:`Item ${i+1}`,completed:false})),total:100};
props={...props,role:'editor'};await act(async()=>renderer.update(<WorkChecklist {...props}/>));
assert.equal(button('Agregar ítem').props.disabled,true);assert.equal(addInput().props.disabled,true);
assert.match(tree(),/Máximo/);
for(const b of renderer.root.findAllByType('button'))assert.equal(b.props.type,'button');
assert.equal(renderer.root.findAllByType('form').length,0,'safe inside the detail form');
props={...props,id:'42'};saved=empty();await act(async()=>renderer.update(<WorkChecklist {...props}/>));
let prevented=0;
act(()=>addInput().props.onChange({target:{value:'Enter task'}}));
await act(async()=>{
 addInput().props.onKeyDown({key:'Enter',preventDefault(){prevented++;}});
 button('Agregar ítem').props.onClick();
});
assert.equal(prevented,1);assert.equal(saved.total,1,'double action during save only adds once');

// Changing tenant aborts the previous request and never accepts its late data.
props={...props,id:'43'};holdGet=true;await act(async()=>renderer.update(<WorkChecklist {...props}/>));
const oldSignal=requests.at(-1)?.signal;assert.ok(deferGet);
props={...props,organizationId:'8'};saved=empty();await act(async()=>renderer.update(<WorkChecklist {...props}/>));
assert.equal(oldSignal?.aborted,true);
await act(async()=>{deferGet!(response({version:'9',items:[{id:'99',text:'Private old tenant',completed:false}],total:1,completed:0,max_items:100}));});
assert.doesNotMatch(tree(),/Private old tenant/);assert.equal(addInput().props.value,'');
act(()=>renderer.unmount());
console.log('PASS: checklist CRUD/progress, explicit removal confirmation, readonly roles, retained drafts on 409/deleted item, ambiguous failure reload, version payloads, 100-item limit, keyboard/form behavior, single-flight mutation and late tenant-response isolation');
}
void main().catch(error=>{console.error(error);process.exitCode=1;});

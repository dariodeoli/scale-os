import React from 'react';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {act,create,type ReactTestRenderer} from 'react-test-renderer';
require.extensions['.css']=(module:NodeModule)=>{module.exports={};};
Object.assign(globalThis,{React});
const calls:{path:string;body:Record<string,unknown>|undefined;init:RequestInit|undefined}[]=[];
let manage=true,print=true,failJob=false;let deferRead=false,deferPair=false;let resolveRead:((v:unknown)=>void)|undefined,resolvePair:((v:unknown)=>void)|undefined;
const snapshot=()=>({can_manage:manage,can_print:print,printers:[{id:'p1',name:'Térmica',width_mm:80,enabled:true,connection:'lan',destination:'lan:192.168.1.10:9100',copies:1,auto_cut:false}],bridges:[],templates:[{id:'t1',name:'Prueba80',kind:'test',version:1,definition:{version:1,widthMm:80,heightMm:'auto',orientation:'portrait',marginsMm:{top:2,left:4,right:4,bottom:2},fontSize:10,autoCut:false}}],jobs:[{id:'j1',reference:'INV-42',state:'incierto',printer_id:'p1',template_id:'t1',template_version:1,copies:1,created_at:'2026-10-19T00:00:00Z'}],audit:[]});
const requestId=require.resolve('../app/workspace-request');
require.cache[requestId]={id:requestId,filename:requestId,loaded:true,exports:{request:async(path:string,init?:RequestInit)=>{const body=init?.body?JSON.parse(String(init.body)):undefined;calls.push({path,body,init});if(!init?.method){if(deferRead){deferRead=false;return new Promise(resolve=>{resolveRead=resolve;});}return snapshot();}if(path.endsWith('/bridges')&&deferPair){deferPair=false;return new Promise(resolve=>{resolvePair=resolve;});}if(path.endsWith('/bridges'))return {bridge:{id:'b1'},pairing_code:'ONCE-123',expires_at:'2026-10-20T00:00:00Z'};if(failJob&&path.endsWith('/reprint'))throw Error('Servidor no responde');return {ok:true};}}} as NodeModule;
const operationsId=require.resolve('../app/operations');
function EditorMock(_props:Record<string,unknown>){return <div data-editor=""/>;}
function DialogMock({title,children,close}:{title:string;children:React.ReactNode;close:()=>void}){return <section data-dialog={title}><button onClick={close}>Cerrar diálogo</button>{children}</section>;}
require.cache[operationsId]={id:operationsId,filename:operationsId,loaded:true,exports:{Editor:EditorMock,Dialog:DialogMock}} as NodeModule;
const {PrintingWorkspace,bridgeOnline}=require('../app/printing-workspace') as typeof import('../app/printing-workspace');
function button(r:ReactTestRenderer,text:string){return r.root.findAllByType('button').find(node=>node.children.join('')===text)!;}
function editor(r:ReactTestRenderer){return r.root.findByType(EditorMock).props as {save:(v:Record<string,string>)=>Promise<void>;defaults:Record<string,string>;fields:{key:string;choices?:{value:string}[]}[]};}
test('permissions and honest uncertain state do not trigger printing automatically',async()=>{
 calls.length=0;manage=false;print=false;let r:ReactTestRenderer;await act(async()=>{r=create(<PrintingWorkspace/>);});
 assert.equal(button(r!,'Agregar impresora'),undefined);assert.equal(button(r!,'Preparar impresión'),undefined);assert.equal(button(r!,'Reimprimir…'),undefined);
 assert.match(JSON.stringify(r!.toJSON()),/Incierto · sin reintento/);assert.equal(calls.filter(c=>c.init?.method).length,0);assert.equal(calls[0].init?.cache,'no-store');await act(async()=>r!.unmount());
});
test('pairing is shown once and clearing the dialog clears the code',async()=>{
 manage=true;print=true;let r:ReactTestRenderer;await act(async()=>{r=create(<PrintingWorkspace/>);});
 await act(async()=>button(r!,'Emparejar computadora').props.onClick());
 await act(async()=>editor(r!).save({name:'Computadora',branch_id:'main'}));
 assert.match(JSON.stringify(r!.toJSON()),/ONCE-123/);
 await act(async()=>button(r!,'Ya lo guardé en el agente').props.onClick());assert.doesNotMatch(JSON.stringify(r!.toJSON()),/ONCE-123/);await act(async()=>r!.unmount());
});
test('80 mm printer form has no unsupported paper profiles',async()=>{
 let r:ReactTestRenderer;await act(async()=>{r=create(<PrintingWorkspace/>);});await act(async()=>button(r!,'Agregar impresora').props.onClick());
 assert.equal(editor(r!).fields.some(f=>f.key==='width_mm'),false);
 await act(async()=>editor(r!).save({name:'Térmica',model:'',branch_id:'main',connection:'cups',destination:'cups:Scale',copies:'1',auto_cut:'false',enabled:'true'}));
 assert.equal(calls.findLast(c=>c.path.endsWith('/printers'))?.body?.width_mm,80);await act(async()=>r!.unmount());
});
test('uncertain manual reprint requires explicit document and retains idempotency after failure',async()=>{
 let r:ReactTestRenderer;await act(async()=>{r=create(<PrintingWorkspace/>);});await act(async()=>button(r!,'Reimprimir…').props.onClick());
 const values={...editor(r!).defaults,reference:'INV-42',notes:'Contenido revisado'};failJob=true;
 await act(async()=>{await assert.rejects(editor(r!).save(values),/Servidor/);});const first=calls.findLast(c=>c.path.endsWith('/reprint'))!;
 assert.equal(first.body?.confirm,true);assert.deepEqual(first.body?.data,{reference:'INV-42',title:'',companyName:'',customerName:'',notes:'Contenido revisado',inventoryCode:''});assert.ok(editor(r!));
 failJob=false;await act(async()=>editor(r!).save(values));const second=calls.findLast(c=>c.path.endsWith('/reprint'))!;assert.equal(first.body?.idempotency_key,second.body?.idempotency_key);await act(async()=>r!.unmount());
});
test('heartbeat never treats a revoked or future-dated bridge as online',()=>{
 const now=Date.now();assert.equal(bridgeOnline({id:'a',name:'a',last_seen_at:new Date(now-1000).toISOString()},now),true);assert.equal(bridgeOnline({id:'a',name:'a',last_seen_at:new Date(now-46000).toISOString()},now),false);assert.equal(bridgeOnline({id:'a',name:'a',last_seen_at:new Date(now+1000).toISOString()},now),false);assert.equal(bridgeOnline({id:'a',name:'a',last_seen_at:new Date(now-1000).toISOString(),revoked_at:'2026-10-19'},now),false);
});
test('demo explores the shared template locally without API calls or physical claims',async()=>{
 calls.length=0;let r:ReactTestRenderer;await act(async()=>{r=create(<PrintingWorkspace demo/>);});assert.equal(calls.length,0);assert.match(JSON.stringify(r!.toJSON()),/Demo: vista previa/);assert.equal(button(r!,'Preparar impresión'),undefined);await act(async()=>button(r!,'Explorar plantilla').props.onClick());assert.ok(r!.root.findAllByType('iframe').length);await act(async()=>editor(r!).save(editor(r!).defaults));assert.equal(calls.length,0);assert.equal(r!.root.findAllByType(EditorMock).length,0);await act(async()=>r!.unmount());
});

test('scope changes discard deferred old reads, drafts and one-time pairing responses',async()=>{
 manage=true;print=true;deferRead=true;let r:ReactTestRenderer;await act(async()=>{r=create(<PrintingWorkspace scopeKey="orgA:user1"/>);});
 await act(async()=>r!.update(<PrintingWorkspace scopeKey="orgB:user2"/>));assert.match(JSON.stringify(r!.toJSON()),/Térmica/);
 await act(async()=>resolveRead!({...snapshot(),printers:[{...snapshot().printers[0],name:'OLD PRIVATE TENANT'}]}));assert.doesNotMatch(JSON.stringify(r!.toJSON()),/OLD PRIVATE TENANT/);
 await act(async()=>button(r!,'Emparejar computadora').props.onClick());deferPair=true;let pending:Promise<void>;await act(async()=>{pending=editor(r!).save({name:'Old computer',branch_id:'main'});});
 await act(async()=>r!.update(<PrintingWorkspace scopeKey="orgC:user3"/>));assert.equal(r!.root.findAllByType(EditorMock).length,0);
 await act(async()=>{resolvePair!({pairing_code:'OLD-SECRET',expires_at:'2026-10-20T00:00:00Z'});await pending!;});assert.doesNotMatch(JSON.stringify(r!.toJSON()),/OLD-SECRET/);
 await act(async()=>r!.unmount());
});

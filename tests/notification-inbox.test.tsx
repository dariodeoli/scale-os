import React from 'react';
import assert from 'node:assert/strict';
import {test,type TestContext} from 'node:test';
import {readFileSync} from 'node:fs';
import {act,create,type ReactTestRenderer,type ReactTestInstance} from 'react-test-renderer';
Object.assign(globalThis,{React});require.extensions['.css']=()=>{};
let destinations:string[]=[];
const navigationId=require.resolve('next/navigation');
require.cache[navigationId]={id:navigationId,filename:navigationId,loaded:true,exports:{useRouter:()=>({push:(path:string)=>destinations.push(path)})}} as NodeModule;
const dialogId=require.resolve('../app/dialog');
require.cache[dialogId]={id:dialogId,filename:dialogId,loaded:true,exports:{Dialog:({children,close,busy}:{children:React.ReactNode;close:()=>void;busy:boolean})=><section role="dialog"><button disabled={busy} onClick={close}>Cerrar</button>{children}</section>}} as NodeModule;
const {NotificationBell}=require('../app/notifications-ui') as typeof import('../app/notifications-ui');
const text=(node:ReactTestInstance|string):string=>typeof node==='string'?node:node.children.map(text).join('');
const fixtures=():Array<{id:string;title:string;body:string;project_id:string|null;work_order_id:string|null;comment_id?:string|null;read_at:string|null;resolved_at:string|null;created_at:string}>=>[
 {id:'4',title:'Asignación propia de proyecto',body:'Texto largo '+('responsable '.repeat(50)),project_id:'99',work_order_id:null,read_at:null,resolved_at:null,created_at:'2026-09-11T12:00:00Z'},
 {id:'3',title:'Leído pendiente',body:'Pendiente de atender',project_id:null,work_order_id:null,read_at:'now',resolved_at:null,created_at:'invalid'},
 {id:'2',title:'Aviso resuelto',body:'Ya atendido',project_id:null,work_order_id:null,read_at:'now',resolved_at:'now',created_at:'2026-09-11T12:00:00Z'},
 {id:'1',title:'Asignación de pieza',body:'Nueva pieza',project_id:'99',work_order_id:'88',read_at:null,resolved_at:null,created_at:'2026-09-11T12:00:00Z'},
];
async function harness(t:TestContext,initialFailure=false){
 let rows=fixtures(),failReads=initialFailure,failWrites=false,delayReads=false,delayWrites=false;
 const deferredReads:(()=>void)[]=[],deferredWrites:(()=>void)[]=[],calls:{path:string;body:any;method:string}[]=[],opened:string[]=[],anchors:Record<string,string|undefined>={},timers=new Set<()=>void>();destinations=[];
 Object.assign(globalThis,{document:{hidden:false},window:new EventTarget()});
 t.mock.method(globalThis,'setInterval',((callback:()=>void)=>{timers.add(callback);return callback;}) as any);
 t.mock.method(globalThis,'clearInterval',((callback:()=>void)=>{timers.delete(callback);}) as any);
 t.mock.method(globalThis,'fetch',async(input:RequestInfo|URL,init?:RequestInit)=>{
  const url=new URL(String(input),'https://fixture.invalid'),method=init?.method||'GET',body=init?.body?JSON.parse(String(init.body)):undefined;calls.push({path:url.pathname+url.search,body,method});
  assert(url.pathname.startsWith('/core-api/api/agency/notifications'),'no underlying task writes');
  if(method==='PATCH'){
   if(delayWrites)await new Promise<void>(resolve=>deferredWrites.push(resolve));
   if(failWrites)return Response.json({error:'Guardado rechazado'},{status:403});
   const id=url.pathname.split('/').at(-1);
   for(const row of rows)if(id==='read-all'||row.id===id){if(body.resolved===true){row.resolved_at='now';row.read_at='now';}else if(body.resolved===false)row.resolved_at=null;else row.read_at='now';}
   return Response.json({ok:true});
  }
  if(failReads)return Response.json({error:'Sin conexión'},{status:503});
  const status=url.searchParams.get('status')||'all',before=Number(url.searchParams.get('before')||Infinity);
  assert(['all','unread','unresolved','resolved'].includes(status));
  const page=rows.filter(row=>Number(row.id)<before&&(status==='all'||status==='unread'&&!row.read_at||status==='unresolved'&&!row.resolved_at||status==='resolved'&&!!row.resolved_at)).slice(0,2);
  const snapshot=JSON.stringify({notifications:page,unread:rows.filter(row=>!row.read_at).length,pendingCount:rows.filter(row=>!row.resolved_at).length,next:page.length===2?page.at(-1)!.id:null});
  if(delayReads)await new Promise<void>(resolve=>deferredReads.push(resolve));
  return new Response(snapshot);
 });
 let renderer!:ReactTestRenderer;
 await act(async()=>{renderer=create(<NotificationBell openOrder={(id,anchor)=>{opened.push(id);anchors[id]=anchor;}}/>);});
 const button=(label:string)=>renderer.root.findAllByType('button').find(node=>text(node)===label||String(node.props['aria-label']||'').startsWith(label))!;
 const click=async(label:string)=>{const node=button(label);assert(node,label);assert(!node.props.disabled,label);await act(async()=>{node.props.onClick();});};
 const open=async()=>{await act(async()=>{renderer.root.findByProps({className:'icon-button notification-trigger'}).props.onClick();});};
 const copy=()=>text(renderer.root);
 t.after(()=>act(()=>renderer.unmount()));await open();
 return {renderer,button,click,copy,open,rows,calls,opened,anchors,timers,deferredReads,deferredWrites,
  set failReads(v:boolean){failReads=v;},set failWrites(v:boolean){failWrites=v;},set delayReads(v:boolean){delayReads=v;},set delayWrites(v:boolean){delayWrites=v;}};
}

test('server filters, global unread/pendingCount, resolve/reopen and global read-all stay distinct',async t=>{
 const h=await harness(t);assert(h.copy().includes('2 sin leer · 3 pendientes'));
 assert.equal(h.renderer.root.findAllByType('article').length,2);
 await h.click('Resueltas');assert(h.copy().includes('Aviso resuelto'));assert(!h.copy().includes('Asignación propia'));
 assert(h.copy().includes('2 sin leer · 3 pendientes'));
 await h.click('Pendientes');assert(!h.copy().includes('Aviso resuelto'));
 await h.click('Sin leer');await h.click('Resolver aviso');
 assert.deepEqual(h.calls.find(c=>c.method==='PATCH')?.body,{resolved:true});assert(h.copy().includes('1 sin leer · 2 pendientes'));
 await h.click('Resueltas');await h.click('Reabrir aviso');assert(h.copy().includes('1 sin leer · 3 pendientes'));
 await h.click('Marcar todas las notificaciones como leídas');assert(h.copy().includes('0 sin leer · 3 pendientes'));
 assert.deepEqual(h.calls.filter(c=>c.method==='PATCH').at(-1),{path:'/core-api/api/agency/notifications/read-all',method:'PATCH',body:{}});
 assert(h.copy().includes('Leer, resolver o reabrir cambia solo tu propia bandeja; no completa la pieza'));
});
test('initial failure stays unknown and retryable; successful empty filtered inbox is distinct',async t=>{
 const h=await harness(t,true);assert(h.copy().includes('Estado no disponible'));assert(h.copy().includes('Sin conexión'));
 assert(!/Estás al día|0 sin leer en total|No tenés notificaciones/.test(h.copy()));
 h.failReads=false;await h.click('Actualizar');assert(h.copy().includes('2 sin leer · 3 pendientes'));
 await h.click('Marcar todas las notificaciones como leídas');await h.click('Sin leer');assert(h.copy().includes('No hay notificaciones para este filtro'));
 assert(!h.copy().includes('Tus propias acciones no generan avisos'));
});
test('pagination keeps its filter, stale responses cannot replace a newer filter, and unmount clears polling',async t=>{
 const h=await harness(t);await h.click('Pendientes');await h.click('Ver avisos anteriores');
 assert(h.calls.at(-1)!.path.includes('status=unresolved&before=3'));assert.equal(h.renderer.root.findAllByType('article').length,3);
 h.delayReads=true;await h.click('Sin leer');assert.equal(h.deferredReads.length,1);
 h.delayReads=false;await h.click('Resueltas');assert(h.copy().includes('Aviso resuelto'));
 await act(async()=>h.deferredReads.splice(0).forEach(resolve=>resolve()));assert(!h.copy().includes('Asignación propia'));
 act(()=>h.renderer.unmount());assert.equal(h.timers.size,0);
});
test('project and piece destinations mark unread notices only, without resolving them',async t=>{
 const h=await harness(t);await h.click('Ver proyecto');assert.deepEqual(destinations,['/proyectos#project-99']);assert.equal(h.rows[0].resolved_at,null);
 assert.deepEqual(h.calls.find(c=>c.method==='PATCH')?.body,{});
 await h.open();await h.click('Sin leer');await h.click('Ver pieza');assert.deepEqual(h.opened,['88']);assert.equal(h.rows[3].resolved_at,null);
});
test('mention notifications deep-link to the exact comment on the piece',async t=>{
 const h=await harness(t);h.rows[3].comment_id='77';
 await h.open();await h.click('Sin leer');await h.click('Ver pieza');
 assert.deepEqual(h.opened,['88']);assert.equal(h.anchors['88'],'comment-77','inbox passes the comment anchor when the notice carries comment_id');
 assert.equal(h.rows[3].resolved_at,null,'deep-link visit never resolves the notice');
 h.rows[3].comment_id=null;await h.open();await h.click('Todas');await h.click('Ver avisos anteriores');await h.click('Ver pieza');assert.equal(h.anchors['88'],undefined,'notices without comment_id open the piece without an anchor');
});
test('polling preserves older pages while open, then resumes after refresh, filter change or closing',async t=>{
 const h=await harness(t);
 const tick=()=>act(async()=>{h.timers.forEach(callback=>callback());});
 await h.click('Ver avisos anteriores');assert.equal(h.renderer.root.findAllByType('article').length,4);
 let calls=h.calls.length;await tick();await tick();
 assert.equal(h.calls.length,calls,'no automatic page-one fetch during expanded history');
 assert.equal(h.renderer.root.findAllByType('article').length,4);
 h.failReads=true;await h.click('Actualizar');calls=h.calls.length;await tick();
 assert.equal(h.calls.length,calls,'failed explicit refresh retains the expanded-history pause');
 assert.equal(h.renderer.root.findAllByType('article').length,4);
 h.failReads=false;await h.click('Actualizar');assert.equal(h.renderer.root.findAllByType('article').length,2);
 calls=h.calls.length;await tick();assert.equal(h.calls.length,calls+1,'successful explicit refresh resumes polling');
 await h.click('Ver avisos anteriores');await h.click('Pendientes');
 calls=h.calls.length;await tick();assert.equal(h.calls.length,calls+1,'new filter resumes polling');
 await h.click('Ver avisos anteriores');assert.equal(h.renderer.root.findAllByType('article').length,3);
 await h.click('Cerrar');calls=h.calls.length;await tick();assert.equal(h.calls.length,calls+1,'closed bell still refreshes counts');
});
test('single-flight mutation retries failures, refresh failure reports saved and never repeats the write',async t=>{
 const h=await harness(t);h.failWrites=true;await h.click('Resolver aviso');assert(h.copy().includes('Guardado rechazado'));assert(!h.button('Resolver aviso').props.disabled);
 h.failWrites=false;h.delayWrites=true;const resolveButton=h.button('Resolver aviso'),before=h.calls.filter(c=>c.method==='PATCH').length;
 await act(async()=>{resolveButton.props.onClick();resolveButton.props.onClick();});assert.equal(h.calls.filter(c=>c.method==='PATCH').length,before+1);
 h.failReads=true;await act(async()=>h.deferredWrites.splice(0).forEach(resolve=>resolve()));assert(h.copy().includes('Cambio guardado. No se pudo actualizar'));
 const writes=h.calls.filter(c=>c.method==='PATCH').length;h.failReads=false;await h.click('Actualizar');assert.equal(h.calls.filter(c=>c.method==='PATCH').length,writes);
});
test('bell styles scope mobile wrapping and 44px actions without truncating notification content',()=>{
 const css=readFileSync(new URL('../app/notifications.css',import.meta.url),'utf8');
 assert(css.includes('.notification-inbox button'));assert(css.includes('min-height:44px'));assert(css.includes('overflow-wrap:anywhere'));assert(css.includes('white-space:pre-wrap'));assert(css.includes('flex-wrap:wrap'));assert(!/line-clamp|text-overflow:ellipsis/.test(css));
});

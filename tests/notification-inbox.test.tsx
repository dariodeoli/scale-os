import React from 'react';
import assert from 'node:assert/strict';
import {test,type TestContext} from 'node:test';
import {readFileSync} from 'node:fs';
import {act,create,type ReactTestRenderer,type ReactTestInstance} from 'react-test-renderer';
Object.assign(globalThis,{React});require.extensions['.css']=()=>{};
// owncoding-ui v0.61 usa rAF para devolver el foco; el doble de Node no lo trae.
Object.assign(globalThis,{requestAnimationFrame:(callback:(time:number)=>void)=>{callback(Date.now());return 0;},cancelAnimationFrame:()=>{}});
let destinations:string[]=[];
const navigationId=require.resolve('next/navigation');
require.cache[navigationId]={id:navigationId,filename:navigationId,loaded:true,exports:{useRouter:()=>({push:(path:string)=>destinations.push(path)})}} as NodeModule;
const dialogId=require.resolve('../app/dialog');
require.cache[dialogId]={id:dialogId,filename:dialogId,loaded:true,exports:{Dialog:({children,close,busy,title}:{children:React.ReactNode;close:()=>void;busy:boolean;title:string})=><section role="dialog" data-title={title}><button disabled={busy} onClick={close}>Cerrar</button>{children}</section>}} as NodeModule;
const {NotificationBell}=require('../app/notifications-ui') as typeof import('../app/notifications-ui');
const {avisoDeNotificacion}=require('../app/notification-inbox') as typeof import('../app/notification-inbox')&{avisoDeNotificacion:(notice:any)=>any};
const text=(node:ReactTestInstance|string):string=>typeof node==='string'?node:node.children.map(text).join('');
const fixtures=():Array<{id:string;kind?:string;title:string;body:string;project_id:string|null;work_order_id:string|null;comment_id?:string|null;read_at:string|null;resolved_at:string|null;created_at:string}>=>[
 {id:'4',kind:'assignment',title:'Asignación propia de proyecto',body:'Texto largo '+('responsable '.repeat(50)),project_id:'99',work_order_id:null,read_at:null,resolved_at:null,created_at:'2026-09-11T12:00:00Z'},
 {id:'3',kind:'comment',title:'Leído pendiente',body:'Pendiente de atender',project_id:null,work_order_id:null,read_at:'now',resolved_at:null,created_at:'invalid'},
 {id:'2',kind:'due',title:'Aviso resuelto',body:'Ya atendido',project_id:null,work_order_id:null,read_at:'now',resolved_at:'now',created_at:'2026-09-11T12:00:00Z'},
 {id:'1',kind:'assignment',title:'Asignación de pieza',body:'Nueva pieza',project_id:'99',work_order_id:'88',read_at:null,resolved_at:null,created_at:'2026-09-11T12:00:00Z'},
];
async function harness(t:TestContext,initialFailure=false){
 let rows=fixtures(),failReads=initialFailure,failWrites=false,delayReads=false,delayWrites=false;
 const deferredReads:(()=>void)[]=[],deferredWrites:(()=>void)[]=[],calls:{path:string;body:any;method:string}[]=[],opened:string[]=[],anchors:Record<string,string|undefined>={},timers=new Set<()=>void>();destinations=[];
 Object.assign(globalThis,{document:{hidden:false,addEventListener(){},removeEventListener(){}},window:new EventTarget()});
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
 const button=(label:string)=>renderer.root.findAllByType('button').find(node=>text(node)===label||String(node.props['aria-label']||'').startsWith(label)||String(node.props.title||'')===label)!;
 const click=async(label:string)=>{const node=button(label);assert(node,label);assert(!node.props.disabled,label);await act(async()=>{node.props.onClick();});};
 const open=async()=>{await act(async()=>{renderer.root.findByProps({'data-testid':'campana-avisos'}).props.onClick();});};
 // v0.61 dibuja los avisos como botones dentro del panel (ya no role=menuitem):
 // el contenedor scrolleable del objeto es la fuente de las filas de la lista.
 const items=()=>{
  const panel=renderer.root.findAll(node=>node.props?.role==='dialog'&&typeof node.props['aria-labelledby']==='string').at(-1);
  const scroller=panel?.findAll(node=>String(node.props?.className||'').includes('max-h-80')).at(-1);
  return scroller?scroller.findAll(node=>node.type==='button'||node.type==='a'):[];
 };
 const choose=async(title:string)=>{const item=items().find(node=>text(node).includes(title));assert(item,title);await act(async()=>{item.props.onClick();});};
 const copy=()=>text(renderer.root);
 t.after(()=>act(()=>renderer.unmount()));await open();
 return {renderer,button,click,copy,open,items,choose,rows,calls,opened,anchors,timers,deferredReads,deferredWrites,
  set failReads(v:boolean){failReads=v;},set failWrites(v:boolean){failWrites=v;},set delayReads(v:boolean){delayReads=v;},set delayWrites(v:boolean){delayWrites=v;}};
}

test('the inbox is the library bandeja (CampanaAvisos) with the app mapping in one place',async t=>{
 const h=await harness(t);
 assert(h.renderer.root.findByProps({'data-testid':'campana-avisos'}),'la campana sale del objeto');
 assert.equal(h.items().length,2,'la lista del panel la dibuja el objeto');
 assert(h.copy().includes('1 sin leer'),'el contador del objeto cuenta los avisos cargados que siguen sin leer');
 assert(h.copy().includes('3 pendientes'),'el estado de la app suma los pendientes del servidor');
 const source=readFileSync(new URL('../app/notification-inbox.tsx',import.meta.url),'utf8');
 assert(!source.includes('notification-trigger')&&!source.includes('<article'),'la copia local del marcado se retiró');
 assert(!/\.toque-44|\[&>button\]/.test(source),'el target táctil no se finge con una clase que Tailwind no emite');
 assert(readFileSync(new URL('../app/ui-system.css',import.meta.url),'utf8').includes('[data-testid="campana-avisos"]::after'),'la campana conserva el target táctil de 44 px desde la hoja del marco');
 assert.equal((source.match(/export function avisoDeNotificacion/g)||[]).length,1,'el mapeo al contrato vive en un solo lugar');
});

test('aviso contract: short title, one-line detail, formatted date, tone and read state',()=>{
 const mapping=avisoDeNotificacion({id:7,kind:'due',title:'Entrega pendiente hoy.',body:'Línea uno\n  línea   dos ',work_order_id:'5',project_id:null,read_at:null,resolved_at:null,created_at:'2026-09-11T12:00:00Z'});
 assert.equal(mapping.id,'7');
 assert(!mapping.titulo.endsWith('.'),'título corto sin punto final');
 assert.equal(mapping.detalle,'Línea uno línea dos','detalle en una línea');
 assert.equal(mapping.tono,'warn','una entrega pendiente sin leer pide atención');
 assert.equal(mapping.icono,'clock');
 assert.equal(mapping.leido,false);
 assert(mapping.fecha.length>0&&!mapping.fecha.includes('T'),'la fecha ya llega formateada');
 const resolved=avisoDeNotificacion({id:8,title:'Ya atendido',body:'ok',work_order_id:null,project_id:null,read_at:'now',resolved_at:'now',created_at:'2026-09-11T12:00:00Z'});
 assert.equal(resolved.tono,'ok');assert.equal(resolved.leido,true);assert.equal(resolved.icono,'check');
 assert(avisoDeNotificacion({id:9,title:'x'.repeat(120),body:'y'.repeat(300),work_order_id:null,project_id:null,read_at:null,resolved_at:null,created_at:'2026-09-11T12:00:00Z'}).titulo.length<=90,'el título se acota');
});

test('server filters, pending totals, resolve/reopen and global read-all stay distinct',async t=>{
 const h=await harness(t);
 assert.equal(h.items().length,2);
 await h.click('Resueltas');assert(h.copy().includes('Aviso resuelto'));assert(!h.copy().includes('Asignación propia'));
 assert(h.copy().includes('3 pendientes'));
 await h.click('Pendientes');assert(!h.copy().includes('Aviso resuelto'));
 await h.click('Sin leer');assert(h.copy().includes('2 sin leer'));
 await h.choose('Asignación de pieza');
 assert(h.copy().includes('Leer, resolver o reabrir cambia solo tu propia bandeja; no completa la pieza'));
 await h.click('Resolver aviso');
 assert.deepEqual(h.calls.filter(c=>c.method==='PATCH').at(-1)?.body,{resolved:true});
 await h.click('Cerrar');await h.open();
 assert(h.copy().includes('2 pendientes'),'el total de pendientes baja con la resolución');
 await h.click('Resueltas');await h.choose('Aviso resuelto');await h.click('Reabrir aviso');
 assert.deepEqual(h.calls.filter(c=>c.method==='PATCH').at(-1)?.body,{resolved:false});
 await h.click('Cerrar');await h.open();
 assert(h.copy().includes('3 pendientes'),'reabrir vuelve a contar el aviso como pendiente');
 await h.click('Marcar todas las notificaciones como leídas');
 assert.deepEqual(h.calls.filter(c=>c.method==='PATCH').at(-1),{path:'/core-api/api/agency/notifications/read-all',method:'PATCH',body:{}});
 assert(!h.copy().includes('sin leer'),'sin no leídos el contador desaparece');
});

test('empty states are honest and always offer an action: unknown, retryable error and filtered',async t=>{
 const h=await harness(t,true);
 assert(h.copy().includes('Estado no disponible.'),'sin datos no se afirma que no hay avisos');
 assert(h.copy().includes('Sin conexión')&&h.copy().includes('Reintentar'),'el error explica y ofrece reintento');
 assert(!/No tenés avisos|No hay avisos para este filtro/.test(h.copy()));
 h.failReads=false;await h.click('Reintentar');assert(h.copy().includes('3 pendientes')&&h.copy().includes('1 sin leer'));
 await h.click('Marcar todas las notificaciones como leídas');await h.click('Sin leer');
 assert(h.copy().includes('No hay avisos para este filtro')&&h.copy().includes('Ver todas'),'el vacío filtrado ofrece salida');
 await h.click('Ver todas');assert(h.items().length===2,'volver a todas repuebla la bandeja');
});

test('bandeja sin avisos: un solo refresco, sin filtros apilados (#147)',async t=>{
 const h=await harness(t);
 const refresh=()=>h.renderer.root.findAllByType('button').filter(node=>String(node.props.title)==='Actualizar'||String(node.props['aria-label'])==='Actualizar notificaciones'||text(node)==='Actualizar');
 assert.equal(refresh().length,1,'con avisos queda el refresco del pie');
 const filters=()=>h.renderer.root.findAllByType('button').filter(node=>/^(Todas|Sin leer|Pendientes|Resueltas)$/.test(text(node)));
 assert(filters().length>0,'los filtros acompañan a la lista con contenido');
 act(()=>{h.rows.length=0;});
 await h.click('Actualizar');
 assert(h.copy().includes('No tenés avisos'),'el vacío honesto se mantiene');
 assert.equal(refresh().length,1,'el vacío deja una sola acción de actualizar');
 assert.equal(filters().length,0,'sin avisos no se apilan los cuatro filtros');
 assert(h.button('Preferencias'),'las preferencias siguen accesibles desde el pie');
});

test('pagination keeps its filter, stale responses cannot replace a newer filter, and unmount clears polling',async t=>{
 const h=await harness(t);await h.click('Pendientes');await h.click('Ver avisos anteriores');
 assert(h.calls.at(-1)!.path.includes('status=unresolved&before=3'));assert.equal(h.items().length,3);
 h.delayReads=true;await h.click('Sin leer');assert.equal(h.deferredReads.length,1);
 h.delayReads=false;await h.click('Resueltas');assert(h.copy().includes('Aviso resuelto'));
 await act(async()=>h.deferredReads.splice(0).forEach(resolve=>resolve()));assert(!h.copy().includes('Asignación propia'));
 act(()=>h.renderer.unmount());assert.equal(h.timers.size,0);
});

test('polling pauses on expanded history and resumes on an explicit refresh or a filter change',async t=>{
 const h=await harness(t);
 const tick=()=>act(async()=>{h.timers.forEach(callback=>callback());});
 await h.click('Ver avisos anteriores');assert.equal(h.items().length,4);
 let calls=h.calls.length;await tick();await tick();
 assert.equal(h.calls.length,calls,'la página uno no reemplaza el historial expandido');
 h.failReads=true;await h.click('Actualizar');calls=h.calls.length;await tick();
 assert.equal(h.calls.length,calls,'un refresco fallido no reanuda el polling');
 h.failReads=false;await h.click('Actualizar');assert.equal(h.items().length,2);
 calls=h.calls.length;await tick();assert.equal(h.calls.length,calls+1,'el refresco exitoso reanuda el polling');
 await h.click('Ver avisos anteriores');assert.equal(h.items().length,4);
 calls=h.calls.length;await h.click('Pendientes');await tick();assert.equal(h.calls.length,calls+2,'el cambio de filtro vuelve a la página uno y refresca');
});

test('choosing a notice closes the bandeja, opens its detail, marks unread notices read and deep-links',async t=>{
 const h=await harness(t);await h.click('Sin leer');
 await h.choose('Asignación de pieza');
 assert.equal(h.items().length,0,'elegir un aviso cierra el panel del objeto');
 assert.deepEqual(h.calls.find(c=>c.method==='PATCH')?.body,{});
 assert.equal(h.renderer.root.findByProps({role:'dialog'}).props['data-title'],'Asignación','el detalle nombra el tipo de aviso');
 assert(h.copy().includes('Nueva pieza'),'el detalle muestra el cuerpo completo');
 await h.click('Ver pieza');assert.deepEqual(h.opened,['88']);assert.equal(h.rows[3].resolved_at,null);
 await h.open();await h.click('Todas');await h.choose('Asignación propia de proyecto');await h.click('Ver proyecto');
 assert.deepEqual(destinations,['/proyectos#project-99']);assert.equal(h.rows[0].resolved_at,null);
});

test('mention notifications deep-link to the exact comment on the piece',async t=>{
 const h=await harness(t);h.rows[3].comment_id='77';
 await h.click('Sin leer');await h.choose('Asignación de pieza');await h.click('Ver pieza');
 assert.deepEqual(h.opened,['88']);assert.equal(h.anchors['88'],'comment-77','la bandeja pasa el ancla del comentario');
 assert.equal(h.rows[3].resolved_at,null,'visitar el detalle nunca resuelve el aviso');
 h.rows[3].comment_id=null;await h.open();await h.click('Todas');await h.click('Ver avisos anteriores');await h.choose('Asignación de pieza');await h.click('Ver pieza');
 assert.equal(h.anchors['88'],undefined,'sin comment_id la pieza abre sin ancla');
});

test('single-flight mutation retries failures, refresh failure reports saved and never repeats the write',async t=>{
 const h=await harness(t);await h.click('Sin leer');await h.choose('Asignación de pieza');
 h.failWrites=true;await h.click('Resolver aviso');assert(h.copy().includes('Guardado rechazado'),'el detalle muestra el error de la mutación');assert(!h.button('Resolver aviso').props.disabled);
 h.failWrites=false;h.delayWrites=true;const resolveButton=h.button('Resolver aviso'),before=h.calls.filter(c=>c.method==='PATCH').length;
 await act(async()=>{resolveButton.props.onClick();resolveButton.props.onClick();});assert.equal(h.calls.filter(c=>c.method==='PATCH').length,before+1);
 h.failReads=true;await act(async()=>h.deferredWrites.splice(0).forEach(resolve=>resolve()));assert(h.copy().includes('Cambio guardado. No se pudo actualizar'));
 const writes=h.calls.filter(c=>c.method==='PATCH').length;h.failReads=false;await h.open();await h.click('Actualizar');assert.equal(h.calls.filter(c=>c.method==='PATCH').length,writes);
});

import React from 'react';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {act,create,type ReactTestRenderer} from 'react-test-renderer';

require.extensions['.css']=()=>{};
Object.assign(globalThis,{React});
function mock(path:string,exports:unknown){const id=require.resolve(path);require.cache[id]={id,filename:id,loaded:true,exports} as NodeModule;}
mock('next/link',{__esModule:true,default:({children,...props}:React.AnchorHTMLAttributes<HTMLAnchorElement>)=><a {...props}>{children}</a>});
mock('next/navigation',{useParams:()=>({id:'42'})});

const InvitationPage=require('../app/cliente/invitacion/page').default as React.ComponentType;
const DeliveryPage=require('../app/cliente/entregas/[id]/page').default as React.ComponentType;
type Request={url:string;init:RequestInit;resolve:(response:Response)=>void};
const requests:Request[]=[];
globalThis.fetch=(input,init={})=>new Promise<Response>(resolve=>requests.push({url:String(input),init,resolve}));
const token='a'.repeat(64);
const detail={delivery:{id:42,title:'Identidad visual',summary:'Revisá la pieza final.',asset_name:'Propuesta final.pdf',version:3,project_name:'Lanzamiento',client_name:'Acme'},links:[{id:7,label:'Propuesta final',url:'https://drive.google.com/propuesta'}],comments:[{id:1,body:'Todo claro',created_at:'2026-09-13T12:00:00.000Z',author_name:'Ana'}],decision:null};

function respond(request:Request,data:unknown,status=200){return act(async()=>{request.resolve(new Response(JSON.stringify(data),{status}));});}
function content(renderer:ReactTestRenderer){return JSON.stringify(renderer.toJSON());}

test('verified client invitation sends its token to the Google start endpoint',async()=>{
 requests.length=0;let destination='';Object.assign(globalThis,{window:{location:{search:`?token=${token}`,assign:(url:string)=>{destination=url;}}}});
 let renderer!:ReactTestRenderer;await act(async()=>{renderer=create(<InvitationPage/>);});
 assert.equal(requests[0].url,`/core-api/api/client-portal/invites/preview?token=${token}`);
 assert.equal(renderer.root.findAllByType('a').length,0,'Google is unavailable until the invitation is verified');
 await respond(requests[0],{organizationName:'Scale',clientName:'Acme',expiresAt:'2026-09-20T12:00:00.000Z'});
 const google=renderer.root.findAllByType('a').find(link=>link.props.href?.includes('/auth/google/start'))!;
 assert.equal(google.props.href,`/core-api/api/client-portal/auth/google/start?token=${token}`);
 assert.match(content(renderer),/cuenta de Google asociada a esta invitación/);
 const [name,password]=renderer.root.findAllByType('input');await act(async()=>{name.props.onChange({target:{value:'Ana Cliente'}});password.props.onChange({target:{value:'Una clave segura 123!'}});});
 const form=renderer.root.findByType('form');const submit=form.props.onSubmit({preventDefault(){}}) as Promise<void>;
 assert.equal(requests[1].url,'/core-api/api/client-portal/invites/accept');assert.deepEqual(JSON.parse(String(requests[1].init.body)),{token,fullName:'Ana Cliente',password:'Una clave segura 123!'});
 await act(async()=>{requests[1].resolve(new Response(JSON.stringify({})));await submit;});assert.equal(destination,'/cliente/entregas');renderer.unmount();
});

test('client invitation renders public expiry and exact terminal statuses without authorizing onboarding',async()=>{
 const mountInvitation=async(search:string)=>{requests.length=0;Object.assign(globalThis,{window:{location:{search,assign:()=>{}}}});let focused='';let renderer!:ReactTestRenderer;await act(async()=>{renderer=create(<InvitationPage/>,{createNodeMock:element=>element.props.role==='alert'?{focus(){focused='alert';}}:{}});});return {renderer,focused:()=>focused};};
 const invalid=await mountInvitation('?token=short');assert.equal(invalid.renderer.root.findByType('h1').props.children,'El enlace de invitación es inválido');assert.equal(requests.length,0);assert.equal(invalid.focused(),'alert');invalid.renderer.unmount();
 const valid=await mountInvitation(`?token=${token}`);assert.equal(requests.length,1);await respond(requests[0],{organizationName:'Scale',clientName:'Acme',expiresAt:'2026-09-20T12:00:00Z'});assert.equal(valid.renderer.root.findByType('time').props.dateTime,'2026-09-20T12:00:00.000Z');assert.match(content(valid.renderer),/hora de Asunción/);assert.equal(valid.renderer.root.findAllByType('a').some(link=>link.props.href?.includes('/auth/google/start')),true);valid.renderer.unmount();
 for(const [responseStatus,body,heading,state] of [[410,{link_status:'expired',error:'private'},'El enlace venció','expired'],[410,{link_status:'revoked',error:'private'},'El enlace fue revocado','revoked'],[410,{link_status:'used',error:'private'},'El enlace ya fue utilizado','used'],[404,{error:'private'},'Invitación no encontrada','not-found'],[410,{link_status:'unexpected',error:'private'},'Invitación no disponible','unavailable']] as const){const terminal=await mountInvitation(`?token=${token}`);await respond(requests[0],body,responseStatus);assert.equal(terminal.renderer.root.findByType('h1').props.children,heading);assert.equal(terminal.renderer.root.findAllByProps({'data-state':state}).length,1);assert.equal(terminal.renderer.root.findAllByType('a').length,0);assert(!content(terminal.renderer).includes('private'));assert.equal(terminal.focused(),'alert');terminal.renderer.unmount();}
});

test('delivery details use the audited download endpoint and keep review interactions',async()=>{
 requests.length=0;Object.assign(globalThis,{window:{location:{assign:()=>{}}}});
 let renderer!:ReactTestRenderer;await act(async()=>{renderer=create(<DeliveryPage/>);});
 assert.equal(requests[0].url,'/core-api/api/client-portal/deliveries/42');
 assert.equal(requests[1].url,'/core-api/api/client-portal/deliveries/42/activity');
 await respond(requests[0],detail);await respond(requests[1],{activity:[]});
 const download=renderer.root.findAllByType('a').find(link=>link.props.href?.endsWith('/download'))!;
 assert.equal(download.props.href,'/core-api/api/client-portal/deliveries/42/download');assert.equal(download.props.target,'_blank');assert.equal(download.props.rel,'noopener noreferrer');assert.equal(download.props.referrerPolicy,'no-referrer');assert.equal(download.props['aria-label'],'Abrir Propuesta final.pdf en una pestaña nueva');
 assert.doesNotMatch(content(renderer),/asset_url/);assert(renderer.root.findAllByType('textarea').length===2);assert(renderer.root.findAllByType('button').some(button=>button.children.includes('Aprobar entrega')));assert(renderer.root.findAllByType('button').some(button=>button.children.includes('Pedir cambios')));assert.match(content(renderer),/Todo claro/);
 assert.match(content(renderer),/Todavía no hay actividad registrada/,'empty activity log renders an empty state');
 const visibleLink=renderer.root.findAllByType('a').find(link=>link.props.href==='https://drive.google.com/propuesta')!;
 assert.equal(visibleLink.props.target,'_blank');assert.equal(visibleLink.props.referrerPolicy,'no-referrer');assert.match(content(renderer),/Archivos de esta entrega/);renderer.unmount();
});

test('delivery activity renders chronological entries with kinds and versions',async()=>{
 requests.length=0;Object.assign(globalThis,{window:{location:{assign:()=>{}}}});
 let renderer!:ReactTestRenderer;await act(async()=>{renderer=create(<DeliveryPage/>);});
 await respond(requests[0],detail);
 await respond(requests[1],{activity:[
  {kind:'comment',at:'2026-09-12T12:00:00.000Z',version:null,actor_name:'Ana',summary:'Falta el cierre del video'},
  {kind:'download',at:'2026-09-13T12:00:00.000Z',version:null,actor_name:'Ana',summary:'Descargó el entregable'},
  {kind:'decision',at:'2026-09-13T13:00:00.000Z',version:3,actor_name:'Ana',summary:'Aprobó la entrega'},
  {kind:'version',at:'2026-09-13T13:05:00.000Z',version:3,actor_name:null,summary:'Nueva versión publicada'},
 ]});
 const text=content(renderer);
 assert.match(text,/Actividad de la entrega/);
 assert.match(text,/Comentario/);assert.match(text,/Descarga/);assert.match(text,/Decisión/);assert.match(text,/Nueva versión/);
 assert.match(text,/versión 3/);assert.match(text,/Aprobó la entrega/);assert.match(text,/Falta el cierre del video/);
 const textOf=(node:unknown):string=>typeof node==='string'?node:Array.isArray(node)?node.map(textOf).join(''):node&&typeof node==='object'&&'children'in(node as object)?textOf((node as {children:unknown}).children):'';
 const list=renderer.root.findAllByType('li').map(node=>textOf(node.children));
 assert.ok(list.findIndex(entry=>entry.includes('Comentario'))<list.findIndex(entry=>entry.includes('Descarga')),'entries render in server order');
 renderer.unmount();
});

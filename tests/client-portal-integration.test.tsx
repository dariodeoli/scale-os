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
const detail={delivery:{id:42,title:'Identidad visual',summary:'Revisá la pieza final.',asset_name:'Propuesta final.pdf',version:3,project_name:'Lanzamiento',client_name:'Acme'},comments:[{id:1,body:'Todo claro',created_at:'2026-09-13T12:00:00.000Z',author_name:'Ana'}],decision:null};

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

test('delivery details use the audited download endpoint and keep review interactions',async()=>{
 requests.length=0;Object.assign(globalThis,{window:{location:{assign:()=>{}}}});
 let renderer!:ReactTestRenderer;await act(async()=>{renderer=create(<DeliveryPage/>);});
 assert.equal(requests[0].url,'/core-api/api/client-portal/deliveries/42');
 await respond(requests[0],detail);
 const download=renderer.root.findAllByType('a').find(link=>link.props.href?.endsWith('/download'))!;
 assert.equal(download.props.href,'/core-api/api/client-portal/deliveries/42/download');assert.equal(download.props.target,'_blank');assert.equal(download.props.rel,'noopener noreferrer');assert.equal(download.props.referrerPolicy,'no-referrer');assert.equal(download.props['aria-label'],'Abrir Propuesta final.pdf en una pestaña nueva');
 assert.doesNotMatch(content(renderer),/asset_url/);assert(renderer.root.findAllByType('textarea').length===2);assert(renderer.root.findAllByType('button').some(button=>button.children.includes('Aprobar entrega')));assert(renderer.root.findAllByType('button').some(button=>button.children.includes('Pedir cambios')));assert.match(content(renderer),/Todo claro/);renderer.unmount();
});

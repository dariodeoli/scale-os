import React from 'react';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {act,create,type ReactTestRenderer,type ReactTestInstance} from 'react-test-renderer';
Object.assign(globalThis,{React});require.extensions['.css']=()=>{};
const dialogId=require.resolve('../app/dialog');require.cache[dialogId]={id:dialogId,filename:dialogId,loaded:true,exports:{FormActions:({children}:{children:React.ReactNode})=><div>{children}</div>,ConfirmDialog:()=>null,Dialog:({children}:{children:React.ReactNode})=><section role="dialog">{children}</section>,useDialogClose:()=>undefined,useDialogPending:()=>{},useOverlay:()=>({requestClose:()=>{}})}} as NodeModule;
const {PublicClientIntake}=require('../app/public-client-intake') as typeof import('../app/public-client-intake');
const {rucApplyValues}=require('../app/client-ruc') as typeof import('../app/client-ruc');
const {clientFields}=require('../app/client-editor-data') as typeof import('../app/client-editor-data');
const {ClientIntakeDialog}=require('../app/client-intake') as typeof import('../app/client-intake');
const calls:{url:string;options:RequestInit;payload:Record<string,unknown>|null}[]=[];
let reply:(url:string,options:RequestInit)=>Response=()=>new Response(JSON.stringify({scope:'basic',expires_at:'2026-10-25'}));
globalThis.fetch=(async(input:RequestInfo|URL,options:RequestInit={})=>{calls.push({url:String(input),options,payload:options.body?JSON.parse(String(options.body)):null});return reply(String(input),options);}) as typeof fetch;
const settle=async()=>{await act(async()=>{await new Promise(resolve=>setTimeout(resolve,0));});};
const text=(node:ReactTestInstance|string):string=>typeof node==='string'?node:node.children.map(text).join('');
async function mount(scope='basic'){
 calls.length=0;reply=(_,options)=>new Response(JSON.stringify(options.method==='POST'?{received:true}:{scope,expires_at:'2026-10-25'}));let render!:ReactTestRenderer;await act(async()=>{render=create(<PublicClientIntake token={'x'.repeat(43)}/>);});await settle();return render;
}
const input=(render:ReactTestRenderer,name:string)=>render.root.findAll(node=>node.props['data-field']===name)[0]?.findAllByType('input').find(node=>node.props.type!=='hidden');
const change=async(render:ReactTestRenderer,name:string,value:string)=>{await act(async()=>{input(render,name)!.props.onChange({target:{name,value},type:'change'});});};
async function submit(render:ReactTestRenderer){await act(async()=>{await render.root.findByType('form').props.onSubmit({preventDefault(){},stopPropagation(){}});});await settle();}
test('335 fiscal identity starts with RUC and broad notes; contract reuses existing RUC explicitly',()=>{
 assert.equal(rucApplyValues({name:'APELLIDO, NOMBRE S.A.',tax_id:'80168807-8',source:'owndata:dnit_official_snapshot',tax_state:'',publication_date:'2026-10-01'}).legal_name,'APELLIDO, NOMBRE S.A.');
 const fields=clientFields({mode:'create'});assert.equal(fields[0].key,'tax_id');assert.equal(fields[1].key,'legal_name');assert.equal(fields.find(field=>field.key==='notes')?.span,12);
 const document=fields.find(field=>field.key==='document_number')!;assert.equal(document.valueFrom?.({document_type:'ruc',tax_id:'80168807-8',document_number:''}),'80168807-8');assert.equal(document.valueFrom?.({document_type:'ruc',tax_id:'80168807-8',document_number:'manual'}),undefined);
});
test('335 public basic form validates authorization, sends only scoped fields without credentials and ends in review',async()=>{
 const render=await mount();assert.equal(calls[0].options.credentials,'omit');assert.equal(input(render,'legal_representative_document'),undefined);assert.match(text(render.root),/Teléfono/);
 await change(render,'name','Persona fixture');await change(render,'email','persona@example.invalid');await submit(render);assert.equal(calls.filter(call=>call.options.method==='POST').length,0);
 await act(async()=>{input(render,'consent')!.props.onChange({target:{name:'consent',checked:true,type:'checkbox'},type:'change'});});await submit(render);
 const post=calls.find(call=>call.options.method==='POST');assert(post);assert.equal(post.options.credentials,'omit');assert.equal(post.payload?.consent,true);assert.equal(post.payload?.name,'Persona fixture');assert.equal(post.payload?.legal_representative_same_as_client,undefined);assert.match(text(render.root),/Recibimos tus datos para revisión/);assert.equal(render.root.findAllByType('form').length,0);act(()=>render.unmount());
});
test('335 contract form includes legal identity and unavailable tokens never show a writable form',async()=>{
 let render=await mount('contract');assert(input(render,'legal_representative_document'));assert(input(render,'document_number'));act(()=>render.unmount());
 reply=()=>new Response(JSON.stringify({error:'Enlace vencido o no disponible'}),{status:404});await act(async()=>{render=create(<PublicClientIntake token={'y'.repeat(43)}/>);});await settle();assert.equal(render.root.findAllByType('form').length,0);assert.match(text(render.root),/vencido/);act(()=>render.unmount());
});
test('335 authenticated manager lists scoped links and received submissions; revocation uses canonical API',async()=>{
 calls.length=0;reply=url=>new Response(JSON.stringify(url.includes('submissions')?{submissions:[{id:'5',payload:{name:'Persona enviada'},status:'pending',scope:'basic',intended_client_id:'4'}]}:{links:[{id:'7',scope:'basic',expires_at:'2099-01-01',revoked_at:null,consumed_at:null}]}));let render!:ReactTestRenderer;
 await act(async()=>{render=create(<ClientIntakeDialog clientId="4" close={()=>{}}/>);});await settle();assert(calls.every(call=>call.url.includes('client_id=4')));assert.match(text(render.root),/Persona enviada/);
 const revoke=render.root.findAllByType('button').find(button=>text(button).includes('Revocar enlace #7'))!;await act(async()=>{await revoke.props.onClick();});assert(calls.some(call=>call.url.endsWith('/7')&&call.options.method==='DELETE'));act(()=>render.unmount());
});

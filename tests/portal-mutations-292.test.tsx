import React from 'react';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {act,create,type ReactTestRenderer} from 'react-test-renderer';
require.extensions['.css']=()=>{};
Object.assign(globalThis,{React});
function mock(path:string,exports:unknown){const id=require.resolve(path);require.cache[id]={id,filename:id,loaded:true,exports} as NodeModule;}
mock('next/link',{__esModule:true,default:({children,...props}:React.AnchorHTMLAttributes<HTMLAnchorElement>)=><a {...props}>{children}</a>});
mock('next/navigation',{useParams:()=>({id:'42'})});
const Page=require('../app/cliente/entregas/[id]/page').default as React.ComponentType;
const detail={delivery:{id:42,title:'Entrega QA',summary:'',asset_name:'QA.pdf',version:1,project_name:'Proyecto QA',client_name:'Cliente QA'},links:[],comments:[],decision:null};
test('portal shares an immediate submission lock across comments and review decisions, retaining retry text',async()=>{
 const writes:{body:Record<string,string>;resolve:(response:Response)=>void}[]=[];
 let destination='';Object.assign(globalThis,{window:{location:{assign:(url:string)=>{destination=url;}}}});
 globalThis.fetch=async(input,init={})=>{
  if(init.body)return new Promise<Response>(resolve=>writes.push({body:JSON.parse(String(init.body)),resolve}));
  return new Response(JSON.stringify(String(input).endsWith('/activity')?{activity:[]}:detail));
 };
 let renderer!:ReactTestRenderer;await act(async()=>{renderer=create(<Page/>);});
 await act(async()=>{renderer.root.findAllByType('textarea')[1].props.onChange({target:{value:'Comentario que se conserva'}});});
 const form=renderer.root.findByType('form'),buttons=()=>renderer.root.findAllByType('button');
 let first!:Promise<void>;
 act(()=>{first=form.props.onSubmit({preventDefault(){}});void form.props.onSubmit({preventDefault(){}});void buttons().find(button=>button.children.includes('Aprobar entrega'))!.props.onClick();});
 assert.equal(writes.length,1,'one POST even before React re-renders pending');assert.deepEqual(writes[0].body,{body:'Comentario que se conserva'});
 await act(async()=>{writes[0].resolve(new Response(JSON.stringify({error:'Error controlado'}),{status:503}));await first;});
 assert.equal(renderer.root.findAllByType('textarea')[1].props.value,'Comentario que se conserva');
 assert.match(JSON.stringify(renderer.toJSON()),/Error controlado/);
 await act(async()=>{renderer.root.findAllByType('textarea')[0].props.onChange({target:{value:'Revisión QA'}});});
 act(()=>{void buttons().find(button=>button.children.includes('Pedir cambios'))!.props.onClick();void buttons().find(button=>button.children.includes('Aprobar entrega'))!.props.onClick();void form.props.onSubmit({preventDefault(){}});});
 assert.equal(writes.length,2);assert.deepEqual(writes[1].body,{decision:'changes_requested',comment:'Revisión QA'});
 await act(async()=>{writes[1].resolve(new Response(JSON.stringify({ok:true})));});
 assert.equal(destination,'/cliente/entregas');renderer.unmount();
});

test('logout failure stays in the portal and supports a single successful retry',async()=>{
 const List=require('../app/cliente/entregas/page').default as React.ComponentType;
 const writes:{resolve:(response:Response)=>void}[]=[];let destination='';
 Object.assign(globalThis,{window:{location:{assign:(url:string)=>{destination=url;}}}});
 globalThis.fetch=async(input,init={})=>{
  if(init.body)return new Promise<Response>(resolve=>writes.push({resolve}));
  return new Response(JSON.stringify(String(input).endsWith('/me')?{user:{fullName:'Persona QA'}}:{deliveries:[detail.delivery]}));
 };
 let renderer!:ReactTestRenderer;await act(async()=>{renderer=create(<List/>);});
 const logout=()=>renderer.root.findByType('button').props.onClick();
 act(()=>{logout();logout();});assert.equal(writes.length,1);
 await act(async()=>{writes[0].resolve(new Response(JSON.stringify({error:'No se pudo cerrar sesión'}),{status:503}));});
 assert.equal(destination,'');assert.match(JSON.stringify(renderer.toJSON()),/No se pudo cerrar sesión/);
 act(()=>{logout();});assert.equal(writes.length,2);await act(async()=>{writes[1].resolve(new Response('{}'));});
 assert.equal(destination,'/cliente/ingresar');renderer.unmount();
});

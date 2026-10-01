import React from 'react';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import {act,create,type ReactTestInstance,type ReactTestRenderer} from 'react-test-renderer';
import {MENSAJE_RUC} from 'owncoding-ui';

// Alta manual de clientes (#129): «Guardar y crear otro» con el formulario
// limpio para la carga en serie, RUC/razón social manuales con las mismas
// reglas que el modo RUC y los errores visibles sin cerrar el diálogo.
Object.assign(globalThis,{React});
require.extensions['.css']=()=>{};
const dialogPath=require.resolve('../app/dialog');
require.cache[dialogPath]={id:dialogPath,filename:dialogPath,loaded:true,exports:{
 FormActions:({children}:{children:React.ReactNode})=><div>{children}</div>,
 useDialogClose:()=>undefined,
 useDialogPending:()=>undefined,
}} as NodeModule;
const {ClientForm}=require('../app/workspace-forms') as typeof import('../app/workspace-forms');
const text=(node:ReactTestInstance|string):string=>typeof node==='string'?node:node.children.map(text).join('');

type Call={path:string;method:string;payload:Record<string,unknown>};
type Saved={id:string;name:string;email:string|null;phone:string|null;active:boolean};
const saved=(payload:Record<string,unknown>,index:number):Saved=>({id:String(index),name:String(payload.name||''),email:String(payload.email||'')||null,phone:String(payload.phone||'')||null,active:true});

async function mount(options:{failOnRuc?:boolean}={}){
 const calls:Call[]=[];const dones:(Saved&{keepOpen?:boolean})[]=[];
 async function request<T>(path:string,init?:RequestInit):Promise<T>{
  const payload=JSON.parse(String(init?.body||'{}')) as Record<string,unknown>;
  if(options.failOnRuc&&String(payload.tax_id||'').length)throw new Error('Ya existe un cliente con este RUC en tu empresa. Buscalo antes de crear otro.');
  calls.push({path,method:String(init?.method||'POST'),payload});
  return {client:saved(payload,calls.length)} as T;
 }
 let renderer!:ReactTestRenderer;
 await act(async()=>{renderer=create(<ClientForm request={request} done={(client,keepOpen)=>dones.push({...client,keepOpen})}/>);});
 const input=(name:string)=>renderer.root.findAll(node=>node.type==='input'&&node.props.name===name)[0];
 const change=(name:string,value:string)=>act(async()=>{input(name).props.onChange({target:{name,value}});});
 const button=(label:string)=>renderer.root.findAllByType('button').find(candidate=>text(candidate).includes(label))!;
 const submit=async()=>{await act(async()=>{await (renderer.root.findByType('form').props.onSubmit({preventDefault(){}}) as Promise<void>);});};
 return {renderer,input,change,button,submit,calls,dones};
}

test('guardar y crear otro: guarda, limpia el formulario y no cierra el diálogo',async()=>{
 const {renderer,change,button,calls,dones}=await mount();
 await change('name','Cliente Serie');
 await change('tax_id','80.168.807-8');
 await change('legal_name','Cliente Serie S.A.');
 await act(async()=>{await (button('Guardar y crear otro').props.onClick() as Promise<void>);});
 assert.equal(calls.length,1,'un solo POST por cada guardado');
 assert.equal(calls[0].path,'/api/agency/clients');
 assert.equal(calls[0].method,'POST');
 assert.deepEqual(calls[0].payload,{name:'Cliente Serie',email:'',phone:'',tax_id:'80168807-8',legal_name:'Cliente Serie S.A.'});
 assert.deepEqual(dones,[],'el diálogo no se cierra');
 assert.match(text(renderer.root),/Cliente «Cliente Serie» creado\. Podés cargar el siguiente\./);
 // El siguiente guardado no arrastra nada del anterior (formulario limpio).
 await change('name','Cliente Dos');
 await act(async()=>{await (button('Guardar y crear otro').props.onClick() as Promise<void>);});
 assert.deepEqual(calls[1].payload,{name:'Cliente Dos',email:'',phone:'',tax_id:'',legal_name:''});
 assert.equal(dones.length,0);
 act(()=>renderer.unmount());
});

test('crear cliente: el guardado simple conserva el alta y cierra',async()=>{
 const {renderer,change,submit,calls,dones}=await mount();
 await change('name','Cliente Único');
 await submit();
 assert.equal(calls.length,1);
 assert.deepEqual(dones,[{id:'1',name:'Cliente Único',email:null,phone:null,active:true,keepOpen:undefined}]);
 act(()=>renderer.unmount());
});

test('RUC manual: misma regla que el modo RUC y error visible sin escribir',async()=>{
 const {renderer,change,submit,calls}=await mount();
 await change('name','Con RUC inválido');
 await change('tax_id','ABC');
 await submit();
 assert.equal(calls.length,0,'un RUC inválido no viaja al API');
 assert.ok(text(renderer.root).includes(MENSAJE_RUC),'se explica la regla del RUC');
 act(()=>renderer.unmount());
});

test('RUC manual: el rechazo del API queda inline y no cierra el diálogo',async()=>{
 const {renderer,change,button,calls,dones}=await mount({failOnRuc:true});
 await change('name','Cliente duplicado');
 await change('tax_id','80168807-8');
 await act(async()=>{await (button('Guardar y crear otro').props.onClick() as Promise<void>);});
 assert.equal(calls.length,0);
 assert.match(text(renderer.root),/Ya existe un cliente con este RUC/);
 assert.equal(button('Crear cliente').props.disabled,false,'se puede corregir y reintentar');
 assert.deepEqual(dones,[]);
 act(()=>renderer.unmount());
});

test('límites del alta manual: RUC 14 y razón social 160 como en el modo RUC',async()=>{
 const {renderer,input}=await mount();
 assert.equal(input('tax_id').props.maxLength,14);
 assert.equal(input('legal_name').props.maxLength,160);
 assert.equal(input('tax_id').props.autoCapitalize,'characters');
 assert.equal(input('name').props.maxLength,undefined,'el largo lo gobierna el schema (120)');
 act(()=>renderer.unmount());
});

test('el shell mantiene el diálogo abierto al crear en serie',()=>{
 const workspace=readFileSync(new URL('../app/scale-workspace.tsx',import.meta.url),'utf8');
 assert.match(workspace,/done=\{\(client, keepOpen\) => \{/);
 assert.match(workspace,/if \(!keepOpen\) close\(\);/);
});

import React from 'react';
import assert from 'node:assert/strict';
import test from 'node:test';
import {act,create,type ReactTestRenderer} from 'react-test-renderer';
Object.assign(globalThis,{React});
require.extensions['.css']=()=>{};
const {Editor,ApiFieldError}=require('../app/operations') as typeof import('../app/operations');
const {useSingleFlightSubmit}=require('../app/use-single-flight-submit') as typeof import('../app/use-single-flight-submit');
const event=()=>({preventDefault(){},persist(){}});
const submit=(r:ReactTestRenderer)=>r.root.findByType('form').props.onSubmit(event());
const change=async(r:ReactTestRenderer,key:string,value:string)=>act(async()=>{await r.root.findAllByType('input').find(input=>input.props.name===key)!.props.onChange({target:{name:key,value,setCustomValidity(_message:string){}},type:'change'});});
const tick=()=>new Promise(resolve=>setImmediate(resolve));

test('Editor valida límites explícitos y fechas/horas civiles con rangos sin normalizar valores',async()=>{
 const writes:Record<string,string>[]=[];let r:ReactTestRenderer;
 const fields=[{key:'text',label:'Texto',maxLength:4},{key:'date',label:'Fecha',type:'date' as const,min:'2024-01-01',max:'2024-12-31'},{key:'time',label:'Hora',type:'time' as const,min:'08:00',max:'18:00'}];
 await act(async()=>{r=create(<Editor fields={fields} defaults={{text:'cinco',date:'2024-02-30',time:'24:00'}} save={async values=>{writes.push(values);}}/>);});
 await act(async()=>{await submit(r!);});assert.equal(writes.length,0);
 assert.equal(r!.root.findAllByProps({role:'alert'}).filter(node=>node.type==='small').length,3);
 await change(r!,'text','bien');await change(r!,'date','2024-02-29');await change(r!,'time','08:00');
 await act(async()=>{await submit(r!);});assert.deepEqual(writes[0],{text:'bien',date:'2024-02-29',time:'08:00'});
 for(const [key,value] of [['date','2023-12-31'],['date','2025-01-01'],['date','2023-02-29'],['time','07:59'],['time','18:01'],['time','12:00:01']]){
  await change(r!,key,value);await act(async()=>{await submit(r!);});assert.equal(writes.length,1,`${key} ${value} no se guarda`);
  await change(r!,key,key==='date'?'2024-12-31':'18:00');
 }
 await act(async()=>r!.unmount());
});

test('Errores explícitos del servidor conservan mensaje general y campo hasta editar ese campo',async()=>{
 let r:ReactTestRenderer,calls=0;const writes:Record<string,string>[]=[];
 await act(async()=>{r=create(<Editor fields={[{key:'name',label:'Nombre'},{key:'notes',label:'Notas',optional:true}]} defaults={{name:'Ana',notes:''}} save={async values=>{calls++;if(calls===1)throw new ApiFieldError('Revisá el formulario',{name:'Ese nombre no está disponible',unknown:'No mostrar',notes:['No interpretar arrays']});writes.push(values);}}/>);});
 await act(async()=>{await submit(r!);});
 assert.match(JSON.stringify(r!.toJSON()),/Revisá el formulario/);assert.match(JSON.stringify(r!.toJSON()),/Ese nombre no está disponible/);assert.doesNotMatch(JSON.stringify(r!.toJSON()),/No mostrar|No interpretar arrays/);
 await change(r!,'notes','Otro dato');await act(async()=>{await submit(r!);});assert.equal(calls,1,'cambiar otro campo no borra error del servidor');
 await change(r!,'name','Ana editada');await act(async()=>{await submit(r!);});assert.equal(writes.length,1);assert.equal(writes[0].name,'Ana editada');
 await act(async()=>r!.unmount());
});

test('Lookup conserva destinos editados y cancela RUC modificado; respuesta vieja no alcanza otro borrador',async()=>{
 let r:ReactTestRenderer,resolve:(values:Record<string,string>)=>void=()=>{},signal:AbortSignal|undefined,applied=0;
 const writes:Record<string,string>[]=[];
 const fields=[{key:'tax',label:'RUC',lookup:{label:'Buscar',onApplied:()=>{applied++;},run:async(_value:string,context?:{signal:AbortSignal})=>{signal=context?.signal;return new Promise<Record<string,string>>(done=>{resolve=done;});}}},{key:'legal',label:'Razón social'}];
 await act(async()=>{r=create(<Editor fields={fields} defaults={{tax:'80012345',legal:'Manual'}} save={async values=>{writes.push(values);}}/>);});
 const lookup=()=>r!.root.findAllByType('button').find(button=>React.Children.toArray(button.props.children).join('')==='Buscar')!.props.onClick();
 await act(async()=>{lookup();await tick();});await change(r!,'legal','Editado mientras buscaba');
 await act(async()=>{resolve({tax:'80012345-6',legal:'Proveedor'});await tick();});
 await act(async()=>{await submit(r!);});assert.equal(applied,0);assert.deepEqual(writes[0],{tax:'80012345',legal:'Editado mientras buscaba'});
 await act(async()=>{lookup();await tick();});await change(r!,'tax','90012345');assert.equal(signal!.aborted,true);
 await act(async()=>{resolve({tax:'80012345-6',legal:'Viejo'});await tick();});
 await act(async()=>{await submit(r!);});assert.equal(writes.at(-1)!.tax,'90012345');assert.equal(applied,0);
 await act(async()=>{lookup();await tick();});await act(async()=>{await submit(r!);});assert.equal(signal!.aborted,true,'guardar invalida consulta del borrador previo');
 await act(async()=>{resolve({tax:'90012345-6',legal:'Posterior al guardado'});await tick();});assert.equal(applied,0);
 await act(async()=>{lookup();await tick();});await act(async()=>r!.unmount());assert.equal(signal!.aborted,true);
 await act(async()=>{resolve({legal:'Desmontado'});await tick();});
});

test('Single flight previene submit nativo también en intento duplicado y libera al terminar',async()=>{
 let r:ReactTestRenderer,release:()=>void=()=>{},calls=0,prevented=0;
 function Form(){const submission=useSingleFlightSubmit(async()=>{calls++;await new Promise<void>(resolve=>{release=resolve;});});return <form onSubmit={submission.onSubmit}/>;}
 await act(async()=>{r=create(<Form/>);});
 const event={preventDefault(){prevented++;}};let first:Promise<void>;
 await act(async()=>{first=r!.root.findByType('form').props.onSubmit(event);await r!.root.findByType('form').props.onSubmit(event);});
 assert.equal(calls,1);assert.equal(prevented,2);
 await act(async()=>{release();await first!;});
 await act(async()=>{first=r!.root.findByType('form').props.onSubmit(event);});assert.equal(calls,2);
 await act(async()=>{release();await first!;r!.unmount();});
});

test('api conserva únicamente errores explícitos de campo y no deduce campos del mensaje',async()=>{
 const {api}=require('../app/operations') as typeof import('../app/operations');
 const original=globalThis.fetch;
 try{
  globalThis.fetch=(async()=>new Response(JSON.stringify({error:'Nombre inválido',fieldErrors:{name:'Elegí otro nombre',amount:17,notes:['No'],nested:{error:'No'}}}),{status:400})) as typeof fetch;
  await assert.rejects(api('/api/agency/test',{name:'Ana'}),error=>{assert(error instanceof ApiFieldError);assert.equal(error.message,'Nombre inválido');assert.deepEqual(error.fieldErrors,{name:'Elegí otro nombre'});return true;});
  globalThis.fetch=(async()=>new Response(JSON.stringify({error:'Nombre inválido'}),{status:400})) as typeof fetch;
  await assert.rejects(api('/api/agency/test',{name:'Ana'}),error=>{assert(error instanceof ApiFieldError);assert.deepEqual(error.fieldErrors,{});return true;});
 }finally{globalThis.fetch=original;}
});

test('Editor bloquea contraseña y control revelar mientras guarda, conserva borrador tras fallo',async()=>{
 let r:ReactTestRenderer,reject:(error:Error)=>void=()=>{};let result:Promise<void>;
 await act(async()=>{r=create(<Editor fields={[{key:'password',label:'Nueva contraseña',type:'password'}]} defaults={{password:'Clave sintética de prueba'}} save={async()=>new Promise((_resolve,fail)=>{reject=fail;})}/>);});
 await act(async()=>{result=submit(r!);await tick();});
 assert.equal(r!.root.findByType('input').props.disabled,true);
 assert.equal(r!.root.findAllByType('button').find(button=>button.props.className==='password-visibility')!.props.disabled,true);
 await act(async()=>{reject(new Error('Error recuperable'));await result!;});
 assert.equal(r!.root.findByType('input').props.disabled,false);assert.equal(r!.root.findByType('input').props.value,'Clave sintética de prueba');
 await act(async()=>r!.unmount());
});

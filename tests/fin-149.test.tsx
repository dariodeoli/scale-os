import React from 'react';
import assert from 'node:assert/strict';
import {act,create,type ReactTestRenderer} from 'react-test-renderer';

Object.assign(globalThis,{React});
require.extensions['.css']=()=>{};
const events=new EventTarget();Object.defineProperty(globalThis,'window',{configurable:true,value:events});
Object.defineProperty(globalThis,'document',{configurable:true,value:{activeElement:null,body:{style:{overflow:''}},addEventListener(){},removeEventListener(){}}});

const {EntityPicker}=require('../app/entity-picker') as typeof import('../app/entity-picker');
const {InvoiceForm,PaymentForm,AccountForm}=require('../app/workspace-forms') as typeof import('../app/workspace-forms');
const {AmountInput}=require('../app/profile-controls') as typeof import('../app/profile-controls');
const {dateLabel}=require('../app/forecast-data') as typeof import('../app/forecast-data');
const {listMonthLabel}=require('../app/month-format') as typeof import('../app/month-format');
const {MoraSection}=require('../app/sections/mora') as typeof import('../app/sections/mora');

const request=async()=>{throw new Error('sin transporte')};
const textOf=(renderer:ReactTestRenderer)=>JSON.stringify(renderer.toJSON());
const labelOf=(children:unknown)=>Array.isArray(children)?children.map(value=>typeof value==='string'||typeof value==='number'?String(value):'').join(''):String(children);
const button=(renderer:ReactTestRenderer,label:string)=>renderer.root.findAllByType('button').find(node=>labelOf(node.props.children).includes(label));

/** #149: los pickers largos de Finanzas usan buscador y muestran contexto. */
async function pickersEscalan(){
 const options=Array.from({length:25},(_,index)=>({id:String(index),name:`Cliente ${index}`,secondary:`RUC ${index}`,context:`PYG ${index}.000`}));
 let renderer:ReactTestRenderer;
 await act(async()=>{renderer=create(<EntityPicker legend="Cliente" options={options} value="" onChange={()=>{}}/>);});
 const inputs=renderer!.root.findAllByType('input');
 assert.equal(inputs.length,1,'con 25 opciones aparece el buscador');
 assert.match(textOf(renderer!),/Cliente 2/,'el listado completo se dibuja al abrir');
 await act(async()=>{inputs[0].props.onChange({target:{value:'Cliente 1'}});});
 const after=textOf(renderer!);
 assert.match(after,/Cliente 1/,'la búsqueda conserva la coincidencia');
 assert.doesNotMatch(after,/Cliente 2/,'la búsqueda descarta el resto');
 assert.match(after,/RUC 1/,'cada opción conserva su contexto');
 await act(async()=>{renderer!.unmount();});
 console.log('PASS #149 picker: buscador con 25 opciones y contexto por fila');
}

/** #149: «Crear factura» y «Registrar cobro» bloquean hasta completar obligatorios. */
async function formulariosBloquean(){
 const clients=Array.from({length:8},(_,index)=>({id:`c${index}`,name:`Cliente ${index}`,email:null,phone:null,active:true,logo_url:null}));
 const invoices=[{id:'i1',number:'F-001',client_id:'c0',client_name:'Cliente 0',status:'issued',currency:'PYG' as const,total:'5000000',paid_amount:'0',due_on:'2026-10-20'}];
 const accounts=[{id:'a1',name:'Caja',account_type:'cash' as const,currency:'PYG' as const,balance:'0',active:true,institution:null,account_number:null,holder_name:null,custodian_user_id:null}];
 const custodians=[{id:'u1',email:'persona-7-0@demo.example.invalid',role:'admin',created_at:'2026-01-01',full_name:'Lucía Acosta',photo_url:null}];
 let renderer:ReactTestRenderer;

 await act(async()=>{renderer=create(<InvoiceForm clients={clients} request={request} done={()=>{}}/>);});
 assert.equal(button(renderer!,'Crear factura')!.props.disabled,true,'sin cliente ni importe no se puede crear');
 await act(async()=>{renderer!.root.findByType(EntityPicker).props.onChange('c0');});
 assert.equal(button(renderer!,'Crear factura')!.props.disabled,true,'sin importe sigue bloqueado');
 await act(async()=>{renderer!.root.findByType(AmountInput).props.onChange('0');});
 assert.equal(button(renderer!,'Crear factura')!.props.disabled,true,'importe cero queda bloqueado');
 assert.match(textOf(renderer!),/El importe debe ser mayor a cero/,'error inline con importe inválido');
 await act(async()=>{renderer!.root.findByType(AmountInput).props.onChange('5000000');});
 assert.equal(button(renderer!,'Crear factura')!.props.disabled,false,'cliente e importe positivos habilitan');
 await act(async()=>{renderer!.unmount();});

 await act(async()=>{renderer=create(<PaymentForm invoices={invoices} accounts={accounts} custodians={custodians} request={request} done={()=>{}}/>);});
 assert.match(textOf(renderer!),/Lucía Acosta/,'el custodio demo muestra su nombre');
 assert.doesNotMatch(textOf(renderer!),/demo\.example\.invalid/,'nunca se muestra el correo técnico del demo');
 assert.equal(button(renderer!,'Registrar cobro')!.props.disabled,true,'sin factura, cuenta ni importe no se puede cobrar');
 const invoicePicker=()=>renderer!.root.findAllByType(EntityPicker).find(node=>node.props.legend==='Factura')!;
 await act(async()=>{invoicePicker().props.onChange('i1');});
 assert.equal(button(renderer!,'Registrar cobro')!.props.disabled,true,'sin cuenta e importe sigue bloqueado');
 await act(async()=>{button(renderer!,'Caja · PYG')!.props.onClick();});
 assert.equal(button(renderer!,'Registrar cobro')!.props.disabled,true,'sin importe sigue bloqueado');
 await act(async()=>{renderer!.root.findByType(AmountInput).props.onChange('0');});
 assert.match(textOf(renderer!),/El cobro debe ser mayor a cero/,'error inline con importe cero');
 await act(async()=>{renderer!.root.findByType(AmountInput).props.onChange('150000');});
 assert.equal(button(renderer!,'Registrar cobro')!.props.disabled,false,'factura, cuenta e importe habilitan el cobro');
 await act(async()=>{renderer!.unmount();});

 await act(async()=>{renderer=create(<AccountForm custodians={custodians} request={request} done={()=>{}}/>);});
 assert.match(textOf(renderer!),/Lucía Acosta/,'la custodia de la cuenta muestra el nombre');
 assert.doesNotMatch(textOf(renderer!),/demo\.example\.invalid/,'la custodia no muestra el correo técnico');
 await act(async()=>{renderer!.unmount();});
 console.log('PASS #149 bloqueo: factura y cobro deshabilitados con obligatorios incompletos, errores inline, identidades demo con nombre');
}

/** #149: etiquetas de mes largas y «Sin mora» cuando no hay saldo vencido. */
async function etiquetasYEstado(){
 assert.equal(listMonthLabel('2026-10'),'Octubre 2026','el mes se etiqueta completo');
 assert.equal(dateLabel('2026-10'),'Octubre 2026','Previsión usa la etiqueta completa');
 assert.equal(dateLabel('2026-09-17'),'17-sept','las fechas diarias conservan su formato corto');
 let renderer:ReactTestRenderer;
 await act(async()=>{renderer=create(<MoraSection
  user={null}
  paymentStatuses={[{client_id:'c1',client_name:'Fundación Cultural',currency:'PYG' as const,outstanding_amount:'1500000',next_due_on:null,days_overdue:0,payment_status:'up_to_date' as const,invoice_count:1,has_invoice:true}]}
  moraFilter="" setMoraFilter={()=>{}}
  moraSearch="" setMoraSearch={()=>{}}
  moraUpdated={null}
  moraReportsError={false}
  moraDso={null}
 />);});
 const maquetado=textOf(renderer!);
 assert.match(maquetado,/Sin mora/,'un cliente sin saldo vencido se rotula «Sin mora»');
 assert.doesNotMatch(maquetado,/Al día/,'«Al día» ya no se usa con saldo pendiente');
 await act(async()=>{renderer!.unmount();});
 console.log('PASS #149 formatos: «Octubre 2026» en meses y «Sin mora» en cobranza');
}

async function run(){
 await pickersEscalan();
 await formulariosBloquean();
 await etiquetasYEstado();
}
void run();

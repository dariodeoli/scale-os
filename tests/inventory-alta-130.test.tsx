import React from 'react';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {act,create,type ReactTestInstance,type ReactTestRenderer} from 'react-test-renderer';
import type {InventoryItem,StorageTemplate} from '../app/inventory-workspace';

// Alta manual de equipos (#130): divulgación progresiva (básico + «Más datos»),
// cantidad al crear con «un registro por unidad reservable», «Guardar y agregar
// otro» con reenfoque del nombre y defaults previos, y errores junto al campo.
// No se elimina ningún campo: compra, depreciación, custodio, adquisición,
// estado, foto y notas siguen en el formulario (dentro de «Más datos»).
Object.assign(globalThis,{React});require.extensions['.css']=()=>{};
// Dialog/editor de la app: dobles mínimos para que SaveActions/FormActions
// rendericen sin portal ni overlay real.
const dialogPath=require.resolve('../app/dialog');
require.cache[dialogPath]={id:dialogPath,filename:dialogPath,loaded:true,exports:{
 FormActions:({children}:{children:React.ReactNode})=><div>{children}</div>,
 useDialogClose:()=>undefined,
 useDialogPending:()=>undefined,
}} as NodeModule;
const writes:{path:string;body:Record<string,unknown>;method:string}[]=[];
let failAt=0;
async function mockApi(path:string,body?:unknown,method='POST'):Promise<{record:{id:string}}>{
 writes.push({path,body:(body||{}) as Record<string,unknown>,method});
 if(failAt&&writes.length>=failAt)throw new Error('Sin conexión');
 return {record:{id:String(writes.length)}};
}
const operationsPath=require.resolve('../app/operations');
require.cache[operationsPath]={id:operationsPath,filename:operationsPath,loaded:true,exports:{
 api:mockApi,money:(amount:string,currency:string)=>`${currency} ${amount}`,
 Dialog:({children}:{children:React.ReactNode})=><section role="dialog">{children}</section>,
 Editor:()=>null,
}} as NodeModule;
const {InventoryItemForm}=require('../app/inventory-workspace') as typeof import('../app/inventory-workspace');

const categories=[{id:'1',name:'Memoria',active:true},{id:'2',name:'Audio',active:true}];
const members=[{id:'11',name:'Ana'},{id:'12',name:'Bruno'}];
const templates:StorageTemplate[]=[{id:'storage-a',name:'Estante A',active:true,item_count:1}];
const baseItem:InventoryItem={id:'1',name:'Memoria SD',category:'Memoria',category_id:'1',serial_number:null,value:'500',currency:'PYG',status:'available',storage_shelf:'Estante A',storage_row:'2',custodian_user_id:null,location_type:'storage'};
const text=(node:ReactTestInstance|string):string=>typeof node==='string'?node:node.children.map(text).join('');

async function mount(item:InventoryItem|null=null){
 writes.length=0;failAt=0;
 const dones:{count?:number;keepOpen?:boolean}[]=[];
 let renderer!:ReactTestRenderer;
 await act(async()=>{renderer=create(<InventoryItemForm item={item} categories={categories} members={members} storageTemplates={templates} canManageStorage={false} createStorageTemplate={async name=>({id:'new',name,active:true,item_count:0})} done={(count,keepOpen)=>dones.push({count,keepOpen})}/>);});
 const labelNode=(value:string)=>renderer.root.findAllByType('label').find(node=>text(node).includes(value));
 const control=(value:string,tag:'input'|'textarea'='input')=>{
  const label=labelNode(value);if(!label)throw new Error(`sin campo ${value}`);
  const htmlFor=label.props.htmlFor;
  if(htmlFor){const found=renderer.root.findAll(node=>node.props?.id===htmlFor&&typeof node.type==='string');if(found.length)return found[0];}
  return label.findAllByType(tag)[0];
 };
 const change=(label:string,value:string)=>act(()=>{const node=control(label);node.props.onChange({target:{value,currentTarget:{value,selectionStart:String(value).length}}});});
 const select=(label:string,value:string)=>act(()=>{renderer.root.findAll(node=>node.props?.label===label&&typeof node.props?.onChange==='function')[0].props.onChange(value);});
 const money=(id:string,value:string)=>act(()=>{renderer.root.findAll(node=>node.props?.id===id&&typeof node.props?.onValueChange==='function')[0].props.onValueChange(value);});
 const button=(label:string)=>renderer.root.findAllByType('button').find(node=>text(node).includes(label))!;
 const submit=()=>act(async()=>{await renderer.root.findByType('form').props.onSubmit({preventDefault(){}});});
 const details=()=>renderer.root.findAllByType('details')[0];
 return {renderer,labelNode,control,change,select,money,button,submit,details,dones};
}
const body=(index=-1)=>writes.at(index)!.body;

test('divulgación progresiva: básico visible y «Más datos» plegado en el alta',async()=>{
 const {renderer,details,control}=await mount(null);
 const visible=(label:string)=>assert(Boolean(text(renderer.root).includes(label)),`${label} visible`);
 for(const label of ['Nombre del equipo','Cantidad','Categoría','Serie, IMEI o identificador','Valor del equipo','Moneda','Ubicación de guardado'])visible(label);
 const advanced=details();
 assert(advanced,'hay un bloque plegable');
 assert.equal(advanced.props.open,false,'en el alta arranca plegado');
 const advancedText=text(advanced);
 for(const label of ['Foto del equipo','Valor de compra · Opcional','Método de depreciación','Estado','Custodio registrado','Fecha de adquisición','Notas'])assert(advancedText.includes(label),`${label} sigue en Más datos`);
 assert.equal(control('Cantidad').props.inputMode,'numeric');
 assert.equal(control('Cantidad').props.maxLength,2);
 act(()=>renderer.unmount());
});

test('edición con datos avanzados: «Más datos» arranca abierto y sin cantidad',async()=>{
 const item={...baseItem,photo_url:'data:image/webp;base64,AAA',purchase_value:'300',depreciation_method:'linear' as const,useful_life_months:12};
 const {renderer,details,labelNode}=await mount(item);
 assert.equal(details().props.open,true,'la ficha con datos avanzados se muestra completa');
 assert.equal(labelNode('Cantidad'),undefined,'la cantidad es solo del alta');
 act(()=>renderer.unmount());
});

test('validación junto al campo: el nombre marca su input y no llama al API',async()=>{
 const {renderer,control,submit}=await mount(null);
 await submit();
 assert.equal(writes.length,0,'no viaja nada inválido');
 const nameError=renderer.root.findAll(node=>node.props?.id==='inventory-item-name-error')[0];
 assert(nameError,'el error del nombre vive junto al campo');
 assert.equal(nameError.props.role,'alert');
 assert.equal(control('Nombre del equipo').props['aria-invalid'],true);
 act(()=>{control('Nombre del equipo').props.onChange({target:{value:'Equipo QA'}});});
 assert.doesNotMatch(text(renderer.root),/Escribí el nombre del equipo/,'el error se limpia al corregir');
 act(()=>renderer.unmount());
});

test('valor opcional: un equipo sin valor guarda con 0 (valor faltante del catálogo)',async()=>{
 const {renderer,change,money,submit}=await mount(null);
 await change('Nombre del equipo','Equipo sin valor');
 await money('inventory-item-value','');
 assert.match(text(renderer.root),/valor faltante/,'el formulario explica el 0');
 await submit();
 assert.equal(writes.length,1);
 assert.equal(body(0).value,'0');
 act(()=>renderer.unmount());
});

test('cantidad: N copias idénticas con un POST por unidad y el mismo payload',async()=>{
 const {renderer,change,submit,dones}=await mount(null);
 await change('Nombre del equipo','Trípode de respaldo');
 await change('Cantidad','3');
 await submit();
 assert.equal(writes.length,3,'una unidad por registro reservable');
 for(const write of writes){assert.equal(write.path,'/api/agency/inventory');assert.equal(write.method,'POST');assert.equal(write.body.name,'Trípode de respaldo');assert.equal(write.body.quantity,undefined);}
 assert.equal(dones.length,1,'el alta simple cierra una vez');assert.equal(dones[0].count,3,'cierra con el total creado');assert.equal(dones[0].keepOpen,undefined);
 act(()=>renderer.unmount());
});

test('serie/IMEI: la cantidad queda en 1 y deshabilitada',async()=>{
 const {renderer,change,control,submit,dones}=await mount(null);
 await change('Nombre del equipo','Cámara con serie');
 await change('Cantidad','5');
 await change('Serie, IMEI o identificador','SN-123');
 assert.equal(control('Cantidad').props.value,'1');
 assert.equal(control('Cantidad').props.disabled,true);
 assert.match(text(renderer.root),/Con serie\/IMEI se crea una unidad/);
 await submit();
 assert.equal(writes.length,1,'una serie nunca se duplica');
 assert.equal(body(0).serial_number,'SN123');
 assert.equal(dones.length,1);assert.equal(dones[0].count,1);assert.equal(dones[0].keepOpen,undefined);
 act(()=>renderer.unmount());
});

test('guardar y agregar otro: no cierra, avisa, limpia lo único y conserva los defaults previos',async()=>{
 const {renderer,change,select,money,control,button,submit,dones}=await mount(null);
 await change('Nombre del equipo','Memory Card');
 await select('Categoría','2');
 await money('inventory-item-value','450');
 await select('Ubicación','storage-a');
 await act(async()=>{await (button('Guardar y agregar otro').props.onClick() as Promise<void>);});
 assert.equal(writes.length,1);
 assert.deepEqual(dones,[],'el diálogo queda abierto');
 assert.match(text(renderer.root),/Equipo «Memory Card» creado \(1 unidad\)\./);
 assert.equal(control('Nombre del equipo').props.value,'');
 assert.equal(control('Serie, IMEI o identificador').props.value,'');
 assert.equal(renderer.root.findAll(node=>node.props?.id==='inventory-item-value')[0].props.value,'450','el valor previo se conserva');
 assert.equal(renderer.root.findAll(node=>node.props?.label==='Categoría')[0].props.value,'2');
 assert.equal(renderer.root.findAll(node=>node.props?.label==='Ubicación')[0].props.value,'storage-a');
 assert.equal(control('Cantidad').props.value,'1');
 // El siguiente guardado no arrastra el nombre anterior.
 await change('Nombre del equipo','Memory Card 2');
 await submit();
 assert.equal(writes.length,2);
 assert.equal(body(0).name,'Memory Card');
 assert.equal(body(1).name,'Memory Card 2');
 assert.equal(body(1).currency,'PYG');
 act(()=>renderer.unmount());
});

test('cantidad en serie: si una unidad falla, avisa el corte y baja la cantidad a 1',async()=>{
 const {renderer,change,control,submit,dones}=await mount(null);
 await change('Nombre del equipo','Kit de cables');
 await change('Cantidad','3');
 failAt=2;
 await submit();
 failAt=0;
 assert.equal(writes.length,2,'se corta en la unidad que falló');
 assert.deepEqual(dones,[{count:1,keepOpen:true}],'refresca sin cerrar y conserva el aviso');
 assert.match(text(renderer.root),/Se crearon 1 de 3 unidades/);
 assert.equal(control('Cantidad').props.value,'1','el reintento no duplica lo creado');
 act(()=>renderer.unmount());
});

test('el shell conserva el diálogo abierto cuando la carga sigue',()=>{
 const source=require('node:fs').readFileSync(new URL('../app/inventory-workspace.tsx',import.meta.url),'utf8');
 assert.match(source,/done=\{\(count=1,keepOpen=false\)=>\{if\(keepOpen\)\{setNotice\(''\);setRefresh/);
 assert.match(source,/title=\{editItem==='new'\?'Nuevo equipo':'Editar equipo'\}/);
});

console.log('PASS: alta de equipos #130 — básico + Más datos, cantidad por unidad reservable, guardar y agregar otro con defaults previos y errores junto al campo.');

import React from 'react';
import assert from 'node:assert/strict';
import {act,create,type ReactTestInstance,type ReactTestRenderer} from 'react-test-renderer';
import type {InventoryItem,InventoryMaintenance} from '../app/inventory-workspace';
const {SelectCustom}=require('../app/profile-controls') as typeof import('../app/profile-controls');

Object.assign(globalThis,{React});require.extensions['.css']=()=>{};
type Write={path:string;body:any;method:string};
const writes:Write[]=[],reads:string[]=[];
const members=[{id:'10',name:'Cámara'},{id:'11',name:'Sonido'}];
const categories=[{id:'1',name:'Cámara',active:true}];
const baseItem:InventoryItem={id:'1',name:'Memoria SD',category:'Cámara',category_id:'1',serial_number:null,value:'500',currency:'PYG',status:'available',storage_shelf:'Estante A',storage_row:'2',custodian_user_id:null,location_type:'storage',purchase_value:'1000',purchase_date:'2026-01-10',depreciation_method:'linear',useful_life_months:24,residual_value:'0',current_value:'800',accumulated_depreciation:'200',monthly_depreciation:'41.67'};
const maintenanceRows:InventoryMaintenance[]=[
 {id:'9',inventory_id:'1',maintenance_date:'2026-09-10',kind:'Preventivo',description:'Limpieza',cost:'50000',currency:'PYG',responsible_user_id:'11',responsible_name:'Sonido',responsible_photo_url:null,voided_at:'2026-09-12T10:00:00.000Z',voided_by_name:'Ana'},
 {id:'8',inventory_id:'1',maintenance_date:'2026-08-01',kind:'Correctivo',description:'Cambio de cable',cost:'120000',currency:'PYG',responsible_user_id:null,responsible_name:null,voided_at:null},
];
const mockApi=async(path:string,body?:any,method='POST')=>{
 if(body!==undefined){
  writes.push({path,body,method});
  if(path==='/api/agency/inventory-maintenance'){const member=members.find(person=>person.id===String(body.responsible_user_id));maintenanceRows.unshift({id:'7',inventory_id:'1',maintenance_date:body.maintenance_date,kind:body.kind,description:body.description,cost:body.cost,currency:body.currency,responsible_user_id:body.responsible_user_id,responsible_name:member?.name||null,responsible_photo_url:null,voided_at:null});return {maintenance:maintenanceRows[0]};}
  if(path.startsWith('/api/agency/inventory-maintenance/')&&method==='PATCH'){const row=maintenanceRows.find(value=>value.id===path.split('/').pop());return {maintenance:row};}
  if(path.startsWith('/api/agency/inventory-maintenance/')&&method==='DELETE'){const row=maintenanceRows.find(value=>value.id===path.split('/').pop());if(row)row.voided_at='2026-09-16T10:00:00.000Z';return {ok:true};}
  return {record:baseItem};
 }
 reads.push(path);
 if(path==='/api/agency/inventory/1')return {record:baseItem,verifications:[],trace:[],maintenance:maintenanceRows};
 return {records:[baseItem]};
};
// Dialog/Editor behavior is covered elsewhere; these tests focus on the value/maintenance contract.
const operationsPath=require.resolve('../app/operations');
const MockEditor=()=>null;
const CloseContext=React.createContext<(()=>void)|undefined>(undefined);
function MockDialog({title,children,close}:{title?:string;children:React.ReactNode;close?:()=>void}){return <CloseContext.Provider value={close}><section role="dialog" aria-label={title}>{children}</section></CloseContext.Provider>;}
require.cache[operationsPath]={id:operationsPath,filename:operationsPath,loaded:true,exports:{api:mockApi,money:(value:string|number,currency:string)=>`${currency} ${value}`,Dialog:MockDialog,Editor:MockEditor}} as NodeModule;
const dialogPath=require.resolve('../app/dialog');
require.cache[dialogPath]={id:dialogPath,filename:dialogPath,loaded:true,exports:{FormActions:({children}:{children:React.ReactNode})=><div>{children}</div>,useDialogClose:()=>React.useContext(CloseContext),useDialogPending:()=>undefined}} as NodeModule;
const {InventoryItemForm,InventoryDetail}=require('../app/inventory-workspace') as typeof import('../app/inventory-workspace');
let renderer:ReactTestRenderer,formDone=0,changed=0;
const text=(node:ReactTestInstance|string):string=>typeof node==='string'?node:node.children.map(text).join('');
const labelNode=(value:string)=>renderer.root.findAllByType('label').find(node=>text(node).includes(value))!;
const field=(value:string,tag:'input'|'textarea'='input')=>labelNode(value).findByType(tag);
const select=(name:string)=>renderer.root.findAllByType(SelectCustom).find(node=>node.props.label===name)!;
const change=(name:string,value:string)=>act(()=>{field(name).props.onChange({target:{value}});});
const submit=()=>act(async()=>{await renderer.root.findByType('form').props.onSubmit({preventDefault(){}});});
const button=(name:string)=>renderer.root.findAllByType('button').find(node=>text(node)===name)!;
const itemForm=(item:InventoryItem|null)=>create(<InventoryItemForm item={item} categories={categories} members={members} storageTemplates={[]} canManageStorage={false} createStorageTemplate={async name=>({id:'x',name,active:true,item_count:0})} done={()=>{formDone++;}}/>);

async function run(){
 // New value/depreciation fields render and submit with the optional clear contract.
 await act(async()=>{renderer=itemForm(null);});
 assert(labelNode('Valor de compra · Opcional'));assert.equal(select('Método de depreciación').props.value,'none');assert(labelNode('Valor residual'));
 change('Valor de compra · Opcional','1000000');change('Fecha de compra · Opcional','2026-02-01');
 act(()=>select('Método de depreciación').props.onChange('linear'));change('Vida útil (meses)','24');
 await submit();
 assert.equal(formDone,1);assert.equal(writes.at(-1)!.path,'/api/agency/inventory');assert.equal(writes.at(-1)!.method,'POST');
 assert.equal(writes.at(-1)!.body.purchase_value,'1000000');assert.equal(writes.at(-1)!.body.purchase_date,'2026-02-01');
 assert.equal(writes.at(-1)!.body.depreciation_method,'linear');assert.equal(writes.at(-1)!.body.useful_life_months,24);assert.equal(writes.at(-1)!.body.residual_value,'0');
 act(()=>renderer.unmount());
 // Client validation mirrors the server and never calls the API on invalid input.
 const formWrites=()=>writes.filter(write=>write.path==='/api/agency/inventory').length;
 await act(async()=>{renderer=itemForm(null);});
 act(()=>select('Método de depreciación').props.onChange('linear'));
 await submit();assert.match(text(renderer.root),/Para depreciación lineal indicá el valor de compra/);assert.equal(formWrites(),1);
 change('Valor de compra · Opcional','500');await submit();assert.match(text(renderer.root),/fecha de compra/);
 change('Fecha de compra · Opcional','2026-03-01');change('Vida útil (meses)','601');await submit();assert.match(text(renderer.root),/La vida útil debe estar entre 1 y 600 meses/);
 change('Vida útil (meses)','12');act(()=>select('Método de depreciación').props.onChange('none'));change('Valor residual','900');await submit();assert.match(text(renderer.root),/no puede superar el valor de compra/);
 change('Valor de compra · Opcional','');await submit();assert.match(text(renderer.root),/Cargá primero el valor de compra/);assert.equal(formWrites(),1);
 act(()=>renderer.unmount());
 // Editing sends null for cleared optional fields and keeps the residual at 0.
 await act(async()=>{renderer=itemForm(baseItem);});
 assert.match(text(renderer.root),/Valor actual PYG 800/,'the edit form summarizes the computed value');
 change('Valor de compra · Opcional','');change('Fecha de compra · Opcional','');act(()=>select('Método de depreciación').props.onChange('none'));change('Valor residual','');
 await submit();
 const cleared=writes.at(-1)!;assert.equal(cleared.method,'PATCH');assert.equal(cleared.body.purchase_value,null);assert.equal(cleared.body.purchase_date,null);assert.equal(cleared.body.useful_life_months,null);assert.equal(cleared.body.residual_value,'0');
 act(()=>renderer.unmount());
 // Detail renders the computed depreciation and the maintenance history.
 await act(async()=>{renderer=create(<InventoryDetail item={baseItem} members={members} canManage onChanged={()=>{changed++;}}/>);});
 assert.equal(reads.at(-1),'/api/agency/inventory/1');
 assert.match(text(renderer.root),/Valor y depreciación/);assert.match(text(renderer.root),/PYG 800/);assert.match(text(renderer.root),/PYG 200/);assert.match(text(renderer.root),/PYG 41.67/);
 assert.match(text(renderer.root),/Lineal/);assert.match(text(renderer.root),/24 meses/);assert.match(text(renderer.root),/10-sept/);assert.match(text(renderer.root),/PYG 50000/);
 assert.match(text(renderer.root),/Anulado/);assert.match(text(renderer.root),/Anulado por Ana/);assert.match(text(renderer.root),/Sonido/);
 // Creating a maintenance row posts the contract payload, reloads the detail and notifies the workspace.
 const beforeCreate=writes.length;
 act(()=>button('Agregar mantenimiento').props.onClick());
 change('Fecha del mantenimiento','2026-09-12');change('Tipo de mantenimiento','Preventivo');change('Costo','150000');
 act(()=>select('Responsable').props.onChange('11'));
 await submit();
 const created=writes.at(-1)!;assert.equal(writes.length,beforeCreate+1);assert.equal(created.path,'/api/agency/inventory-maintenance');assert.equal(created.method,'POST');
 assert.deepEqual(created.body,{inventory_id:'1',maintenance_date:'2026-09-12',kind:'Preventivo',description:'',cost:'150000',currency:'PYG',responsible_user_id:'11'});
 assert.equal(changed,1,'maintenance changes refresh the workspace list');assert.equal(reads.at(-1),'/api/agency/inventory/1','the detail is reloaded after creating');
 assert.match(text(renderer.root),/12-sept/);
 // Voiding asks for confirmation, calls DELETE and reloads the detail again.
 const voidRow=()=>renderer.root.findAllByType('article').find(node=>text(node).includes('Correctivo'))!;
 act(()=>voidRow().findAllByType('button').find(node=>text(node)==='Anular')!.props.onClick());
 await act(async()=>{voidRow().findAllByType('button').find(node=>text(node)==='Confirmar')!.props.onClick();});
 assert.equal(writes.at(-1)!.path,'/api/agency/inventory-maintenance/8');assert.equal(writes.at(-1)!.method,'DELETE');assert.deepEqual(writes.at(-1)!.body,{});
 assert.equal(changed,2);assert.equal(reads.at(-1),'/api/agency/inventory/1');
 assert.equal(renderer.root.findAllByType('article').filter(node=>text(node).includes('Anulado')).length,2,'voided rows keep their marker after reload');
 act(()=>renderer.unmount());
 // Non-managers read the value and maintenance history without mutating controls.
 await act(async()=>{renderer=create(<InventoryDetail item={baseItem} members={members} canManage={false}/>);});
 assert.equal(renderer.root.findAllByType('button').filter(node=>text(node)==='Agregar mantenimiento').length,0);
 assert.equal(renderer.root.findAllByType('button').filter(node=>text(node)==='Anular').length,0);
 assert.match(text(renderer.root),/Valor y depreciación/);assert.match(text(renderer.root),/Correctivo/);
 act(()=>renderer.unmount());
 console.log('PASS: inventory purchase value/depreciation fields submit the canonical payload with null clears and mirrored validation; the detail renders computed values plus maintenance history and create/void call the contract endpoints, reload the detail and notify the workspace.');
}
void run();

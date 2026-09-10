import React from 'react';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,create,type ReactTestRenderer,type ReactTestInstance} from 'react-test-renderer';
import type {InventoryItem,InventoryReservation} from '../app/inventory-workspace';
Object.assign(globalThis,{React});require.extensions['.css']=()=>{};
const intervals=new Map<number,()=>void>();let timerId=0;
const documentEvents=Object.assign(new EventTarget(),{visibilityState:'visible'});
Object.defineProperty(globalThis,'document',{configurable:true,value:documentEvents});
Object.defineProperty(globalThis,'window',{configurable:true,value:{setInterval(callback:()=>void,ms:number){assert.equal(ms,30000);intervals.set(++timerId,callback);return timerId;},clearInterval(id:number){intervals.delete(id);}}});
const context={user_id:'10',role:'production',can_manage:false,can_reserve:true,time_zone:'America/Asuncion',members:[{id:'10',name:'Cámara'},{id:'11',name:'Sonido'}],projects:[{id:'20',name:'Proyecto de prueba'}]};
const equipment:InventoryItem[]=[{id:'1',name:'Memoria SD',category:'Memoria',category_id:'1',serial_number:null,value:'0',currency:'PYG',status:'available',storage_shelf:'Estante A',storage_row:'2',custodian_user_id:null,location_type:'storage'},{id:'2',name:'DJI Mic',category:'Audio',category_id:'2',serial_number:null,value:'100',currency:'USD',status:'available',storage_shelf:'Estante B',storage_row:'1',custodian_user_id:null,location_type:'storage'}];
const record:InventoryReservation={id:'30',title:'Rodaje de prueba',project_id:'20',project_name:'Proyecto de prueba',starts_at:'2026-09-10T12:00:00.000Z',ends_at:'2026-09-10T15:00:00.000Z',status:'reserved',created_by_user_id:'10',return_user_id:'11',return_user_name:'Sonido',custodian_user_id:null,custodian_name:null,responsible_members:context.members,items:equipment.map(i=>({id:i.id,name:i.name,storage_shelf:i.storage_shelf,storage_row:i.storage_row})),notes:'',version:0};
const writes:{path:string;body:any;method:string}[]=[];let reads=0,fail=false,delay=false;
const pending:(()=>void)[]=[];
let items=equipment,reservations=[record];
const mockApi=async(path:string,body?:unknown,method='POST')=>{
 if(body!==undefined){writes.push({path,body,method});if(fail)throw new Error('Conflicto de reserva');return {reservation:record};}
 reads++;if(delay)await new Promise<void>(resolve=>pending.push(resolve));if(fail)throw new Error('Sin conexión');
 if(path.endsWith('/inventory-context'))return context;
 if(path.endsWith('/inventory-categories'))return {categories:[{id:'1',name:'Memoria',active:true},{id:'2',name:'Audio',active:true}]};
 if(path.endsWith('/inventory'))return {records:items};
 return {reservations};
};
// Dialog/editor behavior is covered by existing tests. Keep these tests focused
// on the inventory contract, reservation drafts, permissions and polling.
const operationsPath=require.resolve('../app/operations');
require.cache[operationsPath]={id:operationsPath,filename:operationsPath,loaded:true,exports:{api:mockApi,money:(n:string,c:string)=>`${c} ${n}`,Dialog:({children}:{children:React.ReactNode})=><section role="dialog">{children}</section>,Editor:()=>null}} as NodeModule;
const dialogPath=require.resolve('../app/dialog');
require.cache[dialogPath]={id:dialogPath,filename:dialogPath,loaded:true,exports:{FormActions:({children}:{children:React.ReactNode})=><div>{children}</div>}} as NodeModule;
const {InventoryWorkspace,InventoryReservationForm,InventoryTransitionForm,InventoryCalendar,inventoryUtcTime,inventoryLocalTime,inventoryMonthRange,inventoryLocation,inventoryCanReturn,inventoryCanManageReservation}=require('../app/inventory-workspace') as typeof import('../app/inventory-workspace');
let renderer:ReactTestRenderer,done=0;
function text(node:ReactTestInstance|string):string{return typeof node==='string'?node:node.children.map(text).join('');}
const button=(label:string)=>renderer.root.findAllByType('button').find(node=>text(node)===label)!;
const field=(label:string,tag:'input'|'select'|'textarea'='input')=>renderer.root.findAllByType('label').find(node=>node.children.some(c=>c===label))!.findByType(tag);
const change=(label:string,value:string,tag:'input'|'select'|'textarea'='input')=>act(()=>field(label,tag).props.onChange({target:{value}}));
const check=(label:string)=>act(()=>renderer.root.findAllByType('label').find(node=>text(node).startsWith(label))!.findByType('input').props.onChange());
const tree=()=>JSON.stringify(renderer.toJSON());
const submit=()=>act(async()=>{await renderer.root.findByType('form').props.onSubmit({preventDefault(){}});});
async function run(){
 assert.equal(inventoryUtcTime('2026-09-10T09:00'),'2026-09-10T12:00:00.000Z');
 assert.equal(inventoryLocalTime('2026-10-01T02:59:00Z'),'2026-09-30T23:59');
 assert.equal(inventoryMonthRange('2026-12').to,'2027-01-01T03:00:00.000Z');
 assert.throws(()=>inventoryUtcTime('2026-02-30T09:00'));
 assert.equal(inventoryLocation(equipment[0]),'Estante A · fila 2');
 assert.match(inventoryLocation({...equipment[0],location_type:'checked_out',current_custodian_name:'Sonido',production_name:'Rodaje'}),/Con Sonido · Rodaje/);
 assert.match(inventoryLocation({...equipment[0],storage_shelf:'',storage_row:''}),/sin registrar/);
 assert.equal(inventoryCanManageReservation({...context,user_id:'11'},record),false);
 assert.equal(inventoryCanReturn({...context,user_id:'11'},record),true);
 assert.equal(inventoryCanReturn({...context,user_id:'12'},{...record,custodian_user_id:'12'}),true);
 for(const role of ['viewer','editor','finance'])assert.equal(inventoryCanReturn({...context,user_id:'11',role,can_reserve:false},record),false);
 await act(async()=>{renderer=create(<InventoryReservationForm context={context} items={equipment} record={null} done={()=>{done++;}}/>);});
 change('Producción o uso previsto','Rodaje de productos');change('Proyecto','20','select');change('Desde · Asunción','2026-09-10T09:00');change('Devolución prevista · Asunción','2026-09-10T12:00');
 await submit();assert.match(tree(),/Elegí al menos un equipo/);assert.equal(writes.length,0);
 check('Memoria SD');check('DJI Mic');check('Sonido');change('Responsable de devolución','11','select');
 await submit();assert.equal(done,1);assert.deepEqual(writes[0].body.inventory_ids,['1','2']);assert.deepEqual(writes[0].body.responsible_user_ids,['10','11']);assert.equal(writes[0].body.return_user_id,'11');assert.equal(writes[0].body.starts_at,'2026-09-10T12:00:00.000Z');
 fail=true;await submit();assert.match(tree(),/Conflicto de reserva/);assert.equal(field('Producción o uso previsto').props.value,'Rodaje de productos');fail=false;
 act(()=>renderer.unmount());
 await act(async()=>{renderer=create(<InventoryTransitionForm action="return" record={{...record,status:'checked_out'}} done={()=>{done++;}}/>);});
 assert.equal(renderer.root.findAllByType('fieldset').length,2);
 await submit();assert.equal(writes.at(-1)!.path,'/api/agency/inventory-reservations/30/return');assert.equal(writes.at(-1)!.body.locations.length,2);assert.equal(writes.at(-1)!.body.expected_version,0);
 act(()=>renderer.unmount());
 // Exclusive end at midnight occupies only the preceding calendar day.
 await act(async()=>{renderer=create(<InventoryCalendar month="2026-09" reservations={[{...record,starts_at:'2026-09-10T23:00:00.000Z',ends_at:'2026-09-11T03:00:00.000Z'}]}/>);});
 assert.match(text(renderer.root.findByProps({'aria-label':'2026-09-10'})),/Rodaje de prueba/);assert.doesNotMatch(text(renderer.root.findByProps({'aria-label':'2026-09-11'})),/Rodaje de prueba/);act(()=>renderer.unmount());
 const before=reads;await act(async()=>{renderer=create(<InventoryWorkspace role="sales"/>);});assert.equal(renderer.toJSON(),null);assert.equal(reads,before);act(()=>renderer.unmount());
 await act(async()=>{renderer=create(<InventoryWorkspace role="production"/>);});
 assert.equal(intervals.size,1);assert.match(tree(),/actualiza cada 30 s/);assert.match(tree(),/Estante A/);assert.doesNotMatch(tree(),/Cargando inventario/);
 act(()=>button('Reservar equipos').props.onClick());change('Producción o uso previsto','Borrador que debe sobrevivir');check('Memoria SD');
 delay=true;const beforePoll=reads;
 act(()=>intervals.forEach(callback=>callback()));act(()=>intervals.forEach(callback=>callback()));
 assert.equal(reads,beforePoll+4,'a polling cycle waits for all four requests; a second tick cannot overlap');
 assert.doesNotMatch(tree(),/Cargando inventario/,'background updates retain visible content');
 items=[{...equipment[0],location_type:'checked_out',current_custodian_name:'Otra persona',production_name:'Otra producción'},equipment[1]];
 await act(async()=>{pending.splice(0).forEach(resolve=>resolve());});delay=false;
 assert.match(tree(),/Con Otra persona/);assert.equal(field('Producción o uso previsto').props.value,'Borrador que debe sobrevivir');
 const selected=renderer.root.findAllByType('input').filter(node=>node.props.type==='checkbox'&&node.props.checked);assert(selected.length>=2,'selected equipment and own responsibility persist');
 documentEvents.visibilityState='hidden';const beforeHidden=reads;act(()=>intervals.forEach(callback=>callback()));assert.equal(reads,beforeHidden,'hidden tabs do not poll');
 documentEvents.visibilityState='visible';await act(async()=>{documentEvents.dispatchEvent(new Event('visibilitychange'));});assert.equal(reads,beforeHidden+4);
 fail=true;await act(async()=>{intervals.forEach(callback=>callback());});assert.match(tree(),/última información recibida/);assert.match(tree(),/Con Otra persona/);assert.equal(field('Producción o uso previsto').props.value,'Borrador que debe sobrevivir');fail=false;
 act(()=>renderer.unmount());assert.equal(intervals.size,0,'polling stopped on unmount');
 // Assigned returners see Return but cannot edit/cancel another person's booking.
 context.user_id='11';reservations=[{...record,status:'checked_out',custodian_user_id:'11',custodian_name:'Sonido'}];
 await act(async()=>{renderer=create(<InventoryWorkspace role="production"/>);});act(()=>button('Calendario y reservas').props.onClick());
 assert(button('Registrar devolución'));assert(!button('Editar reserva'));assert(!button('Cancelar reserva'));act(()=>renderer.unmount());
 const css=readFileSync(new URL('../app/inventory-workspace.css',import.meta.url),'utf8');assert.match(css,/repeat\(2,minmax/);assert.match(css,/repeat\(3,minmax/);assert.match(css,/@media\(max-width:620px\)/);
 console.log('PASS: inventory UI multi-equipment/responsible form, IANA dates/month boundaries, explicit return payload, own/assigned return permissions, recorded location, visible 30-second polling, no overlap/flicker/draft reset, offline staleness and responsive layouts. Browser layout not visually inspected.');
}
void run();

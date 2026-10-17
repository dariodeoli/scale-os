import React from 'react';
import assert from 'node:assert/strict';
import {test,mock} from 'node:test';
import {act,create,type ReactTestRenderer} from 'react-test-renderer';
import {studioContext,studioSpaces,studioReservations} from './fixtures/studio-agenda';
import {studioReservationsOnDay} from '../app/studio-data';
Object.assign(globalThis,{React});require.extensions['.css']=()=>{};
let catalog={context:studioContext,spaces:studioSpaces,reservations:studioReservations,loading:false,error:''};
const hookId=require.resolve('../app/use-studio-data');require.cache[hookId]={id:hookId,filename:hookId,loaded:true,exports:{useStudioCatalog:()=>catalog}} as NodeModule;
const {StudioWorkspace}=require('../app/studio-workspace') as typeof import('../app/studio-workspace');
const {SelectCustom}=require('../app/profile-controls') as typeof import('../app/profile-controls');
const text=(node:any):string=>typeof node==='string'?node:(node.children||[]).map(text).join('');
const mobile=(view:ReactTestRenderer)=>view.root.find(node=>node.type==='div'&&node.props['data-studio-mobile-view']);
const button=(view:ReactTestRenderer,label:string)=>view.root.findAllByType('button').find(node=>text(node)===label)!;
async function fixture(run:(view:ReactTestRenderer)=>Promise<void>){catalog={context:studioContext,spaces:studioSpaces,reservations:studioReservations,loading:false,error:''};mock.timers.enable({apis:['Date'],now:new Date('2026-10-17T15:00:00Z')});let view!:ReactTestRenderer;try{await act(async()=>{view=create(<StudioWorkspace role="owner"/>);});await run(view);}finally{act(()=>view?.unmount());mock.timers.reset();}}

test('agenda uses Asuncion day boundaries, keeps cancelled state and sorts without modifying source',()=>{
 const row=studioReservations[0];const rows=[{...row,id:'end',ends_at:'2026-10-17T03:00:00.000Z',starts_at:'2026-10-17T02:00:00.000Z'},{...row,id:'late',starts_at:'2026-10-18T02:30:00.000Z',ends_at:'2026-10-18T03:00:00.000Z',status:'cancelled' as const},row,{...row,id:'tomorrow',starts_at:'2026-10-18T03:00:00.000Z',ends_at:'2026-10-18T04:00:00.000Z'}];
 assert.deepEqual(studioReservationsOnDay('2026-10-17',rows).map(r=>r.id),['17','late']);assert.equal(rows[0].id,'end');
 assert.deepEqual(studioReservationsOnDay('2026-12-31',[{...row,starts_at:'2027-01-01T02:00:00.000Z',ends_at:'2027-01-01T03:00:00.000Z'}]).map(r=>r.id),['17']);
});
test('mobile starts with today while desktop keeps monthly calendar; month navigation preserves space/state filters',async()=>fixture(async view=>{
 assert.match(text(mobile(view)),/Reserva de hoy 17/);assert.doesNotMatch(text(mobile(view)),/mañana 18/);
 assert.equal(view.root.findByProps({'data-studio-month-calendar':true}).props.className,'hidden md:block');
 await act(async()=>button(view,'Mes completo').props.onClick());assert.match(text(mobile(view)),/mañana 18/);assert.equal(view.root.findByProps({'data-studio-month-calendar':true}).props.className,undefined);
 await act(async()=>view.root.findAllByType(SelectCustom).find(node=>node.props.label==='Espacio')!.props.onChange('2'));
 await act(async()=>view.root.findAllByType(SelectCustom).find(node=>node.props.label==='Estado')!.props.onChange('reserved'));
 await act(async()=>view.root.findByProps({id:'studio-month'}).props.onChange({target:{value:'2026-11'}}));
 assert.equal(view.root.findByProps({id:'studio-month'}).props.value,'2026-11');assert.equal(mobile(view).props['data-studio-mobile-view'],'month');
 await act(async()=>button(view,'Hoy').props.onClick());assert.equal(view.root.findByProps({id:'studio-month'}).props.value,'2026-10');
 assert.equal(view.root.findAllByType(SelectCustom).find(node=>node.props.label==='Espacio')!.props.value,'2');assert.equal(view.root.findAllByType(SelectCustom).find(node=>node.props.label==='Estado')!.props.value,'reserved');
 assert.match(text(mobile(view)),/No hay reservas para hoy con estos filtros/);
 await act(async()=>button(view,'Ver mes completo').props.onClick());assert.match(text(mobile(view)),/mañana 18/);assert.doesNotMatch(text(mobile(view)),/Reserva de hoy 17/);
}));
test('empty today exposes the rest of the month without inventing reservations; read-only users have no mutation actions',async()=>fixture(async view=>{
 catalog={...catalog,context:{...studioContext,can_manage:false,can_reserve:false},reservations:[studioReservations[1]]};await act(async()=>view.update(<StudioWorkspace role="viewer"/>));
 assert.match(text(mobile(view)),/No hay reservas para hoy\./);assert(!view.root.findAllByType('button').some(node=>/Nueva reserva|Agregar espacio/.test(text(node))));assert(!view.root.findAllByType('button').some(node=>/^Editar reserva|^Cancelar reserva/.test(node.props['aria-label']||'')));
 await act(async()=>button(view,'Ver mes completo').props.onClick());assert.match(text(mobile(view)),/mañana 18/);
}));
test('today refreshes across midnight and existing reservation edit/cancel callbacks remain accessible',async()=>fixture(async view=>{
 const edit=view.root.findAllByType('button').find(node=>node.props['aria-label']==='Editar reserva: Reserva de hoy 17');assert(edit);
 assert(view.root.findAllByType('button').some(node=>node.props['aria-label']==='Cancelar reserva: Reserva de hoy 17'));
 mock.timers.setTime(new Date('2026-10-18T15:00:00Z').getTime());await act(async()=>button(view,'Hoy').props.onClick());assert.match(text(mobile(view)),/mañana 18/);assert.doesNotMatch(text(mobile(view)),/Reserva de hoy 17/);
}));
test('loading and error suppress agenda and retain the original retry path',async()=>fixture(async view=>{
 catalog={...catalog,loading:true};await act(async()=>view.update(<StudioWorkspace role="owner"/>));assert(view.root.findAllByProps({'aria-label':'Cargando espacios y calendario…'}).length>0);assert(!view.root.findAllByType('button').some(node=>text(node)==='Hoy'));
 catalog={...catalog,loading:false,error:'No disponible'};await act(async()=>view.update(<StudioWorkspace role="owner"/>));assert.match(text(view.root),/No disponible/);assert(button(view,'Reintentar'));
}));

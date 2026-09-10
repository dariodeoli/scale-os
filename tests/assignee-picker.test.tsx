import React from 'react';
import assert from 'node:assert/strict';
import {act,create,type ReactTestRenderer} from 'react-test-renderer';
import type {AssigneePickerProps,AssigneeSelection} from '../app/assignee-picker';

Object.assign(globalThis,{React});
require.extensions['.css']=()=>{};
const {AssigneePicker,assigneeSelection}=require('../app/assignee-picker') as typeof import('../app/assignee-picker');
let requests=0;globalThis.fetch=async()=>{requests++;throw Error('Picker must not fetch or mutate');};
assert.deepEqual(assigneeSelection(['001',1,'2'],'02'),{assigned_user_ids:['1','2'],assigned_user_id:'2'});
assert.deepEqual(assigneeSelection(['0','-1','1e2','9223372036854775808',Number.MAX_SAFE_INTEGER+1]),{assigned_user_ids:[],assigned_user_id:null});
let value:AssigneeSelection={assigned_user_ids:[],assigned_user_id:null};
let changes=0;
let renderer!:ReactTestRenderer;
const current=():AssigneeSelection=>value;
const members=[
 {id:1,full_name:'Ana',email:'ana@example.invalid',active:true},
 {id:'002',full_name:'Bruno',email:'bruno@example.invalid',active:true},
 {id:2,full_name:'Duplicado',email:'duplicate@example.invalid',active:true},
 {id:3,full_name:'Suspendido',active:false},
 {id:4,full_name:'Retirado',active:true,removed_at:'2026-09-10'},
 {id:5,full_name:'Carla',email:'carla@example.invalid',active:true},
];
let extra:Partial<AssigneePickerProps>={};
function render(){return <AssigneePicker members={members} value={value} onChange={next=>{changes++;value=next;renderer.update(render());}} {...extra}/>;}
act(()=>{renderer=create(render());});
const json=()=>JSON.stringify(renderer.toJSON());
const checkboxes=()=>renderer.root.findAllByProps({type:'checkbox'});
const click=(label:string)=>act(()=>renderer.root.findByProps({'aria-label':label}).props.onClick());
assert.equal(checkboxes().length,3,'only unique active members are offered');
assert.doesNotMatch(json(),/Suspendido|Retirado|Duplicado/);
assert.match(json(),/Sin responsables asignados/);
act(()=>checkboxes()[0].props.onChange());
assert.deepEqual(current(),{assigned_user_ids:['1'],assigned_user_id:'1'});
act(()=>checkboxes()[1].props.onChange());
assert.deepEqual(current(),{assigned_user_ids:['1','2'],assigned_user_id:'1'});
click('Usar como principal: Bruno');
assert.equal(value.assigned_user_id,'2');
assert.equal(renderer.root.findByProps({'aria-label':'Usar como principal: Bruno'}).props['aria-pressed'],true);
click('Quitar a Bruno');
assert.deepEqual(current(),{assigned_user_ids:['1'],assigned_user_id:'1'},'removing primary chooses the first remaining member');
click('Quitar a Ana');
assert.deepEqual(current(),{assigned_user_ids:[],assigned_user_id:null});
act(()=>renderer.root.findByProps({type:'search'}).props.onChange({target:{value:'BRUNO@'}}));
assert.equal(checkboxes().length,1);
act(()=>checkboxes()[0].props.onChange());
assert.equal(value.assigned_user_id,'2','filtering preserves the correct identity');
act(()=>renderer.root.findByProps({type:'search'}).props.onChange({target:{value:'No existe'}}));
assert.match(json(),/No hay integrantes que coincidan/);
assert.match(json(),/Bruno/,'selected people remain visible while searching');
const beforeDisabled=changes;
act(()=>{extra={disabled:true};renderer.update(render());});
click('Quitar a Bruno');assert.equal(changes,beforeDisabled);
assert.equal(renderer.root.findByType('fieldset').props.disabled,true);
act(()=>{extra={loading:true};renderer.update(render());});
assert.match(json(),/Cargando integrantes/);
assert.equal(checkboxes().length,0);
assert.equal(renderer.root.findByType('fieldset').props['aria-busy'],true);
act(()=>{extra={error:'Los responsables cambiaron. Recargá antes de guardar.'};renderer.update(render());});
assert.match(json(),/Los responsables cambiaron/);
const error=renderer.root.findByProps({role:'alert'});
assert.ok(renderer.root.findByType('fieldset').props['aria-describedby'].includes(error.props.id));
act(()=>{value={assigned_user_ids:['2','3'],assigned_user_id:'2'};extra={};renderer.update(render());});
assert.match(json(),/Hay personas sin acceso activo/);
click('Quitar a Persona no disponible');assert.deepEqual(value.assigned_user_ids,['2'],'unavailable people can be removed without silently dropping them');
act(()=>{extra={members:[]};renderer.update(render());});
assert.match(json(),/No hay integrantes activos disponibles/);
assert.doesNotMatch(json(),/bruno@example.invalid/,'a member list from another tenant does not reuse old names');
act(()=>{value={assigned_user_ids:[],assigned_user_id:null};extra={members:[]};renderer.update(render());});
assert.match(json(),/Sin responsables asignados/);
for(const button of renderer.root.findAllByType('button'))assert.equal(button.props.type,'button','picker actions never submit the surrounding form');
act(()=>renderer.unmount());
const many=Array.from({length:101},(_,index)=>({id:index+1,full_name:`Person ${index+1}`,active:true}));
act(()=>{extra={members:many};value=assigneeSelection(many.slice(0,100).map(m=>m.id));renderer=create(render());});
assert.equal(checkboxes()[100].props.disabled,true);
const atLimit=changes;act(()=>checkboxes()[100].props.onChange());assert.equal(changes,atLimit);
assert.match(json(),/Máximo 100 responsables/);
for(const button of renderer.root.findAllByType('button'))assert.equal(button.props.type,'button');
act(()=>renderer.unmount());
assert.equal(requests,0);
console.log('PASS: multi-selection, primary changes/removal, canonical deduplication, inactive members, search, controlled state, disabled/loading/error, tenant replacement, limit and zero network writes');

import React from 'react';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {act,create,type ReactTestRenderer} from 'react-test-renderer';
import {editableMemberAccess,editableMemberPermissions,accessRoleChoices,type TeamPermissionPolicy} from '../app/team-permission-policy';
import {visibleModule} from '../app/workspace-access';
import {effectiveCapability} from '../app/capabilities';
Object.assign(globalThis,{React,window:new EventTarget()});
require.extensions['.css']=()=>{};
function mock(path:string,exports:unknown){const id=require.resolve(path);require.cache[id]={id,filename:id,loaded:true,exports} as NodeModule;}
const policy:TeamPermissionPolicy={canManageRoles:true,canManageMembers:true,canResetRoles:false,visibleRoles:['finance','sales','production','editor','viewer','collaborator'],permissionRoles:['finance','sales','production','editor','viewer','collaborator'],editableRoles:['sales','production','editor','viewer','collaborator'],grantableCapabilities:['clients.manage'],canViewSalary:false,canViewBalance:false};
const calls:{path:string;body:unknown;method:string}[]=[];
let override:boolean|null=null,fail=false;
const matrix=()=>({roles:['owner','admin','management',...policy.visibleRoles],policy,capabilities:[{id:'clients.manage',label:'Gestionar clientes',description:'Crear y editar clientes',defaults:['owner','admin','management','sales'],overrides:{admin:true}},{id:'salary.view',label:'Salarios superiores',description:'Dato privado',defaults:['owner','admin','finance'],overrides:{}}]});
const memberData=(id:string)=>({member:{id,role:'sales'},policy,capabilities:[{id:'clients.manage',label:'Gestionar clientes',description:'Crear y editar clientes',defaultAllowed:true,override,effectiveAllowed:override??true,canGrant:true},{id:'salary.view',label:'Salario oculto',description:'Dato privado',defaultAllowed:false,override:null,effectiveAllowed:false,canGrant:false}]});
mock('../app/operations',{api:async(path:string,body?:unknown,method='GET')=>{calls.push({path,body,method});if(fail)throw Error('El permiso cambió. Volvé a cargar.');if(path==='/api/agency/permissions')return matrix();if(method==='PATCH')override=(body as {allowed:boolean|null}).allowed;return memberData(path.split('/')[4]);},Dialog:({children}:{children:React.ReactNode})=><div>{children}</div>});
mock('../app/profile-controls',{SelectCustom:({label,choices,value,onChange,disabled}:{label:string;choices:{value:string;label:string}[];value:string;onChange:(value:string)=>void;disabled:boolean})=><select aria-label={label} value={value} disabled={disabled} onChange={event=>onChange(event.target.value)}>{choices.map(choice=><option value={choice.value} key={choice.value}>{choice.label}</option>)}</select>});
mock('../app/feedback',{notify:()=>{}});
const {PermissionsMatrixPanel}=require('../app/permissions-matrix') as typeof import('../app/permissions-matrix');
const {MemberPermissions}=require('../app/member-permissions') as typeof import('../app/member-permissions');
const text=(node:any):string=>typeof node==='string'?node:node?.children?.map(text).join('')||'';

test('navigation follows live Balance and role-permission capabilities without opening salary access',()=>{
 assert.equal(visibleModule('Roles y permisos','management',{'permissions.manage':true}),true);
 assert.equal(visibleModule('Roles y permisos','management',{'permissions.manage':false}),false);
 assert.equal(visibleModule('Balance','management',{'finance.view':true,'finance.balance.view':false}),false);assert.equal(visibleModule('Balance','management',{'finance.balance.view':true}),false,'hard privacy boundary survives a stale override');assert.equal(effectiveCapability('management','salary.view',{'salary.view':true}),false);
 assert.equal(visibleModule('Previsión','management',{'finance.view':true}),true);
 assert.equal(visibleModule('Balance','finance',{'finance.balance.view':true}),true);
});
test('API hierarchy flags exclude self/superiors; assignment choices never invent finance or higher roles',()=>{
 const member={id:'2',email:'test@example.invalid',role:'sales',active:true,removed_at:null,access_editable:true,permissions_editable:true};
 assert(editableMemberAccess(member,'1'));assert(editableMemberPermissions(member,'1'));
 assert(!editableMemberAccess(member,'2'));assert(!editableMemberPermissions(member,'2'));
 assert(!editableMemberAccess({...member,access_editable:false},'1'));assert(!editableMemberPermissions({...member,permissions_editable:false},'1'));
 assert.deepEqual(accessRoleChoices(policy),policy.editableRoles);
 assert(!accessRoleChoices(policy).includes('finance'));
 assert.deepEqual(accessRoleChoices(policy,'finance'),['finance',...policy.editableRoles],'a current role can remain unchanged while updating access');
});
test('manager matrix renders only API-visible roles/capabilities and can update lower finance ordinary permissions',async()=>{
 let renderer!:ReactTestRenderer;calls.length=0;
 await act(async()=>{renderer=create(<PermissionsMatrixPanel role="management"/>);});
 const content=text(renderer.toJSON());
 for(const forbidden of ['Dueño:','Administrador:','Gerencia:','Salarios superiores','Restablecer todos'])assert(!content.includes(forbidden),forbidden);
 assert(content.includes('Finanzas:')&&content.includes('Gestionar clientes'));
 const finance=renderer.root.findAllByType('button').find(button=>String(button.props.title).startsWith('Gestionar clientes · Finanzas'))!;
 assert(finance);assert.equal(finance.props.disabled,false,'ordinary finance permission can change even when assigning finance is forbidden');
 await act(async()=>{await finance.props.onClick();});
 assert.deepEqual(calls.find(call=>call.method==='PATCH')?.body,{capability:'clients.manage',role:'finance',allowed:true});
 act(()=>renderer.unmount());
});
test('individual permission edits preserve inherit semantics, real errors, tenant target and no salary rows',async()=>{
 let renderer!:ReactTestRenderer;calls.length=0;override=null;
 await act(async()=>{renderer=create(<MemberPermissions memberId="2"/>);});
 assert(!text(renderer.toJSON()).includes('Salario oculto'));
 let select=renderer.root.findByType('select');assert.equal(select.props.value,'inherit');
 await act(async()=>{await select.props.onChange({target:{value:'false'}});});
 assert.deepEqual(calls.find(call=>call.method==='PATCH'),{path:'/api/agency/members/2/permissions',method:'PATCH',body:{capability:'clients.manage',allowed:false}});
 select=renderer.root.findByType('select');assert.equal(select.props.value,'false');
 await act(async()=>{await select.props.onChange({target:{value:'inherit'}});});
 assert.equal((calls.filter(call=>call.method==='PATCH').at(-1)?.body as {allowed:boolean|null}).allowed,null);
 fail=true;await act(async()=>{await renderer.root.findByType('select').props.onChange({target:{value:'true'}});});fail=false;
 assert(text(renderer.toJSON()).includes('El permiso cambió'));assert.equal(renderer.root.findByType('select').props.value,'inherit','failed write never appears saved');
 act(()=>renderer.unmount());
});

test('team, role matrix and invites remount when tenant, identity or live permissions change',()=>{for(const file of ['equipo','permisos','invitaciones']){const source=readFileSync(new URL(`../app/sections/${file}.tsx`,import.meta.url),'utf8');assert(source.includes('user?.organization_id')&&source.includes('user?.id')&&source.includes('user?.role')&&source.includes('JSON.stringify(user?.capabilities||{})'),file+' preserves no previous permission UI across scopes');}});

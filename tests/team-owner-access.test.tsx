import React from 'react';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {act,create,type ReactTestRenderer} from 'react-test-renderer';
Object.assign(globalThis,{React,window:new EventTarget()});
require.extensions['.css']=()=>{};
function mock(path:string,exports:unknown){const id=require.resolve(path);require.cache[id]={id,filename:id,loaded:true,exports} as NodeModule;}
const Context=React.createContext<(()=>void)|undefined>(undefined);
mock('../app/dialog',{
 Dialog:({children,close}:{children:React.ReactNode;close:()=>void})=><Context.Provider value={close}><section role="dialog">{children}</section></Context.Provider>,
 ConfirmDialog:({open=true,description,error,onConfirm,onCancel,confirmLabel}:{open?:boolean;description:React.ReactNode;error?:string;onConfirm:()=>void;onCancel:()=>void;confirmLabel:string})=>open?<section role="alertdialog">{description}{error?<p role="alert">{error}</p>:null}<button onClick={onConfirm}>{confirmLabel}</button><button onClick={onCancel}>Cancelar</button></section>:null,
 FormActions:({children}:{children:React.ReactNode})=><div>{children}</div>,useDialogPending:()=>{},useDialogClose:()=>React.useContext(Context),
});
mock('../app/person-photo',{PersonPhotoField:()=>null});
const {PeopleWorkspace}=require('../app/team-workspace') as typeof import('../app/team-workspace');
const {TeamPersonSheet}=require('../app/team-person-sheet') as typeof import('../app/team-person-sheet');
const {ActionMenu}=require('../app/ui-v2') as typeof import('../app/ui-v2');
const {isCurrentTeamMember}=require('../app/team-directory') as typeof import('../app/team-directory');
const me={id:'1',email:'old-email@example.invalid',full_name:'Mi identidad',role:'owner',active:true,removed_at:null};
const other={access_editable:true,permissions_editable:false,id:'2',email:'current-email@example.invalid',full_name:'Otro dueño sin ficha',role:'owner',active:true,removed_at:null};
const text=(node:any):string=>typeof node==='string'?node:node?.children?.map(text).join('')||'';
let actingRole='owner';
const policy={canManageRoles:true,canManageMembers:true,canResetRoles:true,visibleRoles:['owner','admin','management','viewer'],permissionRoles:['admin','management','viewer'],editableRoles:['owner','admin','management','viewer'],grantableCapabilities:['members.manage'],canViewSalary:true,canViewBalance:true};
let deleteStatus=403;const requests:{url:string;method:string}[]=[];
globalThis.fetch=(async(input:RequestInfo|URL,init:RequestInit={})=>{
 const url=String(input),method=init.method||'GET';requests.push({url,method});
 const payload=method==='DELETE'?(deleteStatus===200?{ok:true}:{error:'Tu acceso cambió. Recargá para revisar.'}):{collaborators:[],members:[me,{...other,access_editable:actingRole==='owner'}],archivedProfiles:[],policy};
 return new Response(JSON.stringify(payload),{status:method==='DELETE'?deleteStatus:200});
}) as typeof fetch;
async function workspace(role='owner'){actingRole=role;
 let renderer!:ReactTestRenderer;
 await act(async()=>{renderer=create(<PeopleWorkspace role={role} currentUserId="1" currentEmail="current-email@example.invalid"/>);});
 await act(async()=>{await new Promise(resolve=>setTimeout(resolve,0));});return renderer;
}
test('identidad por ID: badge vos y exclusión del acceso propio aunque cambie el correo',async()=>{
 assert.equal(isCurrentTeamMember(me,'1'),true);assert.equal(isCurrentTeamMember(other,'1'),false);
 const renderer=await workspace();
 const rows=renderer.root.findAll(node=>node.props.role==='row'&&String(node.props.className).includes('team-row'));
 assert.equal(rows.length,2);
 assert.match(text(rows[0]),/vos/);assert.doesNotMatch(text(rows[1]),/vos/);
 const menus=renderer.root.findAllByType(ActionMenu);
 assert.equal(menus[0].props.items.some((item:{id:string})=>item.id==='revoke'),false);
 assert.equal(menus[1].props.items.some((item:{id:string})=>item.id==='revoke'),true,'otro dueño activo sin ficha permite quitar acceso');
 const headers=renderer.root.findAll(node=>node.props.role==='columnheader');
 assert.deepEqual(headers.map(text),['Persona','Datos','Estado laboral','Permiso','Acceso','Acciones']);
 assert.match(headers[4].props.className,/text-center/);
 assert.equal(rows[0].findAll(node=>node.props.role==='cell').length,6);
 const access=rows[0].findAll(node=>node.props.role==='cell')[4];
 assert.match(access.props.className,/justify-center/);assert.equal(text(access),'Habilitado');
 act(()=>renderer.unmount());
});
test('admin no retira dueños; confirmación conserva error real y sólo revoca membresía',async()=>{
 let renderer=await workspace('admin');
 assert.equal(renderer.root.findAllByType(ActionMenu)[1].props.items.some((item:{id:string})=>item.id==='revoke'),false);
 act(()=>renderer.unmount());
 renderer=await workspace();
 await act(async()=>{renderer.root.findAllByType(ActionMenu)[1].props.items.find((item:{id:string})=>item.id==='revoke')!.onClick();});
 assert.match(text(renderer.root),/No se borrarán sus comentarios, pagos ni su acceso a otras empresas/);
 await act(async()=>{await renderer.root.findAllByType('button').find(button=>text(button)==='Confirmar: quitar acceso')!.props.onClick();});
 assert.match(text(renderer.root),/Tu acceso cambió. Recargá para revisar./);
 assert.equal(renderer.root.findAll(node=>node.props.role==='alertdialog').length,1,'el error mantiene la confirmación abierta');
 const deletion=requests.filter(request=>request.method==='DELETE');assert.equal(deletion.at(-1)?.url,'/core-api/api/agency/members/2');
 deleteStatus=200;
 await act(async()=>{await renderer.root.findAllByType('button').find(button=>text(button)==='Confirmar: quitar acceso')!.props.onClick();});
 assert.equal(renderer.root.findAll(node=>node.props.role==='alertdialog').length,0);
 act(()=>renderer.unmount());
});
test('ficha Acceso de otro dueño sin ficha permite retirar; la propia usa ID',async()=>{
 for(const currentUserId of ['1','2']){
  let renderer!:ReactTestRenderer;
  await act(async()=>{renderer=create(<TeamPersonSheet permissionPolicy={policy} role="owner" currentUserId={currentUserId} currentEmail="current-email@example.invalid" person={null} member={other} ambiguous={false} seedEmail="" tab="acceso" defaultCurrency="PYG" load={async()=>{}} onCreated={()=>{}} close={()=>{}}/>);});
  const remove=renderer.root.findAllByType('button').some(button=>String(button.props['aria-label']||'').startsWith('Quitar acceso:'));
  assert.equal(remove,currentUserId==='1');act(()=>renderer.unmount());
 }
});

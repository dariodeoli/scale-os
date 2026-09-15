import React from 'react';
import assert from 'node:assert/strict';
import {act,create,type ReactTestRenderer} from 'react-test-renderer';
require.extensions['.css']=()=>{};
Object.assign(globalThis,{React});
const dialogPath=require.resolve('../app/dialog');
function StubDialog({title,close,children}:{title:string;close:()=>void;children:React.ReactNode}){return <div role="dialog"><h2>{title}</h2>{children}</div>;}
require.cache[dialogPath]={id:dialogPath,filename:dialogPath,loaded:true,exports:{Dialog:StubDialog}} as NodeModule;
const {PlatformAccessPanel}=require('../app/platform-access-panel') as typeof import('../app/platform-access-panel');
type Request={url:string;init:RequestInit;resolve:(response:Response)=>void};
const requests:Request[]=[];
globalThis.fetch=(input,init)=>new Promise<Response>(resolve=>requests.push({url:String(input),init:init||{},resolve}));
let renderer:ReactTestRenderer;
const fixtureUsers=()=>({users:[
 {id:1,email:'owner@scale.example',active_agencies:1,platform_admin:true,platform_role:'admin'},
 {id:2,email:'member@scale.example',active_agencies:0,platform_admin:false,platform_role:null},
 {id:3,email:'viewer@scale.example',active_agencies:2,platform_admin:true,platform_role:'viewer'},
],limit:100,offset:0});
const fixtureAgencies=()=>({agencies:[{id:10,name:'Agency One',slug:'agency-one',active:true,active_users:3,subscription_status:'active'}],limit:100,offset:0});
async function respond(request:Request,data:unknown,status=200){await act(async()=>{request.resolve(new Response(JSON.stringify(data),{status}));});}
const text=()=>JSON.stringify(renderer.toJSON());
const textOf=(node:unknown):string=>typeof node==='string'?node:Array.isArray(node)?node.map(textOf).join(''):(node&&typeof node==='object'&&'children' in node)?textOf((node as {children:unknown}).children):'';
const buttons=()=>renderer.root.findAllByType('button');
const button=(label:string)=>buttons().find(node=>textOf(node).includes(label));
const lastRequest=()=>requests.at(-1)!;
const flush=()=>act(async()=>{});
async function mount(role:string|null='admin',currentUserId='1'){
 await act(async()=>{renderer=create(<PlatformAccessPanel currentUserId={currentUserId} platformRole={role}/>);});
 assert.equal(lastRequest().url,'/core-api/api/platform/agencies?limit=100');
 const agencyRequest=requests.at(-2)!;
 assert.equal(agencyRequest.url,'/core-api/api/platform/users?limit=100');
 await respond(agencyRequest,fixtureUsers());
 await respond(lastRequest(),fixtureAgencies());
}
async function run(){
 await act(async()=>{renderer=create(<PlatformAccessPanel currentUserId="1" platformRole="admin"/>);});
 await respond(requests.at(-2)!,{error:'Sin conexión'},500);
 await respond(lastRequest(),fixtureAgencies());
 assert.match(text(),/Sin conexión/);
 await act(async()=>renderer.unmount());

 await mount('viewer','3');
 assert.match(text(),/Solo lectura: podés consultar la administración global/);
 assert.ok(!text().includes('Hacer admin global')&&!text().includes('Eliminar usuario')&&!text().includes('Quitar acceso')&&!text().includes('Eliminar agencia'),'viewers see no mutation controls');
 assert.match(text(),/Agency One/);
 act(()=>renderer.unmount());

 await mount('admin','1');
 assert.match(text(),/owner@scale.example/);
 assert.match(text(),/Vos/);
 assert.match(text(),/Admins globales/);
 assert(button('Eliminar mi cuenta'),'the admin can delete their own account');
 act(()=>button('Hacer admin global')!.props.onClick());
 const grant=lastRequest();assert.equal(grant.url,'/core-api/api/platform/users/2');assert.equal(grant.init.method,'PATCH');assert.deepEqual(JSON.parse(String(grant.init.body)),{platform_access:'admin'});
 await respond(grant,{access:{platform_access:'admin',changed:true}});
 await respond(requests.at(-2)!,fixtureUsers());await respond(lastRequest(),fixtureAgencies());
 assert.match(text(),/acceso global actualizado/);
 act(()=>button('Solo lectura')!.props.onClick());
 const viewer=lastRequest();assert.equal(viewer.url,'/core-api/api/platform/users/2');assert.deepEqual(JSON.parse(String(viewer.init.body)),{platform_access:'viewer'});
 await respond(viewer,{access:{platform_access:'viewer',changed:true}});
 await respond(requests.at(-2)!,fixtureUsers());await respond(lastRequest(),fixtureAgencies());
 act(()=>button('Quitar acceso')!.props.onClick());
 const revoke=lastRequest();assert.equal(revoke.url,'/core-api/api/platform/users/3');assert.deepEqual(JSON.parse(String(revoke.init.body)),{platform_access:'none'});
 await respond(revoke,{access:{platform_access:'none',changed:true}});
 await respond(requests.at(-2)!,fixtureUsers());await respond(lastRequest(),fixtureAgencies());
 act(()=>button('Eliminar usuario')!.props.onClick());
 assert.match(text(),/Escribí/);assert.match(text(),/member@scale.example/);
 const confirm=()=>buttons().find(node=>textOf(node).includes('Eliminar definitivamente'))!;
 assert.equal(confirm().props.disabled,true,'confirmation requires the typed email');
 act(()=>renderer.root.findAllByType('input')[0].props.onChange({target:{value:'member@scale.example'}}));
 assert.equal(confirm().props.disabled,false);
 act(()=>{void confirm().props.onClick();});
 const remove=lastRequest();assert.equal(remove.url,'/core-api/api/platform/users/2');assert.equal(remove.init.method,'DELETE');
 await respond(remove,{deleted:{userId:2,self:false,agencies:[60]}});
 await respond(requests.at(-2)!,fixtureUsers());await respond(lastRequest(),fixtureAgencies());
 assert.match(text(),/junto con 1 agencia\(s\) completa\(s\)/);
 act(()=>button('Eliminar agencia')!.props.onClick());
 assert.match(text(),/Escribí/);assert.match(text(),/Agency One/);
 act(()=>renderer.root.findAllByType('input')[0].props.onChange({target:{value:'Agency One'}}));
 act(()=>{void confirm().props.onClick();});
 const agencyRemoved=lastRequest();assert.equal(agencyRemoved.url,'/core-api/api/platform/agencies/10');assert.equal(agencyRemoved.init.method,'DELETE');
 await respond(agencyRemoved,{deleted:{agencyId:10,name:'Agency One',slug:'agency-one'}});
 await respond(requests.at(-2)!,fixtureUsers());await respond(lastRequest(),fixtureAgencies());
 assert.match(text(),/Agencia Agency One eliminada/);
 act(()=>button('Eliminar mi cuenta')!.props.onClick());
 assert.match(text(),/Solo vos podés eliminar tu propia cuenta/);
 act(()=>renderer.root.findAllByType('input')[0].props.onChange({target:{value:'owner@scale.example'}}));
 act(()=>{void confirm().props.onClick();});
 const self=lastRequest();assert.equal(self.url,'/core-api/api/platform/users/1');assert.equal(self.init.method,'DELETE');
 await respond(self,{deleted:{userId:1,self:true,agencies:[]}});
 assert.match(text(),/Tu cuenta fue eliminada/);
 act(()=>renderer.unmount());
 console.log('PASS platform access panel: role-aware read-only view, access grants/revokes, email-confirmed user deletion with agency cascade notice, agency deletion and self-deletion');
}
void run();

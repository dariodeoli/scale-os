import React from 'react';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {act,create,type ReactTestRenderer} from 'react-test-renderer';
require.extensions['.css']=(module:NodeModule)=>{module.exports={};};
Object.assign(globalThis,{React,window:{dispatchEvent:()=>true,addEventListener:()=>{},removeEventListener:()=>{}}});
const calls:{path:string;body:unknown}[]=[];
let fail=false;
let pendingSwitch:(()=>void)|null=null;
const id=require.resolve('../app/operations');
require.cache[id]={id,filename:id,loaded:true,exports:{api:async(path:string,body?:unknown)=>{
 calls.push({path,body});
 if(path==='/api/auth/switch-organization')return new Promise<void>(resolve=>{pendingSwitch=resolve;});
 if(body){if(fail)throw Error('No se pudo guardar.');return {ok:true};}
 return {organizations:[{id:1,name:'Agencia A',role:'owner'},{id:2,name:'Agencia B',role:'manager'},{id:3,name:'Demo',role:'owner',isDemo:true}],currentOrganizationId:1,defaultOrganizationId:1};
}}} as NodeModule;
const {CompanySettings}=require('../app/company-settings') as typeof import('../app/company-settings');
test('lists only real companies and waits for server confirmation',async()=>{
 let r:ReactTestRenderer;
 await act(async()=>{r=create(<CompanySettings/>);});
 assert.equal(r!.root.findAllByType('article').length,2);
 assert.doesNotMatch(JSON.stringify(r!.toJSON()),/Demo/);
 const buttons=()=>r!.root.findAllByType('button');
 assert.equal(buttons().filter(b=>b.props['aria-pressed']!==undefined).length,2);
 assert.equal(buttons().find(b=>b.props['aria-pressed']===true)?.props.disabled,false,'the default star stays clickable and idempotent');
 fail=true;
 await act(async()=>{await buttons().find(b=>b.props['aria-pressed']===false)!.props.onClick();});
 assert.equal(r!.root.findAllByProps({role:'alert'}).length,1);
 assert.equal(buttons().filter(b=>b.props['aria-pressed']===true).length,1);
 fail=false;
 await act(async()=>{await buttons().find(b=>b.props['aria-pressed']===false)!.props.onClick();});
 assert.deepEqual(calls.at(-1),{path:'/api/auth/default-organization',body:{organizationId:2}});
 assert.match(JSON.stringify(r!.toJSON()),/Agencia B se abrirá al iniciar sesión/);
 await act(async()=>r!.unmount());
});
test('a successful company switch completes navigation after the panel unmounts',async()=>{
 let r:ReactTestRenderer;let destination='';
 Object.assign(globalThis,{window:{dispatchEvent:()=>true,addEventListener:()=>{},removeEventListener:()=>{},location:{assign:(path:string)=>{destination=path;}}},sessionStorage:{setItem:()=>{throw Error('Storage disabled');}}});
 await act(async()=>{r=create(<CompanySettings/>);});
 await act(async()=>{r!.root.findAllByType('button').find(b=>b.children.join('')==='Abrir')!.props.onClick();});
 await act(async()=>r!.unmount());
 await act(async()=>{pendingSwitch!();});
 assert.equal(destination,'/');
});

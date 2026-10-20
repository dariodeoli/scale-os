import React from 'react';
import assert from 'node:assert/strict';
import {act,create,type ReactTestRenderer} from 'react-test-renderer';
import {AI_CONNECTIONS_LABEL,AI_CONNECTIONS_PATH,sectionPath,childSections} from '../app/navigation';
import {AI_NAV_EXPIRES_AT,temporaryAiNavigationVisible,workspaceNavGroups} from '../app/workspace-navigation';
import {useTemporaryAiNavigation} from '../app/use-temporary-ai-navigation';

const before=Date.parse('2026-10-29T23:59:59.999-03:00');
assert(temporaryAiNavigationVisible(before));assert(!temporaryAiNavigationVisible(AI_NAV_EXPIRES_AT));assert(!temporaryAiNavigationVisible(AI_NAV_EXPIRES_AT+1));assert(!temporaryAiNavigationVisible(NaN));
assert.equal(new Intl.DateTimeFormat('en-GB',{timeZone:'America/Asuncion',dateStyle:'short',timeStyle:'medium',hourCycle:'h23'}).format(AI_NAV_EXPIRES_AT),'30/10/2026, 00:00:00');
assert.equal(sectionPath(AI_CONNECTIONS_LABEL),AI_CONNECTIONS_PATH);assert.deepEqual(childSections(AI_CONNECTIONS_LABEL),['Preferencias'],'the shortcut prefetches only the existing preferences module');
for(const role of ['owner','admin','management','finance','sales','production','editor','viewer','collaborator']){
 const nav=workspaceNavGroups(role,undefined,true),labels=nav.map(item=>item.group);
 assert.equal(labels.at(-1),AI_CONNECTIONS_LABEL,role);
 if(labels.includes('Configuración'))assert.equal(labels.indexOf(AI_CONNECTIONS_LABEL),labels.indexOf('Configuración')+1,role);
 assert(!workspaceNavGroups(role,undefined,false).some(item=>item.group===AI_CONNECTIONS_LABEL));
 assert.deepEqual(nav.find(item=>item.group===AI_CONNECTIONS_LABEL)?.modules,[AI_CONNECTIONS_LABEL]);
}
// The shared hook removes the shortcut while a session remains mounted.
let clock=before,task:(()=>void)|undefined,delay:number|undefined;
const now=Date.now,timeout=globalThis.setTimeout,cancel=globalThis.clearTimeout;
Date.now=()=>clock;
globalThis.setTimeout=((callback:()=>void,milliseconds:number)=>{task=callback;delay=milliseconds;return 1;}) as typeof setTimeout;
globalThis.clearTimeout=(()=>{task=undefined;}) as typeof clearTimeout;
const focus=new Set<()=>void>(),visibility=new Set<()=>void>();
Object.defineProperty(globalThis,'window',{configurable:true,value:{addEventListener:(_n:string,fn:()=>void)=>focus.add(fn),removeEventListener:(_n:string,fn:()=>void)=>focus.delete(fn)}});
Object.defineProperty(globalThis,'document',{configurable:true,value:{addEventListener:(_n:string,fn:()=>void)=>visibility.add(fn),removeEventListener:(_n:string,fn:()=>void)=>visibility.delete(fn)}});
let tree:ReactTestRenderer;
function Fixture(){const show=useTemporaryAiNavigation();const items=workspaceNavGroups('owner',undefined,show);return <nav>{items.map(item=><a key={item.group} href={sectionPath(item.modules[0])}>{item.group}</a>)}</nav>;}
try{
 act(()=>{tree=create(<Fixture/>);});
 assert.equal(tree!.root.findAllByType('a').at(-1)?.children[0],AI_CONNECTIONS_LABEL);assert.equal(delay,1);
 clock=AI_NAV_EXPIRES_AT;act(()=>task?.());
 assert(!tree!.root.findAllByType('a').some(link=>link.children[0]===AI_CONNECTIONS_LABEL));
 assert.equal(task,undefined);
 clock=before;act(()=>focus.forEach(fn=>fn()));assert.equal(tree!.root.findAllByType('a').at(-1)?.props.href,AI_CONNECTIONS_PATH);
 clock=AI_NAV_EXPIRES_AT+1;act(()=>visibility.forEach(fn=>fn()));assert(!tree!.root.findAllByType('a').some(link=>link.children[0]===AI_CONNECTIONS_LABEL));
 act(()=>tree!.unmount());assert.equal(focus.size,0);assert.equal(visibility.size,0);
}finally{Date.now=now;globalThis.setTimeout=timeout;globalThis.clearTimeout=cancel;delete (globalThis as {window?:unknown}).window;delete (globalThis as {document?:unknown}).document;}
console.log('PASS temporary AI navigation: fixed Asuncion boundary, all roles, shared mobile/desktop order, live expiry, wake/focus and cleanup; stable preferences target.');

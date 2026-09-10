import React from 'react';
import assert from 'node:assert/strict';
import {act,create,type ReactTestRenderer} from 'react-test-renderer';
require.extensions['.css']=()=>{};
Object.assign(globalThis,{React,window:new EventTarget()});
let name='Ana Personal',historyLoads=0;
function mock(path:string,exports:unknown){const id=require.resolve(path);require.cache[id]={id,filename:id,loaded:true,exports} as NodeModule;}
mock('../app/operations',{Editor:()=>null,api:async(path:string)=>{
 if(path.endsWith('/people'))return {people:[]};
 if(path.includes('/source-events'))return {records:[{id:'2',source_author:'Ana Personal',body:'Importado',occurred_at:'2026-09-10',actor_verified:true,actor_photo_url:'https://example.invalid/never.png'}],page:{hasMore:false}};
 historyLoads++;return {records:[{id:'1',actor_name:name,actor_verified:true,actor_photo_url:'https://example.invalid/a.png',created_at:'2026-09-10',title:'Reel',action:'INSERT'}],page:{hasMore:false}};
}});
mock('../app/profile-controls',{SelectCustom:()=>null});mock('../app/dialog',{Dialog:()=>null});
const {WorkHistory}=require('../app/work-history') as typeof import('../app/work-history');
async function main(){
 let renderer:ReactTestRenderer;
 await act(async()=>{renderer=create(<WorkHistory role="admin"/>);});
 assert.equal(renderer!.root.findAllByType('img').length,1);assert(JSON.stringify(renderer!.toJSON()).includes('Ana Personal'));
 name='Ana Actualizada';await act(async()=>{window.dispatchEvent(new Event('scale:identity-changed'));});assert.equal(historyLoads,2);assert(JSON.stringify(renderer!.toJSON()).includes(name));
 await act(async()=>renderer!.root.findAllByType('button').find(b=>b.props.children==='Ver historial importado de Trello')!.props.onClick());
 assert.equal(renderer!.root.findAllByType('img').length,0);assert(JSON.stringify(renderer!.toJSON()).includes('AP'));
 await act(async()=>renderer!.unmount());
 console.log('PASS: current author avatar, identity-change reload, imported author initials even with unexpected photo metadata');
}
void main();

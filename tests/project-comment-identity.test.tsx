import React from 'react';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {act,create,type ReactTestRenderer} from 'react-test-renderer';
require.extensions['.css']=()=>{};
Object.assign(globalThis,{React});
function mock(path:string,exports:unknown){const id=require.resolve(path);require.cache[id]={id,filename:id,loaded:true,exports} as NodeModule;}
mock('../app/dialog',{Dialog:({children}:{children:React.ReactNode})=><section>{children}</section>});
mock('../app/presence',{ProjectPresence:()=>null});
let requests=0;
mock('../app/data-cache',{dataFetch:async(path:string)=>{
 requests++;assert.equal(path,'/core-api/api/agency/projects/123/comments');
 return {ok:true,json:async()=>({comments:[
  {id:'1',body:'Comentario existente',author_email:'autor@example.invalid',actor_name:'Ana María Pérez',actor_photo_url:'https://example.invalid/profile.png',actor_verified:true,created_at:'2026-09-11T22:50:00Z'},
  {id:'2',body:'Sin foto verificada',author_email:'anterior@example.invalid',actor_photo_url:'https://example.invalid/untrusted.png',actor_verified:false,created_at:'2026-09-10T22:50:00Z'},
 ]})};
}});
const {ProjectComments}=require('../app/operations') as typeof import('../app/operations');
test('existing project comments use verified full identity and fallback without another profile request',async()=>{
 let renderer:ReactTestRenderer;
 await act(async()=>{renderer=create(<ProjectComments projectId="123" name="Proyecto de prueba" role="viewer"/>);});
 await act(async()=>{renderer!.root.findByType('button').props.onClick();});
 assert.equal(requests,1);
 const cards=renderer!.root.findAllByType('article');assert.equal(cards.length,2);
 assert(JSON.stringify(renderer!.toJSON()).includes('Ana María Pérez'));
 assert.equal(cards[0].findByType('img').props.src,'https://example.invalid/profile.png');
 assert.equal(cards[0].findByType('time').props.dateTime,'2026-09-11T22:50:00.000Z');
 assert.equal(cards[1].findAllByType('img').length,0);
 assert(JSON.stringify(renderer!.toJSON()).includes('anterior@example.invalid'));
 await act(async()=>renderer!.unmount());
});

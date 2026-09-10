import React from 'react';
import assert from 'node:assert/strict';
import {act,create,type ReactTestRenderer} from 'react-test-renderer';
require.extensions['.css']=()=>{};
Object.assign(globalThis,{React});
const {ActorIdentity,actorInitials}=require('../app/actor-identity') as typeof import('../app/actor-identity');

async function main(){
 assert.equal(actorInitials('  María del Carmen  '),'MC');assert.equal(actorInitials(''),'?' );
 let renderer:ReactTestRenderer;
 await act(async()=>{renderer=create(<ActorIdentity name="Ana Pérez" photoUrl="https://example.invalid/a.png" verified/>);});
 const images=()=>renderer!.root.findAllByType('img');
 assert.equal(images().length,1);assert.equal(images()[0].props.referrerPolicy,'no-referrer');assert.equal(images()[0].props.alt,'');
 await act(async()=>images()[0].props.onError());assert.equal(images().length,0);assert(JSON.stringify(renderer!.toJSON()).includes('AP'));
 await act(async()=>renderer!.update(<ActorIdentity name="Ana Pérez" photoUrl="https://example.invalid/b.png" verified/>));assert.equal(images().length,1);
 await act(async()=>renderer!.update(<ActorIdentity name="Ana Pérez" photoUrl="https://example.invalid/b.png" verified imported/>));assert.equal(images().length,0);
 await act(async()=>renderer!.update(<ActorIdentity name="Ana Pérez" photoUrl="https://example.invalid/b.png"/>));assert.equal(images().length,0);
 for(const url of ['javascript:alert(1)','http://example.invalid/a.png','https://secret:password@example.invalid/a.png','data:text/html,hello']){
  await act(async()=>renderer!.update(<ActorIdentity name="Ana Pérez" photoUrl={url} verified/>));assert.equal(images().length,0);
 }
 await act(async()=>renderer!.update(<ActorIdentity name=""/>));assert(JSON.stringify(renderer!.toJSON()).includes('Sistema'));
 await act(async()=>renderer!.unmount());
 console.log('PASS: verified author photos, imported/unverified initials, failed image fallback, changed image retry, unsafe URLs and accessible name');
}
void main();

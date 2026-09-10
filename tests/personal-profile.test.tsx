import React from 'react';
import assert from 'node:assert/strict';
import {act,create,type ReactTestRenderer} from 'react-test-renderer';
require.extensions['.css']=()=>{};
Object.assign(globalThis,{React,window:new EventTarget()});
type Profile={email:string;full_name:string;photo_url:string|null;identity_scope:'personal'|'demo'};
let saved:Profile={email:'ana@example.invalid',full_name:'Ana Personal',photo_url:'https://example.invalid/a.png',identity_scope:'personal'};
const writes:Record<string,string>[]=[];
let fail=false,refreshes=0,closed=0,events=0;
window.addEventListener('scale:identity-changed',()=>events++);
function EditorStub(){return null;}
function PhotoStub(){return null;}
function DialogStub({children}:{children:React.ReactNode}){return <div>{children}</div>;}
function mock(path:string,exports:unknown){const id=require.resolve(path);require.cache[id]={id,filename:id,loaded:true,exports} as NodeModule;}
mock('../app/operations',{Editor:EditorStub,api:async(_path:string,values?:Record<string,string>)=>{
 if(values){if(fail)throw Error('No guardado');writes.push(values);saved={...saved,...values};}return {profile:saved};
}});
mock('../app/profile-photo',{ProfilePhoto:PhotoStub});mock('../app/dialog',{Dialog:DialogStub});
const {MyProfile}=require('../app/my-profile') as typeof import('../app/my-profile');
async function main(){
 let renderer:ReactTestRenderer;
 const props={profile:{email:'ana@example.invalid',full_name:'Nombre obsoleto'},close:()=>closed++,refresh:async()=>{refreshes++;}};
 await act(async()=>{renderer=create(<MyProfile {...props}/>);});
 assert.equal(renderer!.root.findByType(EditorStub).props.defaults.full_name,'Ana Personal');
 assert(JSON.stringify(renderer!.toJSON()).includes('se comparten entre tus empresas'));
 await act(async()=>renderer!.root.findByType(PhotoStub).props.save('https://example.invalid/b.png'));
 assert.deepEqual(writes[0],{photo_url:'https://example.invalid/b.png'});assert.equal(saved.full_name,'Ana Personal');assert.equal(refreshes,1);assert.equal(events,1);
 fail=true;await assert.rejects(()=>renderer!.root.findByType(PhotoStub).props.save('https://example.invalid/fail.png'),/No guardado/);assert.equal(events,1);assert.equal(refreshes,1);
 fail=false;await act(async()=>renderer!.root.findByType(EditorStub).props.save({full_name:'Ana Cambiada'}));assert.equal(closed,1);assert.equal(events,2);
 await act(async()=>renderer!.unmount());saved={...saved,identity_scope:'demo'};
 await act(async()=>{renderer=create(<MyProfile {...props}/>);});assert(JSON.stringify(renderer!.toJSON()).includes('Los cambios no modifican tu perfil en empresas reales'));
 await act(async()=>renderer!.unmount());
 console.log('PASS: canonical profile loading, name/photo partial saves, identity refresh event, failed save isolation, demo copy');
}
void main();

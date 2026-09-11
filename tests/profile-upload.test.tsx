import React from 'react';
import assert from 'node:assert/strict';
import {act,create,type ReactTestRenderer} from 'react-test-renderer';
require.extensions['.css']=()=>{};
Object.assign(globalThis,{React});
const {ProfilePhoto,preparePhoto}=require('../app/profile-photo') as typeof import('../app/profile-photo');
// Browser primitives are doubles: this verifies geometry and save flow, not the OS file picker.
const draws:unknown[][]=[];let closed=0;const encoded='data:image/webp;base64,YXZhdGFy';
Object.defineProperty(globalThis,'createImageBitmap',{configurable:true,value:async()=>({width:1200,height:800,close(){closed++;}})});
Object.defineProperty(globalThis,'FileReader',{configurable:true,value:class {result='data:image/jpeg;base64,b3JpZ2luYWw=';onload=()=>{};readAsDataURL(){this.onload();}}});
Object.defineProperty(globalThis,'document',{configurable:true,value:{createElement:()=>({width:0,height:0,getContext:()=>({drawImage(...args:unknown[]){draws.push(args);}}),toDataURL:(type:string,quality:number)=>{assert.equal(type,'image/webp');assert.equal(quality,.92);return encoded;}})}});
async function main(){
 const file={name:'original.jpg',type:'image/jpeg',size:1024} as File;
 assert.equal(await preparePhoto(file,false,true),encoded);
 assert.deepEqual(draws.at(-1)!.slice(1),[200,0,800,800,0,0,512,512]);
 await preparePhoto(file,true);assert.deepEqual(draws.at(-1)!.slice(1),[0,0,1200,800,0,0,512,341]);
 for(const [width,height] of [[800,1200],[100,1000],[1000,100],[80,80]]){
  Object.defineProperty(globalThis,'createImageBitmap',{configurable:true,value:async()=>({width,height,close(){closed++;}})});
  await preparePhoto(file,false,true);
  const size=Math.min(width,height),output=Math.min(size,512);
  assert.deepEqual(draws.at(-1)!.slice(1),[(width-size)/2,(height-size)/2,size,size,0,0,output,output]);
 }
 Object.defineProperty(globalThis,'createImageBitmap',{configurable:true,value:async()=>({width:1200,height:800,close(){closed++;}})});
 await assert.rejects(()=>preparePhoto({...file,type:'application/pdf'} as File),/JPG/);
 await assert.rejects(()=>preparePhoto({...file,size:5*1024*1024} as File),/4 MB/);
 let renderer:ReactTestRenderer;const saves:string[]=[];
 await act(async()=>{renderer=create(<ProfilePhoto name="Persona de prueba" photo={null} save={async value=>{saves.push(value);}}/>);});
 const input=()=>renderer!.root.findByProps({type:'file'});
 await act(async()=>{await input().props.onChange({currentTarget:{files:[file],value:'original.jpg'}});});
 assert.deepEqual(saves,[encoded]);assert(JSON.stringify(renderer!.toJSON()).includes('guardada automáticamente'));
 assert.equal(input().props.disabled,false);
 await act(async()=>renderer!.unmount());
 await act(async()=>{renderer=create(<ProfilePhoto name="Persona de prueba" photo={null} save={async()=>{throw Error('Servidor no disponible');}}/>);});
 await act(async()=>{await input().props.onChange({currentTarget:{files:[file],value:'original.jpg'}});});
 const tree=JSON.stringify(renderer!.toJSON());assert(tree.includes('Servidor no disponible'));assert(!tree.includes('Foto centrada y guardada automáticamente.'));
 assert.equal(input().props.disabled,false);assert(closed>=6);
 await act(async()=>renderer!.unmount());
 console.log('PASS: automatic single save, centered cover crop, original preservation, logo proportions, validation and visible save failure (file-picker QA separate)');
}
void main();

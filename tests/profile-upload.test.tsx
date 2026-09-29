import React from 'react';
import assert from 'node:assert/strict';
import {act,create,type ReactTestRenderer} from 'react-test-renderer';
require.extensions['.css']=()=>{};
Object.assign(globalThis,{React});
const {ProfilePhoto,preparePhoto,photoSource}=require('../app/profile-photo') as typeof import('../app/profile-photo');
// Browser primitives are doubles: this verifies geometry and save flow, not the OS file picker.
const draws:unknown[][]=[];let closed=0;const encoded='data:image/webp;base64,YXZhdGFy';
function bitmap(width:number,height:number){Object.defineProperty(globalThis,'createImageBitmap',{configurable:true,value:async()=>({width,height,close(){closed++;}})});}
bitmap(1200,800);
Object.defineProperty(globalThis,'FileReader',{configurable:true,value:class {result='data:image/jpeg;base64,b3JpZ2luYWw=';onload=()=>{};readAsDataURL(){this.onload();}}});
Object.defineProperty(globalThis,'document',{configurable:true,value:{createElement:()=>({width:0,height:0,getContext:()=>({clearRect(){},drawImage(...args:unknown[]){draws.push(args);}}),toDataURL:(type:string,quality:number)=>{assert.equal(type,'image/webp');assert.equal(quality,.92);return encoded;}})}});
async function main(){
  const file={name:'original.jpg',type:'image/jpeg',size:1024} as File;
  // #107: la foto se guarda COMPLETA (sin recorte automático), escalada al lado mayor.
  assert.equal(await preparePhoto(file),encoded);
  assert.deepEqual(draws.at(-1)!.slice(1),[0,0,1200,800,0,0,512,341],'una horizontal conserva su relación (512×341)');
  for(const [width,height] of [[800,1200],[100,1000],[1000,100],[80,80],[512,512]]){
    bitmap(width,height);
    await preparePhoto(file);
    const ratio=Math.min(1,512/Math.max(width,height)),outW=Math.max(1,Math.round(width*ratio)),outH=Math.max(1,Math.round(height*ratio));
    assert.deepEqual(draws.at(-1)!.slice(1),[0,0,width,height,0,0,outW,outH],`${width}×${height}: escala completa sin recortar`);
    const relacion=width/height, salida=outW/outH;
    assert(Math.abs(salida-relacion)/relacion<0.02,`${width}×${height}: conserva la relación de aspecto (${outW}×${outH})`);
    assert(Math.max(outW,outH)<=512,`${width}×${height}: el lado mayor no pasa de 512`);
  }
  // La fuente local del recorte manual es el archivo tal cual (no se envía).
  assert.equal(await photoSource(file),'data:image/jpeg;base64,b3JpZ2luYWw=');
  await assert.rejects(()=>preparePhoto({...file,type:'application/pdf'} as File),/JPG/);
  await assert.rejects(()=>preparePhoto({...file,size:5*1024*1024} as File),/4 MB/);
  bitmap(1200,800);
  let renderer:ReactTestRenderer;const saves:string[]=[];
  await act(async()=>{renderer=create(<ProfilePhoto name="Persona de prueba" photo={null} save={async value=>{saves.push(value);}}/>);});
  const input=()=>renderer!.root.findByProps({type:'file'});
  await act(async()=>{await input().props.onChange({currentTarget:{files:[file],value:'original.jpg'}});});
  assert.deepEqual(saves,[encoded],'la subida guarda la foto preparada (completa)');
  assert(JSON.stringify(renderer!.toJSON()).includes('Foto guardada. Podés ajustar el encuadre.'),'el aviso ya no dice que se recortó sola');
  assert(!JSON.stringify(renderer!.toJSON()).includes('centrada y guardada automáticamente'));
  assert.equal(input().props.disabled,false);
  await act(async()=>renderer!.unmount());
  await act(async()=>{renderer=create(<ProfilePhoto name="Persona de prueba" photo={null} save={async()=>{throw Error('Servidor no disponible');}}/>);});
  await act(async()=>{await input().props.onChange({currentTarget:{files:[file],value:'original.jpg'}});});
  const tree=JSON.stringify(renderer!.toJSON());assert(tree.includes('Servidor no disponible'));assert(!tree.includes('Foto guardada. Podés ajustar el encuadre.'));
  assert.equal(input().props.disabled,false);assert(closed>=6);
  await act(async()=>renderer!.unmount());
  console.log('PASS: subida sin autozoom ni autoencuadre, relación de aspecto conservada, fuente local para el recorte manual, validación y fallo de guardado visible (file-picker QA separate)');
}
void main();

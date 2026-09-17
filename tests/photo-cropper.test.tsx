import React from 'react';
import assert from 'node:assert/strict';
import {act,create,type ReactTestRenderer} from 'react-test-renderer';
require.extensions['.css']=()=>{};
Object.assign(globalThis,{React});
function CropperStub(){return null;}
function Wrapper({children}:{children:React.ReactNode}){return <div>{children}</div>;}
function mock(path:string,exports:unknown){const id=require.resolve(path);require.cache[id]={id,filename:id,loaded:true,exports} as NodeModule;}
mock('react-easy-crop',{__esModule:true,default:CropperStub});
mock('../app/dialog',{Dialog:Wrapper,FormActions:Wrapper});
const {PhotoCropper,cropImage}=require('../app/photo-cropper') as typeof import('../app/photo-cropper');
const source='data:image/jpeg;base64,b3JpZ2luYWw=',encoded='data:image/webp;base64,YXZhdGFy';
const huge='data:image/webp;base64,'+'x'.repeat(681000);
const draws:unknown[][]=[];let closedBitmaps=0,hasContext=true,alwaysHuge=false;const qualities:number[]=[];
Object.assign(globalThis,{
 fetch:async()=>{throw Error('cropImage must decode the data URL without fetching it');},
 createImageBitmap:async()=>({width:1200,height:800,close(){closedBitmaps++;}}),
 document:{createElement:()=>({width:0,height:0,getContext:()=>hasContext?{drawImage(...args:unknown[]){draws.push(args);}}:null,toDataURL:(type:string,quality:number)=>{assert.equal(type,'image/webp');qualities.push(quality);return quality===0.92||alwaysHuge?huge:encoded;}})},
});
async function main(){
 const area={x:200,y:0,width:800,height:800};
 assert.equal(await cropImage(source,area),encoded,'oversized first pass re-encodes at a lower quality');
 assert.deepEqual(qualities.slice(0,2),[0.92,0.72],'compression retries once before accepting the crop');
 assert.deepEqual(draws.at(-1)!.slice(1),[200,0,800,800,0,0,512,512]);
 await assert.rejects(()=>cropImage('https://example.invalid/a.png',area),/archivo original/);
 for(const invalid of [{...area,x:NaN},{...area,height:0}])await assert.rejects(()=>cropImage(source,invalid),/encuadre válido/);
 alwaysHuge=true;await assert.rejects(()=>cropImage(source,area),/límite/);alwaysHuge=false;
 hasContext=false;await assert.rejects(()=>cropImage(source,area),/preparar/);hasContext=true;
 assert.equal(closedBitmaps,5,'All decoded bitmaps close, including failed crops');
 let renderer:ReactTestRenderer,closed=0,fail=true;const saved:string[]=[];
 await act(async()=>{renderer=create(<PhotoCropper source={source} name="Ana" close={()=>closed++} save={async value=>{if(fail)throw Error('No guardado');saved.push(value);}}/>);});
 const crop=()=>renderer!.root.findByType(CropperStub);
 const saveButton=()=>renderer!.root.findAllByType('button').find(b=>b.props.className==='primary')!;
 assert.equal(crop().props.objectFit,'cover');assert.equal(crop().props.restrictPosition,true);assert.equal(crop().props.aspect,1);assert.equal(crop().props.cropShape,'round');
 assert.equal(saveButton().props.disabled,true,'A crop must be available before saving');
 await act(async()=>{crop().props.onCropComplete({},area);});
 await act(async()=>{await saveButton().props.onClick();});
 assert.equal(closed,0);assert.deepEqual(saved,[]);assert(JSON.stringify(renderer!.toJSON()).includes('No guardado'));
 fail=false;await act(async()=>{await saveButton().props.onClick();});assert.equal(closed,1);assert.deepEqual(saved,[encoded]);
 await act(async()=>{crop().props.onCropComplete({},{x:0,y:0,width:120,height:120});});
 assert(JSON.stringify(renderer!.toJSON()).includes('pocos píxeles'));
 await act(async()=>{crop().props.mediaProps.onError();});assert(JSON.stringify(renderer!.toJSON()).includes('No se pudo abrir la foto'));
 await act(async()=>{renderer!.unmount();});
 console.log('PASS: cover/restricted crop, exact canvas geometry, local-only decode without network, decoder cleanup, save failure/retry and image-error feedback; browser layout not simulated');
}
void main();

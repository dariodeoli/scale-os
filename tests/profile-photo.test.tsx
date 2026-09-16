import React from 'react';
import assert from 'node:assert/strict';
import {act,create} from 'react-test-renderer';

Object.assign(globalThis,{React});
require.extensions['.css']=()=>{};
function stub(path:string,exports:unknown){const id=require.resolve(path);require.cache[id]={id,filename:id,loaded:true,exports} as NodeModule;}
stub('react-easy-crop',{__esModule:true,default:()=>null});
stub('../app/photo-cropper',{PhotoCropper:()=>null});
const tinyWebp='data:image/webp;base64,UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEALmk0mk0iIiIiIgBoSygABc6zbAAA';
Object.assign(globalThis,{
 File:class{type='image/jpeg';size=1000;name='foto.jpg';},
 FileReader:class{onload:(()=>void)|null=null;result:string|null=null;readAsDataURL(){this.result='data:image/jpeg;base64,b3JpZ2luYWw=';if(this.onload)this.onload();}},
 createImageBitmap:async()=>({width:1200,height:900,close(){}}),
 document:{createElement:()=>({width:0,height:0,getContext:()=>({drawImage(){},}),toDataURL:()=>tinyWebp})},
 Image:class{onload:(()=>void)|null=null;onerror:(()=>void)|null=null;naturalWidth=800;naturalHeight=600;referrerPolicy='';set src(_value:string){queueMicrotask(()=>{if(this.onload)this.onload();});}},
});
const {ProfilePhoto}=require('../app/profile-photo') as typeof import('../app/profile-photo');
async function run(){
 const saved:string[]=[];let renderer:ReturnType<typeof create>;
 await act(async()=>{renderer=create(<ProfilePhoto compact photo={null} name="Ana" save={async value=>{saved.push(value);}}/>);});
 const file=renderer!.root.findByProps({type:'file'});
 assert.equal(file.props.accept,'image/jpeg,image/png,image/webp,image/heic,image/heif');
 await act(async()=>{await file.props.onChange({currentTarget:{files:[new (globalThis as any).File()],value:''}});});
 assert.equal(saved.length,1,'upload saves automatically');
 assert.match(saved[0],/^data:image\/webp;base64,/);
 const textOf=(node:any):string=>typeof node==='string'?node:node&&typeof node.props?.children==='string'?node.props.children:Array.isArray(node?.props?.children)?node.props.children.map(textOf).join(''):'';
 const summary=renderer!.root.findAllByType('summary').find(s=>textOf(s)==='Más opciones de foto')!;
 await act(async()=>{summary.props.onClick?.();});
 await act(async()=>{renderer!.root.findAllByType('button').find(b=>textOf(b)==='Usar enlace de imagen')!.props.onClick();});
 const linkInput=renderer!.root.findAllByType('input').find(i=>i.props.type==='url')!;
 await act(async()=>{linkInput.props.onChange({target:{value:'https://example.invalid/foto.png'}});});
 const form=renderer!.root.findAllByType('form').find(f=>f.props.className==='form-stack profile-photo-form')!;
 await act(async()=>{await form.props.onSubmit({preventDefault(){}});});
 assert.equal(saved.at(-1),'https://example.invalid/foto.png','link saves after confirming');
 await act(async()=>{renderer!.unmount();});
 console.log('PASS: compact profile photo auto-saves uploads and persists links through the confirm button');
}
void run();

import React from 'react';
import assert from 'node:assert/strict';
import {act,create,type ReactTestRenderer} from 'react-test-renderer';
require.extensions['.css']=()=>{};
Object.assign(globalThis,{React});
function CropperStub(){return null;}
const dynamicId=require.resolve('next/dynamic');
require.cache[dynamicId]={id:dynamicId,filename:dynamicId,loaded:true,exports:{__esModule:true,default:()=>CropperStub}} as NodeModule;
const {ProfilePhoto}=require('../app/profile-photo') as typeof import('../app/profile-photo');
const encoded='data:image/webp;base64,YXZhdGFy';
const file={name:'original.jpg',type:'image/jpeg',size:1024} as File;
function deferred<T>(){let resolve!:(value:T)=>void;const promise=new Promise<T>(done=>{resolve=done;});return {promise,resolve};}
const bitmap=()=>({width:1200,height:800,close(){}});
Object.assign(globalThis,{
 FileReader:class {result='data:image/jpeg;base64,b3JpZ2luYWw=';onload=()=>{};readAsDataURL(){this.onload();}},
 document:{createElement:()=>({width:0,height:0,getContext:()=>({drawImage(){}}),toDataURL:()=>encoded})},
 Image:class {naturalWidth=500;naturalHeight=500;onload:(()=>void)|null=null;onerror:(()=>void)|null=null;set src(_value:string){queueMicrotask(()=>this.onload?.());}},
});
const change=()=>({currentTarget:{files:[file],value:'original.jpg'}});
async function main(){
 let renderer:ReactTestRenderer;
 const saves:string[]=[];
 const props={name:'Ana',photo:null,save:async(value:string)=>{saves.push(value);}};
 // Closing a profile while the decoder is still preparing a file cancels the
 // not-yet-issued write. No browser or external image request is involved.
 const pending=deferred<ReturnType<typeof bitmap>>();
 Object.assign(globalThis,{createImageBitmap:()=>pending.promise});
 await act(async()=>{renderer=create(<ProfilePhoto {...props}/>);});
 let upload:Promise<void>;
 await act(async()=>{upload=renderer!.root.findByProps({type:'file'}).props.onChange(change());});
 await act(async()=>{renderer!.unmount();});
 await act(async()=>{pending.resolve(bitmap());await upload;});
 assert.deepEqual(saves,[],'Preparing an abandoned upload must not save after unmount');

 // Two input events can arrive before React renders disabled=true. Only the
 // operation accepted first may reach save; it must not race a second write.
 const preparation=deferred<ReturnType<typeof bitmap>>();let decodes=0;
 Object.assign(globalThis,{createImageBitmap:()=>{decodes++;return preparation.promise;}});
 await act(async()=>{renderer=create(<ProfilePhoto {...props}/>);});
 const input=renderer!.root.findByProps({type:'file'});let second:Promise<void>;
 await act(async()=>{upload=input.props.onChange(change());second=input.props.onChange(change());});
 await act(async()=>{preparation.resolve(bitmap());await Promise.all([upload,second]);});
 assert.equal(saves.length,1,'Concurrent input events must produce one autosave');
 assert.equal(decodes,2,'Only the accepted file is decoded for original and crop');
 await act(async()=>{renderer!.root.findAllByType('button').find(b=>b.children.includes('Mover y recortar'))!.props.onClick();});
 assert.equal(renderer!.root.findByType(CropperStub).props.source,'data:image/jpeg;base64,b3JpZ2luYWw=','Optional crop retains original pixels, not the saved thumbnail');
 assert.equal(saves[0],encoded,'Only the small final image is saved');
 await act(async()=>{renderer!.unmount();});

 // A transient preview failure must be retryable with the same valid URL.
 const url='https://example.invalid/retry.png';
 await act(async()=>{renderer=create(<ProfilePhoto {...props} photo={url}/>);});
 await act(async()=>{renderer!.root.findByType('img').props.onError();});
 assert.equal(renderer!.root.findAllByType('img').length,0);
 await act(async()=>{await renderer!.root.findByType('form').props.onSubmit({preventDefault(){},persist(){}});});
 assert.equal(saves.at(-1),url);
 assert.equal(renderer!.root.findAllByType('img').length,1,'Successful retry must clear the failed-preview marker');
 await act(async()=>{renderer!.unmount();});

 // The save lock also spans URL validation and the server response. Repeated
 // submits must not issue concurrent requests while the first remains pending.
 const server=deferred<void>();let submissions=0;
 await act(async()=>{renderer=create(<ProfilePhoto {...props} photo={url} save={async()=>{submissions++;await server.promise;}}/>);});
 const submit=renderer!.root.findByType('form').props.onSubmit;let saving:Promise<void>;
 await act(async()=>{saving=submit({preventDefault(){},persist(){}});});
 assert.equal(submissions,1);assert.equal(renderer!.root.findByProps({type:'file'}).props.disabled,true);
 await act(async()=>{await submit({preventDefault(){},persist(){}});});assert.equal(submissions,1);
 await act(async()=>{server.resolve();await saving;});assert.equal(renderer!.root.findByProps({type:'file'}).props.disabled,false);
 await act(async()=>{renderer!.unmount();});

 const images:Array<{onerror:null|(()=>void)}>=[];
 Object.assign(globalThis,{Image:class {onerror:(()=>void)|null=null;onload:(()=>void)|null=null;constructor(){images.push(this);}set src(_value:string){}}});
 await act(async()=>{renderer=create(<ProfilePhoto {...props} photo={url}/>);});
 const count=saves.length;
 await act(async()=>{saving=renderer!.root.findByType('form').props.onSubmit({preventDefault(){},persist(){}});});
 await act(async()=>{images.at(-1)!.onerror!();await saving;});
 assert.equal(saves.length,count,'Blocked URL validation must never call save');
 assert(JSON.stringify(renderer!.toJSON()).includes('No se puede mostrar esta imagen'));
 assert(!JSON.stringify(renderer!.toJSON()).includes('Foto guardada.'));
 await act(async()=>{renderer!.unmount();});
 console.log('PASS: abandoned preparation, upload/submit locks, original retention, same-URL retry and blocked-URL no-write guarantee (all image/network primitives isolated)');
}
void main();

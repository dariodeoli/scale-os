import assert from 'node:assert/strict';
import {validateImageLink} from '../app/image-link';
async function run(){
 const original=globalThis.Image,originalTimeout=globalThis.setTimeout,originalClear=globalThis.clearTimeout;
 let timeout:(()=>void)|null=null,cleared=0;
 globalThis.setTimeout=((callback:()=>void,delay:number)=>{assert.equal(delay,12000);timeout=callback;return 1;}) as unknown as typeof setTimeout;
 globalThis.clearTimeout=(()=>{cleared++;timeout=null;}) as typeof clearTimeout;
 const instances:FakeImage[]=[];
 class FakeImage{
  naturalWidth=500;naturalHeight=500;referrerPolicy='';onload:(()=>void)|null=null;onerror:(()=>void)|null=null;
  constructor(){instances.push(this);}
  set src(value:string){if(value.includes('slow'))return;if(value.includes('empty'))this.naturalWidth=0;queueMicrotask(()=>value.includes('blocked')?this.onerror?.():this.onload?.());}
 }
 globalThis.Image=FakeImage as unknown as typeof Image;
 try{
  await validateImageLink('https://example.invalid/photo.jpg');
  await assert.rejects(validateImageLink('https://example.invalid/blocked.jpg'),/No se puede mostrar/);
  await assert.rejects(validateImageLink('https://example.invalid/empty.jpg'),/imagen visible/);
  const slow=validateImageLink('https://example.invalid/slow.jpg');
  assert(timeout);(timeout as ()=>void)();await assert.rejects(slow,/tardó demasiado/);
  assert.equal(cleared,4);
  for(const image of instances){assert.equal(image.referrerPolicy,'no-referrer');assert.equal(image.onload,null);assert.equal(image.onerror,null);}
 }finally{globalThis.Image=original;globalThis.setTimeout=originalTimeout;globalThis.clearTimeout=originalClear;}
 console.log('PASS: image success, blocked URL, empty image, timeout and handler/timer cleanup; no external requests');
}
void run();

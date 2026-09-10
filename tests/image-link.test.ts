import assert from 'node:assert/strict';
import {validateImageLink} from '../app/image-link';
async function run(){
 const original=globalThis.Image;
 class FakeImage{
  naturalWidth=500;naturalHeight=500;referrerPolicy='';onload:(()=>void)|null=null;onerror:(()=>void)|null=null;
  set src(value:string){queueMicrotask(()=>value.includes('blocked')?this.onerror?.():this.onload?.());}
 }
 globalThis.Image=FakeImage as unknown as typeof Image;
 try{await validateImageLink('https://example.com/photo.jpg');await assert.rejects(validateImageLink('https://example.com/blocked.jpg'),/No se puede mostrar/);}
 finally{globalThis.Image=original;}
 console.log('PASS: image URL must load successfully before save; blocked sources reject');
}
void run();

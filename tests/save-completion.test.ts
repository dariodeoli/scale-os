import assert from 'node:assert/strict';
import test from 'node:test';
const notices:unknown[]=[];
const id=require.resolve('../app/feedback');
require.cache[id]={id,filename:id,loaded:true,exports:{notify:(notice:unknown)=>notices.push(notice)}} as NodeModule;
const {completeSave}=require('../app/save-completion') as typeof import('../app/save-completion');
test('confirmed save closes before refresh and a refresh failure is warning, not a failed mutation',async()=>{
 const steps:string[]=[];
 let reject:(error:Error)=>void=()=>{};
 const result=completeSave(()=>steps.push('close'),()=>{steps.push('refresh');return new Promise<void>((_resolve,fail)=>reject=fail);});
 assert.deepEqual(steps,['close','refresh']);
 reject(new Error('offline'));
 await result;
 assert.equal(notices.length,1);assert.equal((notices[0] as {tone:string}).tone,'warning');
 assert(JSON.stringify(notices).includes('no hace falta guardar otra vez'));
 await completeSave(()=>steps.push('close'),async()=>{steps.push('refreshed');});
 assert.equal(notices.length,1);assert.deepEqual(steps.slice(-2),['close','refreshed']);
});

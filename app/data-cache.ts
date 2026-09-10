/** Short-lived session-only cache. Never persists credentials or tenant data to disk. */
let scope='',generation=0;
const entries=new Map<string,{expires:number;response:Response}>();
const pending=new Map<string,Promise<Response>>();
export function clearDataCache(){generation++;entries.clear();pending.clear();}
export function setDataScope(next:string){if(next!==scope){scope=next;clearDataCache();}}
export async function dataFetch(url:string,init:RequestInit={}):Promise<Response>{
 const method=(init.method||'GET').toUpperCase();
 const cacheable=method==='GET'&&!!scope&&url.includes('/api/agency/')&&!/\/members|\/team|\/settings|\/activity|\/notifications/.test(url);
 if(method!=='GET')clearDataCache();
 if(!cacheable){const response=await fetch(url,init);if(method!=='GET'||response.status===401||response.status===403)clearDataCache();return response;}
 const key=scope+':'+url,now=Date.now(),cached=entries.get(key);
 if(cached&&cached.expires>now)return cached.response.clone();
 const inflight=pending.get(key);if(inflight)return (await inflight).clone();
 const version=generation;
 const work=fetch(url,init).then(response=>{
  if(response.status===401||response.status===403)clearDataCache();
  if(response.ok&&version===generation){if(entries.size>=80)entries.delete(entries.keys().next().value!);entries.set(key,{expires:Date.now()+15000,response:response.clone()});}
  return response;
 });
 pending.set(key,work);
 try{return (await work).clone();}finally{if(pending.get(key)===work)pending.delete(key);}
}

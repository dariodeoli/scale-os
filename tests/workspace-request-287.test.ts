import assert from 'node:assert/strict';
import {test} from 'node:test';
let response:Response;let cause:Error|undefined;
const calls:{url:string;init:RequestInit}[]=[],notifications:unknown[][]=[];
const cacheId=require.resolve('../app/data-cache');require.cache[cacheId]={id:cacheId,filename:cacheId,loaded:true,exports:{dataFetch:async(url:string,init:RequestInit)=>{calls.push({url,init});if(cause)throw cause;return response;}}} as NodeModule;
const feedbackId=require.resolve('../app/feedback');require.cache[feedbackId]={id:feedbackId,filename:feedbackId,loaded:true,exports:{notifyMutation:(...args:unknown[])=>notifications.push(args)}} as NodeModule;
const {request}=require('../app/workspace-request') as typeof import('../app/workspace-request');
test('real Response HTML 200 fails after one body read instead of returning empty data',async()=>{
 response=new Response('<html><body>Proxy login page</body></html>',{status:200,headers:{'content-type':'text/html'}});const before=notifications.length;
 await assert.rejects(request('/api/agency/printing'),error=>error instanceof Error&&/respuesta inválida/i.test(error.message));assert.equal(response.bodyUsed,true);assert.equal(notifications.length,before);
});
test('JSON authentication errors retain HTTP status and server message',async()=>{
 for(const status of [401,403]){response=Response.json({error:'Acceso revocado'},{status});await assert.rejects(request('/api/agency/printing'),error=>error instanceof Error&&(error as Error&{status:number}).status===status&&error.message==='Acceso revocado');}
});
test('proxy 500 body is consumed once and shown as a friendly error',async()=>{
 response=new Response('<html>internal upstream address and trace</html>',{status:503});await assert.rejects(request('/api/agency/printing'),error=>error instanceof Error&&(error as Error&{status:number}).status===503&&error.message==='El servidor no pudo completar la operación. Probá de nuevo en unos segundos.');assert.equal(response.bodyUsed,true);
});
test('success preserves core prefix, credentials, cache, headers and mutation feedback',async()=>{
 response=Response.json({ok:true});assert.deepEqual(await request('/core-api/api/agency/printing',{cache:'no-store',method:'POST',body:JSON.stringify({name:'Printer'}),headers:{'X-Test':'yes'}}),{ok:true});
 const latest=calls.at(-1)!;assert.equal(latest.url,'/core-api/api/agency/printing');assert.equal(latest.init.credentials,'include');assert.equal(latest.init.cache,'no-store');assert.deepEqual(latest.init.headers,{'Content-Type':'application/json','X-Test':'yes'});assert.deepEqual(notifications.at(-1),['/core-api/api/agency/printing','POST',{name:'Printer'},{ok:true}]);
 cause=new TypeError('Failed to fetch');await assert.rejects(request('/api/agency/printing'),/No se pudo conectar con el servidor/);cause=undefined;
});

test('empty 204, JSON arrays/primitives and null errors preserve compatibility',async()=>{
 response=new Response(null,{status:204});assert.deepEqual(await request('/api/agency/printing'),{});
 for(const value of [[{id:1}],7,'ok',null]){response=Response.json(value);assert.deepEqual(await request('/api/agency/printing'),value);}
 response=Response.json(null,{status:403});await assert.rejects(request('/api/agency/printing'),error=>error instanceof Error&&(error as Error&{status:number}).status===403&&error.message==='No se pudo completar la acción.');
});

test('a failed body read retains the already received authentication status',async()=>{
 response=new Response(new ReadableStream({start(controller){controller.error(new TypeError('Failed to fetch'));}}),{status:401});await assert.rejects(request('/api/agency/printing'),error=>error instanceof Error&&(error as Error&{status:number}).status===401&&/No se pudo conectar/.test(error.message));
});

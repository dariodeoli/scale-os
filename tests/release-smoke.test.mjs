import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createServer} from 'node:http';
import {runReleaseSmoke} from '../build-tools/release-smoke.mjs';

const paths=['/status','/registro','/health','/core-api/api/auth/me','/core-api/api/auth/providers','/core-api/api/public/maintenance'];
const valid={
 '/status':{status:200,body:'<footer>v9.8.7</footer>',type:'text/html'},
 '/registro':{status:200,body:'<footer>v9.8.7</footer>',type:'text/html'},
 '/health':{status:200,body:{ok:true,database:'ready',release:{version:'9.8.7'}}},
 '/core-api/api/auth/me':{status:401,body:{error:'No autenticado'}},
 '/core-api/api/auth/providers':{status:200,body:{google:true,microsoft:false,apple:true}},
 '/core-api/api/public/maintenance':{status:200,body:{maintenance:false,message:'',until:null,bypass:false}},
};
async function fixture(t,overrides={}){
 const calls=[],logs=[];let tick=0;
 const server=createServer((req,res)=>{
  calls.push({path:req.url,authorization:req.headers.authorization,cookie:req.headers.cookie});
  const value=overrides[req.url]||valid[req.url];
  res.writeHead(value.status,{'content-type':value.type||'application/json',...(value.headers||{})});
  res.end(typeof value.body==='string'?value.body:JSON.stringify(value.body));
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 t.after(()=>new Promise(resolve=>server.close(resolve)));
 const options={
  env:{SCALE_EXPECTED_VERSION:'9.8.7',SCALE_APP_ORIGIN:'https://web.staging.invalid/',SCALE_API_ORIGIN:'https://api.staging.invalid/',SCALE_SMOKE_TIMEOUT_MS:'10000'},
  fetchImpl:async(url,options)=>{
   assert.equal(options.redirect,'error');assert.equal(options.credentials,'omit');assert(options.signal instanceof AbortSignal);
   const parsed=new URL(url);assert.equal(parsed.protocol,'https:');assert.equal(parsed.hostname,parsed.pathname==='/health'?'api.staging.invalid':'web.staging.invalid');
   return fetch(`http://127.0.0.1:${server.address().port}${parsed.pathname}`,options);
  },
  now:()=>tick,pause:async ms=>{tick+=ms;},log:line=>logs.push(line),
 };
 return {options,calls,logs};
}
test('public smoke requires healthy API and all three anonymous login endpoints through configured web proxy',async t=>{
 const f=await fixture(t);await runReleaseSmoke(f.options);
 assert.deepEqual(f.calls.map(c=>c.path),paths);
 assert(f.calls.every(c=>!c.authorization&&!c.cookie));
 assert.equal(f.logs.length,7);assert.match(f.logs.at(-1),/v9\.8\.7/);
});
for(const [name,path,value] of [
 ['proxy503 at session','/core-api/api/auth/me',{status:503,type:'text/plain',body:'no available server'}],
 ['unexpected authenticated response','/core-api/api/auth/me',{status:200,body:{user:{id:1}}}],
 ['nonJSON401','/core-api/api/auth/me',{status:401,type:'text/html',body:'Unauthorized'}],
 ['proxy503 at providers','/core-api/api/auth/providers',{status:503,type:'text/plain',body:'no available server'}],
 ['malformed providers','/core-api/api/auth/providers',{status:200,body:{google:'true',microsoft:false,apple:true}}],
 ['proxy503 at maintenance','/core-api/api/public/maintenance',{status:503,type:'text/plain',body:'no available server'}],
 ['invalid maintenance','/core-api/api/public/maintenance',{status:200,body:{maintenance:'false'}}],
 ['initializing database','/health',{status:200,body:{ok:true,database:'initializing',release:{version:'9.8.7'}}}],
 ['old API version','/health',{status:200,body:{ok:true,database:'ready',release:{version:'9.8.6'}}}],
 ['version only in HTML comment','/status',{status:200,type:'text/html',body:'<!-- v9.8.7 -->v9.8.6'}],
 ['login redirect','/core-api/api/auth/me',{status:302,headers:{location:'/registro'},body:{}}],
])test(`smoke fails within one shared deadline: ${name}`,async t=>{
 const f=await fixture(t,{[path]:value});
 await assert.rejects(runReleaseSmoke(f.options),/no confirmó v9\.8\.7/);
 assert.equal(f.calls.filter(c=>c.path===path).length,2);
 assert(!f.logs.some(line=>line.startsWith('Smoke test público aprobado')));
});
test('temporary proxy503 retries the failed endpoint without redeploying or repeating successful probes',async t=>{
 const f=await fixture(t);const fetchImpl=f.options.fetchImpl;let calls=0;
 f.options.fetchImpl=(url,options)=>url.endsWith('/api/auth/providers')&&calls++===0?Promise.resolve(new Response('no available server',{status:503})):fetchImpl(url,options);
 await runReleaseSmoke(f.options);assert.equal(calls,2);assert.deepEqual(f.calls.map(c=>c.path),paths);
});
test('HTTP origins are rejected before making any request',async()=>{
 await assert.rejects(runReleaseSmoke({env:{SCALE_APP_ORIGIN:'http://web.invalid'},fetchImpl:()=>{throw Error('must not fetch');}}),/debe usar HTTPS/);
});

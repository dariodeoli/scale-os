import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {supervise} from './supervisor.mjs';
import config from '../next.config.mjs';

const child=code=>({args:['-e',code],env:{},stdio:'ignore'});
const forever=child('setInterval(()=>{},1000)');
async function health(t,ready=true){
 const server=http.createServer((req,res)=>{res.writeHead(ready?200:503,{'content-type':'application/json'});res.end(JSON.stringify({database:ready?'ready':'starting'}));});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 t.after(()=>new Promise(resolve=>server.close(resolve)));
 return `http://127.0.0.1:${server.address().port}/health`;
}
test('unified production routing uses only loopback; legacy callback is same-deployment alias',async()=>{
 assert.equal(config.output,'standalone');
 const rules=(await config.rewrites()).beforeFiles;
 for(const rule of rules)assert(rule.destination.startsWith('http://127.0.0.1:3001/'));
 for(const source of ['/health','/core-api/:path*','/p/:path*','/review/:path*'])assert(rules.some(rule=>rule.source===source));
 assert(rules.some(rule=>rule.has?.some(item=>item.type==='host'&&item.value==='admin.scaleparaguay.com')));
});
test('ready backend starts web; requested shutdown terminates both', {timeout:5000},async t=>{
 const services=supervise({backend:forever,web:forever,healthUrl:await health(t),shutdownTimeout:100});
 t.after(()=>services.stop());
 assert.equal(await services.ready,true);
 services.stop();assert.equal(await services.done,0);
});
test('unhealthy backend never starts web and exits failed', {timeout:5000},async t=>{
 const services=supervise({backend:forever,web:forever,healthUrl:await health(t,false),startupTimeout:100,shutdownTimeout:100});
 t.after(()=>services.stop());
 assert.equal(await services.ready,false);assert.equal(await services.done,1);
});
test('web exit terminates backend, rather than leaving a partial service', {timeout:5000},async t=>{
 const services=supervise({backend:forever,web:child('process.exit(0)'),healthUrl:await health(t),shutdownTimeout:100});
 t.after(()=>services.stop());
 assert.equal(await services.ready,true);assert.equal(await services.done,1);
});
test('backend exit stops the release before readiness', {timeout:5000},async t=>{
 const services=supervise({backend:child('process.exit(1)'),web:forever,healthUrl:await health(t,false),shutdownTimeout:100});
 t.after(()=>services.stop());
 assert.equal(await services.done,1);assert.equal(await services.ready,false);
});

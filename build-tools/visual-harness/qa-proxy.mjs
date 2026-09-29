/*
 * Proxy local de un solo origen para las mediciones y capturas de QA
 * (Compactación PLT / carga): `/core-api/*` va al API y el resto al front de
 * Next. Pipe crudo (sin descompresión) para conservar `content-encoding` y que
 * las mediciones de peso/TTFB reflejen el comportamiento real del API.
 *
 * Uso:
 *   API_PORT=3977 FRONT_PORT=3077 PROXY_PORT=3078 node build-tools/visual-harness/qa-proxy.mjs
 */
import {createServer,request as httpRequest} from 'node:http';

const API=Number(process.env.API_PORT||3977);
const FRONT=Number(process.env.FRONT_PORT||3077);
const PORT=Number(process.env.PROXY_PORT||3078);
const HOP=['connection','keep-alive','proxy-authenticate','proxy-authorization','te','trailer','transfer-encoding','upgrade'];

const server=createServer((req,res)=>{
 const coreApi=req.url.startsWith('/core-api/');
 const upstreamPath=coreApi?req.url.replace('/core-api',''):req.url;
 const headers={...req.headers,host:`127.0.0.1:${coreApi?API:FRONT}`};
 for(const hop of HOP)delete headers[hop];
 const upstream=httpRequest({host:'127.0.0.1',port:coreApi?API:FRONT,path:upstreamPath,method:req.method,headers},proxied=>{
  const out={};for(const [key,value] of Object.entries(proxied.headers)){if(!HOP.includes(key.toLowerCase()))out[key]=value;}
  res.writeHead(proxied.statusCode||502,out);
  proxied.pipe(res);
 });
 upstream.on('error',error=>{if(!res.headersSent)res.writeHead(502,{'content-type':'text/plain'});res.end(`proxy: ${error.message}`);});
 req.pipe(upstream);
});
server.on('error',error=>console.error(JSON.stringify({event:'qa_proxy_error',message:error.message})));
server.listen(PORT,'127.0.0.1',()=>console.log(`proxy listo en ${PORT} → front ${FRONT} · api ${API}`));

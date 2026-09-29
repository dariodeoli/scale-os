/*
 * Proxy local de un solo origen para las capturas de QA (Compactación PLT):
 * `/core-api/*` va al API y el resto al front de Next. Permite correr API y
 * front como procesos independientes, sin levantar el stack completo.
 *
 * Uso:
 *   API_PORT=3977 FRONT_PORT=3077 PROXY_PORT=3078 node build-tools/visual-harness/qa-proxy.mjs
 */
import {createServer} from 'node:http';

const API=Number(process.env.API_PORT||3977);
const FRONT=Number(process.env.FRONT_PORT||3077);
const PORT=Number(process.env.PROXY_PORT||3078);

const server=createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://127.0.0.1');
  const target=url.pathname.startsWith('/core-api/')?`http://127.0.0.1:${API}${url.pathname.replace('/core-api','')}${url.search}`:`http://127.0.0.1:${FRONT}${req.url}`;
  const body=req.method==='GET'||req.method==='HEAD'?undefined:await new Promise(resolve=>{const chunks=[];req.on('data',chunk=>chunks.push(chunk));req.on('end',()=>resolve(Buffer.concat(chunks)));});
  const upstream=await fetch(target,{method:req.method,headers:{...req.headers,host:undefined},body,redirect:'manual'});
  const headers={};upstream.headers.forEach((value,key)=>{if(!['content-encoding','transfer-encoding','content-length'].includes(key))headers[key]=value;});
  res.writeHead(upstream.status,headers);
  res.end(Buffer.from(await upstream.arrayBuffer()));
 }catch(error){
  if(!res.headersSent)res.writeHead(502,{'content-type':'text/plain'});
  res.end(`proxy: ${error.message}`);
 }
});
server.on('error',error=>console.error(JSON.stringify({event:'qa_proxy_error',message:error.message})));
server.listen(PORT,'127.0.0.1',()=>console.log(`proxy listo en ${PORT} → front ${FRONT} · api ${API}`));

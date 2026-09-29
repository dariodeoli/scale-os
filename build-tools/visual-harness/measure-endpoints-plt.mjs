/*
 * TTFB p95 por endpoint (#108): mide con sesión real (local o producción) y la
 * codificación que usa el navegador (brotli/gzip), N repeticiones por endpoint.
 *
 * Uso local:
 *   QA_SESSION=plt-qa-session.txt node build-tools/visual-harness/measure-endpoints-plt.mjs
 * Producción:
 *   PROD_BASE=https://app.scaleparaguay.com PROD_SESSION=<cookie> node ...
 * Opciones: QA_ITER=12 QA_ENDPOINTS=team,projects
 */
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import http from 'node:http';
import https from 'node:https';
import zlib from 'node:zlib';

/** Petición cruda (sin descompresión) para medir TTFB y peso reales. */
function request(url,cookie){
 return new Promise(resolve=>{
  const mod=url.protocol==='https:'?https:http;
  const started=performance.now();
  const req=mod.request({protocol:url.protocol,hostname:url.hostname,port:url.port,path:url.pathname+url.search,agent:false,headers:{cookie:`scale_session=${cookie}`,'accept-encoding':'gzip, br','user-agent':'scale-os-medicion',connection:'close'}},res=>{
   const ttfb=performance.now()-started;const chunks=[];
   res.on('data',chunk=>chunks.push(chunk));
   res.on('end',()=>{
    const body=Buffer.concat(chunks);const encoding=res.headers['content-encoding'];
    let decoded=body.length;
    try{if(encoding==='br')decoded=zlib.brotliDecompressSync(body).length;else if(encoding==='gzip')decoded=zlib.gunzipSync(body).length;}catch{decoded=body.length;}
    resolve({status:res.statusCode,ttfb:Math.round(ttfb),total:Math.round(performance.now()-started),bytes:body.length,decoded});
   });
  });
  req.on('error',error=>{if(process.env.QA_DEBUG)console.error(url.pathname,error.code||error.message);resolve({status:0,ttfb:0,total:0,bytes:0,decoded:0});});
  req.end();
 });
}
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const here=dirname(fileURLToPath(import.meta.url));
const repo=resolve(here,'../..');
const sessionFile=resolve(repo,'work/visual-harness',process.env.QA_SESSION||'plt-qa-session.txt');
const session=(()=>{try{return Object.fromEntries(readFileSync(sessionFile,'utf8').trim().split('\n').map(line=>line.split('=')));}catch{return {};}})();
const BASE=process.env.PROD_BASE||session.BASE;
const SESSION=process.env.PROD_SESSION||session.SESSION;
const OWNER=process.env.PROD_SESSION||session.OWNER_SESSION||SESSION;
const ITER=Number(process.env.QA_ITER||12);
const OUT=resolve(repo,process.env.OUT_DIR||'docs/qa/carga-prod');
mkdirSync(OUT,{recursive:true});

const endpoints=[
 ['/api/auth/me','sesión'],
 ['/api/agency/team','Equipo'],
 // Proyecciones reales del shell (lo que pide cada pantalla PLT).
 ['/api/agency/clients?fields=id,name,email,active,logo_url,color_key','Clientes (chrome)'],
 ['/api/agency/clients','Clientes (completo)'],
 ['/api/agency/projects?fields=id,name,client_id,client_name,work_order_count','Proyectos (chrome)'],
 ['/api/agency/projects','Proyectos (completo)'],
 ['/api/agency/work-orders?limit=300&fields=id,title,status,project_id,project_name,client_name,due_date','Órdenes (ventana shell)'],
 ['/api/agency/control-center','Centro de control'],
 ['/api/agency/dashboard','Tablero'],
 ['/api/agency/activity?limit=20&offset=0','Actividad (ventana)'],
 ['/api/agency/trash?limit=50&offset=0','Papelera (ventana)'],
 ['/api/agency/productivity/history?limit=10&offset=0','Historial (ventana)'],
 ['/api/agency/invite-links','Invitaciones'],
 ['/api/agency/access-requests','Solicitudes'],
 ['/api/agency/presence/usage','Presencia · uso'],
 ['/api/agency/notifications?status=all','Bandeja'],
 ['/api/agency/permissions','Permisos'],
 ['/api/agency/settings','Configuración'],
 ['/api/agency/exchange-rates','Cotizaciones'],
 ['/api/platform/overview','Superadmin · resumen',OWNER],
 ['/api/platform/agencies?limit=50','Superadmin · agencias',OWNER],
 ['/api/platform/users?limit=50','Superadmin · usuarios',OWNER],
 ['/api/platform/coupons?limit=50','Superadmin · cupones',OWNER],
 ['/api/platform/audit?limit=50','Superadmin · auditoría',OWNER],
];
const wanted=(process.env.QA_ENDPOINTS||'').split(',').filter(Boolean);
const list=wanted.length?endpoints.filter(([path])=>wanted.some(token=>path.includes(token))):endpoints;

const percentile=(values,p)=>{const sorted=[...values].sort((a,b)=>a-b);return sorted[Math.min(sorted.length-1,Math.max(0,Math.ceil(p/100*sorted.length)-1))];};
const rows=[];
for(const [path,label,cookie] of list){
 const times=[],bytes=[],decoded=[],statuses=[];
 for(let i=0;i<ITER;i+=1){
  const result=await request(new URL(BASE+'/core-api'+path),cookie||SESSION);
  if(result.status===200){times.push(result.ttfb);bytes.push(result.bytes);decoded.push(result.decoded);}
  statuses.push(result.status);
 }
 const ok=statuses.filter(status=>status===200).length;
 rows.push({endpoint:path,label,ok,total:statuses.length,p50:percentile(times,50),p95:percentile(times,95),max:Math.max(...times),bytesMedian:percentile(bytes,50),decodedMedian:percentile(decoded,50)});
}
const md=['| Endpoint | Uso | p50 | p95 | máx | Peso real (mediana) | Decodificado |','| --- | --- | --- | --- | --- | --- | --- |'];
for(const row of rows)md.push(`| \`${row.endpoint}\` | ${row.label} | ${row.p50} ms | ${row.p95} ms | ${row.max} ms | ${(row.bytesMedian/1024).toFixed(1)} KB | ${(row.decodedMedian/1024).toFixed(1)} KB |`);
writeFileSync(resolve(OUT,process.env.OUT_FILE||'endpoints.json'),JSON.stringify({capturedAt:new Date().toISOString(),base:BASE,iterations:ITER,rows},null,1));
writeFileSync(resolve(OUT,process.env.OUT_MD||'endpoints.md'),md.join('\n')+'\n');
console.log(md.join('\n'));

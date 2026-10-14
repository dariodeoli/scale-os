#!/usr/bin/env node
// Lanzador local para QA (no producción): levanta un PostgreSQL efímero, el API
// (`server.js`, que aplica schema + migraciones al arrancar) y un proxy delgado
// que reescribe las cookies para que funcionen en http://localhost.
//
//   npm --prefix backend run dev:local            # API en http://127.0.0.1:4100
//   SCALE_API_ORIGIN=http://127.0.0.1:4100 npm run dev   # front en :3000
//
// Variables: SCALE_DEV_API_PORT (4100), SCALE_DEV_PG_PORT (55440),
// SCALE_DEV_FRONT_ORIGIN (http://localhost:3000), SCALE_DEV_OWNER_EMAIL /
// SCALE_DEV_OWNER_PASSWORD (dueño de «scale» y admin de plataforma), SCALE_DEV_PG_DIR
// (carpeta persistente de la base; sin ella la base es descartable),
// SCALE_TEST_PG_BIN (carpeta de initdb/pg_ctl). Ctrl+C detiene todo y borra la base.
// Los correos (verificación, invitaciones, recuperación) no salen: quedan en el
// buzón JSONL que se imprime al arrancar, con los enlaces en consola.
import {execFileSync,spawn} from 'node:child_process';
import {existsSync,mkdirSync,mkdtempSync,readFileSync,rmSync,chownSync,readdirSync,writeFileSync} from 'node:fs';
import {randomBytes} from 'node:crypto';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const backend=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const apiPort=Number(process.env.SCALE_DEV_API_PORT||4100),innerPort=apiPort+1;
const pgPort=Number(process.env.SCALE_DEV_PG_PORT||55440);
const front=(process.env.SCALE_DEV_FRONT_ORIGIN||'http://localhost:3000').replace(/\/$/,'');
const ownerEmail=process.env.SCALE_DEV_OWNER_EMAIL||'owner@scale.local';
const ownerPassword=process.env.SCALE_DEV_OWNER_PASSWORD||'ScaleLocal-2026!';

const binCandidates=[process.env.SCALE_TEST_PG_BIN,...(process.env.PATH||'').split(':'),
 ...(existsSync('/usr/lib/postgresql')?readdirSync('/usr/lib/postgresql').sort().reverse().map(v=>`/usr/lib/postgresql/${v}/bin`):[]),
 '/opt/homebrew/opt/postgresql@16/bin','/opt/homebrew/opt/postgresql@17/bin','/usr/local/opt/postgresql@16/bin'].filter(Boolean);
const bin=binCandidates.find(dir=>existsSync(path.join(dir,'initdb'))&&existsSync(path.join(dir,'pg_ctl')));
if(!bin){console.error('No encontré initdb/pg_ctl. Instalá PostgreSQL 16+ o definí SCALE_TEST_PG_BIN.');process.exit(1);}
// initdb no corre como root: en contenedores se delega al usuario «postgres».
const asRoot=process.getuid?.()===0;
const pgTool=(name,args)=>asRoot
 ?execFileSync('runuser',['-u','postgres','--',path.join(bin,name),...args],{stdio:'pipe',encoding:'utf8'})
 :execFileSync(path.join(bin,name),args,{stdio:'pipe',encoding:'utf8'});

// SCALE_DEV_PG_DIR conserva la base entre arranques (no se borra al salir);
// sin ella, cada arranque es una base nueva y descartable.
const keep=process.env.SCALE_DEV_PG_DIR?path.resolve(process.env.SCALE_DEV_PG_DIR):'';
if(keep)mkdirSync(keep,{recursive:true});
const temporary=keep||mkdtempSync(path.join(os.tmpdir(),'scale-dev-pg-')),data=path.join(temporary,'data');
if(asRoot)chownSync(temporary,Number(execFileSync('id',['-u','postgres'],{encoding:'utf8'})),Number(execFileSync('id',['-g','postgres'],{encoding:'utf8'})));
let api=null,proxy=null,stopped=false;
function stop(code=0){
 if(stopped)return;stopped=true;
 try{api?.kill('SIGTERM');}catch{/* ya terminó */}
 try{proxy?.close();}catch{/* ya cerrado */}
 try{pgTool('pg_ctl',['-D',data,'stop','-m','fast','-w','-t','10']);}catch{/* no arrancó */}
 if(!keep)rmSync(temporary,{recursive:true,force:true});
 process.exit(code);
}
process.on('SIGINT',()=>stop(0));process.on('SIGTERM',()=>stop(0));

if(!existsSync(path.join(data,'PG_VERSION')))pgTool('initdb',['-D',data,'-U','scale','--no-locale','-E','UTF8','-A','trust']);
pgTool('pg_ctl',['-D',data,'-l',path.join(temporary,'postgres.log'),'-o',`-p ${pgPort} -h 127.0.0.1 -c listen_addresses=127.0.0.1`,'-w','-t','60','start']);
console.log(`PostgreSQL ${bin} en 127.0.0.1:${pgPort} (${data})`);

// El correo exige APP_URL https: se declara https://localhost y el buzón local
// (`dev-local-mail.mjs`) reescribe los enlaces a http. Nada sale a Resend.
const mailbox=path.join(temporary,'mailbox.jsonl');
// Secreto de enlaces de invitación propio de esta base local (se conserva con SCALE_DEV_PG_DIR).
const secretFile=path.join(temporary,'invite-link-secret');
if(!existsSync(secretFile))writeFileSync(secretFile,randomBytes(32).toString('hex'),{mode:0o600});
const inviteSecret=process.env.INVITE_LINK_SECRET||readFileSync(secretFile,'utf8').trim();
api=spawn(process.execPath,['--import','./scripts/dev-local-mail.mjs','server.js'],{cwd:backend,stdio:'inherit',env:{...process.env,
 PORT:String(innerPort),DATABASE_URL:`postgresql://scale@127.0.0.1:${pgPort}/postgres`,
 ADMIN_EMAIL:ownerEmail,ADMIN_PASSWORD:ownerPassword,SCALE_INITIAL_PLATFORM_ADMIN_EMAIL:ownerEmail,
 PUBLIC_ORIGIN:front,APP_URL:front.replace(/^http:/,'https:'),
 RESEND_API_KEY:'dev-local-mailbox',EMAIL_FROM:'Scale OS local <no-reply@scale.local>',SCALE_DEV_MAILBOX:mailbox,INVITE_LINK_SECRET:inviteSecret,
 CLIENT_PORTAL_ORIGIN:process.env.CLIENT_PORTAL_ORIGIN||'https://app.scaleparaguay.com/cliente'}});
console.log(`Buzón local: ${mailbox}`);
api.on('exit',code=>{if(!stopped){console.error(`El API terminó (código ${code}).`);stop(code||1);}});

// Las cookies del API llevan `Domain=.scaleparaguay.com; Secure`: el navegador las
// descarta en localhost. El proxy las vuelve host-only sin tocar el código de producción.
proxy=http.createServer((req,res)=>{
 const upstream=http.request({host:'127.0.0.1',port:innerPort,path:req.url,method:req.method,headers:req.headers},answer=>{
  const headers={...answer.headers};
  if(headers['set-cookie'])headers['set-cookie']=headers['set-cookie'].map(value=>value.replace(/;\s*Domain=[^;]*/i,'').replace(/;\s*Secure/i,''));
  res.writeHead(answer.statusCode||502,headers);answer.pipe(res);
 });
 upstream.on('error',()=>{if(!res.headersSent)res.writeHead(502,{'Content-Type':'application/json'});res.end('{"error":"API local no disponible"}');});
 req.pipe(upstream);
}).listen(apiPort,'127.0.0.1',()=>console.log(`API local en http://127.0.0.1:${apiPort} · dueño ${ownerEmail} / ${ownerPassword}\nFront: SCALE_API_ORIGIN=http://127.0.0.1:${apiPort} npm run dev`));

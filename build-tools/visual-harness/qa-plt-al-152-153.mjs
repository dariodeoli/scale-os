/*
 * QA visual de la ronda al (#152/#153): Configuración por bloques, diálogo de
 * preferencias de correo y portal del cliente (invitación válida/vencida/
 * revocada, ingreso, tablero con decisión y detalle).
 *
 * Requiere el stack local de `e2e-plt-stack.mjs` (proxy con host
 * app.scaleparaguay.com) y su archivo de sesión. Datos 100% de QA: no envía
 * correos ni toca clientes reales.
 *
 * Uso:
 *   node build-tools/visual-harness/e2e-plt-stack.mjs        # en otra terminal
 *   QA_SIZES=390x844,1440x900 QA_THEMES=light,dark \
 *   node build-tools/visual-harness/qa-plt-al-152-153.mjs
 */
import {launchChrome,openTarget} from './chrome.mjs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const here=dirname(fileURLToPath(import.meta.url));
const repo=resolve(here,'../..');
const sessionFile=resolve(repo,'work/visual-harness',process.env.QA_SESSION||'plt-qa2-session.txt');
const session=Object.fromEntries(readFileSync(sessionFile,'utf8').trim().split('\n').map(line=>line.split('=')));
const BASE=process.env.BASE_URL||session.BASE;
if(!BASE)throw new Error('Falta BASE_URL o el archivo de sesión del stack');
const PG_BIN=process.env.PG_BIN||'/opt/homebrew/opt/postgresql@17/bin';
const PG_PORT=Number(process.env.PG_PORT||55456);
const psql=sql=>execFileSync(`${PG_BIN}/psql`,['-h','127.0.0.1','-p',String(PG_PORT),'-U','postgres','-d','scaleos','-t','-A','-c',sql],{encoding:'utf8'}).trim();
const hash=raw=>createHash('sha256').update(raw).digest('hex');
const ORG=Number(session.ORG||psql("select id from organizations where slug like 'demo-session-%' order by id desc limit 1"));

/* ── Datos de QA (idempotentes) ─────────────────────────────────────────── */
const ownerId=psql(`select user_id from organization_members where organization_id=${ORG} and role='owner' and active and removed_at is null order by user_id limit 1`);
psql(`insert into agency_clients(organization_id,name,active) select ${ORG},'QA Portal 153',true where not exists(select 1 from agency_clients where organization_id=${ORG} and name='QA Portal 153')`);
const clientId=psql(`select id from agency_clients where organization_id=${ORG} and name='QA Portal 153' order by id desc limit 1`);
psql(`insert into agency_projects(organization_id,client_id,name) select ${ORG},${clientId},'Proyecto QA 153' where not exists(select 1 from agency_projects where organization_id=${ORG} and client_id=${clientId} and name='Proyecto QA 153')`);
const projectId=psql(`select id from agency_projects where organization_id=${ORG} and client_id=${clientId} and name='Proyecto QA 153' order by id desc limit 1`);
psql(`insert into agency_work_orders(organization_id,project_id,title,status) select ${ORG},${projectId},'Entrega QA 153','approved' where not exists(select 1 from agency_work_orders where organization_id=${ORG} and project_id=${projectId} and title='Entrega QA 153')`);
const orderId=psql(`select id from agency_work_orders where organization_id=${ORG} and project_id=${projectId} and title='Entrega QA 153' order by id desc limit 1`);
psql(`insert into client_portal_deliveries(organization_id,work_order_id,visible,title,summary,asset_name,asset_url,published_by_user_id,published_at)
 values(${ORG},${orderId},true,'Campaña QA 153','Pieza de prueba del portal, sin datos reales.','archivo-qa.pdf','https://example.com/archivo-qa.pdf',${ownerId},now())
 on conflict(organization_id,work_order_id) do update set visible=true,published_at=now()`);
const deliveryId=psql(`select id from client_portal_deliveries where organization_id=${ORG} and work_order_id=${orderId}`);

// Usuario, grant y sesión de portal controlados (sin enviar correo ni aceptar nada real).
const rawSession=hash('qa153-session-'+Date.now());
psql(`delete from client_portal_sessions where portal_user_id in (select id from client_portal_users where email_normalized='qa-portal@example.invalid')`);
psql(`delete from client_portal_grants where portal_user_id in (select id from client_portal_users where email_normalized='qa-portal@example.invalid')`);
psql(`delete from client_portal_users where email_normalized='qa-portal@example.invalid'`);
psql(`insert into client_portal_users(organization_id,client_id,email,email_normalized,password_hash,full_name) values(${ORG},${clientId},'qa-portal@example.invalid','qa-portal@example.invalid','qa-no-login','Cliente QA')`);
const portalUserId=psql(`select id from client_portal_users where organization_id=${ORG} and email_normalized='qa-portal@example.invalid'`);
psql(`insert into client_portal_grants(organization_id,client_id,portal_user_id,granted_by_user_id) values(${ORG},${clientId},${portalUserId},${ownerId})`);
psql(`insert into client_portal_sessions(token_hash,portal_user_id,expires_at) values('${hash(rawSession)}',${portalUserId},now()+interval '7 days')`);
psql(`insert into client_portal_delivery_decisions(organization_id,delivery_id,portal_user_id,version,decision) values(${ORG},${deliveryId},${portalUserId},1,'approved') on conflict(delivery_id,portal_user_id,version) do update set decision=excluded.decision,updated_at=now()`);

const rawValid=hash('qa153-valid-'+Date.now()),rawExpired=hash('qa153-expired-'+Date.now()),rawRevoked=hash('qa153-revoked-'+Date.now());
const invite=(raw,{expires='+ interval \'7 days\'',revoked='null'}={})=>{
 psql(`delete from client_portal_invites where token_hash='${hash(raw)}'`);
 psql(`insert into client_portal_invites(organization_id,client_id,email_normalized,token_hash,expires_at,revoked_at,invited_by_user_id) values(${ORG},${clientId},'qa-portal@example.invalid','${hash(raw)}',now()${expires},${revoked},${ownerId})`);
};
invite(rawValid);
invite(rawExpired,{expires:"- interval '1 hour'"});
invite(rawRevoked,{revoked:'now()'});

const OUT=resolve(repo,process.env.OUT_DIR||'docs/qa/plt-al-152-153/capturas');
mkdirSync(OUT,{recursive:true});
const SCREENS={
 configuracion:{path:'/configuracion',ready:'.settings-block',content:'.settings-block'},
 preferencias:{path:'/configuracion',ready:'.settings-block',clickBell:true,content:'.dialog-body'},
 'portal-invitacion-valida':{path:`/cliente/invitacion?token=${rawValid}`,readyText:'Enlace activo',content:'.client-portal-card'},
 'portal-invitacion-vencida':{path:`/cliente/invitacion?token=${rawExpired}`,readyText:'El enlace venció',content:'.client-portal-card'},
 'portal-invitacion-revocada':{path:`/cliente/invitacion?token=${rawRevoked}`,readyText:'El enlace fue revocado',content:'.client-portal-card'},
 'portal-ingresar':{path:'/cliente/ingresar',readyText:'Ver entregables',content:'.client-portal-card'},
 'portal-recuperar':{path:'/cliente/recuperar',readyText:'Recuperar contraseña',content:'.client-portal-card'},
 'portal-tablero':{path:'/cliente/entregas',readyText:'Entregables',content:'.delivery',portalSession:true},
 'portal-detalle':{path:`/cliente/entregas/${deliveryId}`,readyText:'Campaña QA 153',content:'.client-portal-card',portalSession:true},
};
const wanted=(process.env.QA_SCREENS||Object.keys(SCREENS).join(',')).split(',').filter(Boolean);

const chrome=await launchChrome();
const cdp=await openTarget(chrome.port);
const send=(m,p={})=>cdp.send(m,p);
const evaluate=async expression=>{
 const {result,exceptionDetails}=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
 if(exceptionDetails)throw new Error(exceptionDetails.text+' '+(exceptionDetails.exception?.description||''));
 return result.value;
};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const waitFor=async(expression,{timeout=45000,label=''}={})=>{
 const start=Date.now();
 while(Date.now()-start<timeout){try{if(await evaluate(`Boolean(${expression})`))return true;}catch{/* navegación en curso */}await sleep(200);}
 throw new Error(`timeout esperando ${label||expression}`);
};
const shot=async file=>{const {data}=await send('Page.captureScreenshot',{format:'jpeg',quality:82,captureBeyondViewport:true});writeFileSync(resolve(OUT,file),Buffer.from(data,'base64'));console.log(file);};
const measurements=[];
try{
 await send('Page.enable');await send('Runtime.enable');
 for(const theme of (process.env.QA_THEMES||'light,dark').split(',')){
  for(const [width,height] of (process.env.QA_SIZES||'390x844,1440x900').split(',').map(size=>size.split('x').map(Number))){
   const mobile=width<768;
   for(const id of wanted){
    const screen=SCREENS[id];
    if(!screen)throw new Error(`pantalla desconocida: ${id}`);
    await send('Network.clearBrowserCookies');
    if(screen.portalSession)await send('Network.setCookie',{name:'__Host-scale_client_session',value:rawSession,url:BASE,secure:true,httpOnly:true,sameSite:'Lax'});
    else await send('Network.setCookie',{name:'scale_session',value:session.SESSION,url:BASE});
    await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile});
    await send('Page.navigate',{url:BASE+screen.path});
    const ready=screen.ready?`document.querySelector(${JSON.stringify(screen.ready)})`:`document.body.innerText.includes(${JSON.stringify(screen.readyText)})`;
    await waitFor(ready,{label:`${id} (${width} ${theme})`});
    await sleep(900);
    if(screen.clickBell){
     await evaluate(`(()=>{const bell=[...document.querySelectorAll('button')].find(b=>(b.getAttribute('aria-label')||'').includes('Notificaciones'));if(bell)bell.click();return Boolean(bell);})()`);
     await sleep(500);
     await evaluate(`(()=>{const prefs=[...document.querySelectorAll('button')].find(b=>b.title==='Preferencias');if(prefs)prefs.click();return Boolean(prefs);})()`);
     await waitFor(`document.body.innerText.includes('Preferencias de notificaciones')`,{label:'diálogo de preferencias'});
     await sleep(400);
    }
    await evaluate(`(()=>{try{localStorage.setItem('scale-theme',${JSON.stringify(theme)})}catch{};document.documentElement.dataset.theme=${JSON.stringify(theme==='dark'?'dark':'')};return true;})()`);
    await sleep(250);
    await shot(`${id}-${width}-${theme}.jpg`);
    const metrics=await evaluate(`(()=>{const first=document.querySelector(${JSON.stringify(screen.content)});return {contentTop:first?Math.round(first.getBoundingClientRect().top):null,scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth};})()`);
    console.log(`métricas ${id} ${width}×${height} ${theme}:`,JSON.stringify(metrics));
    measurements.push({screen:id,width,height,theme,...metrics});
   }
  }
 }
 writeFileSync(resolve(OUT,'metricas-qa.json'),JSON.stringify(measurements,null,1));
 console.log(`Capturas en ${OUT}`);
}catch(error){
 console.error(error.stack||error);process.exitCode=1;
}finally{
 cdp.close();await chrome.close?.();process.exit(process.exitCode||0);
}

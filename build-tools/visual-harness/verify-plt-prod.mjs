/*
 * Verificación visual en producción de la vertical PLT (ronda #74):
 * Equipo, Perfil, Configuración y el host admin (Superadmin).
 *
 * Corre Chrome local contra la app desplegada con una sesión demo aislada
 * (cookie `scale_session` de `/api/demo/start`, no toca datos reales). Por cada
 * superficie y cada combinación ancho×tema:
 *   - captura PNG de página completa,
 *   - mide overflow horizontal del documento,
 *   - lista targets táctiles <44 px (con etiquetas y áreas `after:-inset-*`),
 *   - lista textos recortados sin `title`.
 *
 * Uso:
 *   node build-tools/visual-harness/verify-plt-prod.mjs --out work/prod-plt-74/antes
 *   SESSION=<scale_session> node ... --out ...   (si no está work/prod-plt-session.txt)
 */
import {launchChrome,openTarget} from './chrome.mjs';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const here=dirname(fileURLToPath(import.meta.url));
const BASE=process.env.BASE_URL||'https://sistema.scaleparaguay.com';
const ADMIN_BASE=process.env.ADMIN_BASE_URL||'https://admin.scaleparaguay.com';
const sessionFile=resolve(here,'../../work/prod-plt-session.txt');
const SESSION=process.env.SESSION||(readFileSync(sessionFile,'utf8').match(/scale_session=([a-f0-9]+)/)||[])[1];
if(!SESSION)throw new Error('Falta SESSION (cookie scale_session de una demo)');
const option=(name,fallback)=>{const i=process.argv.indexOf(`--${name}`);return i>=0&&process.argv[i+1]?process.argv[i+1]:fallback;};
const OUT=resolve(here,'../../',option('out','work/prod-plt-74/antes'));
const WIDTHS=(option('widths','1440,1280,390')).split(',').map(Number);
const THEMES=(option('themes','light,dark')).split(',').map(value=>value.trim());
const ONLY=(option('only','')).split(',').map(value=>value.trim()).filter(Boolean);
mkdirSync(OUT,{recursive:true});

const chrome=await launchChrome();
const cdp=await openTarget(chrome.port);
const send=(method,params={})=>cdp.send(method,params);
const evaluate=async(expression)=>{
 const {result,exceptionDetails}=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
 if(exceptionDetails)throw new Error(exceptionDetails.text+' '+(exceptionDetails.exception?.description||''));
 return result.value;
};
const sleep=ms=>new Promise(done=>setTimeout(done,ms));
const waitFor=async (expression,{timeout=45000,label=''}={})=>{
 const start=Date.now();
 while(Date.now()-start<timeout){try{if(await evaluate(`Boolean(${expression})`))return true;}catch{}await sleep(250);}
 let detail='';
 try{detail=(await evaluate(`document.body.innerText.slice(0,300)`))||'';}catch{}
 throw new Error(`timeout esperando ${label||expression} · url=${await evaluate('location.href')} · texto="${String(detail).replace(/\s+/g,' ').slice(0,200)}"`);
};
const capture=async name=>{
 const metrics=await evaluate(`({width:Math.ceil(document.documentElement.scrollWidth),height:Math.ceil(document.documentElement.scrollHeight)})`);
 const {data}=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip:{x:0,y:0,width:metrics.width,height:Math.max(200,metrics.height),scale:1}});
 writeFileSync(resolve(OUT,`${name}.png`),Buffer.from(data,'base64'));
};

const AUDIT=`(()=>{
 const visible=el=>{const r=el.getBoundingClientRect();const s=getComputedStyle(el);return r.width>0&&r.height>0&&s.visibility!=='hidden'&&s.display!=='none';};
 const expandFrom=el=>{let expand=0;const cls=String(el.className||'');for(const m of cls.matchAll(/-inset(?:-[xy])?-(\\d+(?:\\.\\d+)?)/g))expand=Math.max(expand,Number(m[1])*4);return expand;};
 const hit=el=>{const r=el.getBoundingClientRect();let w=r.width,h=r.height,node=el;
  while(node&&node!==document.body){const expand=expandFrom(node);if(expand){const nr=node.getBoundingClientRect();w=Math.max(w,nr.width+expand*2);h=Math.max(h,nr.height+expand*2);}node=node.parentElement;}
  const label=el.closest('label');if(label){const lr=label.getBoundingClientRect();w=Math.max(w,lr.width);h=Math.max(h,lr.height);}
  return {w,h};};
 const small=[];
 for(const el of document.querySelectorAll('button,a[href],input:not([type=hidden]),select,textarea,summary,[role=button],[role=switch]')){
  if(!visible(el))continue;const a=hit(el);
  if(a.w<44||a.h<44)small.push({tag:el.tagName.toLowerCase(),cls:String(el.className).slice(0,70),text:(el.getAttribute('aria-label')||el.textContent||'').trim().replace(/\\s+/g,' ').slice(0,50),w:Math.round(a.w),h:Math.round(a.h)});
 }
 const clipped=[];
 for(const el of document.querySelectorAll('span,p,b,strong,small,dd,dt,td,th,h1,h2,h3,label,div')){
  if(!visible(el))continue;
  const s=getComputedStyle(el);
  const clips=s.textOverflow==='ellipsis'||(s.webkitLineClamp&&s.webkitLineClamp!=='none'&&s.webkitLineClamp!=='0');
  if(!clips)continue;
  if(el.scrollWidth<=el.clientWidth+1&&el.scrollHeight<=el.clientHeight+1)continue;
  const text=(el.textContent||'').trim();if(!text)continue;
  if(el.title||el.closest('[title]')||el.closest('[aria-label]'))continue;
  clipped.push({tag:el.tagName.toLowerCase(),cls:String(el.className).slice(0,70),text:text.slice(0,60)});
 }
 const root=document.documentElement;
 return {scrollWidth:root.scrollWidth,clientWidth:root.clientWidth,overflow:root.scrollWidth>root.clientWidth+1,small,clipped:clipped.slice(0,20),clippedTotal:clipped.length};
})()`;

const results=[];
// La demo/local puede abrir el selector de empresa al entrar (varias empresas):
// se cierra antes de cada captura para no tapar la superficie medida.
const closeCompanyDialog=async()=>{
 await evaluate(`(()=>{const dialog=document.querySelector('[role="dialog"]');if(!dialog)return false;const title=dialog.querySelector('h2')?.textContent||'';if(!/empresa/i.test(title))return false;const close=[...dialog.querySelectorAll('button')].find(button=>(button.getAttribute('aria-label')||button.title||'')==='Cerrar');if(!close)return false;close.click();return true;})()`);
 await sleep(350);
};
const runSurface=async({name,url,prepare,ready})=>{
 if(ONLY.length&&!ONLY.includes(name))return;
 for(const theme of THEMES){
  for(const width of WIDTHS){
   await send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<768,screenWidth:width,screenHeight:900});
   await send('Page.navigate',{url});
   await waitFor(ready.expression,{label:ready.label});
   await closeCompanyDialog();
   if(prepare)await prepare();
   await evaluate(`document.documentElement.dataset.theme=${JSON.stringify(theme==='dark'?'dark':'')};`);
   await sleep(500);
   const audit=await evaluate(AUDIT);
   const label=`${name}-${width}-${theme}`;
   await capture(label);
   results.push({surface:name,width,theme,url,...audit});
   console.log(`${audit.overflow?'✗':'✓'} ${label} · overflow ${audit.overflow?'SÍ':'no'} · targets<44 ${audit.small.length} · recortes sin title ${audit.clippedTotal}`);
  }
 }
};

await send('Page.enable');await send('Runtime.enable');
await send('Network.enable');
const cookieParams={name:'scale_session',value:SESSION,url:BASE,path:'/'};
if(BASE.includes('scaleparaguay.com'))cookieParams.domain='.scaleparaguay.com';
await send('Network.setCookie',cookieParams);

const surfaceReady=label=>({expression:`document.querySelector('main.shell, main') && document.body.innerText.includes(${JSON.stringify(label)})`,label});

// Equipo
await runSurface({name:'equipo',url:`${BASE}/equipo`,ready:surfaceReady('Personas, accesos y remuneraciones')});
// Diálogo de persona (rediseño: editor + identidad/acceso en dos columnas)
await runSurface({
 name:'equipo-dialogo',url:`${BASE}/equipo`,
 ready:surfaceReady('Personas, accesos y remuneraciones'),
 prepare:async()=>{
  const clickProfile=()=>evaluate(`(()=>{const button=[...document.querySelectorAll('button')].find(candidate=>(candidate.textContent||'').trim()==='Perfil');if(button)button.click();return Boolean(button);})()`);
  await waitFor(`[...document.querySelectorAll('button')].some(candidate=>(candidate.textContent||'').trim()==='Perfil')`,{label:'botón Perfil'});
  await clickProfile();
  try{await waitFor(`document.querySelector('[role="dialog"]')?.textContent.includes('Editar persona')`,{timeout:15000,label:'diálogo Editar persona'});}
  catch{await closeCompanyDialog();await clickProfile();await waitFor(`document.querySelector('[role="dialog"]')?.textContent.includes('Editar persona')`,{label:'diálogo Editar persona (reintento)'});}
  await sleep(400);
 },
});
// Configuración
await runSurface({name:'configuracion',url:`${BASE}/configuracion`,ready:surfaceReady('Empresa')});
// Perfil (diálogo desde el topbar)
await runSurface({
 name:'perfil',url:`${BASE}/equipo`,
 ready:{expression:`document.querySelector('button[aria-label="Abrir mi perfil"]')`,label:'botón de perfil'},
 prepare:async()=>{await evaluate(`document.querySelector('button[aria-label="Abrir mi perfil"]').click()`);await waitFor(`document.querySelector('[role="dialog"]')`,{label:'diálogo Mi perfil'});await sleep(400);},
});
// Perfil con el editor de nombre abierto (el pie aparece recién al desplegar)
await runSurface({
 name:'perfil-editor',url:`${BASE}/equipo`,
 ready:{expression:`document.querySelector('button[aria-label="Abrir mi perfil"]')`,label:'botón de perfil'},
 prepare:async()=>{
  await evaluate(`document.querySelector('button[aria-label="Abrir mi perfil"]').click()`);
  await waitFor(`document.querySelector('[role="dialog"]')`,{label:'diálogo Mi perfil'});
  await evaluate(`(()=>{const summary=[...document.querySelectorAll('[role="dialog"] summary')].find(item=>item.textContent.includes('Datos personales'));if(summary)summary.click();return Boolean(summary);})()`);
  await waitFor(`document.querySelector('[role="dialog"] input, [role="dialog"] textarea')`,{label:'editor de nombre'}).catch(()=>{});
  await sleep(400);
 },
});
// Host admin: acceso público y estado sin rol (la demo no es platform admin)
await runSurface({name:'admin-acceso',url:`${ADMIN_BASE}${process.env.ADMIN_PATH||'/'}`,ready:{expression:`document.body.innerText.length>50`,label:'host admin'}});

writeFileSync(resolve(OUT,'resumen.json'),JSON.stringify({base:BASE,admin:ADMIN_BASE,widths:WIDTHS,themes:THEMES,results},null,2));
const findings=results.filter(row=>row.overflow||row.small.length||row.clippedTotal);
console.log(`\nCapturas y resumen en ${OUT}`);
console.log(findings.length?`${findings.length} superficies con hallazgos (ver resumen.json)`:'Sin hallazgos automáticos');
cdp.close();await chrome.close();

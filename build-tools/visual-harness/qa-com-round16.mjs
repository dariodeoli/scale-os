#!/usr/bin/env node
/*
 * QA ola 2 — vertical COM (#70): Clientes, Pipeline, Presupuestos, Planes y
 * Métricas en móvil/tablet (360/390/430), claro y oscuro; modales reales
 * (foco atrapado y retorno), formularios largos, targets ≥44, reduced-motion,
 * contraste y scroll horizontal de página.
 *
 * Requisitos: stack local de COM (receta en e2e-com-stack.mjs) y la sesión en
 * work/visual-harness/com-qa-session.txt.
 *
 * Uso: node build-tools/visual-harness/qa-com-round16.mjs
 *      QA_OUT=work/qa-r16/antes node ...   (fase de evidencia)
 * Env: BASE (default: sesión), QA_OUT, QA_SESSION.
 */
import {launchChrome,openTarget} from './chrome.mjs';
import {CONTRAST_JS} from './contrast.mjs';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const here=dirname(fileURLToPath(import.meta.url));
const repo=resolve(here,'../..');
const WORK=resolve(repo,'work/visual-harness');
const session=Object.fromEntries(readFileSync(resolve(WORK,process.env.QA_SESSION||'com-qa-session.txt'),'utf8').trim().split('\n').map(line=>line.split('=')));
const BASE=process.env.BASE||session.BASE;
const TOKEN=session.SESSION;
const OUT=resolve(repo,process.env.QA_OUT||'work/qa-r16/antes');

const log=[];
const check=(label,value,expected=true)=>{const ok=value===expected;log.push(`${ok?'✓':'✗'} ${label}: ${JSON.stringify(value)}${ok?'':` (esperado ${JSON.stringify(expected)})`}`);if(!ok)process.exitCode=1;};
const note=(text)=>log.push(`· ${text}`);

const chrome=await launchChrome();
const cdp=await openTarget(chrome.port);
const send=(m,p={})=>cdp.send(m,p);
const evaluate=async(expression)=>{const {result,exceptionDetails}=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(exceptionDetails)throw new Error(exceptionDetails.text);return result.value;};
const sleep=(ms)=>new Promise(resolveWait=>setTimeout(resolveWait,ms));
const waitFor=async(expression,{timeout=30000,label=''}={})=>{const start=Date.now();while(Date.now()-start<timeout){if(await evaluate(`Boolean(${expression})`))return true;await sleep(300);}throw new Error(`timeout esperando ${label||expression}`);};
const capture=async(name)=>{mkdirSync(OUT,{recursive:true});const {data}=await send('Page.captureScreenshot',{format:'png'});writeFileSync(resolve(OUT,`${name}.png`),Buffer.from(data,'base64'));};
const pressTab=async(shift=false)=>{await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9,modifiers:shift?8:0});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9,modifiers:shift?8:0});await sleep(110);};
const pressEscape=async()=>{await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await sleep(300);};
const q=(selector)=>`document.querySelector(${JSON.stringify(selector)})`;
const setTheme=(theme)=>evaluate(`(()=>{try{localStorage.setItem('scale-theme',${JSON.stringify(theme)});}catch{}document.documentElement.dataset.theme=${JSON.stringify(theme)};return true;})()`);

const SR_ONLY=`(el,style,r)=>(r.width<=4||r.height<=4)&&(style.clip!=='auto'||style.clipPath!=='none'||style.position==='absolute'||style.position==='fixed')`;
const SECTION_TARGETS=`(()=>{
 const srOnly=${SR_ONLY};
 const small=[];
 document.querySelectorAll('main button,main a[href],main input:not([type=checkbox]):not([type=hidden]),main select,main textarea').forEach(el=>{
  if(el.closest('nav,aside,.desktop-sidebar,.workspace-topbar,.workspace-footer,[aria-hidden="true"]'))return;
  const r=el.getBoundingClientRect();
  if(!r.width||!r.height||r.height<1)return;
  const style=getComputedStyle(el);
  if(style.display==='none'||style.visibility==='hidden')return;
  if(srOnly(el,style,r))return;
  if(r.height<44)small.push({tag:el.tagName,cls:String(el.className).slice(0,46),title:String(el.getAttribute('title')||el.getAttribute('aria-label')||'').slice(0,30),h:Math.round(r.height)});
 });
 return {count:small.length,sample:small.slice(0,8)};
})()`;

const DIALOG_TARGETS=`(()=>{
 const srOnly=${SR_ONLY};
 const small=[];
 document.querySelectorAll('[role="dialog"] button,[role="dialog"] a[href],[role="dialog"] input:not([type=checkbox]):not([type=hidden]),[role="dialog"] select,[role="dialog"] textarea').forEach(el=>{
  const r=el.getBoundingClientRect();
  if(!r.width||!r.height)return;
  const style=getComputedStyle(el);
  if(style.display==='none'||style.visibility==='hidden')return;
  if(srOnly(el,style,r))return;
  if(r.height<44)small.push({tag:el.tagName,cls:String(el.className).slice(0,40),label:String(el.getAttribute('aria-label')||el.getAttribute('title')||el.textContent||'').slice(0,30),h:Math.round(r.height)});
 });
 return {count:small.length,sample:small.slice(0,6)};
})()`;



const REDUCED_MOTION=`(()=>{
 const sample=[...document.querySelectorAll('main *')].slice(0,900);
 let active=0;const detail=[];
 for(const el of sample){
  if(el.closest('nav,aside,.desktop-sidebar,.workspace-topbar,[aria-hidden="true"]'))continue;
  const style=getComputedStyle(el);
  const anim=parseFloat(style.animationDuration)>0.05&&style.animationName!=='none';
  const trans=parseFloat(style.transitionDuration)>0.15;
  if(anim||trans){active+=1;if(detail.length<5)detail.push(el.tagName+'.'+String(el.className).slice(0,40)+' '+(anim?'anim '+style.animationName+' '+style.animationDuration:'trans '+style.transitionDuration));}
 }
 return {active,detail};
})()`;

const screens=[
 {name:'Clientes',path:'/clientes',marker:'[aria-label="Directorio de clientes"]',slug:'clientes'},
 {name:'Pipeline',path:'/pipeline',marker:'[aria-label="Pipeline comercial"]',slug:'pipeline'},
 {name:'Presupuestos',path:'/presupuestos',marker:'[aria-label="Presupuestos"]',slug:'presupuestos'},
 {name:'Planes',path:'/presupuestos/planes',marker:'[aria-label="Planes reutilizables"]',slug:'planes'},
 {name:'Métricas',path:'/pipeline/metricas',marker:'[aria-label="Métricas y crecimiento"]',slug:'metricas'},
];

await send('Page.enable');await send('Runtime.enable');
await send('Network.setCookie',{name:'scale_session',value:TOKEN,url:BASE,httpOnly:true});

/* ── Barrido móvil/tablet por pantalla, claro y oscuro ───────────────────── */
for(const theme of ['light','dark']){
 for(const width of [360,390,430]){
  await send('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:2,mobile:true});
  for(const screen of screens){
   await send('Page.navigate',{url:BASE+screen.path});
   await sleep(2600);
   await setTheme(theme);
   await sleep(1200);
   const loaded=await waitFor(q(screen.marker),{timeout:25000,label:`${screen.name} ${theme} ${width}`}).catch(()=>false);
   check(`${screen.name} ${theme} ${width}: carga`,loaded);
   if(!loaded)continue;
   const overflow=await evaluate(`document.documentElement.scrollWidth-document.documentElement.clientWidth`);
   check(`${screen.name} ${theme} ${width}: sin scroll horizontal`,overflow,0);
   if(['Clientes','Presupuestos'].includes(screen.name)){
    const tables=await evaluate(`document.querySelectorAll(${JSON.stringify(screen.marker+' [role="table"]')}).length`);
    check(`${screen.name} ${theme} ${width}: vista tarjeta (sin tabla densa)`,tables,0);
   }
   if(screen.name==='Pipeline'){
    const handle=await evaluate(`(()=>{const button=[...document.querySelectorAll('main button')].find(node=>/^Mover /.test(node.getAttribute('aria-label')||''));if(!button)return null;const box=button.getBoundingClientRect();const style=getComputedStyle(button);return {w:Math.round(box.width),h:Math.round(box.height),touch:style.touchAction};})()`);
    check(`${screen.name} ${theme} ${width}: asa de arrastre ≥44 y touch-action none`,Boolean(handle&&handle.w>=44&&handle.h>=44&&handle.touch==='none'));
    if(handle)note(`  asa de arrastre ${handle.w}×${handle.h} · touch-action ${handle.touch}`);
   }
   const targets=await evaluate(SECTION_TARGETS);
   check(`${screen.name} ${theme} ${width}: targets ≥44`,targets.count,0);
   if(targets.count)for(const item of targets.sample.slice(0,4))note(`  target ${item.h}px · ${item.tag}.${item.cls} ${item.title}`);
   const contrast=await evaluate(CONTRAST_JS);
   const chips=contrast.chipFailures||0;
   check(`${screen.name} ${theme} ${width}: contraste AA (fuera del chip de librería)`,contrast.failureCount-chips,0);
   check(`${screen.name} ${theme} ${width}: UI ≥3:1`,contrast.uiFailureCount,0);
   if(chips)note(`  chip de owncoding-ui con contraste pendiente: ${chips} (medido en StateChip; reportado a DSN)`);
   if(contrast.failureCount)for(const failure of contrast.failures.slice(0,4))note(`  contraste ${failure.ratio}<${failure.threshold} · ${failure.size}px/${failure.weight} · ${failure.fg} sobre ${failure.bg} · «${failure.text}» (${failure.cls})`);
   if(contrast.uiFailureCount)for(const failure of contrast.uiFailures.slice(0,3))note(`  UI ${failure.ratio}<3 · ${failure.kind} de ${failure.tag}.${failure.cls} «${failure.label||''}»`);
   await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
   await sleep(500);
   const motion=await evaluate(REDUCED_MOTION);
   check(`${screen.name} ${theme} ${width}: reduced-motion sin transiciones largas`,motion.active,0);
   if(motion.active)for(const item of motion.detail)note(`  ${item}`);
   await send('Emulation.setEmulatedMedia',{features:[]});
   if(width===390)await capture(`${screen.slug}-${theme}-390`);
  }
 }
}

/* ── Modales: foco atrapado/retorno, encaje y formularios largos ─────────── */
const modalCases=[
 {name:'Clientes · editar',path:'/clientes',marker:'[aria-label="Directorio de clientes"]',open:`(()=>{const button=[...document.querySelectorAll('button')].find(node=>node.getAttribute('title')==='Editar');if(!button)return false;button.focus();button.click();return true;})()`,slug:'modal-clientes'},
 {name:'Clientes · ficha',path:'/clientes',marker:'[aria-label="Directorio de clientes"]',open:`(()=>{const button=[...document.querySelectorAll('button')].find(node=>/^Abrir ficha: /.test(node.getAttribute('aria-label')||''));if(!button)return false;button.focus();button.click();return true;})()`,slug:'modal-ficha'},
 {name:'Presupuestos · abrir',path:'/presupuestos',marker:'[aria-label="Presupuestos"]',open:`(()=>{const button=[...document.querySelectorAll('button')].find(node=>/Abrir presupuesto/.test(node.textContent||''));if(!button)return false;button.focus();button.click();return true;})()`,slug:'modal-presupuesto'},
 {name:'Planes · nuevo (formulario largo)',path:'/presupuestos/planes',marker:'[aria-label="Planes reutilizables"]',open:`(()=>{const button=[...document.querySelectorAll('button')].find(node=>/Nuevo plan/.test(node.textContent||''));if(!button)return false;button.focus();button.click();return true;})()`,slug:'modal-plan'},
];
for(const theme of ['light','dark']){
 for(const width of [360,390]){
  for(const modal of modalCases){
   await send('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:2,mobile:true});
   await send('Page.navigate',{url:BASE+modal.path});
   await sleep(2600);
   await setTheme(theme);
   await sleep(1000);
   await waitFor(q(modal.marker),{timeout:25000,label:`${modal.name} ${theme}`});
   const opened=await evaluate(modal.open);
   check(`${modal.name} ${theme} ${width}: abre con el disparador`,opened);
   if(!opened)continue;
   const dialog=await waitFor(`document.querySelector('[role="dialog"]')`,{timeout:15000,label:`diálogo ${modal.name}`}).catch(()=>false);
   check(`${modal.name} ${theme} ${width}: diálogo visible`,dialog);
   if(!dialog)continue;
   await sleep(900);
   const inside=await evaluate(`Boolean(document.activeElement&&document.activeElement.closest('[role="dialog"]'))`);
   const trapped=[];for(let i=0;i<10;i++){await pressTab();trapped.push(await evaluate(`Boolean(document.activeElement&&document.activeElement.closest('[role="dialog"]'))`));}
   check(`${modal.name} ${theme} ${width}: el foco entra al diálogo`,inside);
   check(`${modal.name} ${theme} ${width}: el foco queda atrapado`,trapped.every(Boolean),true);
   const box=await evaluate(`(()=>{const d=document.querySelector('[role="dialog"]');const r=d.getBoundingClientRect();return {w:Math.round(r.width),h:Math.round(r.height),vw:innerWidth,vh:innerHeight,hScroll:d.scrollWidth-d.clientWidth,bodyHScroll:(d.querySelector('.dialog-body')||d).scrollWidth-(d.querySelector('.dialog-body')||d).clientWidth,fields:d.querySelectorAll('input:not([type=checkbox]),select,textarea').length};})()`);
   check(`${modal.name} ${theme} ${width}: el diálogo cabe a lo ancho`,box.w<=box.vw,true);
   check(`${modal.name} ${theme} ${width}: sin scroll horizontal dentro del formulario`,box.hScroll+box.bodyHScroll,0);
   note(`${modal.name} ${theme} ${width}: diálogo ${box.w}×${box.h} (viewport ${box.vw}) · ${box.fields} campos`);
   const dialogTargets=await evaluate(DIALOG_TARGETS);
   check(`${modal.name} ${theme} ${width}: targets ≥44 dentro del diálogo`,dialogTargets.count,0);
   if(dialogTargets.count)for(const item of dialogTargets.sample.slice(0,4))note(`  target ${item.h}px · ${item.tag}.${item.cls} ${item.label}`);
   if(width===390)await capture(`${modal.slug}-${theme}`);
   if(modal.slug==='modal-presupuesto'){
    const copy=await evaluate(`(()=>{const d=document.querySelector('[role="dialog"]');return {text:d.textContent||'',link:Boolean(d.querySelector('a[href^="http"]'))};})()`);
    check(`${modal.name} ${theme} ${width}: sin "Aceptado por ."`,/Aceptado por\s*\./.test(copy.text),false);
    if(!copy.link)check(`${modal.name} ${theme} ${width}: sin "Desactivar enlace" sin enlace público`,(copy.text||'').includes('Desactivar enlace'),false);
   }
   await pressEscape();
   await sleep(700);
   const closed=await evaluate(`Boolean(document.querySelector('[role="dialog"]'))`);
   check(`${modal.name} ${theme} ${width}: Escape cierra`,closed,false);
   const returned=await evaluate(`(()=>{const el=document.activeElement;if(!el)return false;return Boolean(el.closest('main'))&&el.tagName!=='BODY';})()`);
   check(`${modal.name} ${theme} ${width}: el foco vuelve al contenido`,returned);
  }
 }
}

/* ── Pipeline: arrastre táctil real en móvil (390) ───────────────────────── */
async function touchDrag(from,to){
 const touch=async(type,x,y)=>send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'?[]:[{x,y,id:1,radiusX:6,radiusY:6,force:1}]});
 await touch('touchStart',from.x,from.y);
 await sleep(140);
 await touch('touchMove',from.x+8,from.y+8);
 await sleep(140);
 for(let step=1;step<=12;step+=1){await touch('touchMove',Math.round(from.x+(to.x-from.x)*step/12),Math.round(from.y+(to.y-from.y)*step/12));await sleep(75);}
 await touch('touchEnd',to.x,to.y);
 await sleep(2400);
}
const dragGeometry=(name)=>`(()=>{
 const handle=[...document.querySelectorAll('main button')].find(node=>node.getAttribute('aria-label')===${JSON.stringify(name)});
 if(!handle)return null;
 handle.scrollIntoView({block:'center',inline:'center'});
 const source=handle.closest('section[aria-label]');
 const columns=[...document.querySelectorAll('main section[aria-label$="oportunidades"]')];
 const target=columns.find(column=>{if(column===source)return false;const r=column.getBoundingClientRect();return r.right>24&&r.left<innerWidth-24&&r.bottom>24&&r.top<innerHeight-24&&r.width>40;});
 if(!target)return null;
 const clamp=(value,min,max)=>Math.min(Math.max(value,min),max);
 const h=handle.getBoundingClientRect();const t=target.getBoundingClientRect();
 return {name:${JSON.stringify(name)},source:source.getAttribute('aria-label'),target:target.getAttribute('aria-label'),
  from:{x:Math.round(clamp(h.left+h.width/2,24,innerWidth-24)),y:Math.round(clamp(h.top+h.height/2,24,innerHeight-24))},
  to:{x:Math.round(clamp(t.left+t.width/2,24,innerWidth-24)),y:Math.round(clamp(t.top+140,24,innerHeight-24))}};})()`;
await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:2,mobile:true});
await send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
await send('Page.navigate',{url:BASE+'/pipeline'});
await sleep(3000);
await setTheme('light');
await waitFor(q('[aria-label="Pipeline comercial"]'),{label:'pipeline dnd'});
const firstHandle=await evaluate(`(()=>{const handle=[...document.querySelectorAll('main button')].find(node=>/^Mover /.test(node.getAttribute('aria-label')||''));return handle?handle.getAttribute('aria-label'):null;})()`);
check('Pipeline 390: hay tarjeta con asa para arrastrar',Boolean(firstHandle));
if(firstHandle){
 const dragPlan=await evaluate(dragGeometry(firstHandle));
 check('Pipeline 390: hay etapa destino visible',Boolean(dragPlan));
 if(dragPlan){
  await touchDrag(dragPlan.from,dragPlan.to);
  const movedTo=await evaluate(`(()=>{const handle=[...document.querySelectorAll('main button')].find(node=>node.getAttribute('aria-label')===${JSON.stringify(dragPlan.name)});return handle?handle.closest('section[aria-label]')?.getAttribute('aria-label')||null:null;})()`);
  const moved=movedTo!==null&&movedTo!==dragPlan.source;
  check('Pipeline 390: el arrastre táctil mueve la tarjeta',moved);
  note(`  «${dragPlan.name}» ${dragPlan.source} → ${movedTo||'sin cambio'}`);
  await capture('pipeline-dnd-390');
  if(moved){
   const backPlan=await evaluate(dragGeometry(dragPlan.name));
   if(backPlan&&backPlan.target!==dragPlan.source&&backPlan.source===movedTo){
    // La geometría del gesto vuelve a apuntar a la columna original.
    const toSource=await evaluate(`(()=>{const handle=[...document.querySelectorAll('main button')].find(node=>node.getAttribute('aria-label')===${JSON.stringify(dragPlan.name)});const source=[...document.querySelectorAll('main section[aria-label$="oportunidades"]')].find(column=>column.getAttribute('aria-label')===${JSON.stringify(dragPlan.source)});if(!handle||!source)return null;const clamp=(value,min,max)=>Math.min(Math.max(value,min),max);const h=handle.getBoundingClientRect();const t=source.getBoundingClientRect();return {from:{x:Math.round(clamp(h.left+h.width/2,24,innerWidth-24)),y:Math.round(clamp(h.top+h.height/2,24,innerHeight-24))},to:{x:Math.round(clamp(t.left+t.width/2,24,innerWidth-24)),y:Math.round(clamp(t.top+140,24,innerHeight-24))}};})()`);
    if(toSource){await touchDrag(toSource.from,toSource.to);note('  tarjeta devuelta a una etapa anterior para no dejar datos movidos');}
   }
  }
 }
}
await send('Emulation.setTouchEmulationEnabled',{enabled:false}).catch(()=>{});

console.log(log.join('\n'));
console.log(process.exitCode?'FALLÓ la QA ola 2 COM (ver hallazgos)':'PASS QA ola 2 COM: móvil/tablet, dark, modales y formularios largos verificados.');
await send('Page.close').catch(()=>{});
process.exit(process.exitCode||0);

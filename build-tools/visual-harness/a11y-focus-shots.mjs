/*
 * Capturas de foco (ronda 13, #60): por pantalla y tema, enfoca con Tab tres
 * veces y guarda la captura con el indicador de foco visible.
 *
 * Uso: node build-tools/visual-harness/a11y-focus-shots.mjs
 * Requisitos: stack local (receta en `e2e-drag.mjs`). Env: BASE_URL, QA_OUT.
 */
import {launchChrome,openTarget} from './chrome.mjs';
import {mkdirSync,writeFileSync} from 'node:fs';

const BASE=process.env.BASE_URL||'http://127.0.0.1:3006';
const OUT=process.env.QA_OUT||'work/visual-harness/a11y-60';
const SCREENS=[
 {route:'/produccion',slug:'produccion'},
 {route:'/proyectos',slug:'proyectos'},
 {route:'/inventario',slug:'inventario'},
 {route:'/estudio',slug:'estudio'},
 {route:'/equipo/historial',slug:'historial'},
];
const sleep=(ms)=>new Promise(resolve=>setTimeout(resolve,ms));

for(const theme of ['light','dark']){
 for(const screen of SCREENS){
  const chrome=await launchChrome();
  const cdp=await openTarget(chrome.port);
  const send=(m,p={})=>cdp.send(m,p);
  const evaluate=async(e)=>{const {result,exceptionDetails}=await send('Runtime.evaluate',{expression:e,returnByValue:true,awaitPromise:true});if(exceptionDetails)throw new Error(exceptionDetails.text);return result.value;};
  await send('Page.enable');await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
  await send('Network.setCookie',{name:'scale_session',value:'measure-token',url:BASE});
  await send('Page.navigate',{url:BASE+screen.route});
  await sleep(8000);
  if(screen.route==='/produccion'&&!await evaluate(`Boolean(document.querySelector('[data-column]'))`)){
   await evaluate(`(()=>{const el=[...document.querySelectorAll('[role=group] button')].find(b=>b.textContent.trim()==='Tablero');if(el)el.click();return true;})()`);
   await sleep(2500);
  }
  await evaluate(`(()=>{try{localStorage.setItem('scale-theme',${JSON.stringify(theme)})}catch{};document.documentElement.dataset.theme=${JSON.stringify(theme)};return true;})()`);
  await sleep(1200);
  // Enfocar el primer control del contenido (saltando la cáscara) con Tab.
  const focused=[];
  for(let i=0;i<14;i++){
   await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
   await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
   await sleep(90);
   const info=await evaluate(`(()=>{const el=document.activeElement;if(!el||el===document.body)return null;const r=el.getBoundingClientRect();const inContent=el.closest('main')&&!el.closest('nav,aside,.workspace-topbar,.desktop-sidebar');return inContent?{tag:el.tagName,label:(el.getAttribute('aria-label')||el.textContent||'').trim().slice(0,30),y:Math.round(r.top)}:null;})()`);
   if(info){focused.push(info);break;}
  }
  mkdirSync(OUT,{recursive:true});
  const {data}=await send('Page.captureScreenshot',{format:'png'});
  writeFileSync(`${OUT}/foco-${screen.slug}-${theme}.png`,Buffer.from(data,'base64'));
  console.log(`captura foco-${screen.slug}-${theme}.png · primer control del contenido: ${focused[0]?`${focused[0].tag} «${focused[0].label}»`:'—'}`);
  await cdp.send('Page.close').catch(()=>{});
  chrome.process?.kill?.('SIGKILL');
 }
}
process.exit(0);

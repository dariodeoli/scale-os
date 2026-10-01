/*
 * QA ola 2 — chequeo de interacción de modales/forms (issue #125):
 * foco al abrir, Escape para cerrar, scroll interno, targets y validación
 * visible en Equipo/Plataforma. Requiere el stack del harness.
 *
 * Uso: node build-tools/visual-harness/qa-plt-modal-check.mjs
 */
import {launchChrome,openTarget} from './chrome.mjs';
import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const here=dirname(fileURLToPath(import.meta.url));
const repo=resolve(here,'../..');
const session=Object.fromEntries(readFileSync(resolve(repo,'work/visual-harness','plt-qa2-session.txt'),'utf8').trim().split('\n').map(line=>line.split('=')));
const BASE=session.BASE;

const CASES=[
 {name:'equipo-alta', path:'/equipo', ready:'.team-filters', owner:false, open:{text:'Agregar persona'}, submit:'Guardar'},
 {name:'equipo-permisos', path:'/equipo', ready:'.team-filters', owner:false, open:{text:'Permisos del panel'}},
 {name:'perfil', path:'/equipo', ready:'.team-filters', owner:false, open:{aria:'Abrir mi perfil'}},
 {name:'nueva-empresa', path:'/configuracion', ready:'.settings-slice .settings-card', owner:true, open:{text:'Crear otra empresa'}, submit:'Crear empresa e iniciar prueba'},
];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

const chrome=await launchChrome();
const cdp=await openTarget(chrome.port);
const send=(m,p={})=>cdp.send(m,p);
const evaluate=async(expression)=>{
 const {result,exceptionDetails}=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
 if(exceptionDetails)throw new Error(exceptionDetails.text+' '+(exceptionDetails.exception?.description||''));
 return result.value;
};
const results=[];
for(const size of (process.env.QA_SIZES||'390x844,768x1024').split(',').map(value=>value.split('x').map(Number))){
 const [width,height]=size;
 for(const testCase of CASES){
  await send('Network.clearBrowserCookies');
  await send('Network.setCookie',{name:'scale_session',value:testCase.owner?session.OWNER_SESSION:session.SESSION,url:BASE});
  await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<768});
  await send('Page.navigate',{url:BASE+testCase.path});
  const start=Date.now();
  while(Date.now()-start<60000){try{if(await evaluate(`Boolean(document.querySelector(${JSON.stringify(testCase.ready)}))`))break;}catch{}await sleep(250);}
  await sleep(1000);
  const before=await evaluate(`({bodyOverflow:getComputedStyle(document.body).overflow,scrollLocked:document.body.style.overflow==='hidden'||document.documentElement.style.overflow==='hidden'})`);
  const opened=await evaluate(`(()=>{const q=${JSON.stringify(testCase.open)};const button=q.aria?document.querySelector('[aria-label="'+q.aria+'"]'):[...document.querySelectorAll('button')].find(el=>(el.textContent||'').trim().startsWith(q.text));if(!button)return false;button.click();return true;})()`);
  if(!opened){results.push({name:testCase.name,width,height,error:'no se encontró el disparador'});continue;}
  await sleep(900);
  const dialogOpen=await evaluate(`Boolean(document.querySelector('.ops-dialog'))`);
  if(!dialogOpen){results.push({name:testCase.name,width,height,error:'el modal no se abrió'});continue;}
  const state=await evaluate(`(()=>{
   const dialog=document.querySelector('.ops-dialog');const body=dialog.querySelector('.dialog-body')||dialog;
   const focusInside=Boolean(document.activeElement&&dialog.contains(document.activeElement));
   const focusLabel=(document.activeElement?.getAttribute('aria-label')||document.activeElement?.textContent||'').trim().slice(0,40);
   const small=[...dialog.querySelectorAll('button,input,select,textarea,a[href]')].filter(el=>{const r=el.getBoundingClientRect();if(r.width<1||r.height<1)return false;let node=el,hit=r;for(let i=0;i<4&&node;i++){node=node.parentElement;if(!node)break;const pr=node.getBoundingClientRect();if(pr.height>hit.height)hit=pr;if(node.tagName==='LABEL'||node.tagName==='BUTTON')break;}return hit.height<40;}).slice(0,8).map(el=>({tag:el.tagName,label:(el.getAttribute('aria-label')||el.getAttribute('placeholder')||el.textContent||'').trim().slice(0,40),h:Math.round(el.getBoundingClientRect().height)}));
   const rect=dialog.getBoundingClientRect();
   return {focusInside,focusLabel,small,rect:{top:Math.round(rect.top),bottom:Math.round(rect.bottom),w:Math.round(rect.width),h:Math.round(rect.height),viewport:window.innerHeight},hScroll:body.scrollWidth>body.clientWidth+2,vScroll:body.scrollHeight>body.clientHeight+2,bodyOverflow:getComputedStyle(document.body).overflow};
  })()`);
  let validation=null;
  if(testCase.submit){
   await evaluate(`(()=>{const button=[...document.querySelectorAll('.ops-dialog button')].find(el=>(el.textContent||'').trim().startsWith(${JSON.stringify(testCase.submit)}));if(button)button.click();return Boolean(button);})()`);
   await sleep(700);
   validation=await evaluate(`(()=>{const alerts=[...document.querySelectorAll('.ops-dialog [role="alert"], .ops-dialog .error, .ops-dialog .form-note')].filter(el=>{const r=el.getBoundingClientRect();return r.width>0&&r.height>0;}).map(el=>(el.textContent||'').trim().slice(0,70));return alerts.slice(0,4);})()`);
  }
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
  await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
  await sleep(600);
  const closed=await evaluate(`!document.querySelector('.ops-dialog')`);
  const after=await evaluate(`({bodyOverflow:getComputedStyle(document.body).overflow,focusTag:document.activeElement?.tagName,focusLabel:(document.activeElement?.getAttribute('aria-label')||document.activeElement?.textContent||'').trim().slice(0,40)})`);
  results.push({name:testCase.name,width,height,before,state,validation,escapeClosed:closed,after});
 }
}
await chrome.close?.();
console.log(JSON.stringify(results,null,1));

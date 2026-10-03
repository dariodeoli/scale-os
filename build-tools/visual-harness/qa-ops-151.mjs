/*
 * Auditoría #151 de Operaciones: ruido de estados, horas humanas, vencido vs.
 * aprobado/publicado, detalle de pieza sin emails técnicos y checklists con
 * atribución correcta; fallback de foto rota y nombres completos en Inventario.
 *
 * Requisitos: stack local de OPS (`e2e-ops-stack.mjs`) con el build actual.
 * Uso: node build-tools/visual-harness/qa-ops-151.mjs --tag antes|despues [--checks]
 * Salida: docs/qa/demo-151/<tag>/ (capturas) + informe-<tag>.json
 */
import {launchChrome,openTarget} from './chrome.mjs';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const here=dirname(fileURLToPath(import.meta.url));
const repo=resolve(here,'../..');
const arg=(name,fallback='')=>{const index=process.argv.indexOf(`--${name}`);return index>=0&&process.argv[index+1]?process.argv[index+1]:fallback;};
const tag=arg('tag','despues');
const withChecks=process.argv.includes('--checks');
const out=resolve(repo,'docs/qa/demo-151',tag);
mkdirSync(out,{recursive:true});
const session=Object.fromEntries(readFileSync(resolve(repo,'work/visual-harness/ops-qa-session.txt'),'utf8').split('\n').filter(Boolean).map((line)=>line.split('=')));
const BASE=process.env.BASE_URL||session.BASE||'http://127.0.0.1:3006';

const log=[];const checks=[];
const check=(label,value,expected=true)=>{const ok=value===expected;checks.push({label,ok,value,expected});log.push(`${ok?'✓':'✗'} ${label}: ${JSON.stringify(value)}${ok?'':` (esperado ${JSON.stringify(expected)})`}`);if(!ok)process.exitCode=1;};
const note=(text)=>log.push(`· ${text}`);
const chrome=await launchChrome();
const cdp=await openTarget(chrome.port);
const send=(method,params={})=>cdp.send(method,params);
const evaluate=async(expression)=>{const {result,exceptionDetails}=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(exceptionDetails)throw new Error(exceptionDetails.text+' '+(exceptionDetails.exception?.description||''));return result.value;};
const waitFor=async(expression,{timeout=20000,label=''}={})=>{const start=Date.now();while(Date.now()-start<timeout){if(await evaluate(`Boolean(${expression})`))return true;await new Promise(r=>setTimeout(r,200));}throw new Error(`timeout esperando ${label||expression}`);};
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
const capture=async(name)=>{const {data}=await send('Page.captureScreenshot',{format:'jpeg',quality:78});writeFileSync(resolve(out,`${name}.jpg`),Buffer.from(data,'base64'));note(`captura ${tag}/${name}.jpg`);};
const clickByText=(text,selector='button,a,summary')=>evaluate(`(()=>{const el=[...document.querySelectorAll(${JSON.stringify(selector)})].find(node=>node.textContent.trim()===${JSON.stringify(text)}&&node.getClientRects().length>0);if(!el)return false;el.focus?.();el.click();return true;})()`);
const clickByLabel=(label,selector='button,a,[role=button]')=>evaluate(`(()=>{const el=[...document.querySelectorAll(${JSON.stringify(selector)})].find(node=>(node.getAttribute('aria-label')||'')===${JSON.stringify(label)}&&node.getClientRects().length>0);if(!el)return false;el.focus?.();el.click();return true;})()`);
const setTheme=async(theme)=>{await evaluate(`(()=>{localStorage.setItem('scale-theme',${JSON.stringify(theme)});if(${JSON.stringify(theme)}==='light')document.documentElement.removeAttribute('data-theme');else document.documentElement.dataset.theme=${JSON.stringify(theme)};return document.documentElement.dataset.theme||'light';})()`);await sleep(250);};
const setViewport=async(width,height)=>{await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<768});await sleep(300);};
const navItem=async(name)=>evaluate(`(()=>{const side=document.querySelector('.desktop-sidebar'),drawer=document.querySelector('.mobile-sidebar');const roots=[side&&side.getBoundingClientRect().width>0?side:null,drawer].filter(Boolean);for(const root of roots){const el=[...root.querySelectorAll('button,a')].find(node=>node.textContent.trim()===${JSON.stringify(name)}&&node.getClientRects().length>0);if(el){el.focus?.();el.click();return true;}}return false;})()`);
const ensureDrawer=async()=>{if(await evaluate(`!document.querySelector('.mobile-sidebar')&&(document.querySelector('.mobile-menu-trigger')?.getBoundingClientRect().width||0)>0`)){await clickByLabel('Abrir menú');await waitFor(`document.querySelector('.mobile-sidebar')`,{label:'drawer móvil',timeout:8000});}};
const goTo=async(name)=>{
 if(await navItem(name)){await sleep(1500);return true;}
 await ensureDrawer();
 if(await navItem(name)){await sleep(1500);return true;}
 const groups=await evaluate(`(()=>{const root=document.querySelector('.mobile-sidebar')||document.querySelector('.desktop-sidebar');if(!root)return [];return [...root.querySelectorAll('.nav-group-toggle')].map(group=>group.textContent.trim());})()`);
 for(const group of groups){
  await evaluate(`(()=>{const root=document.querySelector('.mobile-sidebar')||document.querySelector('.desktop-sidebar');const group=[...root.querySelectorAll('.nav-group-toggle')].find(node=>node.textContent.trim()===${JSON.stringify(group)});if(!group)return false;group.click();return true;})()`);
  await sleep(1600);
  await ensureDrawer();
  if(await navItem(name)){await sleep(1500);return true;}
 }
 return false;
};

// Foto rota real servida por un host inexistente: el DOM debe fallbackear.
const prepareBrokenPhoto=async()=>{
 const response=await fetch(BASE+'/core-api/api/agency/inventory',{headers:{Cookie:`scale_session=${session.OWNER_TOKEN}`}});
 const data=await response.json();
 const item=(data.records||[]).find(row=>!row.photo_url)||(data.records||[])[0];
 if(!item)return null;
 await fetch(`${BASE}/core-api/api/agency/inventory/${item.id}`,{method:'PATCH',headers:{Cookie:`scale_session=${session.OWNER_TOKEN}`,'Content-Type':'application/json'},body:JSON.stringify({photo_url:'https://qa-151.invalid/foto-rota.jpg'})});
 note(`foto rota preparada en «${item.name}» (#${item.id})`);
 return {id:String(item.id),name:item.name};
};

await send('Page.enable');await send('Runtime.enable');await send('Network.enable');
await send('Network.setCookie',{name:'scale_session',value:session.OWNER_TOKEN||'measure-token',url:BASE});
await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
await send('Page.navigate',{url:BASE+'/'});
await sleep(4500);
await evaluate(`localStorage.clear()`);await send('Page.reload');await sleep(4500);
await waitFor(`[...document.querySelectorAll('button,a')].some(n=>n.textContent.trim()==='Inventario'||n.textContent.trim()==='Resumen')`,{label:'cáscara',timeout:30000});
const broken=await prepareBrokenPhoto();
await send('Page.reload');await sleep(4500);

const widths=[[390,844],[1440,900]];
for(const [width,height] of widths){
 await setViewport(width,height);await setTheme('light');
 const W=String(width);
 log.push(`\n──── ${width}×${height} ────`);

 // Producción: ruido, horas y vencido vs. publicado.
 await goTo('Producción');
 await waitFor(`document.querySelector('[data-order]')`,{label:'tablero'});
 await sleep(900);
 await capture(`produccion-tablero-${W}-light`);
 await setTheme('dark');await capture(`produccion-tablero-${W}-dark`);await setTheme('light');
 // Las etapas finales muestran la entrega cumplida, no «venció» (#151).
 await evaluate(`(()=>{const next=document.querySelector('[data-board-next]');for(let i=0;i<3;i++)next?.click();return true;})()`);
 await sleep(900);
 await capture(`produccion-etapas-finales-${W}-light`);
 await setTheme('dark');await capture(`produccion-etapas-finales-${W}-dark`);await setTheme('light');
 await evaluate(`(()=>{const prev=document.querySelector('[data-board-prev]');for(let i=0;i<3;i++)prev?.click();return true;})()`);
 await sleep(700);
 if(withChecks){
  const board=await evaluate(`(()=>{const cards=[...document.querySelectorAll('[data-order]')];const text=cards.map(card=>card.innerText).join('\\n');
   const noisy=cards.filter(card=>/Sin definir|Sin clasificar/.test(card.innerText)).length;
   const fracHours=(text.match(/\\d+\\.\\d{2} h/g)||[]);
   const overdueDone=cards.filter(card=>['approved','published'].includes(card.getAttribute('data-status'))&&/(venció|overdue)/.test(card.innerText)).length;
   const doneInRed=cards.filter(card=>['approved','published'].includes(card.getAttribute('data-status'))&&card.querySelector('.due-date.overdue')).length;
   return {cards:cards.length,noisy,fracHours,overdueDone,doneInRed};})()`);
  check(`producción ${W}: sin «Sin definir»/«Sin clasificar»`,board.noisy,0);
  check(`producción ${W}: horas sin decimales vacíos`,board.fracHours.length,0);
  check(`producción ${W}: aprobadas/publicadas no muestran «venció»`,board.overdueDone,0);
  check(`producción ${W}: ninguna pieza terminada queda en rojo`,board.doneInRed,0);
  note(`producción ${W}: ${board.cards} tarjetas`);
 }

 // Detalle de pieza: identidad real y checklist con estado.
 await evaluate(`(()=>{const card=[...document.querySelectorAll('[data-order][data-status="to_record"]')].find(node=>/pasos/.test(node.innerText))||document.querySelector('[data-order]');const button=card?.querySelector('button[aria-label^="Abrir "]');if(button)button.click();return Boolean(button);})()`);
 await waitFor(`Boolean(document.querySelector('[role="dialog"]'))`,{label:'detalle de pieza'});
 await sleep(1800);
 await evaluate(`(()=>{const panel=document.querySelector('[role="dialog"]');const tab=[...panel.querySelectorAll('button')].find(node=>node.textContent.trim()==='Detalle');if(tab)tab.click();return true;})()`);
 await sleep(600);
 await capture(`pieza-detalle-${W}-light`);
 await setTheme('dark');await capture(`pieza-detalle-${W}-dark`);await setTheme('light');
 // Checklist: la atribución se lee dentro del pliegue (#151).
 await evaluate(`(()=>{const panel=document.querySelector('[role="dialog"]');const checklist=panel&&panel.querySelector('.work-checklist');if(checklist)checklist.scrollIntoView({block:'center'});return Boolean(checklist);})()`);
 await sleep(700);
 await capture(`pieza-checklist-${W}-light`);
 await setTheme('dark');await capture(`pieza-checklist-${W}-dark`);await setTheme('light');
 if(withChecks){
  const detail=await evaluate(`(()=>{const panel=document.querySelector('[role="dialog"]');const text=panel?panel.innerText:'';
   return {hasRawDemoEmail:/@(?:scale-)?demo\\.example\\.invalid/.test(text),hasHours:/(?:^|\\n)Horas estimadas\\n[^\\n]+/.test(text),hoursLabel:(text.match(/Horas estimadas\\n([^\\n]+)/)||[])[1]||'',checklistComplete:/Completado/.test(text)};})()`);
  check(`detalle ${W}: sin emails técnicos del demo`,detail.hasRawDemoEmail,false);
  check(`detalle ${W}: horas estimadas en formato humano`,!/\\d+\\.\\d{2} h/.test(detail.hoursLabel),true);
  check(`detalle ${W}: un ítem completado muestra su estado`,detail.checklistComplete,true);
  note(`detalle ${W}: horas «${detail.hoursLabel}»`);
 }
 await evaluate(`(()=>{const panel=document.querySelector('[role="dialog"]');const close=[...panel.querySelectorAll('button')].find(node=>(node.getAttribute('aria-label')||'').match(/cerrar|close/i));if(close)close.click();})()`);
 await sleep(600);

 // Inventario: foto rota con fallback y nombres completos.
 await goTo('Inventario');
 await waitFor(`document.querySelector('[aria-label="Vista de inventario"]')`,{label:'inventario'});
 await sleep(800);
 await evaluate(`(()=>{const control=document.querySelector('[aria-label="Vista de inventario"]');const el=control&&[...control.querySelectorAll('button')].find(n=>n.textContent.trim()==='Lista');if(el)el.click();return true;})()`);
 await waitFor(`document.querySelector('[data-list-row="equipment"]')`,{label:'lista de inventario'});
 await sleep(700);
 await capture(`inventario-lista-${W}-light`);
 await setTheme('dark');await capture(`inventario-lista-${W}-dark`);await setTheme('light');
 if(withChecks){
  const brokenName=broken?.name||'';
  const list=await evaluate(`(()=>{const rows=[...document.querySelectorAll('[data-list-row="equipment"]')];const clipped=rows.filter(row=>{const b=row.querySelector('b');return b&&b.scrollWidth>b.clientWidth+1;}).map(row=>row.querySelector('b')?.textContent);
   const brokenImages=rows.filter(row=>[...row.querySelectorAll('img')].some(img=>/qa-151\\.invalid/.test(img.getAttribute('src')||''))).length;
   const altPhoto=[...document.querySelectorAll('[data-list-row="equipment"] img[alt^="Foto"]')].length;
   const placeholder=[...document.querySelectorAll('[data-list-row="equipment"] [aria-label]')].filter(node=>(node.getAttribute('aria-label')||'').startsWith('Sin foto')).length;
   const hasBroken=${JSON.stringify(brokenName)}?[...document.querySelectorAll('[data-list-row="equipment"] [aria-label]')].some(node=>(node.getAttribute('aria-label')||'')===${JSON.stringify(`Sin foto: ${brokenName}`)}):false;
   return {rows:rows.length,clipped,brokenImages,altPhoto,placeholder,hasBroken};})()`);
  check(`inventario ${W}: ningún nombre visible recortado`,list.clipped.length,0);
  check(`inventario ${W}: la foto rota no deja <img> quebrada`,list.brokenImages,0);
  check(`inventario ${W}: la foto rota usa el placeholder de la casa`,list.hasBroken,true);
  note(`inventario ${W}: ${list.rows} filas · placeholders ${list.placeholder} · recortadas ${JSON.stringify(list.clipped)}`);
 }

 await setViewport(width,height);await setTheme('light');
}

writeFileSync(resolve(out,`informe-${tag}.json`),JSON.stringify({generatedAt:new Date().toISOString(),tag,broken,checks,log},null,1));
writeFileSync(resolve(out,`qa-${tag}.txt`),log.join('\n')+'\n');
console.log(log.join('\n'));
console.log(withChecks?(process.exitCode?`Demo audit #151 (${tag}): FALLÓ`:`Demo audit #151 (${tag}): PASS`):`Demo audit #151 (${tag}): capturas listas`);
await send('Page.close').catch(()=>{});
process.exit(process.exitCode||0);

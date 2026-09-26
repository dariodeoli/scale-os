/*
 * Probe de targets táctiles (ronda 16, #70 — propuesta PLT para SOS-DSN).
 *
 * Mide el área de impacto real de cada control interactivo del audit.html del
 * harness y lista los que quedan por debajo de 44 px en móvil. Considera la
 * etiqueta envolvente y las áreas ampliadas con pseudo-elementos
 * (`after:-inset-*`), la misma regla de targets ≥44 de AGENTS.md.
 *
 *   node build-tools/visual-harness/probe-targets.mjs [audit.html] [360,390,430] [id,id]
 *
 * Ejemplo:
 *   node build-tools/visual-harness/probe-targets.mjs work/visual-harness/latest/audit.html 390 equipo-lista,v2-permisos
 */
import {createServer} from 'node:http';
import {readFileSync, existsSync} from 'node:fs';
import {extname, join, resolve, dirname} from 'node:path';
import {launchChrome, openTarget, defaultChromePath} from './chrome.mjs';

const repo=resolve(dirname(new URL(import.meta.url).pathname),'..','..');
const input=resolve(process.argv[2]||join(repo,'work/visual-harness/latest/audit.html'));
const widths=(process.argv[3]||'360,390,430').split(',').map(Number);
const only=(process.argv[4]||'').split(',').map(s=>s.trim()).filter(Boolean);
const mime={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2','.json':'application/json'};
const server=createServer((request,response)=>{
 const pathname=decodeURIComponent(new URL(request.url,'http://localhost').pathname);
 const candidates=[join(dirname(input),pathname),join(repo,'public',pathname)];
 for(const candidate of candidates){
  if(existsSync(candidate)&&!candidate.endsWith('/')){response.writeHead(200,{'Content-Type':mime[extname(candidate)]||'application/octet-stream'});response.end(readFileSync(candidate));return;}
 }
 response.writeHead(404).end('not found');
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const chrome=await launchChrome({chromePath:process.env.CHROME_PATH||defaultChromePath});
const cdp=await openTarget(chrome.port);
try{
 await cdp.send('Page.enable');
 let selected=null,total=0;
 for(const width of widths){
  const loaded=cdp.once('Page.loadEventFired');
  await cdp.send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<768});
  await cdp.send('Page.navigate',{url:`http://127.0.0.1:${server.address().port}/audit.html`});
  await loaded;
  await new Promise(r=>setTimeout(r,150));
  if(selected===null){
   const ids=await cdp.evaluate(`[...document.querySelectorAll('[data-fixture]')].map(element=>element.getAttribute('data-fixture'))`);
   selected=ids.filter(id=>!only.length||only.includes(id));
  }
  console.log(`\n== ${width}px ==`);
  for(const id of selected){
   const small=await cdp.evaluate(`(()=>{
    const fixture=document.querySelector('[data-fixture="${id}"]');
    if(!fixture)return null;
    const nodes=[...fixture.querySelectorAll('button,a[href],input:not([type=hidden]),select,textarea,summary,[role=button],[role=switch]')];
    const visible=el=>{const r=el.getBoundingClientRect();const s=getComputedStyle(el);return r.width>0&&r.height>0&&s.visibility!=='hidden'&&s.display!=='none';};
    const expandFrom=el=>{let expand=0;const cls=String(el.className||'');for(const m of cls.matchAll(/-inset(?:-[xy])?-(\\d+(?:\\.\\d+)?)/g))expand=Math.max(expand,Number(m[1])*4);return expand;};
    const hit=el=>{const r=el.getBoundingClientRect();let w=r.width,h=r.height;
     let node=el;
     while(node&&node!==fixture){
      const expand=expandFrom(node);
      if(expand){const nr=node.getBoundingClientRect();w=Math.max(w,nr.width+expand*2);h=Math.max(h,nr.height+expand*2);}
      node=node.parentElement;
     }
     const label=el.closest('label');
     if(label){const lr=label.getBoundingClientRect();w=Math.max(w,lr.width);h=Math.max(h,lr.height);}
     return {w,h,rawW:r.width,rawH:r.height};};
    const out=[];
    for(const el of nodes){
     if(!visible(el))continue;
     const a=hit(el);
     if(a.w<44||a.h<44)out.push({tag:el.tagName.toLowerCase(),cls:String(el.className).slice(0,90),text:(el.getAttribute('aria-label')||el.textContent||'').trim().replace(/\\s+/g,' ').slice(0,60),w:Math.round(a.w),h:Math.round(a.h),rawW:Math.round(a.rawW),rawH:Math.round(a.rawH)});
    }
    return out;
   })()`);
   if(small===null){console.log(`  ${id}: (no está en el artefacto)`);continue;}
   if(!small.length)continue;
   total+=small.length;
   console.log(`  ${id}: ${small.length} controles <44`);
   for(const item of small.slice(0,12))console.log(`    ${item.tag}.${item.cls.split(' ').slice(0,2).join('.')} ${item.w}x${item.h} (raw ${item.rawW}x${item.rawH}) "${item.text}"`);
   if(small.length>12)console.log(`    … ${small.length-12} más`);
  }
 }
 console.log(`\nTotal de controles <44 px: ${total}`);
}finally{cdp.close();await chrome.close();server.close();}

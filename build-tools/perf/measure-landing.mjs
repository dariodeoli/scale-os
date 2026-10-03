/*
 * Baseline de Core Web Vitals de la landing pública (issue #158). Mide LCP,
 * CLS acumulado, TTFB, DCL y load con Chrome local (CDP), sin Lighthouse.
 *
 * Uso:
 *   node build-tools/perf/measure-landing.mjs                    # 1440x900
 *   node build-tools/perf/measure-landing.mjs 390 844           # mobile
 *   LANDING_URL=https://sistema.scaleparaguay.com node ...
 */
import {launchChrome,openTarget} from '../visual-harness/chrome.mjs';
import {writeFileSync} from 'node:fs';

const BASE=process.env.LANDING_URL||'https://sistema.scaleparaguay.com';
const width=Number(process.argv[2]||1440),height=Number(process.argv[3]||900);
const chrome=await launchChrome();
const cdp=await openTarget(chrome.port);
const send=(method,params={})=>cdp.send(method,params);
const evaluate=async expression=>{
 const {result,exceptionDetails}=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
 if(exceptionDetails)throw new Error(exceptionDetails.text+' '+(exceptionDetails.exception?.description||''));
 return result.value;
};
try{
 await send('Page.enable');await send('Runtime.enable');
 await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<768,screenWidth:width,screenHeight:height});
 await send('Page.navigate',{url:BASE});
 await evaluate(`new Promise(resolve=>{if(document.readyState==='complete')resolve(true);else addEventListener('load',()=>resolve(true),{once:true});})`);
 // Los observers se registran después del load con entradas bufferizadas:
 // LCP y layout-shift quedan disponibles sin alterar la navegación medida.
 const metrics=await evaluate(`new Promise(resolve=>{
  let lcp=null,cls=0,shifts=0;
  try{new PerformanceObserver(list=>{for(const entry of list.getEntries())lcp=Math.round(entry.startTime);}).observe({type:'largest-contentful-paint',buffered:true});}catch{}
  try{new PerformanceObserver(list=>{for(const entry of list.getEntries()){if(!entry.hadRecentInput){cls+=entry.value;shifts++;}}}).observe({type:'layout-shift',buffered:true});}catch{}
  setTimeout(()=>{
   const nav=performance.getEntriesByType('navigation')[0]||{};
   resolve({url:location.href,lcp,cls:Number(cls.toFixed(4)),shifts,ttfb:Math.round(nav.responseStart||0),dcl:Math.round(nav.domContentLoadedEventEnd||0),load:Math.round(nav.loadEventEnd||0)});
  },2500);
 })`);
 const result={measuredAt:new Date().toISOString(),viewport:{width,height},...metrics};
 console.log(JSON.stringify(result,null,1));
 if(process.env.OUT_FILE)writeFileSync(process.env.OUT_FILE,JSON.stringify(result,null,1));
}finally{
 cdp.close();await chrome.close?.();
}

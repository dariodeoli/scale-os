import assert from 'node:assert/strict';
import test from 'node:test';
import {existsSync} from 'node:fs';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
const chrome=process.env.SCALE_QA_CHROME||'/usr/bin/chromium';
const backendRequire=createRequire(new URL('../backend/package.json',import.meta.url));

test('Chromium admin: fieldset keeps coupon flex rules and details actions never escape a collapsed form',{skip:!existsSync(chrome)},async()=>{
 const bundle=await build({stdin:{resolveDir:process.cwd(),loader:'tsx',contents:`
  import React from 'react';import {createRoot} from 'react-dom/client';
  import {PlatformCatalog} from './app/superadmin/catalog';import {SubscriptionDialog} from './app/superadmin/subscription-dialog';
  const root=createRoot(document.getElementById('root')),noop=()=>{};window.qa={writes:0};
  window.showCatalog=()=>root.render(<PlatformCatalog busy={false} writable page={{}} onMore={noop} state={{coupons:[],agencies:[]}} coupon={{code:'RETRY',discount_value:'10',discount_type:'percent',currency:'USD',expires_at:'',organization_id:'',note:'Conservar'}} setCoupon={noop} toggleCoupon={async()=>{}} createCoupon={async()=>{window.qa.writes++;await new Promise((resolve,reject)=>window.qa.fail=reject);}}/>);
  window.showSubscription=()=>root.render(<SubscriptionDialog busy={false} subscriptionAgency={{id:1,name:'Agencia sintética'}} setSubscriptionAgency={noop} subscription={{internal_state:'active',internal_expires_at:null}} setSubscription={noop} subscriptionLoaded setSubscriptionLoaded={noop} subscriptionError="" setSubscriptionError={noop} subscriptionRequest={{current:0}} subscriptionState="active" setSubscriptionState={noop} subscriptionReason="Motivo" setSubscriptionReason={noop} subscriptionExpiryValue="" setSubscriptionExpiryValue={noop} extendDays="30" setExtendDays={noop} extendReason="Pago" setExtendReason={noop} manageSubscription={async()=>{}} saveSubscription={async()=>{}} saveExtension={async()=>{}} grantGrace={async()=>''} applyCoupon={noop}/>);
 `},bundle:true,write:false,jsx:'automatic',format:'iife',loader:{'.css':'empty'},define:{'process.env.NODE_ENV':'"production"'}});
 const puppeteer=backendRequire('puppeteer-core');const browser=await puppeteer.launch({executablePath:chrome,headless:true,args:['--no-sandbox']});
 try{
  const page=await browser.newPage();const errors:string[]=[];page.on('pageerror',(cause:any)=>errors.push(cause.message));await page.setViewport({width:1366,height:900});
  await page.setRequestInterception(true);page.on('request',(request:any)=>request.abort());
  await page.setContent('<main id="root" class="control-shell platform-admin-page"></main>');await page.evaluate(()=>{(window as any).process={env:{NODE_ENV:'production'}};});
  for(const file of ['app/ui-system.css','app/dialog.css','app/superadmin/platform-admin.css'])await page.addStyleTag({path:file});
  await page.addScriptTag({content:bundle.outputFiles[0].text});assert.equal(errors.length,0,errors.join('\n'));await page.evaluate(()=>(window as any).showCatalog());await page.waitForSelector('.platform-admin-coupon');
  const styles=await page.evaluate(()=>{const form=document.querySelector('.platform-admin-coupon')!;const labels=[...form.querySelectorAll('.ui-form-fields > label')];return {display:getComputedStyle(form).display,wrap:getComputedStyle(form).flexWrap,fieldset:getComputedStyle(form.querySelector('fieldset')!).display,bases:labels.map(label=>getComputedStyle(label).flexBasis),overflow:document.documentElement.scrollWidth>innerWidth};});
  assert.equal(styles.display,'flex');assert.equal(styles.wrap,'wrap');assert.equal(styles.fieldset,'contents');assert.equal(styles.bases[0],'192px');assert(styles.bases.includes('144px'));assert.equal(styles.bases.at(-1),'100%');assert.equal(styles.overflow,false);
  await page.setViewport({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.setViewport({width:1366,height:900});
  await page.focus('input');await page.evaluate(()=>{(window as any).qa.input=document.querySelector('input');});
  await page.evaluate(()=>{const form=document.querySelector('form')!;form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));});
  await page.waitForFunction(()=>document.querySelector('input')!.matches(':disabled'));assert.equal(await page.evaluate(()=>(window as any).qa.writes),1);
  await page.evaluate(()=>(window as any).qa.fail(Error('Error recuperable')));await page.waitForSelector('[role="alert"]');assert.equal(await page.$eval('input',(node:any)=>node.value),'RETRY');assert.equal(await page.$eval('input',(node:any)=>node.matches(':disabled')),false);assert.equal(await page.evaluate(()=>document.activeElement===(window as any).qa.input&&document.querySelector('input')===(window as any).qa.input),true);
  await page.evaluate(()=>(window as any).showSubscription());await page.waitForSelector('details');
  const footer=()=>page.$eval('.dialog-footer',(node:any)=>node.textContent);
  assert.doesNotMatch(await footer(),/Guardar estado manual|Marcar pago manual/);
  await page.$eval('details',(node:any)=>{node.open=true;node.dispatchEvent(new Event('toggle'));});
  await page.waitForFunction(()=>document.querySelector('.dialog-footer')?.textContent?.includes('Marcar pago manual'));
  const associations=await page.$$eval('.dialog-footer button[type="submit"]',(nodes:any[])=>nodes.map(node=>Boolean(node.form)&&node.form.closest('details')?.open));assert.equal(associations.length,2);assert(associations.every(Boolean));
  await page.$eval('details',(node:any)=>{node.open=false;node.dispatchEvent(new Event('toggle'));});
  await page.waitForFunction(()=>!document.querySelector('.dialog-footer')?.textContent?.includes('Marcar pago manual'));
  assert.doesNotMatch(await footer(),/Guardar estado manual|Marcar pago manual/);
 }finally{await browser.close();}
});

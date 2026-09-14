import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dataFetch,setDataScope,clearDataCache} from '../app/data-cache';
import {NextRequest} from 'next/server';
import {middleware} from '../middleware';

async function run(){
 const originalFetch=globalThis.fetch,descriptor=Object.getOwnPropertyDescriptor(globalThis,'window');
 const target=new EventTarget();let signals=0,calls=0,status=200;
 target.addEventListener('scale:billing-refresh',()=>{signals++;});
 Object.defineProperty(globalThis,'window',{configurable:true,value:target});
 globalThis.fetch=(async()=>{calls++;return new Response(JSON.stringify({ok:status===200}),{status});}) as typeof fetch;
 try{
  setDataScope('test-owner:trial-company:owner');
  await dataFetch('/core-api/api/agency/clients');await dataFetch('/core-api/api/agency/clients');assert.equal(calls,1);
  status=402;assert.equal((await dataFetch('/core-api/api/agency/projects')).status,402);assert.equal(signals,1);
  status=200;await dataFetch('/core-api/api/agency/clients');assert.equal(calls,3,'suspension discarded previous private cache');
  status=402;await dataFetch('/core-api/api/agency/clients',{method:'POST'});assert.equal(signals,2,'mutations also notify the gate');
  status=200;await dataFetch('/core-api/api/agency/clients');assert.equal(calls,5);
  assert.equal((await dataFetch('/core-api/api/billing/subscription')).status,200);
 }finally{globalThis.fetch=originalFetch;setDataScope('');clearDataCache();if(descriptor)Object.defineProperty(globalThis,'window',descriptor);else Reflect.deleteProperty(globalThis,'window');}
 const workspace=readFileSync(new URL('../app/scale-workspace.tsx',import.meta.url),'utf8');
 assert(workspace.includes('if(user?.subscription?.hasAccess===false)return <main'));
 assert(workspace.includes('if(data.user.subscription?.hasAccess!==false)return load(data.user)'));
 assert(workspace.includes('if(data.user.subscription?.hasAccess!==false)await load(data.user)'));
 assert(workspace.includes('previousBillingAccess.current===false&&next===true'));
 for(const section of ['Mora','Presupuestos','Finanzas'])assert(workspace.includes(`operationalAccess && active === "${section}"`));
 assert(workspace.includes("document.removeEventListener('visibilitychange',refresh)"));
 assert(workspace.includes("window.removeEventListener('scale:billing-refresh',refresh)"));
 const form=readFileSync(new URL('../app/registro/page.tsx',import.meta.url),'utf8');
 assert(form.includes("window.location.assign('/core-api/api/auth/google/start?signup=1');"));
 assert(form.includes("JSON.stringify({ticket:googleTicket,company:company.trim(),currency,consent:true})"));
 assert(!form.includes("company:company.trim(),currency,consent:'1'"));
 assert(form.includes("if(!consent){setError('Aceptá las condiciones de la prueba y suscripción para continuar.');return false;}"));
 assert(form.includes('checked={consent}'));assert(form.includes('onChange={event=>setConsent(event.target.checked)}'));
 const redirect=middleware(new NextRequest('https://sistema.scaleparaguay.com/registro',{headers:{host:'sistema.scaleparaguay.com'}}));
 assert.equal(redirect.headers.get('location'),'https://app.scaleparaguay.com/registro');
 console.log('PASS: 402 invalidates private cache and signals billing refresh, workspace gating contracts, trial form consent and canonical signup routing. Not visual browser QA.');
}
run().catch(error=>{console.error(error);process.exitCode=1;});

// Regresiones del smoke e2e local (lanzador `npm --prefix backend run dev:local`):
// cada bloque fija un fallo visto al usar la app como un usuario real.
import React from 'react';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';

Object.assign(globalThis,{React});
require.extensions['.css']=()=>{};
const source=(file:string)=>readFileSync(new URL(`../${file}`,import.meta.url),'utf8');
const {budgetKpisOf}=require('../app/budget-status') as typeof import('../app/budget-status');
const {paymentCurrency}=require('../app/workspace-forms') as typeof import('../app/workspace-forms');
const {platformAttention}=require('../app/superadmin/overview') as typeof import('../app/superadmin/overview');

test('Presupuestos: el KPI «Total sin IVA» suma subtotales, no el total con IVA',()=>{
 const kpis=budgetKpisOf([
  {subtotal:'3000.00',currency:'USD',status:'draft',valid_until:null},
  {subtotal:'1000.00',currency:'USD',status:'accepted',valid_until:null},
  {subtotal:'500000',currency:'PYG',status:'sent',valid_until:new Date(Date.UTC(2026,9,16)).toISOString()},
 ],Date.UTC(2026,9,14));
 assert.equal(kpis.totals.get('USD'),4000,'3.000 + 1.000 sin IVA (no 3.300 + 1.100)');
 assert.equal(kpis.totals.get('PYG'),500000);
 assert.deepEqual([kpis.drafts,kpis.accepted,kpis.expiring],[1,1,1]);
});

test('Presupuestos: un refresco completo tras crear reemplaza la ventana (sin «1 de 0»)',()=>{
 const shell=source('app/scale-workspace.tsx');
 assert.match(shell,/const replaceBudgets = \(list: Budget\[\]\) => \{ setBudgets\(list\); setBudgetsWindow\(windowStateOf\(null, list\.length\)\); \};/);
 assert.match(shell,/<QuoteComposer mode="create" done=\{\(\)=>completeSave\(close,async\(\)=>\{replaceBudgets\(/,'el alta refresca lista y ventana juntas');
 assert.match(shell,/setBudgets=\{replaceBudgets\}/,'los refrescos de la sección (borrar, acciones) también');
 assert.doesNotMatch(shell,/setBudgets=\{setBudgets\}/);
});

test('Clientes: el alta recarga el estado de cobro (sin «Sin datos de cobro» para el nuevo)',()=>{
 const shell=source('app/scale-workspace.tsx');
 const created=shell.slice(shell.indexOf('onCreated={(client, keepOpen) => {'),shell.indexOf('if (!keepOpen) close();'));
 assert.match(created,/setMoraReload\(\(value\) => value \+ 1\)/);
});

test('Producción: crear o editar una orden relee el tablero sin recargar la página',()=>{
 const shell=source('app/scale-workspace.tsx'),section=source('app/sections/produccion.tsx');
 assert.match(shell,/const reloadWithBoard = async \(\) => \{ await load\(\); setBoardVersion\(\(value\) => value \+ 1\); \};/);
 const order=shell.slice(shell.indexOf('<Dialog title="Nueva orden de trabajo"'),shell.indexOf('{modal === "budget"'));
 assert.match(order,/completeSave\(close,reloadWithBoard\)/,'el alta de orden sube la versión del tablero');
 assert.match(shell,/kind==='order'&&<WorkDetail[^\n]*refresh=\{reloadWithBoard\}/,'la edición desde el detalle también');
 assert.match(shell,/boardRefresh=\{boardVersion\}/);
 assert.match(section,/useBoardData\(\{board:productionView==='Tablero',planner:productionView!=='Tablero',filters,refresh:boardRefresh\}\)/);
 assert.doesNotMatch(section,/refresh:0\}/,'el tablero ya no queda fijo en su primera carga');
});

test('Cobros: el importe usa la moneda de la cuenta y, antes de elegirla, la de la factura',()=>{
 const accounts=[{id:'1',currency:'USD'},{id:'2',currency:'PYG'}],invoices=[{id:'9',currency:'USD'}];
 assert.equal(paymentCurrency(accounts as never,invoices as never,'','9'),'USD','factura en USD: nunca «Gs» por defecto');
 assert.equal(paymentCurrency(accounts as never,invoices as never,'2','9'),'PYG','la cuenta elegida manda');
 assert.equal(paymentCurrency([],[],'',''),'PYG');
});

test('Superadmin: una prueba vigente no figura como suscripción a seguir',()=>{
 const state={agencies:[],overview:{subscriptions:[{status:'trialing',total:2},{status:'active',total:3}]}};
 assert.deepEqual(platformAttention(state as never,null),[]);
 const pending=platformAttention({agencies:[],overview:{subscriptions:[{status:'trialing',total:2},{status:'past_due',total:1}]}} as never,null);
 assert.equal(pending.length,1);assert.match(pending[0].label,/^1 suscripciones fuera de «active»/);
});

test('Zona de peligro: un nombre de empresa largo no desborda en 390 px',()=>{
 const zone=source('app/deletion-danger-zone.tsx');
 assert.match(zone,/const FLOW='grid min-w-0 grid-cols-\[minmax\(0,1fr\)\] gap-3 /,'la tarjeta acota su única columna');
 assert.match(zone,/secondary deletion-review max-w-full justify-self-start !whitespace-normal break-words max-md:w-full/,'el botón con el nombre envuelve en vez de ensanchar la página');
});

test('QA local: el origen del API admite http solo contra loopback y la CSP de next dev permite eval',async()=>{
 const {resolveCoreApiOrigin}=await import('../core-api-origin.mjs');
 assert.equal(resolveCoreApiOrigin('http://127.0.0.1:4100'),'http://127.0.0.1:4100');
 assert.equal(resolveCoreApiOrigin('http://localhost:4100'),'http://localhost:4100');
 assert.equal(resolveCoreApiOrigin('https://api.scaleparaguay.com'),'https://api.scaleparaguay.com');
 for(const unsafe of ['http://api.scaleparaguay.com','http://10.0.0.5:4100','https://user:pw@api.scaleparaguay.com','https://api.scaleparaguay.com/core'])assert.throws(()=>resolveCoreApiOrigin(unsafe));
 const config=source('next.config.mjs');
 assert.match(config,/const devEval=development\?" 'unsafe-eval'":'';/);
 assert.match(config,/const devUpgrade=development\?'':'; upgrade-insecure-requests';/,'producción conserva upgrade-insecure-requests');
 assert.match(config,/const development=process\.env\.NODE_ENV==='development';/);
});

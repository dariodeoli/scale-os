import React from 'react';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import {create} from 'react-test-renderer';
Object.assign(globalThis,{React});require.extensions['.css']=()=>{};
const {namedHttpsLink,CommentBody}=require('../app/commenting') as typeof import('../app/commenting');
const {subscriptionExpiry}=require('../app/platform-admin-api') as typeof import('../app/platform-admin-api');

test('named comment links are HTTPS-only and render as visible link chips',()=>{
 assert.equal(namedHttpsLink('Brief final','https://example.com/brief'), '[Brief final](https://example.com/brief)');
 assert.throws(()=>namedHttpsLink('Brief','http://example.com'),/HTTPS/);
 assert.throws(()=>namedHttpsLink('Brief','https://user:secret@example.com'),/HTTPS/);
 const tree=create(<CommentBody value={'Revisá [Brief final](https://example.com/brief) antes de @Ana'}/>);
 const anchor=tree.root.findByType('a');assert.equal(anchor.props.className,'comment-link-chip');assert.equal(anchor.props.href,'https://example.com/brief');assert.match(JSON.stringify(tree.toJSON()),/@Ana/);
});

test('platform manual subscription wrapper uses the proxy and UTC expiry',()=>{
 assert.equal(subscriptionExpiry(''),null);
 assert.equal(subscriptionExpiry('2026-10-01T12:30'),new Date('2026-10-01T12:30').toISOString());
 assert.throws(()=>subscriptionExpiry('invalid'),/válida/);
 const wrapper=readFileSync(new URL('../app/platform-admin-api.ts',import.meta.url),'utf8');
 assert.match(wrapper,/platformApiBase='\/core-api'/);
 const page=readFileSync(new URL('../app/superadmin/page.tsx',import.meta.url),'utf8');
 const dialog=readFileSync(new URL('../app/superadmin/subscription-dialog.tsx',import.meta.url),'utf8');
 assert.match(page,/\/agencies\/\$\{subscriptionAgency\.id\}\/subscription/);assert.match(dialog,/Guardar estado manual/);assert.doesNotMatch(page+dialog,/Stripe/);
});

test('inventory, RUC, work-order links and recipient notifications use the Core API contracts',()=>{
 const inventory=readFileSync(new URL('../app/inventory-workspace.tsx',import.meta.url),'utf8');
 assert.match(inventory,/Detalle y trazabilidad/);assert.match(inventory,/\/api\/agency\/inventory\/\$\{item\.id\}/);assert.match(inventory,/<InventoryBarcode code=\{code\}/);
 const ruc=readFileSync(new URL('../app/client-ruc.tsx',import.meta.url),'utf8');
 assert.match(ruc,/\/api\/agency\/clients\/\$\{existing\.id\}\/ruc-refresh/);assert.match(ruc,/{apply:true}/);assert.match(ruc,/Actualizar datos RUC/);
 const links=readFileSync(new URL('../app/work-order-links.tsx',import.meta.url),'utf8');
 assert.match(links,/\/api\/agency\/work-orders\/\$\{orderId\}\/links/);assert.match(links,/httpsUrl/);
 const notices=readFileSync(new URL('../app/notification-inbox.tsx',import.meta.url),'utf8');
 assert.match(notices,/cambia solo tu propia bandeja/);assert.match(notices,/kindLabel/);
});

test('las proyecciones COM viven en las whitelists del API y la ventana de Resumen no trae fotos (#67/#71/#73)',async()=>{
 const list=(source:string,name:string)=>{const match=source.match(new RegExp(`const ${name}=\\[([^\\]]*)\\]`));return match?[...match[1].matchAll(/'([^']+)'/g)].map(value=>value[1]):null;};
 const core=readFileSync(new URL('../backend/agency-core.js',import.meta.url),'utf8');
 const suite=readFileSync(new URL('../backend/agency-suite.js',import.meta.url),'utf8');
 const orders=list(core,'workOrderListFields'),leads=list(suite,'leadListFields'),budgets=list(core,'budgetListFields');
 assert.ok(orders&&leads&&budgets,'las whitelists de la API se pueden leer');
 assert.ok(orders.includes('assignee_names'),'la API expone el nombre liviano de responsables (#73)');
 assert.ok(orders.includes('due_date')&&orders.includes('client_name')&&orders.includes('project_name'),'la lista de órdenes conserva alertas y buscador');
 const shellData=await import('../app/shell-data');
 const projections:[string,string,string[]][]=[
  ['Resumen',shellData.ORDER_FIELDS_SUMMARY,orders],
  ['Buscador',shellData.ORDER_FIELDS_SEARCH,orders],
  ['Cartera',shellData.ORDER_FIELDS_PORTFOLIO,orders],
  ['Tablero',shellData.ORDER_FIELDS_BOARD,orders],
  ['Oportunidades',shellData.LEAD_LIST_FIELDS,leads],
  ['Presupuestos',shellData.BUDGET_LIST_FIELDS,budgets],
 ];
 for(const [name,projection,whitelist] of projections){
  const missing=projection.split(',').map(field=>field.trim()).filter(field=>!whitelist.includes(field));
  assert.deepEqual(missing,[],`${name}: el API debe aceptar ${missing.join(', ')}`);
 }
 assert.doesNotMatch(shellData.ORDER_FIELDS_SUMMARY,/effective_assignees/,'la ventana de Resumen no arrastra las fotos base64 de responsables');
 const control=readFileSync(new URL('../app/control-center.tsx',import.meta.url),'utf8');
 assert.match(control,/work-orders\?due=overdue&limit=30&fields=\$\{ORDER_FIELDS_SEARCH\}/,'las alertas sin finanzas salen de los vencidos exactos de la API');
});

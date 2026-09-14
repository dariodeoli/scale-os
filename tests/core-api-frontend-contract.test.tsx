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
 assert.match(page,/\/agencies\/\$\{subscriptionAgency\.id\}\/subscription/);assert.match(page,/Guardar estado manual/);assert.doesNotMatch(page,/Stripe/);
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

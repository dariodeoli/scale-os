import React from 'react';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {renderToStaticMarkup} from 'react-dom/server';
Object.assign(globalThis,{React});
const Home=require('../page') as typeof import('../page');
const Mcp=require('../mcp/page') as typeof import('../mcp/page');
const Api=require('../api/page') as typeof import('../api/page');
const entries=[['/documentacion',Home],['/documentacion/mcp',Mcp],['/documentacion/api',Api]] as const;
const htmls=new Map(entries.map(([path,module])=>[path,renderToStaticMarkup(React.createElement(module.default))]));
test('public documentation has canonical metadata, one h1, named navigation and a working TOC',()=>{
 for(const[path,module]of entries){const html=htmls.get(path)!;assert.equal((html.match(/<h1[ >]/g)||[]).length,1);assert.match(html,/<main id="contenido"/);assert.match(html,/href="#contenido"/);assert.match(html,/aria-label="Navegación pública"/);assert.match(html,/aria-label="En esta página"/);assert.equal((module.metadata.alternates as {canonical:string}).canonical,'https://sistema.scaleparaguay.com'+path);assert.deepEqual(module.metadata.robots,{index:true,follow:true});
  for(const match of html.matchAll(/href="#([^"]+)"/g)){if(match[1]==='precio')continue;assert.ok(html.includes('id="'+match[1]+'"'),'missing anchor '+path+'#'+match[1]);}
 }
});
test('documentation links point at actual guides and login/registration/demo routes',()=>{
 for(const html of htmls.values()){assert.match(html,/https:\/\/app.scaleparaguay.com\//);assert.match(html,/https:\/\/sistema.scaleparaguay.com\/demo/);for(const match of html.matchAll(/href="(\/documentacion[^"#]*)(?:#[^"]*)?"/g))assert.ok(htmls.has(match[1] as typeof entries[number][0]),'missing documentation route '+match[1]);assert.doesNotMatch(html,/<form|<button|<script/i);}
});
test('MCP documentation retains concrete permissions, plan ID and financial limits without claiming live provider validation',()=>{
 const html=htmls.get('/documentacion/mcp')!;for(const required of ['41 herramientas','scale:read','scale:write','scale_create_plan','scale_update_client_commercial_terms','scale_get_client_plan_history','identificador positivo','15 minutos','validación externa','CIMD','no está implementado','tokens','revoc'])assert.ok(html.includes(required),'missing '+required);assert.match(html,/https:\/\/api.scaleparaguay.com\/mcp/);assert.match(html,/ejemplo son ficticios/);
});
test('API documentation separates internal API, library, configured adapters and external acceptance',()=>{
 const html=htmls.get('/documentacion/api')!;for(const required of ['API REST pública','token MCP','OwnData','pendientes','Microsoft','Apple','OwnCoding UI','no es una API','PagaYa/Stripe','Resend','WEEM','Carga con IA','No implica sincronización'])assert.ok(html.includes(required),'missing '+required);
});

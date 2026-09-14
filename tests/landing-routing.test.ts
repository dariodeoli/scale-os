import assert from 'node:assert/strict';
import {NextRequest} from 'next/server';
import {middleware} from '../middleware';
import {readFileSync} from 'node:fs';
import {sections,legacyRoutes} from '../app/navigation';
function request(host:string,path='/'){return middleware(new NextRequest('https://'+host+path,{headers:{host}}));}
assert.equal(request('sistema.scaleparaguay.com').headers.get('x-middleware-rewrite'),'https://sistema.scaleparaguay.com/scale-os.html');
assert.equal(request('app.scaleparaguay.com','/equipo').headers.get('x-robots-tag'),'noindex, nofollow');
assert.equal(request('app.scaleparaguay.com','/demo').headers.get('location'),'https://sistema.scaleparaguay.com/demo');
assert.equal(request('sistema.scaleparaguay.com','/core-api/api/auth/me').status,200);
assert.equal(request('sistema.scaleparaguay.com','/scale-os.html').status,308);
assert.equal(request('sistema.scaleparaguay.com','/brand/favicon-32.png').status,200);
for(const path of [...sections.map(([,slug])=>'/'+slug),...Object.keys(legacyRoutes).map(slug=>'/'+slug)]){
 const response=request('sistema.scaleparaguay.com',path);
 assert.equal(response.status,200,`${path} must reach the workspace in a public demo`);
 assert.equal(response.headers.get('x-robots-tag'),'noindex, nofollow',path);
}
for(const path of ['/informes-privados','/desconocido','/api/agency/reports'])assert.equal(request('sistema.scaleparaguay.com',path).status,404,path);
assert.equal(request('sistema.scaleparaguay.com.evil.example').headers.get('x-middleware-rewrite'),null);
const html=readFileSync('public/scale-os.html','utf8');assert(html.includes('application/ld+json'));assert(html.includes('VISTA ILUSTRATIVA'));assert(!html.includes('Desarrollado por'));assert(html.includes('https://app.scaleparaguay.com/'));
console.log('PASS: public landing host routing, private noindex, isolated Demo paths allowed under public host, metadata');

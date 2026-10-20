import assert from 'node:assert/strict';
import {NextRequest} from 'next/server';
import {middleware} from '../middleware';
import {readFileSync} from 'node:fs';
import {sections,legacyRoutes} from '../app/navigation';
import {landingSitemapXml} from '../app/seo';
function request(host:string,path='/'){return middleware(new NextRequest('https://'+host+path,{headers:{host}}));}
assert.equal(request('sistema.scaleparaguay.com').headers.get('x-middleware-rewrite'),'https://sistema.scaleparaguay.com/public-landing');
assert.equal(request('app.scaleparaguay.com','/equipo').headers.get('x-robots-tag'),'noindex, nofollow');
assert.equal(request('app.scaleparaguay.com','/demo').headers.get('location'),'https://sistema.scaleparaguay.com/demo');
assert.equal(request('sistema.scaleparaguay.com','/core-api/api/auth/me').status,200);
assert.equal(request('sistema.scaleparaguay.com','/scale-os.html').status,308);
assert.equal(request('sistema.scaleparaguay.com','/brand/favicon-32.png').status,200);
assert.equal(request('sistema.scaleparaguay.com','/fonts/s/outfit/v15/QGYvz_MVcBeNP4NJtEtqUYLknw.woff2').status,200,'public documentation can load the shared font');
for(const path of ['/documentacion','/documentacion/mcp','/documentacion/api']){
 const publicDocs=request('sistema.scaleparaguay.com',path);
 assert.equal(publicDocs.status,200,`${path} is public on the landing host`);
 assert.equal(publicDocs.headers.get('x-robots-tag'),null,`${path} is indexable on its canonical host`);
 assert.equal(publicDocs.headers.get('x-middleware-rewrite'),null,'documentation reaches its own Next route');
 assert(landingSitemapXml().includes(`<loc>https://sistema.scaleparaguay.com${path}</loc>`),'documentation is discoverable');
 assert.equal(request('app.scaleparaguay.com',path).headers.get('x-robots-tag'),'noindex, nofollow','app host retains its indexing boundary');
 assert.equal(request('cliente.scaleparaguay.com',path).status,404,'the customer portal does not expose unrelated public routes');
}
assert.equal(request('sistema.scaleparaguay.com','/documentacion/desconocida').status,404,'only supported documentation routes are exposed');
for(const path of [...sections.map(([,slug])=>'/'+slug),...Object.keys(legacyRoutes).map(slug=>'/'+slug)]){
 const response=request('sistema.scaleparaguay.com',path);
 assert.equal(response.status,200,`${path} must reach the workspace in a public demo`);
 assert.equal(response.headers.get('x-robots-tag'),'noindex, nofollow',path);
}
for(const path of ['/informes-privados','/desconocido','/api/agency/reports'])assert.equal(request('sistema.scaleparaguay.com',path).status,404,path);
assert.equal(request('sistema.scaleparaguay.com.evil.example').headers.get('x-middleware-rewrite'),null);
const html=readFileSync('public/scale-os.html','utf8');assert(html.includes('application/ld+json'));assert(html.includes('Captura del producto.'));assert(html.includes('/landing/producir-960.webp'));assert(html.includes('data-testid="product-footer"')&&html.includes('Desarrollado por Owncoding'),'la landing publica el pie institucional (§14)');assert(html.includes('https://app.scaleparaguay.com/'));
console.log('PASS: public landing host routing, private noindex, isolated Demo paths allowed under public host, metadata');

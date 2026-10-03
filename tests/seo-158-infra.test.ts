import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {NextRequest} from 'next/server';
import {landingRobotsTxt,landingSitemapXml} from '../app/seo';
import {middleware} from '../middleware';

// SEO técnico (#158) — infraestructura PLT: una sola fuente de robots/sitemap
// (app/seo.ts sincronizado a public/), `/status` enrutado desde la landing,
// 404 con marca y activos sociales reales. Los metadatos/structured data de la
// landing viven en tests/seo-158.test.ts (DSN); Search Console es del dueño.
const read=(path:string)=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const request=(host:string,path='/')=>middleware(new NextRequest('https://'+host+path,{headers:{host}}));

// 1) La imagen social existe y respeta 1200×630.
const png=readFileSync(new URL('../public/brand/share.png',import.meta.url));
assert.equal(png.subarray(1,4).toString(),'PNG','share.png es un PNG real');
assert.equal(png.readUInt32BE(16),1200,'share.png ancho 1200');
assert.equal(png.readUInt32BE(20),630,'share.png alto 630');

// 2) robots/sitemap con fuente única y archivos sincronizados.
assert.equal(read('public/robots.txt'),landingRobotsTxt(),'public/robots.txt sincronizado');
assert.equal(read('public/sitemap.xml'),landingSitemapXml(),'public/sitemap.xml sincronizado');
assert.ok(landingSitemapXml().includes('<loc>https://sistema.scaleparaguay.com/privacidad</loc>'),'el sitemap incluye la política');
assert.equal(request('sistema.scaleparaguay.com','/robots.txt').status,200);
assert.equal(request('sistema.scaleparaguay.com','/sitemap.xml').status,200);
assert.equal(request('app.scaleparaguay.com','/robots.txt').status,200);

// 3) `/status` deja de ser 404 en la landing; la app sigue noindex.
assert.equal(request('sistema.scaleparaguay.com','/status').headers.get('location'),'https://app.scaleparaguay.com/status');
assert.equal(request('app.scaleparaguay.com','/equipo').headers.get('x-robots-tag'),'noindex, nofollow');

// 4) 404 con marca y canonical de la política.
assert.ok(existsSync(new URL('../app/not-found.tsx',import.meta.url)),'404 con marca en la app');
assert.ok(read('app/privacidad/page.tsx').includes("canonical:'https://sistema.scaleparaguay.com/privacidad'"),'canonical de la política');

console.log('PASS: SEO 158 infra — imagen social 1200×630, robots/sitemap de fuente única, /status enrutado, 404 con marca y política canónica.');

import assert from 'node:assert/strict';
import {NextRequest} from 'next/server';
import {middleware} from '../middleware';
import {readFileSync} from 'node:fs';
function request(host:string,path='/'){return middleware(new NextRequest('https://'+host+path,{headers:{host}}));}
assert.equal(request('sistema.scaleparaguay.com').headers.get('x-middleware-rewrite'),'https://sistema.scaleparaguay.com/scale-os.html');
assert.equal(request('app.scaleparaguay.com','/equipo').headers.get('x-robots-tag'),'noindex, nofollow');
assert.equal(request('sistema.scaleparaguay.com','/core-api/api/auth/me').status,404);
assert.equal(request('sistema.scaleparaguay.com','/scale-os.html').status,308);
assert.equal(request('sistema.scaleparaguay.com','/brand/favicon-32.png').status,200);
assert.equal(request('sistema.scaleparaguay.com.evil.example').headers.get('x-middleware-rewrite'),null);
const html=readFileSync('public/scale-os.html','utf8');assert(html.includes('application/ld+json'));assert(html.includes('VISTA ILUSTRATIVA'));assert(!html.includes('Desarrollado por'));assert(html.includes('https://app.scaleparaguay.com/'));
console.log('PASS: public landing host routing, private noindex, protected app paths not served under public host, metadata');

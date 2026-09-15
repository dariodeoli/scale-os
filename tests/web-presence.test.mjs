import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const file=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const metadata=file('../app/brand-metadata.ts');
const robots=file('../app/robots.ts');
const headers=file('../next.config.mjs');
const landing=file('../public/scale-os.html');
const appManifest=JSON.parse(file('../public/app.webmanifest'));
const landingManifest=JSON.parse(file('../public/site.webmanifest'));
const landingRobots=file('../public/robots.txt');
const sitemap=file('../public/sitemap.xml');

assert(metadata.includes("manifest:'/app.webmanifest'"),'the authenticated app must have its own install manifest');
assert(metadata.includes("url:'/favicon.ico'"),'the authenticated app must declare the ICO favicon');
assert(metadata.includes("url:'/brand/apple-touch-icon.png'"),'the authenticated app must declare the Apple touch icon');
assert(metadata.includes('robots:{index:false,follow:false'),'private app pages must remain non-indexable');
assert(robots.includes("disallow:'/"),'robots route must disallow private application crawling');
assert.equal(appManifest.start_url,'https://app.scaleparaguay.com/','app manifest must open the product host');
assert.equal(appManifest.id,'https://app.scaleparaguay.com/','app manifest must keep a stable install identity');
assert.equal(landingManifest.start_url,'https://sistema.scaleparaguay.com/','landing manifest must remain scoped to the public host');
assert(landing.includes('application/ld+json'),'landing must expose structured data');
assert(landing.includes('SoftwareApplication'),'landing structured data must identify the product');
assert(landingRobots.includes('Sitemap: https://sistema.scaleparaguay.com/sitemap.xml'),'landing robots must point crawlers to the canonical sitemap');
assert(sitemap.includes('<loc>https://sistema.scaleparaguay.com/</loc>'),'sitemap must only advertise the public landing');
for(const header of ['Cross-Origin-Opener-Policy','X-Permitted-Cross-Domain-Policies','manifest-src'])assert(headers.includes(header),'missing professional security header: '+header);
console.log('PASS: metadata, icons, private crawling boundaries, landing discovery and browser security headers are aligned.');

import assert from 'node:assert/strict';
import {test} from 'node:test';
import {existsSync, readFileSync} from 'node:fs';

// SEO técnico (#158, parte front): metadatos únicos, canónicos, structured data
// y reglas por host. La infraestructura de Search Console y el sitemap por host
// se coordinan con PLT; acá queda el contrato verificable del front.

const file=(path:string)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const landing=file('public/scale-os.html');
const meta=(name:string,attribute='name')=>landing.match(new RegExp(`<meta ${attribute}="${name}" content="([^"]+)"`))?.[1]||null;
const jsonLd=()=>[...landing.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(match=>JSON.parse(match[1]));

test('#158: la landing tiene metadatos únicos, canónicos y sociales',()=>{
 const titles=[...landing.matchAll(/<title>([^<]+)<\/title>/g)];
 assert.equal(titles.length,1,'un solo <title>');
 assert(titles[0][1].includes('Scale OS')&&titles[0][1].length<=70,'título único y acotado');
 const description=meta('description')!;
 assert(description&&description.length>=80&&description.length<=160,'descripción propia y de largo útil');
 assert.equal(meta('robots'),'index,follow','la landing se indexa');
 assert.equal(meta('canonical','rel')||landing.match(/<link rel="canonical" href="([^"]+)"/)?.[1],'https://sistema.scaleparaguay.com/','canónica al host del sitio');
 assert.equal(meta('og:url','property'),'https://sistema.scaleparaguay.com/');
 assert.equal(meta('og:type','property'),'website');
 assert(meta('og:title','property')&&meta('og:description','property')&&meta('og:image','property'),'OG completo');
 assert.equal(meta('twitter:card'),'summary_large_image');
 assert(meta('twitter:title')&&meta('twitter:image'),'Twitter completo');
 const imgs=[...landing.matchAll(/<img\b[^>]*>/g)].map(match=>match[0]);
 assert(imgs.length>=4);
 for(const img of imgs)assert(/\balt=/.test(img),`imagen sin alt: ${img.slice(0,80)}`);
 for(const file of ['vender.jpg','producir.jpg','cobrar.jpg'])assert(existsSync(new URL(`../public/landing/${file}`,import.meta.url)),`${file} existe`);
});

test('#158: structured data único y válido (Organization, WebSite, SoftwareApplication)',()=>{
 const blocks=jsonLd();
 assert.equal(blocks.length,1,'una sola declaración JSON-LD: sin SoftwareApplication duplicado');
 const graph=blocks[0]['@graph'] as Array<Record<string,unknown>>;
 assert(graph.length>=3);
 const byType=(type:string)=>graph.filter(item=>item['@type']===type);
 assert.equal(byType('Organization').length,1);
 assert.equal(byType('WebSite').length,1);
 assert.equal(byType('SoftwareApplication').length,1,'el tipo se declara una sola vez');
 const app=byType('SoftwareApplication')[0] as {offers?:Array<{price:string;priceCurrency:string}>;image?:string;publisher?:Record<string,unknown>};
 assert.equal(app.image,'https://sistema.scaleparaguay.com/brand/share.png');
 assert.equal((app.publisher as Record<string,unknown>)['@id'],'https://sistema.scaleparaguay.com/#organization');
 const offers=app.offers||[];
 assert.deepEqual(offers.map(offer=>[offer.price,offer.priceCurrency]),[['10','USD'],['50000','PYG']],'los dos precios reales de lanzamiento');
 const website=byType('WebSite')[0] as {url?:string};
 assert.equal(website.url,'https://sistema.scaleparaguay.com/');
});

test('#158: la imagen social existe y mide 1200×630',()=>{
 const url=new URL('../public/brand/share.png',import.meta.url);
 assert(existsSync(url),'share.png referenciada por OG y JSON-LD');
 const png=readFileSync(url);
 assert.equal(png.readUInt32BE(0),0x89504e47,'PNG real');
 assert.equal(png.readUInt32BE(16),1200);
 assert.equal(png.readUInt32BE(20),630);
});

test('#158: robots y sitemap por host en el middleware',()=>{
 const middleware=file('middleware.ts');
 const sistema=middleware.slice(middleware.indexOf("host==='sistema.scaleparaguay.com'"));
 assert.match(sistema,/path==='\/robots\.txt'\)return new NextResponse\('User-agent: \*\\nAllow: \/\\nSitemap: https:\/\/sistema\.scaleparaguay\.com\/sitemap\.xml/,'el sitio permite el rastreo y declara el sitemap');
 const sitemap=sistema.match(/sitemap\.xml'\)return new NextResponse\('([^']+)'/)?.[1]||'';
 assert(sitemap.includes('https://sistema.scaleparaguay.com/')&&sitemap.includes('https://sistema.scaleparaguay.com/privacidad'),'el sitemap lista la landing y la política');
 assert(sitemap.includes('<?xml')&&sitemap.includes('urlset'),'sitemap XML válido');
 const cliente=middleware.slice(middleware.indexOf("host==='cliente.scaleparaguay.com'"));
 assert(cliente.includes('Disallow: /'),'el portal del cliente no se indexa');
 assert.match(middleware,/path==='\/robots\.txt'\)return new NextResponse\('User-agent: \*\\nDisallow: \/\\n'/,'el host de la app no se indexa');
 assert.match(middleware,/X-Robots-Tag','noindex, nofollow'/,'las superficies privadas viajan con noindex');
});

test('#158: la app es noindex y la política pública tiene canónica propia',()=>{
 const brand=file('app/brand-metadata.ts');
 assert.match(brand,/robots:\{index:false,follow:false/,'la app autenticada no compite con la landing');
 assert.match(brand,/appOrigin='https:\/\/app\.scaleparaguay\.com'/,'metadataBase en el host de la app');
 assert.match(file('app/robots.ts'),/disallow:'\/'/,'el robots de Next sigue cerrado por defecto');
 const privacidad=file('app/privacidad/page.tsx');
 assert.match(privacidad,/alternates:\{canonical:'https:\/\/sistema\.scaleparaguay\.com\/privacidad'\}/);
 assert.match(privacidad,/openGraph:\{type:'article'/);
});

test('#158: la decisión sobre FAQ queda documentada (sin rich result aplicable)',()=>{
 // Google limitó los rich results de FAQPage a sitios de gobierno/salud: no se
 // agrega schema que no produce resultado. La FAQ visible se mantiene y el
 // contrato de la landing (tests/landing-sales) la cubre.
 const docs=file('docs/qa/seo-158/INFORME-158.md');
 assert.match(docs,/FAQPage/,'la decisión de FAQ está documentada');
 assert.doesNotMatch(landing,/"@type":"FAQPage"/,'no se publica schema sin rich result');
});

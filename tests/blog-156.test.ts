import assert from 'node:assert/strict';
import {test} from 'node:test';
import {NextRequest} from 'next/server';
import {middleware} from '../middleware';
import {BLOG_CATEGORIES,BLOG_SECTIONS,getPost,isBlogSection,listPosts,parseBlogPost,postCanonical,postPath} from '../app/blog-data';
import {BLOG_ORIGINS} from '../app/seo';
import {GET as rssGet} from '../app/blog/[section]/rss.xml/route';
import {GET as sitemapGet} from '../app/blog/[section]/sitemap.xml/route';

// Blogs Fase 1 (#156/#157) contra el contrato acordado con contenido:
// canonical con categoría, coverAlt, títulos/descripciones acotados, sin H1,
// ≥400 palabras, CTA y enlace interno; borradores fuera de índice/sitemap/RSS.
const request=(host:string,path='/')=>middleware(new NextRequest('https://'+host+path,{headers:{host}}));
const call=(handler:typeof rssGet,section:string)=>handler(new Request('https://blog.scaleparaguay.com/'),{params:Promise.resolve({section})});

const filler=(count:number)=>Array.from({length:count},(_,index)=>`contenido${index}`).join(' ');
const validBody=()=>`## Una sección real\n\n${filler(400)}\n\nMás información en https://blog.scaleparaguay.com/servicios/atencion-al-cliente-que-ordena-la-operacion o escribinos por https://wa.me/595993391354.`;
const validRaw=(overrides:Record<string,string>={},body=validBody())=>`---\n${Object.entries({
 title:'Un título válido para el blog',
 description:'Una descripción suficientemente larga para pasar la validación del contrato de contenido del blog.',
 date:'2026-10-03',
 author:'Scale Paraguay',
 canonical:'https://blog.scaleparaguay.com/servicios/mi-post',
 categories:'[servicios]',
 tags:'[agencias]',
 cover:'/brand/share.png',
 coverAlt:'Portada del artículo',
 draft:'false',
 ...overrides,
}).map(([key,value])=>`${key}: ${value}`).join('\n')}\n---\n\n${body}\n`;

test('blog: publicados por sección, borradores afuera y canonical con categoría',()=>{
 assert.deepEqual(BLOG_SECTIONS,['empresa','producto']);
 for(const section of BLOG_SECTIONS){
  const posts=listPosts(section);
  assert.ok(posts.length>=2,`${section} tiene publicados`);
  for(const post of posts){
   assert.equal(post.draft,false);
   assert.equal(post.canonical,`${BLOG_ORIGINS[section]}/${post.categories[0]}/${post.slug}`);
   assert.ok(post.title.length>=15&&post.title.length<=60);
   assert.ok(post.description.length>=60&&post.description.length<=155);
   assert.ok(post.coverAlt.length>0);
   assert.equal(postPath(post),`/${post.categories[0]}/${post.slug}`);
   assert.ok(getPost(section,post.slug),'el publicado se sirve');
  }
 }
 assert.ok(listPosts('empresa',{includeDrafts:true}).some(post=>post.draft),'hay un borrador real de prueba');
 assert.equal(getPost('empresa','trabajar-por-entregas-sin-perder-el-hilo'),null,'un borrador no se sirve');
 assert.equal(isBlogSection('empresa'),true);assert.equal(isBlogSection('otro'),false);
});

test('blog: el frontmatter y el cuerpo se validan al construir',()=>{
 const parsed=parseBlogPost('empresa','2026-10-mi-post.mdx',validRaw());
 assert.equal(parsed.slug,'mi-post');assert.deepEqual(parsed.categories,['servicios']);assert.equal(parsed.draft,false);
 assert.throws(()=>parseBlogPost('empresa','2026-10-mi-post.mdx',validRaw({title:'corto'})),/title/);
 assert.throws(()=>parseBlogPost('empresa','2026-10-mi-post.mdx',validRaw({description:'muy corta'})),/description/);
 assert.throws(()=>parseBlogPost('empresa','2026-10-mi-post.mdx',validRaw({date:'2026-13-40'})),/date/);
 assert.throws(()=>parseBlogPost('empresa','2026-09-mi-post.mdx',validRaw()),/mes de publicación/);
 assert.throws(()=>parseBlogPost('empresa','2026-10-mi-post.mdx',validRaw({categories:'[otra]'})),/categoría inválida/);
 assert.throws(()=>parseBlogPost('empresa','2026-10-mi-post.mdx',validRaw({canonical:'https://otro.example/mi-post'})),/canonical/);
 assert.throws(()=>parseBlogPost('empresa','2026-10-mi-post.mdx',validRaw({coverAlt:''})),/coverAlt/);
 assert.throws(()=>parseBlogPost('empresa','2026-10-mi-post.mdx',validRaw({},`# Título repetido\n\n${filler(400)}`)),/H1/);
 assert.throws(()=>parseBlogPost('empresa','2026-10-mi-post.mdx',validRaw({},'## Sección\n\ncorto')),/contenido insuficiente/);
 assert.deepEqual(BLOG_CATEGORIES.producto,['novedades','guias','changelog','casos']);
});

test('blog: el middleware enruta hosts y rutas con categoría',()=>{
 assert.equal(request('blog.scaleparaguay.com').headers.get('x-middleware-rewrite'),'https://blog.scaleparaguay.com/blog/empresa');
 assert.equal(request('blog.scaleparaguay.com','/casos/una-agencia-ordenada-en-tres-meses').headers.get('x-middleware-rewrite'),'https://blog.scaleparaguay.com/blog/empresa/casos/una-agencia-ordenada-en-tres-meses');
 assert.equal(request('blog.scaleparaguay.com','/casos/una-agencia-ordenada-en-tres-meses').headers.get('x-robots-tag'),null,'el blog se indexa');
 assert.equal(request('producto.scaleparaguay.com','/novedades/scale-os-v1-0-173').headers.get('x-middleware-rewrite'),'https://producto.scaleparaguay.com/blog/producto/novedades/scale-os-v1-0-173');
 assert.equal(request('producto.scaleparaguay.com','/rss.xml').headers.get('x-middleware-rewrite'),'https://producto.scaleparaguay.com/blog/producto/rss.xml');
 assert.equal(request('producto.scaleparaguay.com','/sitemap.xml').headers.get('x-middleware-rewrite'),'https://producto.scaleparaguay.com/blog/producto/sitemap.xml');
 assert.equal(request('app.scaleparaguay.com','/equipo').headers.get('x-robots-tag'),'noindex, nofollow','la app sigue fuera');
});

test('blog: RSS y sitemap usan el canonical con categoría y excluyen borradores',async()=>{
 const rss=await call(rssGet,'empresa');const rssText=await rss.text();
 assert.match(rss.headers.get('content-type')||'',/rss\+xml/);
 assert.ok(rssText.includes('https://blog.scaleparaguay.com/servicios/atencion-al-cliente-que-ordena-la-operacion'));
 assert.ok(!rssText.includes('trabajar-por-entregas'),'el borrador no entra al RSS');
 const sitemap=await (await call(sitemapGet,'producto')).text();
 assert.ok(sitemap.includes('<loc>https://producto.scaleparaguay.com/</loc>'));
 assert.ok(sitemap.includes('https://producto.scaleparaguay.com/novedades/scale-os-v1-0-173'));
 const post=listPosts('producto')[0];
 assert.equal(postCanonical(post),`https://producto.scaleparaguay.com/${post.categories[0]}/${post.slug}`);
});

console.log('PASS: blogs #156/#157 — contrato de contenido, hosts, canonical con categoría, RSS y sitemap.');

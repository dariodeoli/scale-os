import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {after,before,mock,test} from 'node:test';
import {NextRequest} from 'next/server';
import {middleware} from '../middleware';
import {BLOG_CATEGORIES,BLOG_SECTIONS,asuncionPublicationDate,getPost,isBlogSection,isPublicBlogPost,listPosts,parseBlogPost,postCanonical,postPath} from '../app/blog-data';
import {BLOG_ORIGINS} from '../app/seo';
import BlogPostPage,{generateStaticParams as postParams,generateMetadata as postMetadata} from '../app/blog/[section]/[slug]/page';

// The real index now loads the editorial template's scoped stylesheet.
require.extensions['.css'] = () => {};
const {default: BlogIndex} = require('../app/blog/[section]/page') as typeof import('../app/blog/[section]/page');

// Keep real content fixtures deterministic even after their scheduled dates pass.
before(()=>mock.timers.enable({apis:['Date'],now:Date.parse('2026-10-05T15:00:00Z')}));
after(()=>mock.timers.reset());
import {GET as rssGet} from '../app/blog/[section]/rss.xml/route';
import {GET as sitemapGet} from '../app/blog/[section]/sitemap.xml/route';

// Blogs Fase 1 (#156/#157), contrato único: URL pública `/<slug>` (slug del
// archivo sin fecha), canonical OPCIONAL derivada del host, categorías por
// nombre visible o slug, sin H1, y borradores fuera de índice/sitemap/RSS.
const request=(host:string,path='/')=>middleware(new NextRequest('https://'+host+path,{headers:{host}}));
const call=(handler:typeof rssGet,section:string)=>handler(new Request('https://blog.scaleparaguay.com/'),{params:Promise.resolve({section})});

const validBody=`## Una sección real\n\n${Array.from({length:120},(_,index)=>`contenido${index}`).join(' ')}\n\nMás información en https://blog.scaleparaguay.com/atencion-al-cliente-que-ordena-la-operacion.`;
const validRaw=(overrides:Record<string,string>={},body=validBody)=>`---\n${Object.entries({
 title:'Un título válido para el blog',
 description:'Una descripción suficientemente larga para pasar la validación del contrato de contenido del blog.',
 date:'2026-10-03',
 author:'Scale Paraguay',
 categories:'[Servicios]',
 tags:'[agencias]',
 cover:'/brand/share.png',
 coverAlt:'Portada del artículo',
 draft:'false',
 ...overrides,
}).map(([key,value])=>`${key}: ${value}`).join('\n')}\n---\n\n${body}\n`;

test('blog: slug sin fecha, canonical derivado y categoría nombre→slug',()=>{
 assert.deepEqual(BLOG_SECTIONS,['empresa','producto']);
 for(const section of BLOG_SECTIONS){
  const posts=listPosts(section);
  assert.ok(posts.length>=2,`${section} tiene publicados`);
  for(const post of posts){
   assert.equal(post.draft,false);
   assert.ok(!/^\d{4}-\d{2}-/.test(post.slug),'el slug público no lleva la fecha');
   assert.ok(post.title.length>=10&&post.title.length<=90);
   assert.ok(post.description.length>=40&&post.description.length<=200);
   assert.ok(!post.cover||post.coverAlt.length>=4,'alt obligatorio con portada');
   assert.ok(BLOG_CATEGORIES[section].some(entry=>entry.slug===post.categories[0]),'categoría válida');
   assert.ok(post.categoryNames[0].length>0,'categoría con nombre visible');
   assert.equal(postPath(post),`/${post.slug}`);
   assert.equal(postCanonical(post),post.canonical||`${BLOG_ORIGINS[section]}/${post.slug}`);
   assert.ok(getPost(section,post.slug),'el publicado se sirve');
  }
 }
 assert.ok(listPosts('empresa',{includeDrafts:true}).some(post=>post.draft),'hay un borrador real de prueba');
 assert.equal(getPost('empresa','trabajar-por-entregas-sin-perder-el-hilo'),null,'un borrador no se sirve');
 assert.equal(isBlogSection('empresa'),true);assert.equal(isBlogSection('otro'),false);
});

test('blog: la fecha de Asunción embarga hasta el día exacto y editorial conserva acceso',()=>{
 const before=new Date('2026-10-20T02:59:59.999Z');
 const exact=new Date('2026-10-20T03:00:00.000Z');
 assert.equal(asuncionPublicationDate(before),'2026-10-19');
 assert.equal(asuncionPublicationDate(exact),'2026-10-20');
 assert.throws(()=>asuncionPublicationDate(new Date(NaN)),/fecha válida/);
 const scheduled={date:'2026-10-20',draft:false};
 assert.equal(isPublicBlogPost(scheduled,asuncionPublicationDate(before)),false,'el día anterior sigue embargado');
 assert.equal(isPublicBlogPost(scheduled,asuncionPublicationDate(exact)),true,'el día exacto se publica');
 assert.equal(isPublicBlogPost({date:'2026-10-01',draft:true},asuncionPublicationDate(exact)),false,'un borrador sigue privado');
 assert.equal(getPost('empresa','que-publicar-en-instagram',{now:before}),null,'la consulta directa respeta el embargo');
 assert.ok(getPost('empresa','que-publicar-en-instagram',{now:exact}),'la consulta directa publica en la fecha exacta');
 const editorial=listPosts('empresa',{includeDrafts:true,now:before});
 assert.ok(editorial.some(post=>post.slug==='que-publicar-en-instagram'&&!post.draft),'editorial ve publicaciones programadas');
 assert.ok(editorial.some(post=>post.slug==='trabajar-por-entregas-sin-perder-el-hilo'&&post.draft),'editorial ve borradores');
 assert.ok(getPost('empresa','trabajar-por-entregas-sin-perder-el-hilo',{includeDrafts:true,now:before}),'la consulta editorial directa ve borradores');
});

test('blog: static params and public metadata exclude scheduled posts',async()=>{
 const params=postParams();
 for(const section of BLOG_SECTIONS){
  for(const post of listPosts(section,{includeDrafts:true})){
   const publicPost=isPublicBlogPost(post,'2026-10-05');
   assert.equal(params.some(value=>value.section===section&&value.slug===post.slug),publicPost);
   const metadata=await postMetadata({params:Promise.resolve({section,slug:post.slug})});
   if(!publicPost){
    assert.deepEqual(metadata,{});
    await assert.rejects(()=>BlogPostPage({params:Promise.resolve({section,slug:post.slug})}),/404/);
   }
  }
 }
});

test('blog: rendered indexes exclude drafts and scheduled content',async()=>{
 const previous=(globalThis as any).React;
 Object.assign(globalThis,{React});
 try{
  for(const section of BLOG_SECTIONS){
   const html=renderToStaticMarkup(await BlogIndex({params:Promise.resolve({section})}));
   for(const post of listPosts(section,{includeDrafts:true})){
    assert.equal(html.includes(`href="/${post.slug}"`),isPublicBlogPost(post,'2026-10-05'));
   }
  }
 }finally{(globalThis as any).React=previous;}
});

test('blog: el parser acepta nombre o slug de categoría y canonical opcional',()=>{
 const parsed=parseBlogPost('empresa','2026-10-mi-post.mdx',validRaw());
 assert.equal(parsed.slug,'mi-post');
 assert.deepEqual(parsed.categories,['servicios']);
 assert.deepEqual(parsed.categoryNames,['Servicios']);
 assert.equal(parsed.canonical,null,'sin canonical declarada se deriva');
 assert.equal(postCanonical(parsed),'https://blog.scaleparaguay.com/mi-post');
 const slugged=parseBlogPost('empresa','2026-10-mi-post.mdx',validRaw({categories:'[servicios]'}));
 assert.deepEqual(slugged.categoryNames,['Servicios'],'el slug también se normaliza a nombre');
 const conCanonical=parseBlogPost('empresa','2026-10-mi-post.mdx',validRaw({canonical:'https://blog.scaleparaguay.com/mi-post'}));
 assert.equal(conCanonical.canonical,'https://blog.scaleparaguay.com/mi-post');
 assert.throws(()=>parseBlogPost('empresa','2026-10-mi-post.mdx',validRaw({canonical:'https://blog.scaleparaguay.com/servicios/mi-post'})),/canonical/);
 assert.throws(()=>parseBlogPost('empresa','2026-10-mi-post.mdx',validRaw({title:'corto'})),/title/);
 assert.throws(()=>parseBlogPost('empresa','2026-10-mi-post.mdx',validRaw({description:'muy corta'})),/description/);
 assert.throws(()=>parseBlogPost('empresa','2026-10-mi-post.mdx',validRaw({date:'2026-13-40'})),/date/);
 assert.throws(()=>parseBlogPost('empresa','2026-09-mi-post.mdx',validRaw()),/mes de publicación/);
 assert.throws(()=>parseBlogPost('empresa','2026-10-mi-post.mdx',validRaw({categories:'[Inexistente]'})),/categoría inválida/);
 assert.throws(()=>parseBlogPost('empresa','2026-10-mi-post.mdx',validRaw({coverAlt:''})),/coverAlt/);
 assert.throws(()=>parseBlogPost('empresa','2026-10-mi-post.mdx',validRaw({},`# Título repetido\n\n## Sección\n\ncuerpo`)),/H1/);
});

test('blog: el middleware enruta hosts y posts por slug',()=>{
 assert.equal(request('blog.scaleparaguay.com').headers.get('x-middleware-rewrite'),'https://blog.scaleparaguay.com/blog/empresa');
 assert.equal(request('blog.scaleparaguay.com','/una-agencia-ordenada-en-tres-meses').headers.get('x-middleware-rewrite'),'https://blog.scaleparaguay.com/blog/empresa/una-agencia-ordenada-en-tres-meses');
 assert.equal(request('blog.scaleparaguay.com','/una-agencia-ordenada-en-tres-meses').headers.get('x-robots-tag'),null,'el blog se indexa');
 assert.equal(request('producto.scaleparaguay.com','/scale-os-v1-0-173').headers.get('x-middleware-rewrite'),'https://producto.scaleparaguay.com/blog/producto/scale-os-v1-0-173');
 assert.equal(request('producto.scaleparaguay.com','/rss.xml').headers.get('x-middleware-rewrite'),'https://producto.scaleparaguay.com/blog/producto/rss.xml');
 assert.equal(request('producto.scaleparaguay.com','/sitemap.xml').headers.get('x-middleware-rewrite'),'https://producto.scaleparaguay.com/blog/producto/sitemap.xml');
 assert.equal(request('app.scaleparaguay.com','/equipo').headers.get('x-robots-tag'),'noindex, nofollow','la app sigue fuera');
});

test('blog: RSS y sitemap usan host/slug y excluyen borradores',async()=>{
 const today=asuncionPublicationDate(new Date());
 const futurePosts=BLOG_SECTIONS.flatMap(section=>listPosts(section,{includeDrafts:true}).filter(post=>!post.draft&&post.date>today));
 for(const section of BLOG_SECTIONS){
  for(const handler of [rssGet,sitemapGet]){
   const xml=await (await call(handler,section)).text();
   for(const post of listPosts(section,{includeDrafts:true})){
    assert.equal(xml.includes(postCanonical(post)),isPublicBlogPost(post,today),`${section}/${post.slug} publication policy`);
   }
  }
 }
 const rss=await call(rssGet,'empresa');const rssText=await rss.text();
 assert.match(rss.headers.get('content-type')||'',/rss\+xml/);
 assert.ok(rssText.includes('https://blog.scaleparaguay.com/atencion-al-cliente-que-ordena-la-operacion'));
 assert.ok(!rssText.includes('trabajar-por-entregas'),'el borrador no entra al RSS');
 for(const post of futurePosts.filter(post=>post.section==='empresa'))assert.ok(!rssText.includes(postCanonical(post)),`${post.slug} sigue fuera del RSS hasta ${post.date}`);
 const sitemap=await (await call(sitemapGet,'producto')).text();
 assert.ok(sitemap.includes('<loc>https://producto.scaleparaguay.com/</loc>'));
 assert.ok(sitemap.includes('https://producto.scaleparaguay.com/scale-os-v1-0-173'));
 assert.ok(!sitemap.includes('slash'),'sin rutas con categoría');
 for(const post of futurePosts.filter(post=>post.section==='producto'))assert.ok(!sitemap.includes(postCanonical(post)),`${post.slug} sigue fuera del sitemap hasta ${post.date}`);
 for(const lastmod of sitemap.matchAll(/<lastmod>(\d{4}-\d{2}-\d{2})<\/lastmod>/g))assert.ok(lastmod[1]<=today,`lastmod futuro: ${lastmod[1]}`);
});

console.log('PASS: blogs #156/#157/#158 — publicación programada en Asunción, contrato de contenido, hosts, RSS y sitemap.');

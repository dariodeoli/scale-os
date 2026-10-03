import assert from 'node:assert/strict';
import {test} from 'node:test';
import {NextRequest} from 'next/server';
import {middleware} from '../middleware';
import {BLOG_SECTIONS,getPost,isBlogSection,listPosts,parseBlogPost,postCanonical} from '../app/blog-data';
import {blogRobotsTxt} from '../app/seo';
import {GET as rssGet} from '../app/blog/[section]/rss.xml/route';
import {GET as sitemapGet} from '../app/blog/[section]/sitemap.xml/route';

// Blogs Fase 1 (#156/#157): contenido MDX con frontmatter, borradores fuera de
// índice/sitemap/RSS y hosts propios enrutados por middleware.
const request=(host:string,path='/')=>middleware(new NextRequest('https://'+host+path,{headers:{host}}));
const call=(handler:typeof rssGet,section:string)=>handler(new Request('https://blog.scaleparaguay.com/'),{params:Promise.resolve({section})});

test('blog: publicados por sección, borradores afuera y orden por fecha',()=>{
 assert.deepEqual(BLOG_SECTIONS,['empresa','producto']);
 const empresa=listPosts('empresa');
 assert.ok(empresa.length>=1,'la sección empresa tiene contenido');
 assert.equal(empresa[0].title,'Bienvenidos al blog de Scale Paraguay');
 assert.ok(empresa[0].date.startsWith('2026-'));
 assert.equal(empresa[0].draft,false);
 const producto=listPosts('producto');
 assert.ok(producto.every(post=>!post.draft),'listPosts no devuelve borradores');
 assert.ok(!producto.some(post=>post.slug.includes('guia-cobros')),'el borrador no se lista');
 assert.equal(getPost('producto','2026-10-guia-cobros'),null,'un borrador no se sirve');
 assert.ok(getPost('producto','2026-10-scale-os-v1-0-172'),'el publicado se sirve');
 assert.equal(isBlogSection('empresa'),true);assert.equal(isBlogSection('otro'),false);
});

test('blog: el frontmatter se valida al construir',()=>{
 const base={title:'Un título válido',description:'Una descripción suficientemente larga para pasar la validación del blog.',date:'2026-10-03',author:'Scale OS'};
 const raw=(extra:Record<string, unknown>)=>`---\n${Object.entries({...base,...extra}).map(([key,value])=>`${key}: ${Array.isArray(value)?`[${value.join(', ')}]`:value}`).join('\n')}\n---\n\n# Cuerpo\n`;
 const parsed=parseBlogPost('producto','un-slug-valido',raw({categories:['Novedades'],tags:['release'],draft:false}));
 assert.equal(parsed.title,base.title);assert.deepEqual(parsed.categories,['Novedades']);
 assert.throws(()=>parseBlogPost('producto','slug inválido',raw({})),/slug/);
 assert.throws(()=>parseBlogPost('producto','ok',raw({title:'ab'})),/title/);
 assert.throws(()=>parseBlogPost('producto','ok',raw({description:'muy corta'})),/description/);
 assert.throws(()=>parseBlogPost('producto','ok',raw({date:'2026-13-40'})),/date/);
 assert.throws(()=>parseBlogPost('producto','ok',raw({draft:'sí'})),/author|cuerpo|draft/);
});

test('blog: middleware enruta los hosts propios y mantiene noindex fuera de ellos',()=>{
 assert.equal(request('blog.scaleparaguay.com').headers.get('x-middleware-rewrite'),'https://blog.scaleparaguay.com/blog/empresa');
 const post=request('blog.scaleparaguay.com','/2026-10-bienvenidos-al-blog');
 assert.equal(post.headers.get('x-middleware-rewrite'),'https://blog.scaleparaguay.com/blog/empresa/2026-10-bienvenidos-al-blog');
 assert.equal(post.headers.get('x-robots-tag'),null,'el blog se indexa');
 assert.equal(request('producto.scaleparaguay.com').headers.get('x-middleware-rewrite'),'https://producto.scaleparaguay.com/blog/producto');
 assert.equal(request('producto.scaleparaguay.com','/rss.xml').headers.get('x-middleware-rewrite'),'https://producto.scaleparaguay.com/blog/producto/rss.xml');
 assert.equal(request('producto.scaleparaguay.com','/sitemap.xml').headers.get('x-middleware-rewrite'),'https://producto.scaleparaguay.com/blog/producto/sitemap.xml');
 assert.equal(request('producto.scaleparaguay.com','/privacidad').headers.get('location'),'https://sistema.scaleparaguay.com/privacidad');
 const robots=request('blog.scaleparaguay.com','/robots.txt');
 assert.equal(robots.status,200);assert.match(blogRobotsTxt('empresa'),/Allow: \//);assert.match(blogRobotsTxt('empresa'),/Sitemap: https:\/\/blog\.scaleparaguay\.com\/sitemap\.xml/);
 assert.equal(request('app.scaleparaguay.com','/equipo').headers.get('x-robots-tag'),'noindex, nofollow','la app sigue fuera');
});

test('blog: RSS y sitemap por sección, sin borradores',async()=>{
 const rss=await call(rssGet,'empresa');const rssText=await rss.text();
 assert.match(rss.headers.get('content-type')||'',/rss\+xml/);
 assert.ok(rssText.includes('<rss version="2.0"'));
 assert.ok(rssText.includes('https://blog.scaleparaguay.com/2026-10-bienvenidos-al-blog'));
 const rssProducto=await (await call(rssGet,'producto')).text();
 assert.ok(!rssProducto.includes('guia-cobros'),'el borrador no entra al RSS');
 const sitemap=await (await call(sitemapGet,'producto')).text();
 assert.ok(sitemap.includes('<loc>https://producto.scaleparaguay.com/</loc>'));
 assert.ok(sitemap.includes('https://producto.scaleparaguay.com/2026-10-scale-os-v1-0-172'));
 assert.ok(!sitemap.includes('guia-cobros'),'el borrador no entra al sitemap');
 assert.equal(postCanonical('empresa','mi-post'),'https://blog.scaleparaguay.com/mi-post');
 assert.equal(postCanonical('producto','mi-post','https://otro.example/mi-post'),'https://otro.example/mi-post');
});

console.log('PASS: blogs #156/#157 — contenido validado, borradores afuera, hosts propios, RSS y sitemap por sección.');

import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import {BLOG_SECTIONS,isBlogSection,listPosts} from '../../blog-data';
import {BlogListTemplate} from '../../blog-templates';
import {BLOG_ORIGINS} from '../../seo';

// Índice del blog por sección (#156/#157). En los hosts propios, el middleware
// reescribe `/` a `/blog/<sección>`; las URLs de los posts son `/<slug>`.
export const dynamicParams = false;

export function generateStaticParams(){
 return BLOG_SECTIONS.map(section=>({section}));
}

export async function generateMetadata(props:{params:Promise<{section:string}>}):Promise<Metadata>{
 const {section}=await props.params;
 if(!isBlogSection(section))return {};
 const titles={empresa:'Blog de Scale Paraguay',producto:'Blog de Scale OS'} as const;
 const description=section==='empresa'
  ? 'Casos, cultura y noticias de Scale Paraguay, la agencia detrás de Scale OS.'
  : 'Novedades, guías y casos de producto de Scale OS.';
 return {
  title:titles[section],
  description,
  alternates:{canonical:`${BLOG_ORIGINS[section]}/`},
  robots:{index:true,follow:true},
  openGraph:{type:'website',url:`${BLOG_ORIGINS[section]}/`,title:titles[section],description,siteName:titles[section],locale:'es_PY'},
 };
}

export default async function BlogIndex(props:{params:Promise<{section:string}>}){
 const {section}=await props.params;
 if(!isBlogSection(section))notFound();
 const posts=listPosts(section);
 const categories=Array.from(new Set(posts.flatMap(post=>post.categoryNames))).sort();
 return <BlogListTemplate embedded variant={section}
  title={section==='empresa'?'Historias de la agencia':'Novedades de producto'}
  description={section==='empresa'?'Casos, cultura y noticias del equipo.':'Guías, lanzamientos y cómo usar Scale OS de punta a punta.'}
  categories={categories.map(name=>({slug:name,label:name}))}
  posts={posts.map(post=>({slug:post.slug,title:post.title,excerpt:post.description,date:post.date,author:post.author,
   category:{slug:post.categories[0],label:post.categoryNames[0]},tags:post.tags,cover:post.cover,coverAlt:post.coverAlt}))}
  basePath="" rssHref="/rss.xml" sitemapHref={`${BLOG_ORIGINS[section]}/sitemap.xml`}/>;
}

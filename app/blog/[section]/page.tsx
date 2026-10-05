import type {Metadata} from 'next';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {BLOG_SECTIONS,isBlogSection,listPosts,postPath} from '../../blog-data';
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

const dateLabel=(value:string)=>{
 const [year,month,day]=value.split('-').map(Number);
 return new Intl.DateTimeFormat('es-PY',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(Date.UTC(year,month-1,day,12)));
};

export default async function BlogIndex(props:{params:Promise<{section:string}>}){
 const {section}=await props.params;
 if(!isBlogSection(section))notFound();
 const posts=listPosts(section);
 const categories=Array.from(new Set(posts.flatMap(post=>post.categoryNames))).sort();
 return <section className="blog-index" aria-labelledby="blog-title">
  <header className="blog-index-header">
   <p className="blog-kicker">{section==='empresa'?'Scale Paraguay':'Scale OS · Producto'}</p>
   <h1 id="blog-title">{section==='empresa'?'Historias de la agencia':'Novedades de producto'}</h1>
   <p className="blog-lead">{section==='empresa'?'Casos, cultura y noticias del equipo.':'Guías, lanzamientos y cómo usar Scale OS de punta a punta.'}</p>
   {categories.length?<p className="blog-categories" aria-label="Categorías">{categories.map(category=><span key={category} className="blog-chip">{category}</span>)}</p>:null}
  </header>
  {posts.length?<div className="blog-list">{posts.map(post=><article className="blog-item" key={post.slug}>
   {post.cover?<img className="blog-cover" src={post.cover} alt={post.coverAlt} loading="lazy" decoding="async" width={640} height={360}/>:null}
   <div className="blog-item-body">
    <p className="blog-meta"><time dateTime={post.date}>{dateLabel(post.date)}</time> · {post.author}</p>
    <h2><Link href={postPath(post)}>{post.title}</Link></h2>
    <p className="blog-summary">{post.description}</p>
    {post.tags.length?<p className="blog-tags" aria-label="Etiquetas">{post.tags.map(tag=><span key={tag} className="blog-chip muted">{tag}</span>)}</p>:null}
   </div>
  </article>)}</div>:<p className="blog-empty">Todavía no hay artículos publicados. Volvé pronto.</p>}
  <p className="blog-feeds"><a href="/rss.xml">RSS</a> · <a href={`${BLOG_ORIGINS[section]}/sitemap.xml`}>Sitemap</a></p>
 </section>;
}

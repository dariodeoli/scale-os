import type {Metadata} from 'next';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {marked} from 'marked';
import {BLOG_SECTIONS,getPost,isBlogSection,listPosts,postCanonical} from '../../../blog-data';

// Post del blog (#156/#157): estático, con canonical del host propio y
// Article JSON-LD. Los borradores no se generan y devuelven 404. El cuerpo se
// renderiza a HTML en el build (subconjunto Markdown+GFM de MDX, ver README).
export const dynamicParams = false;

export function generateStaticParams(){
 return BLOG_SECTIONS.flatMap(section=>listPosts(section).map(post=>({section,slug:post.slug})));
}

export async function generateMetadata(props:{params:Promise<{section:string;slug:string}>}):Promise<Metadata>{
 const {section,slug}=await props.params;
 if(!isBlogSection(section))return {};
 const post=getPost(section,slug);
 if(!post)return {};
 const canonical=postCanonical(post);
 return {
  title:post.seoTitle||post.title,
  description:post.description,
  alternates:{canonical},
  robots:{index:true,follow:true},
  openGraph:{type:'article',url:canonical,title:post.seoTitle||post.title,description:post.description,siteName:section==='empresa'?'Blog de Scale Paraguay':'Blog de Scale OS',locale:'es_PY',publishedTime:post.date,authors:[post.author],...post.cover?{images:[post.cover]}:{}},
  twitter:{card:'summary_large_image',title:post.seoTitle||post.title,description:post.description,...post.cover?{images:[post.cover]}:{}},
 };
}

const dateLabel=(value:string)=>{
 const [year,month,day]=value.split('-').map(Number);
 return new Intl.DateTimeFormat('es-PY',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(Date.UTC(year,month-1,day,12)));
};

export default async function BlogPostPage(props:{params:Promise<{section:string;slug:string}>}){
 const {section,slug}=await props.params;
 if(!isBlogSection(section))notFound();
 const post=getPost(section,slug);
 if(!post)notFound();
 const html=await marked.parse(post.body,{gfm:true});
 const canonical=postCanonical(post);
 const jsonLd={
  '@context':'https://schema.org','@type':'Article',
  headline:post.title,description:post.description,datePublished:post.date,dateModified:post.date,
  author:{'@type':'Organization',name:post.author},
  publisher:{'@type':'Organization',name:'Scale Strategy Group',url:'https://scaleparaguay.com/'},
  mainEntityOfPage:canonical,inLanguage:'es-PY',...(post.cover?{image:[post.cover]}:{}),
 };
 return <article className="blog-post">
  <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(jsonLd)}}/>
  <header className="blog-post-header">
   <p className="blog-kicker"><Link href="/">{section==='empresa'?'Scale Paraguay':'Scale OS · Producto'}</Link></p>
   <h1>{post.title}</h1>
   <p className="blog-meta"><time dateTime={post.date}>{dateLabel(post.date)}</time> · {post.author}</p>
   {post.categoryNames.length?<p className="blog-categories" aria-label="Categorías">{post.categoryNames.map(name=><span key={name} className="blog-chip">{name}</span>)}</p>:null}
  </header>
  {post.cover?<img className="blog-cover wide" src={post.cover} alt={post.coverAlt} loading="lazy" decoding="async" width={1200} height={675}/>:null}
  <div className="blog-prose" dangerouslySetInnerHTML={{__html:html}}/>
  {post.tags.length?<p className="blog-tags" aria-label="Etiquetas">{post.tags.map(tag=><span key={tag} className="blog-chip muted">{tag}</span>)}</p>:null}
  <p className="blog-back"><Link href="/">← Volver al inicio</Link></p>
 </article>;
}

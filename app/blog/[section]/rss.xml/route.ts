import {BLOG_SECTIONS,isBlogSection,listPosts,postCanonical} from '../../../blog-data';
import {BLOG_ORIGINS} from '../../../seo';

// RSS por sección (#156/#157). Estático: se regenera en cada build.
export const dynamic = 'force-static';

export function generateStaticParams(){
 return BLOG_SECTIONS.map(section=>({section}));
}

const xmlEscapes:Record<string,string>={'<':'&lt;','>':'&gt;','&':'&amp;',"'":'&apos;','"':'&quot;'};
const escapeXml=(value:unknown)=>String(value??'').replace(/[<>&'"]/g,char=>xmlEscapes[char]??char);

export async function GET(_request:Request,props:{params:Promise<{section:string}>}){
 const {section}=await props.params;
 if(!isBlogSection(section))return new Response('No encontrado',{status:404});
 const title=section==='empresa'?'Blog de Scale Paraguay':'Blog de Scale OS';
 const description=section==='empresa'?'Casos, cultura y noticias de Scale Paraguay.':'Novedades y guías de Scale OS.';
 const items=listPosts(section).map(post=>{
  const url=postCanonical(section,post.slug,post.canonical);
  return `  <item>\n   <title>${escapeXml(post.title)}</title>\n   <link>${escapeXml(url)}</link>\n   <guid isPermaLink="true">${escapeXml(url)}</guid>\n   <pubDate>${new Date(`${post.date}T12:00:00Z`).toUTCString()}</pubDate>\n   <description>${escapeXml(post.description)}</description>\n  </item>`;
 }).join('\n');
 const xml=`<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0">\n<channel>\n  <title>${escapeXml(title)}</title>\n  <link>${BLOG_ORIGINS[section]}/</link>\n  <description>${escapeXml(description)}</description>\n  <language>es-PY</language>\n${items}\n</channel>\n</rss>\n`;
 return new Response(xml,{headers:{'content-type':'application/rss+xml; charset=utf-8'}});
}

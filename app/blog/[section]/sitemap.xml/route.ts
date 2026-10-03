import {BLOG_SECTIONS,isBlogSection,listPosts,postCanonical} from '../../../blog-data';
import {BLOG_ORIGINS} from '../../../seo';

// Sitemap por sección (#156/#157): portada + posts publicados (sin borradores).
export const dynamic = 'force-static';

export function generateStaticParams(){
 return BLOG_SECTIONS.map(section=>({section}));
}

const xmlEscapes:Record<string,string>={'<':'&lt;','>':'&gt;','&':'&amp;',"'":'&apos;','"':'&quot;'};
const escapeXml=(value:unknown)=>String(value??'').replace(/[<>&'"]/g,char=>xmlEscapes[char]??char);

export async function GET(_request:Request,props:{params:Promise<{section:string}>}){
 const {section}=await props.params;
 if(!isBlogSection(section))return new Response('No encontrado',{status:404});
 const urls=[
  `  <url><loc>${BLOG_ORIGINS[section]}/</loc></url>`,
  ...listPosts(section).map(post=>`  <url><loc>${escapeXml(postCanonical(post))}</loc><lastmod>${post.date}</lastmod></url>`),
 ];
 const xml=`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
 return new Response(xml,{headers:{'content-type':'application/xml; charset=utf-8'}});
}

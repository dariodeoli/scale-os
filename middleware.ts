import {NextResponse,type NextRequest} from 'next/server';
import {sections,legacyRoutes} from './app/navigation';
const workspaceRoots=new Set([...sections.map(([,slug])=>slug.split('/')[0]),...Object.keys(legacyRoutes)]);
export function middleware(request:NextRequest){
 const host=(request.headers.get('host')||'').split(':')[0].toLowerCase(),path=request.nextUrl.pathname;
 if(host==='sistema.scaleparaguay.com'){
  if(path==='/robots.txt')return new NextResponse('User-agent: *\nAllow: /\nSitemap: https://sistema.scaleparaguay.com/sitemap.xml\n',{headers:{'Content-Type':'text/plain'}});
  if(path==='/sitemap.xml')return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://sistema.scaleparaguay.com/</loc></url></urlset>',{headers:{'Content-Type':'application/xml'}});
  if(path==='/')return NextResponse.rewrite(new URL('/scale-os.html',request.url));
  if(path==='/scale-os.html')return NextResponse.redirect(new URL('https://sistema.scaleparaguay.com/'),308);
  if(path==='/registro')return NextResponse.redirect(new URL('https://app.scaleparaguay.com/registro'),307);
  if(path.startsWith('/brand/'))return NextResponse.next();
  if(path==='/demo'||path.startsWith('/core-api/')||workspaceRoots.has(path.split('/')[1])){const response=NextResponse.next();response.headers.set('X-Robots-Tag','noindex, nofollow');return response;}
  return new NextResponse('Página no encontrada',{status:404,headers:{'X-Robots-Tag':'noindex'}});
 }
 if(path==='/robots.txt')return new NextResponse('User-agent: *\nDisallow: /\n',{headers:{'Content-Type':'text/plain'}});
 const response=NextResponse.next();response.headers.set('X-Robots-Tag','noindex, nofollow');return response;
}
export const config={matcher:['/((?!_next/static|_next/image).*)']};

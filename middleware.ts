import {NextResponse,type NextRequest} from 'next/server';
import {sections,legacyRoutes} from './app/navigation';
import {resolveCoreApiOrigin} from './core-api-origin.mjs';
const workspaceRoots=new Set([...sections.map(([,slug])=>slug.split('/')[0]),...Object.keys(legacyRoutes)]);
export function middleware(request:NextRequest){
 const host=(request.headers.get('host')||'').split(':')[0].toLowerCase(),path=request.nextUrl.pathname;
 if(host==='admin.scaleparaguay.com'&&path==='/'){
  const url=request.nextUrl.clone();url.pathname='/superadmin';
  const response=NextResponse.rewrite(url);response.headers.set('X-Robots-Tag','noindex, nofollow');return response;
 }
 if((path==='/core-api'||path.startsWith('/core-api/'))&&request.nextUrl.origin===resolveCoreApiOrigin()){
  return new NextResponse('Core API proxy target cannot be this frontend host',{status:508,headers:{'X-Robots-Tag':'noindex, nofollow'}});
 }
 if(host==='cliente.scaleparaguay.com'){
  if(path==='/robots.txt')return new NextResponse('User-agent: *\nDisallow: /\n',{headers:{'Content-Type':'text/plain'}});
  if(path.startsWith('/brand/')||path.startsWith('/core-api/')){const response=NextResponse.next();response.headers.set('X-Robots-Tag','noindex, nofollow');return response;}
  if(path.startsWith('/cliente/')){const response=NextResponse.next();response.headers.set('X-Robots-Tag','noindex, nofollow');return response;}
  const destinations:Record<string,string>={'/':'/cliente/ingresar','/ingresar':'/cliente/ingresar','/invitacion':'/cliente/invitacion','/entregas':'/cliente/entregas'};
  const destination=destinations[path]||(path.match(/^\/entregas\/\d+$/)?'/cliente'+path:null);
  if(destination){const response=NextResponse.rewrite(new URL(destination,request.url));response.headers.set('X-Robots-Tag','noindex, nofollow');return response;}
  return new NextResponse('Página no encontrada',{status:404,headers:{'X-Robots-Tag':'noindex, nofollow'}});
 }
 if(host==='sistema.scaleparaguay.com'){
  if(path==='/robots.txt')return new NextResponse('User-agent: *\nAllow: /\nSitemap: https://sistema.scaleparaguay.com/sitemap.xml\n',{headers:{'Content-Type':'text/plain'}});
  if(path==='/sitemap.xml')return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://sistema.scaleparaguay.com/</loc></url></urlset>',{headers:{'Content-Type':'application/xml'}});
  if(path==='/')return NextResponse.rewrite(new URL('/scale-os.html',request.url));
  if(path==='/scale-os.html')return NextResponse.redirect(new URL('https://sistema.scaleparaguay.com/'),308);
  if(path==='/registro')return NextResponse.redirect(new URL('https://app.scaleparaguay.com/registro'),307);
  if(path.startsWith('/brand/')||path==='/favicon.ico'||path==='/site.webmanifest'||path==='/apple-touch-icon.png')return NextResponse.next();
  if(path==='/demo'||path.startsWith('/core-api/')||workspaceRoots.has(path.split('/')[1])){const response=NextResponse.next();response.headers.set('X-Robots-Tag','noindex, nofollow');return response;}
  return new NextResponse('Página no encontrada',{status:404,headers:{'X-Robots-Tag':'noindex'}});
 }
 // The production fallback is deliberately available on the existing app
 // domain until cliente.scaleparaguay.com is provisioned. It remains private
 // from search engines and uses its own client-only API session.
 if(host==='app.scaleparaguay.com'&&path==='/demo')return NextResponse.redirect(new URL('https://sistema.scaleparaguay.com/demo'),307);
 if(host==='app.scaleparaguay.com'&&path.startsWith('/cliente/')){const response=NextResponse.next();response.headers.set('X-Robots-Tag','noindex, nofollow');return response;}
 if(path.startsWith('/cliente/'))return new NextResponse('Página no encontrada',{status:404,headers:{'X-Robots-Tag':'noindex, nofollow'}});
 if(path==='/robots.txt')return new NextResponse('User-agent: *\nDisallow: /\n',{headers:{'Content-Type':'text/plain'}});
 const response=NextResponse.next();response.headers.set('X-Robots-Tag','noindex, nofollow');return response;
}
export const config={matcher:['/((?!_next/static|_next/image).*)']};

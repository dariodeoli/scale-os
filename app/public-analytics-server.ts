import {getPost,listPosts} from './blog-data';
import {ANALYTICS_COLLECT,ANALYTICS_LOADER,analyticsConfig,doNotTrack,type AnalyticsConfig,type AnalyticsHost} from './public-analytics';

type HeaderReader = Pick<Headers, 'get'>;
const noStore = {'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex, nofollow'};

export function requestAnalyticsConfig(headers: HeaderReader): AnalyticsConfig | null {
  if (doNotTrack(headers.get('dnt'))) return null;
  // Never trust x-forwarded-host or a caller-supplied website ID.
  return analyticsConfig(headers.get('host') || '');
}

function publicPaths(host: AnalyticsHost): string[] {
  if (host === 'sistema.scaleparaguay.com') return ['/'];
  const section = host === 'blog.scaleparaguay.com' ? 'empresa' : 'producto';
  return ['/', ...listPosts(section).map(post => `/${post.slug}`)];
}

function isPublicPath(host: AnalyticsHost, path: string): boolean {
  if (path === '/') return true;
  if (host === 'sistema.scaleparaguay.com' || !/^\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(path)) return false;
  return !!getPost(host === 'blog.scaleparaguay.com' ? 'empresa' : 'producto', path.slice(1));
}

/** Guard before loading anything, including browsers with DNT but no DNT header. */
export function analyticsBootstrap(config: AnalyticsConfig): string {
  return `(function(){var l=window.location,n=window.navigator;function d(v){return v==='1'||String(v).toLowerCase()==='yes';}if(l.protocol!=='https:'||l.host!==${JSON.stringify(config.host)}||d(n.doNotTrack)||d(n.msDoNotTrack)||d(window.doNotTrack))return;var s=document.createElement('script');s.src=${JSON.stringify(ANALYTICS_LOADER)};s.defer=true;s.referrerPolicy='no-referrer';document.head.appendChild(s);})();`;
}

/** Minimal pageview sender, not the upstream SDK: no event/identify API or click capture. */
export function analyticsLoader(config: AnalyticsConfig): string {
  return `(function(){
var l=window.location,n=window.navigator,host=${JSON.stringify(config.host)},paths=${JSON.stringify(publicPaths(config.host))};
function disabled(){function d(v){return v==='1'||String(v).toLowerCase()==='yes';}return l.protocol!=='https:'||l.host!==host||d(n.doNotTrack)||d(n.msDoNotTrack)||d(window.doNotTrack);}
if(disabled()||window.__scalePublicAnalytics)return;
window.__scalePublicAnalytics=true;
var last;
function pageview(){var path=l.pathname;if(disabled()||paths.indexOf(path)===-1||path===last)return;last=path;fetch(${JSON.stringify(ANALYTICS_COLLECT)},{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({path:path}),credentials:'omit',referrerPolicy:'no-referrer',keepalive:true}).catch(function(){});}
for(var key of ['pushState','replaceState']){var original=window.history[key];window.history[key]=(function(fn){return function(){var result=fn.apply(this,arguments);pageview();return result;};})(original);}
window.addEventListener('popstate',pageview);
pageview();
})();`;
}

export function serveAnalyticsLoader(request: Request): Response {
  const config = requestAnalyticsConfig(request.headers);
  if (!config) return new Response(null, {status: 204, headers: noStore});
  return new Response(analyticsLoader(config), {headers: {...noStore, 'Content-Type': 'application/javascript; charset=utf-8'}});
}

/** Constrained proxy: a single pageview shape, fixed target, no cookies/auth/IP forwarding. */
export async function collectAnalytics(request: Request): Promise<Response> {
  const config = requestAnalyticsConfig(request.headers);
  const empty = () => new Response(null, {status: 204, headers: noStore});
  if (!config) return empty();
  if (request.headers.get('origin') !== `https://${config.host}` ||
      request.headers.get('content-type')?.split(';')[0].trim() !== 'application/json') {
    return new Response(null, {status: 400, headers: noStore});
  }
  // Limit even chunked input before parsing, rather than trusting Content-Length.
  const reader = request.body?.getReader();
  if (!reader) return new Response(null, {status: 400, headers: noStore});
  let raw = '';
  let size = 0;
  const decoder = new TextDecoder();
  try {
    while (true) {
      const {done, value} = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 2048) {
        await reader.cancel();
        return new Response(null, {status: 413, headers: noStore});
      }
      raw += decoder.decode(value, {stream: true});
    }
    raw += decoder.decode();
    const body = JSON.parse(raw);
    if (!body || Object.keys(body).length !== 1 || typeof body.path !== 'string' || !isPublicPath(config.host, body.path)) {
      return new Response(null, {status: 400, headers: noStore});
    }
    const upstream = await fetch(`${config.origin}/api/send`, {
      method: 'POST', redirect: 'error', signal: AbortSignal.timeout(5000),
      headers: {'Content-Type': 'application/json', 'User-Agent': request.headers.get('user-agent') || 'ScalePublicAnalytics/1.0'},
      body: JSON.stringify({type: 'event', payload: {website: config.website, hostname: config.host, url: body.path}}),
      credentials: 'omit', cache: 'no-store',
    });
    await upstream.body?.cancel();
  } catch {
    // Analytics outages never break navigation. No upstream tokens, bodies or cookies escape.
  } finally {
    reader.releaseLock();
  }
  return empty();
}

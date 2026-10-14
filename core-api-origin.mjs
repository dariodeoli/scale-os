const defaultCoreApiOrigin='https://api.scaleparaguay.com';
// Solo para QA local (`npm --prefix backend run dev:local`): se admite http contra loopback.
const loopbackHosts=new Set(['localhost','127.0.0.1','[::1]']);

export function resolveCoreApiOrigin(value=process.env.SCALE_API_ORIGIN||defaultCoreApiOrigin) {
 const url=new URL(value);
 const secure=url.protocol==='https:'||(url.protocol==='http:'&&loopbackHosts.has(url.hostname));
 if(!secure||url.username||url.password||url.pathname!=='/'||url.search||url.hash)throw new Error('SCALE_API_ORIGIN debe ser un origen HTTPS (o http de loopback) sin ruta ni credenciales.');
 return url.origin;
}

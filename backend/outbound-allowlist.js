import net from 'node:net';

// Anti-SSRF (guía superadmin §6): todo pedido que el servidor hace hacia afuera
// pasa por una lista CERRADA de hosts. La lista se fija al arrancar con:
//  - los proveedores conocidos de abajo (correo, pagos, Google/Apple/Microsoft,
//    IA, RUC e IdP OIDC habituales),
//  - los hosts de las URLs de servicio que configura el operador por entorno
//    (RUC_LOOKUP_PROVIDER_URL, IA_BASE_URL, PAGAYA_SUBSCRIPTION_ORIGIN,
//    WEEM_EMAIL_RELAY_URL): son configuración del deploy, no datos de usuario,
//  - OUTBOUND_ALLOWED_HOSTS (lista separada por comas; `*.dominio` admite
//    subdominios) para sumar, por ejemplo, el IdP propio de una empresa.
// Un dato que viene de un tenant (el emisor OIDC de una empresa) nunca amplía
// la lista. Además se rechazan siempre: http, credenciales en la URL, puertos
// no estándar e IP literales privadas/loopback/link-local.
export const DEFAULT_OUTBOUND_HOSTS=Object.freeze([
 'api.resend.com',
 'api.stripe.com',
 'oauth2.googleapis.com','openidconnect.googleapis.com','www.googleapis.com','accounts.google.com',
 'appleid.apple.com',
 'login.microsoftonline.com','graph.microsoft.com',
 'api.groq.com','api.openai.com',
 'ruc.sun.com.py','app.controlaria.online',
 '*.okta.com','*.oktapreview.com','*.auth0.com','*.onelogin.com','*.amazoncognito.com','*.b2clogin.com',
]);
const SERVICE_URL_ENV=['RUC_LOOKUP_PROVIDER_URL','IA_BASE_URL','PAGAYA_SUBSCRIPTION_ORIGIN','WEEM_EMAIL_RELAY_URL'];

const normalHost=value=>String(value||'').trim().toLowerCase().replace(/\.$/,'');
function hostOf(value){
 try{const url=new URL(String(value||'').trim());return url.protocol==='https:'?normalHost(url.hostname):'';}catch{return '';}
}

/** Lista cerrada efectiva (patrones `host` o `*.sufijo`). */
export function outboundAllowlist(env=process.env){
 const extra=String(env.OUTBOUND_ALLOWED_HOSTS||'').split(',').map(normalHost).filter(entry=>/^(\*\.)?[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(entry));
 const services=SERVICE_URL_ENV.map(name=>hostOf(env[name])).filter(Boolean);
 return [...new Set([...DEFAULT_OUTBOUND_HOSTS,...services,...extra])];
}

export function hostAllowed(hostname,patterns){
 const host=normalHost(hostname);
 if(!host)return false;
 return patterns.some(pattern=>pattern.startsWith('*.')?host.endsWith(pattern.slice(1))&&host.length>pattern.length-1:host===pattern);
}

/** IP literal privada, loopback, link-local, CGNAT o reservada (v4/v6). */
export function isPrivateAddress(hostname){
 let host=normalHost(hostname).replace(/^\[|\]$/g,'');
 if(host==='localhost'||host.endsWith('.localhost')||host.endsWith('.internal')||host.endsWith('.local'))return true;
 const mapped=host.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);if(mapped)host=mapped[1];
 const kind=net.isIP(host);
 if(kind===4){
  const [a,b]=host.split('.').map(Number);
  return a===0||a===10||a===127||(a===100&&b>=64&&b<=127)||(a===169&&b===254)||(a===172&&b>=16&&b<=31)||(a===192&&b===168)||(a===198&&(b===18||b===19))||a>=224;
 }
 if(kind===6)return host==='::'||host==='::1'||/^f[cd]/.test(host)||/^fe[89ab]/.test(host);
 return false;
}

const blocked=(message)=>Object.assign(new Error(message),{status:502,code:'OUTBOUND_BLOCKED'});

/** Valida una URL saliente contra la lista cerrada. Devuelve el `URL` o lanza 502 `OUTBOUND_BLOCKED`. */
export function assertOutboundUrl(value,{allowedHosts=outboundAllowlist(),label='El destino externo'}={}){
 let url;
 try{url=value instanceof URL?value:new URL(String(value??''));}catch{throw blocked(`${label} no es una URL válida.`);}
 if(url.protocol!=='https:')throw blocked(`${label} debe usar HTTPS.`);
 if(url.username||url.password)throw blocked(`${label} no puede incluir credenciales.`);
 if(url.port&&url.port!=='443')throw blocked(`${label} no puede usar un puerto no estándar.`);
 if(isPrivateAddress(url.hostname)||net.isIP(url.hostname.replace(/^\[|\]$/g,'')))throw blocked(`${label} no puede apuntar a una dirección IP.`);
 if(!hostAllowed(url.hostname,allowedHosts))throw blocked(`${label} (${normalHost(url.hostname)}) no está en la lista de hosts permitidos.`);
 return url;
}

/**
 * `fetch` con la lista cerrada: valida el destino y prohíbe redirecciones (una
 * redirección podría saltar a un host interno después de la validación).
 */
export async function safeFetch(value,init={},{allowedHosts,fetchImpl=fetch,label}={}){
 const url=assertOutboundUrl(value,{allowedHosts:allowedHosts||outboundAllowlist(),label});
 return fetchImpl(url.href,{...init,redirect:'error'});
}

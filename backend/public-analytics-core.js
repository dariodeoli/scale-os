// Analítica de primera parte (landing y demo): reglas puras, sin base de datos.
// Lista cerrada de eventos, tipos estrictos y normalización que descarta todo lo
// que podría identificar a una persona (query string, fragmento, ids en la ruta,
// URL completa del referer). Lo usa el endpoint `collect` y lo prueban los tests.
import crypto from 'node:crypto';

export const ANALYTICS_ZONE='America/Asuncion';
export const ANALYTICS_MAX_BYTES=1024;
export const ANALYTICS_MAX_SECONDS=1800;
export const ANALYTICS_MAX_RANGE_DAYS=180;
export const ANALYTICS_SURFACES=['landing','demo'];
/** Eventos que puede mandar el navegador. `demo_start`/`demo_role` solo los escribe el servidor. */
export const CLIENT_EVENTS=['page_view','engagement','cta_click'];
export const SERVER_EVENTS=['demo_start','demo_role'];
export const ANALYTICS_CTAS=['trial','demo','contact','whatsapp'];
export const DEMO_KINDS=['publica','privada'];
/** Límites de inundación por ventana de 15 minutos (`auth_throttles`). */
export const ANALYTICS_LIMITS={global:20000,ip:300,visitor:150};

const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
const FIELDS={
 page_view:['event','surface','path','visitor','view','referrer','mobile'],
 engagement:['event','surface','path','visitor','view','seconds','scroll'],
 cta_click:['event','surface','path','visitor','cta'],
};
const TOKEN=/^[a-z0-9]{8,40}$/;
const VISITOR=/^[a-z0-9]{16,40}$/;

/** Ruta sin query, fragmento ni identificadores: los segmentos con dígitos largos o
 * hashes pasan a `:id`. En la demo solo cuenta la sección (primer segmento). */
export function analyticsPath(value,surface){
 if(typeof value!=='string'||value.length<1||value.length>200||value[0]!=='/'||value.startsWith('//'))fail('Ruta inválida');
 if(/[?#\s\\%]/.test(value))fail('Ruta inválida');
 const segments=value.toLowerCase().split('/').filter(Boolean);
 if(segments.some(segment=>!/^[a-z0-9._-]{1,60}$/.test(segment)))fail('Ruta inválida');
 const clean=segments.map(segment=>/\d{4,}/.test(segment)||/^[a-f0-9-]{16,}$/.test(segment)||(segment.length>=24&&/\d/.test(segment))?':id':segment);
 const kept=surface==='demo'?clean.slice(0,1):clean.slice(0,4);
 const path='/'+kept.join('/');
 return path.length>120?path.slice(0,120):path;
}

/** Dominio del referer agrupado (sin `www.`, sin ruta ni query). IPs y hosts locales no se guardan. */
export function referrerDomain(value){
 if(value===undefined||value===null||value==='')return null;
 if(typeof value!=='string'||value.length>300)fail('Origen inválido');
 let host=value.trim().toLowerCase();
 if(host.includes('/')){try{host=new URL(host).hostname;}catch{fail('Origen inválido');}}
 host=host.replace(/^www\./,'').replace(/\.$/,'');
 if(!host)return null;
 if(!/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$/.test(host)||host.length>100)return null;
 if(/(?:^|\.)(?:localhost|local|internal|test|invalid|example)$/.test(host))return null;
 return host;
}

const integer=(value,min,max,label)=>{
 if(typeof value!=='number'||!Number.isFinite(value))fail(label+' inválido');
 const rounded=Math.round(value);
 if(rounded<min||rounded>max)fail(label+' fuera de rango');
 return rounded;
};
/** Segundos visibles: se acepta hasta un día y se recorta a 30 minutos (pestañas olvidadas). */
export const clampSeconds=value=>Math.min(ANALYTICS_MAX_SECONDS,integer(value,0,86400,'Tiempo'));
export const clampScroll=value=>integer(value,0,100,'Scroll');

/** Valida y normaliza un evento del navegador. Rechaza campos de más y tipos inválidos. */
export function parseAnalyticsEvent(raw){
 if(!raw||typeof raw!=='object'||Array.isArray(raw))fail('Evento inválido');
 const event=raw.event;
 if(typeof event!=='string'||!CLIENT_EVENTS.includes(event))fail('Evento inválido');
 const allowed=FIELDS[event];
 if(Object.keys(raw).some(key=>!allowed.includes(key)))fail('El evento contiene campos no permitidos');
 if(!ANALYTICS_SURFACES.includes(raw.surface))fail('Superficie inválida');
 const surface=raw.surface;
 const out={event,surface,path:analyticsPath(raw.path,surface)};
 // En la demo el visitante lo deriva el servidor desde la sesión: el navegador no lo elige.
 if(surface==='landing'){
  if(typeof raw.visitor!=='string'||!VISITOR.test(raw.visitor))fail('Visitante inválido');
  out.visitor=raw.visitor;
 }else if(raw.visitor!==undefined)fail('La demo no acepta visitante');
 if(event==='page_view'||event==='engagement'){
  if(typeof raw.view!=='string'||!TOKEN.test(raw.view))fail('Vista inválida');
  out.view=raw.view;
 }
 if(event==='page_view'){
  out.referrer=surface==='landing'?referrerDomain(raw.referrer):null;
  if(raw.mobile!==undefined&&typeof raw.mobile!=='boolean')fail('Dispositivo inválido');
  out.mobile=raw.mobile===true;
 }
 if(event==='engagement'){
  if(raw.seconds===undefined&&raw.scroll===undefined)fail('Evento vacío');
  out.seconds=raw.seconds===undefined?null:clampSeconds(raw.seconds);
  out.scroll=raw.scroll===undefined?null:clampScroll(raw.scroll);
 }
 if(event==='cta_click'){
  if(surface!=='landing')fail('Evento inválido');
  if(!ANALYTICS_CTAS.includes(raw.cta))fail('Botón inválido');
  out.cta=raw.cta;
 }
 return out;
}

/** Lee el cuerpo con tope duro (también para cuerpos chunked) y lo parsea como JSON. */
export async function readAnalyticsBody(req,max=ANALYTICS_MAX_BYTES){
 const type=String(req.headers?.['content-type']||'').split(';')[0].trim().toLowerCase();
 if(type!=='application/json'&&type!=='text/plain')fail('Formato no permitido',415);
 if(Number(req.headers?.['content-length'])>max)fail('Solicitud demasiado grande',413);
 let size=0;const chunks=[];
 for await(const chunk of req){const bytes=Buffer.from(chunk);size+=bytes.length;if(size>max)fail('Solicitud demasiado grande',413);chunks.push(bytes);}
 try{return JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{fail('Evento inválido');}
}

const salt=()=>process.env.ANALYTICS_HASH_SALT||process.env.SESSION_SECRET||'scale-os-public-analytics';
/** Hash diario con sal: sirve para limitar por IP sin guardarla (ni siquiera en el throttle). */
export function dailyHash(value,day=asuncionDay()){
 return crypto.createHash('sha256').update(`${salt()}|${day}|${value}`).digest('hex').slice(0,32);
}
/** Visitante de una demo: hash con sal del id de la organización demo (nunca el id crudo). */
export function demoVisitor(organizationId){
 return 'd'+crypto.createHash('sha256').update(`${salt()}|demo|${organizationId}`).digest('hex').slice(0,31);
}
export function clientIp(req){
 return String(req?.headers?.['x-forwarded-for']||'').split(',')[0].trim()||req?.socket?.remoteAddress||'';
}
export function doNotTrack(headers={}){
 const flag=value=>value==='1'||String(value||'').toLowerCase()==='yes';
 return flag(headers.dnt)||flag(headers['sec-gpc']);
}

/** Día AAAA-MM-DD en Asunción. */
export function asuncionDay(now=new Date()){
 return new Intl.DateTimeFormat('en-CA',{timeZone:ANALYTICS_ZONE,year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
}
const DAY=/^\d{4}-\d{2}-\d{2}$/;
function parseDay(value,label){
 if(typeof value!=='string'||!DAY.test(value))fail(`${label} debe tener formato AAAA-MM-DD.`);
 const date=new Date(value+'T00:00:00Z');
 if(Number.isNaN(date.getTime())||date.toISOString().slice(0,10)!==value)fail(`${label} no es una fecha válida.`);
 return date;
}
const iso=date=>date.toISOString().slice(0,10);
const shift=(date,days)=>new Date(date.getTime()+days*86400000);

/** Rango de días de Asunción (ambos inclusive) y el período anterior de igual duración. */
export function analyticsRange({from,to}={},today=asuncionDay()){
 const end=to?parseDay(to,'to'):parseDay(today,'Hoy');
 const start=from?parseDay(from,'from'):shift(end,-29);
 if(start>end)fail('El rango es inválido: from es posterior a to.');
 const days=Math.round((end-start)/86400000)+1;
 if(days>ANALYTICS_MAX_RANGE_DAYS)fail(`El rango máximo es de ${ANALYTICS_MAX_RANGE_DAYS} días.`);
 return {from:iso(start),to:iso(end),days,previous_from:iso(shift(start,-days)),previous_to:iso(shift(start,-1)),today,timezone:ANALYTICS_ZONE};
}

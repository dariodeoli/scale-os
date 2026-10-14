import {throttleClient} from './request-guard.js';

// Errores del API y de la web agrupados por huella para el panel global
// (guía superadmin §5). Reglas:
//  - huella = fuente + mensaje con números/ids/uuids normalizados + primer
//    frame del stack (también normalizado);
//  - la muestra nunca lleva PII: sin query strings, correos, tokens, cookies ni
//    encabezados de autorización; todo se trunca;
//  - límites de inundación por huella y globales por minuto (en memoria, sin
//    tocar la base cuando se superan) y tope por cliente en el endpoint público.
export const ERROR_STATUSES=['new','resolved','ignored'];
export const ERROR_SOURCES=['api','web'];
export const LIMITS=Object.freeze({
 message:300,stack:4000,route:200,meta:400,
 body:8192,
 perFingerprintPerMinute:10,
 globalPerMinute:120,
 clientPer15Minutes:60,
});
const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status});};

// ── Limpieza (sin PII) ───────────────────────────────────────────────────────
const EMAIL=/[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+/g;
const JWT=/\beyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\b/g;
const BEARER=/\b(bearer|basic)\s+[A-Za-z0-9._~+/=-]{6,}/gi;
const SECRET_HEADER=/\b(authorization|cookie|set-cookie|x-[a-z-]*(?:token|secret|key|signature))\s*[:=]\s*[^\n]*/gi;
const SECRET_PAIR=/\b(token|access_token|refresh_token|id_token|code|password|passwd|secret|api[_-]?key|session|scale_session|sid)\s*[:=]\s*["']?[^\s"'&;,]+/gi;
const LONG_TOKEN=/\b(?=[A-Za-z0-9_-]*\d)(?=[A-Za-z0-9_-]*[A-Za-z])[A-Za-z0-9_-]{32,}\b/g;
const QUERY=/(\b(?:https?:\/\/|\/)[^\s?#"'<>()]*)\?[^\s#"'<>()]*/g;

/** Quita PII y secretos de un texto libre y lo trunca. */
export function scrubText(value,max=LIMITS.message){
 let text=typeof value==='string'?value:value==null?'':String(value);
 text=text.slice(0,max*4)
  .replace(QUERY,'$1')
  .replace(SECRET_HEADER,'$1: [redactado]')
  .replace(BEARER,'$1 [redactado]')
  .replace(JWT,'[token]')
  .replace(SECRET_PAIR,'$1=[redactado]')
  .replace(EMAIL,'[correo]')
  .replace(LONG_TOKEN,'[token]')
  // eslint-disable-next-line no-control-regex
  .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g,'');
 return text.length>max?text.slice(0,max-1)+'…':text;
}

/** Ruta sin query ni fragmento; segmentos con ids/tokens se colapsan. */
export function cleanRoute(value){
 if(typeof value!=='string'||!value.trim())return null;
 let path=value.trim();
 try{if(/^https?:\/\//i.test(path))path=new URL(path).pathname;}catch{return null;}
 path=path.split(/[?#]/)[0];
 if(!path.startsWith('/'))path='/'+path;
 path=path.split('/').map(segment=>{
  if(!segment)return segment;
  if(/^\d+$/.test(segment)||/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment))return ':id';
  if(segment.length>=20&&/[0-9]/.test(segment)&&/^[A-Za-z0-9_-]+$/.test(segment))return ':token';
  if(segment.includes('@'))return ':correo';
  return segment.slice(0,60);
 }).join('/');
 return path.slice(0,LIMITS.route)||'/';
}

/** Mensaje normalizado para la huella: uuids, hex largos y números → marcadores. */
export function normalizeMessage(value){
 return scrubText(value,LIMITS.message)
  .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,'<uuid>')
  .replace(/\b[0-9a-f]{8,}\b/gi,'<hex>')
  .replace(/\d+(?:[.,]\d+)?/g,'<n>')
  .replace(/'[^']{1,80}'|"[^"]{1,80}"/g,'<v>')
  .replace(/\s+/g,' ')
  .trim()
  .toLowerCase();
}

/** Primer frame del stack (V8 `at …` o Firefox/Safari `fn@url`), normalizado. */
export function firstStackFrame(stack){
 if(typeof stack!=='string')return '';
 const lines=stack.split('\n').map(line=>line.trim()).filter(Boolean);
 const frame=lines.find(line=>/^at\s/.test(line))||lines.find(line=>/@\S+:\d+/.test(line))||'';
 return scrubText(frame,300)
  .replace(/\b[0-9a-f]{8,}\b/gi,'<hex>')
  .replace(/[.-][0-9a-z]{8,20}(?=\.js)/gi,'.<chunk>')
  .replace(/:\d+(?::\d+)?\)?$/,'')
  .replace(/\d+/g,'<n>')
  .toLowerCase();
}

export function errorFingerprint({source,message,stack}){
 const basis=`${source}|${normalizeMessage(message)}|${firstStackFrame(stack)}`;
 // Hash estable y sin dependencias: FNV-1a de 64 bits en hexadecimal.
 let h=0xcbf29ce484222325n;
 for(const byte of new TextEncoder().encode(basis)){h^=BigInt(byte);h=BigInt.asUintN(64,h*0x100000001b3n);}
 return `${source}-${h.toString(16).padStart(16,'0')}`;
}

/** Stack de muestra: líneas limpias, sin query strings ni secretos, truncado. */
export function scrubStack(stack){
 if(typeof stack!=='string'||!stack.trim())return null;
 return stack.split('\n').slice(0,40).map(line=>scrubText(line,400)).join('\n').slice(0,LIMITS.stack)||null;
}

// ── Límites de inundación (en memoria, ventana de un minuto) ─────────────────
export function createFloodGate({perFingerprint=LIMITS.perFingerprintPerMinute,global=LIMITS.globalPerMinute,now=()=>Date.now()}={}){
 let windowStart=0,total=0;
 const counts=new Map(),suppressed=new Map();
 const roll=()=>{const t=now();if(t-windowStart>=60000){windowStart=t;total=0;counts.clear();}};
 return {
  /** `{write:true,extra}` si se escribe (con las ocurrencias suprimidas acumuladas); `{write:false}` si se descarta. */
  admit(fingerprint){
   roll();
   if(total>=global)return {write:false,reason:'global'};
   const seen=counts.get(fingerprint)||0;
   if(seen>=perFingerprint){
    if(suppressed.size<1000||suppressed.has(fingerprint))suppressed.set(fingerprint,(suppressed.get(fingerprint)||0)+1);
    return {write:false,reason:'fingerprint'};
   }
   counts.set(fingerprint,seen+1);total++;
   const extra=suppressed.get(fingerprint)||0;suppressed.delete(fingerprint);
   return {write:true,extra};
  },
  reset(){windowStart=0;total=0;counts.clear();suppressed.clear();},
 };
}
const defaultGate=createFloodGate();

// ── Registro ─────────────────────────────────────────────────────────────────
function cleanMeta(meta){
 const out={};
 for(const [key,value] of Object.entries(meta||{})){
  if(!/^[a-z_]{1,24}$/.test(key))continue;
  if(typeof value==='number'&&Number.isFinite(value))out[key]=value;
  else if(typeof value==='string')out[key]=scrubText(value,80);
 }
 const text=JSON.stringify(out);
 return text.length>LIMITS.meta?{}:out;
}

/**
 * Agrupa una ocurrencia. Devuelve `{recorded:false}` si el límite la descartó.
 * Un grupo resuelto vuelve a «nuevo» si reaparece (regresión); uno ignorado sigue ignorado.
 */
export async function recordError(db,{source,message,stack,route,meta},{gate=defaultGate}={}){
 if(!ERROR_SOURCES.includes(source))return {recorded:false};
 const cleanMessage=scrubText(message||'Error sin mensaje',LIMITS.message)||'Error sin mensaje';
 const fingerprint=errorFingerprint({source,message:cleanMessage,stack});
 const admitted=gate.admit(fingerprint);
 if(!admitted.write)return {recorded:false,reason:admitted.reason,fingerprint};
 const row=(await db.query(`insert into platform_error_groups(fingerprint,source,message,route,sample_stack,sample_meta,occurrences)
  values($1,$2,$3,$4,$5,$6::jsonb,$7)
  on conflict(fingerprint) do update set occurrences=platform_error_groups.occurrences+excluded.occurrences,last_seen_at=now(),
   route=coalesce(excluded.route,platform_error_groups.route),sample_stack=coalesce(excluded.sample_stack,platform_error_groups.sample_stack),
   sample_meta=excluded.sample_meta,status=case when platform_error_groups.status='resolved' then 'new' else platform_error_groups.status end,updated_at=now()
  returning id,occurrences,status`,
  [fingerprint,source,cleanMessage,cleanRoute(route),scrubStack(stack),JSON.stringify(cleanMeta(meta)),1+(admitted.extra||0)])).rows[0];
 return {recorded:true,fingerprint,...row};
}

/** Captura un error del API (central handler o respuesta 5xx). Nunca lanza. */
export async function captureServerError(db,{error,req,status=500,message,log=console,gate}={}){
 try{
  if(status<500)return {recorded:false};
  const route=req?.url?String(req.url).split('?')[0]:null;
  return await recordError(db,{source:'api',message:message||error?.message||`HTTP ${status}`,stack:error?.stack,route,meta:{status,method:typeof req?.method==='string'?req.method.slice(0,8):''}},{gate});
 }catch(cause){
  log.warn?.(JSON.stringify({event:'error_tracking_failed',code:cause?.code||cause?.name||'Error'}));
  return {recorded:false};
 }
}

async function limitedBody(req,max=LIMITS.body){
 let size=0;const chunks=[];
 for await(const chunk of req){
  size+=chunk.length;
  if(size>max)fail('Reporte demasiado grande',413);
  chunks.push(typeof chunk==='string'?Buffer.from(chunk):chunk);
 }
 if(!size)return {};
 try{return JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{fail('Cuerpo JSON inválido');}
}
const str=(value,max)=>typeof value==='string'?value.slice(0,max):'';

// ── Endpoint público: POST /api/public/client-errors ─────────────────────────
export async function clientErrors({req,res,url,db,send,readBody=limitedBody,gate=defaultGate}){
 if(url.pathname!=='/api/public/client-errors')return false;
 try{
  if(req.method!=='POST')fail('Método no permitido',405);
  const declared=Number(req.headers?.['content-length']||0);
  if(declared>LIMITS.body)fail('Reporte demasiado grande',413);
  const input=await readBody(req,LIMITS.body);
  if(!input||typeof input!=='object'||Array.isArray(input))fail('Solicitud inválida');
  const message=str(input.message,LIMITS.message*2).trim();
  if(!message)fail('Falta el mensaje del error');
  const kind=['error','unhandledrejection','boundary'].includes(input.kind)?input.kind:'error';
  // Tope por cliente antes de escribir: un navegador con un bucle de errores no inunda la base.
  if(!await throttleClient(db,req,'client-errors',LIMITS.clientPer15Minutes)){send(res,202,{ok:true,dropped:true});return true;}
  const version=/^[0-9A-Za-z.+-]{1,40}$/.test(str(input.version,40))?str(input.version,40):'';
  const result=await recordError(db,{source:'web',message,stack:str(input.stack,LIMITS.stack*2),route:str(input.route,600),meta:{kind,...(version?{version}:{})}},{gate});
  send(res,202,{ok:true,...(result.recorded?{}:{dropped:true})});return true;
 }catch(error){
  send(res,error.status||500,{error:error.status?error.message:'No se pudo registrar el error'});return true;
 }
}

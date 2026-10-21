import {assertDemoEffectAllowed} from './demo-effects.js';
import {roleCan} from './permissions.js';
import {fail,text} from './suite-validation.js';
import {throttle} from './request-guard.js';
import {outboundAllowlist,safeFetch} from './outbound-allowlist.js';
// Consultas por usuario cada 15 min, antes de mirar la caché (que revela si un RUC ya se consultó).
export const RUC_LOOKUPS_PER_WINDOW=40;

export const OWNDATA_API_ORIGIN='https://app.controlaria.online';
export const OWNDATA_RUC_URL=OWNDATA_API_ORIGIN+'/api/v1/ruc';
const OWNDATA_SOURCE='owndata:dnit_official_snapshot';
const defaultProviderUrl='https://ruc.sun.com.py/api/ruc';
const numberSetting=(value,fallback,min,max)=>{
 const parsed=Number(value);
 return Number.isInteger(parsed)&&parsed>=min&&parsed<=max?parsed:fallback;
};

export function normalizeRuc(value){
 const clean=String(value??'').trim().replace(/[.\s]/g,'');
 if(!/^\d{1,12}(?:-\d)?$/.test(clean))fail('Ingresá un RUC numérico, con o sin guion y dígito verificador');
 return clean;
}
export function rucDigits(value){
 const raw=String(value??'').trim();
 return raw?normalizeRuc(raw).replace('-',''):null;
}
export function rucLookupConfig(env=process.env){
 const providerKind=(env.RUC_LOOKUP_PROVIDER_KIND||(env.OWNDATA_API_ORIGIN||env.OWNDATA_API_KEY?'owndata':'legacy')).trim();
 if(providerKind==='legacy'&&(env.OWNDATA_API_ORIGIN||env.OWNDATA_API_KEY))throw Error('La configuración OwnData no puede combinarse con RUC_LOOKUP_PROVIDER_KIND=legacy');
 const origin=(env.OWNDATA_API_ORIGIN||OWNDATA_API_ORIGIN).trim().replace(/\/+$/,'');
 if(providerKind==='owndata'&&origin!==OWNDATA_API_ORIGIN)throw Error('OWNDATA_API_ORIGIN debe ser el origen HTTPS documentado de OwnData');
 if(!['legacy','owndata'].includes(providerKind))throw Error('RUC_LOOKUP_PROVIDER_KIND inválido');
 const providerUrl=(env.RUC_LOOKUP_PROVIDER_URL||(providerKind==='owndata'?origin+'/api/v1/ruc':defaultProviderUrl)).trim().replace(/\/+$/,'');
 try{const parsed=new URL(providerUrl);if(parsed.protocol!=='https:'||parsed.username||parsed.password)throw Error();}catch{throw Error('RUC_LOOKUP_PROVIDER_URL debe ser una URL HTTPS válida');}
 if(providerKind==='owndata'&&providerUrl!==OWNDATA_RUC_URL)throw Error('OwnData requiere el endpoint HTTPS documentado /api/v1/ruc');
 const ownDataApiKey=providerKind==='owndata'?(env.OWNDATA_API_KEY||'').trim():null;
 if(providerKind==='owndata'&&(!ownDataApiKey||/[\r\n]/.test(ownDataApiKey)||ownDataApiKey.startsWith('pk_')))throw Error('OwnData requiere OWNDATA_API_KEY secreta Live del servidor, personal o empresarial, con permiso ruc:read');
 return {
  providerKind,ownDataApiKey,providerUrl,
  timeoutMs:numberSetting(env.RUC_LOOKUP_TIMEOUT_MS,12000,1000,30000),
  cacheTtlSeconds:numberSetting(env.RUC_LOOKUP_CACHE_TTL_SECONDS,86400,60,604800),
  noResultTtlSeconds:numberSetting(env.RUC_LOOKUP_NO_RESULT_TTL_SECONDS,3600,60,86400),
  monthlyLimit:numberSetting(env.RUC_LOOKUP_MONTHLY_LIMIT,100,1,100),
 };
}
export function createRucProvider({baseUrl=defaultProviderUrl,fetcher=fetch,timeoutMs=12000,allowedHosts=outboundAllowlist()}={}){
 const endpoint=String(baseUrl).replace(/\/+$/,'');
 return {name:'configured-ruc-provider',async lookup(ruc){
  let response;
  try{response=await safeFetch(`${endpoint}/${encodeURIComponent(ruc)}`,{signal:AbortSignal.timeout(timeoutMs),headers:{Accept:'application/json'}},{fetchImpl:fetcher,allowedHosts,label:'El proveedor de RUC'});}catch{throw Object.assign(Error('Proveedor de RUC no disponible'),{status:503});}
  if(response.status===404)return null;
  if(!response.ok)throw Object.assign(Error('Proveedor de RUC no disponible'),{status:503});
  try{return await response.json();}catch{throw Object.assign(Error('Proveedor de RUC devolvió una respuesta inválida'),{status:503});}
 }};
}
const ownDataFailure=(message,status=503,code='OWNDATA_INVALID_RESPONSE')=>Object.assign(Error(message),{status,code,rucProviderError:true});
const ownDataErrors={
 INVALID_NAME_OPTIONS:[400,'Las opciones de nombre de la consulta no son válidas.'],
 ACCOUNT_PERIOD_CHANGED:[409,'El período de OwnData cambió. Volvé a consultar manualmente.'],
 METHOD_NOT_ALLOWED:[503,'El servidor no pudo consultar OwnData con el método configurado.'],
 INVALID_RUC_FORMAT:[400,'El formato del RUC no es válido.'],INVALID_RUC_DV:[400,'El dígito verificador del RUC no coincide.'],
 ...Object.fromEntries(['API_KEY_REQUIRED','API_KEY_INVALID','API_KEY_REVOKED','API_KEY_EXPIRED','API_KEY_ENVIRONMENT_MISMATCH','ENVIRONMENT_MISMATCH','INSUFFICIENT_SCOPE','PLAN_REQUIRED','ORIGIN_NOT_ALLOWED','PUBLISHABLE_KEY_FORBIDDEN'].map(code=>[code,[503,'OwnData no autorizó la clave, el ambiente o el plan del servidor. Revisá su configuración o activación.']])),
 COMMERCIAL_API_DISABLED:[503,'La API comercial de OwnData no está habilitada. Revisá su activación con OwnData.'],
 ...Object.fromEntries(['COMMERCIAL_API_UNAVAILABLE','DNIT_DATA_UNAVAILABLE','FREE_API_DISABLED','PUBLISHABLE_KEY_UNAVAILABLE'].map(code=>[code,[503,'La API de OwnData no está disponible. Podés ingresar los datos manualmente.']])),
 DAILY_QUOTA_REACHED:[429,'OwnData agotó el cupo. Esperá el reinicio del proveedor o ingresá los datos manualmente.'],
};
const nonempty=value=>typeof value==='string'&&value.trim().length>0;
const validDay=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;
function ownDataMetadata(meta){
 const source=meta?.provenance,quota=meta?.quota;
 let https=false;try{const url=new URL(source?.sourcePage);https=typeof source?.sourcePage==='string'&&url.protocol==='https:'&&!url.username&&!url.password&&(!url.port||url.port==='443');}catch{}
 return meta?.environment==='live'&&source?.source==='dnit_official_snapshot'&&https&&validDay(source.publicationDate)&&
  typeof source.importedAt==='string'&&/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d+)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/.test(source.importedAt)&&validDay(source.importedAt.slice(0,10))&&Number.isFinite(Date.parse(source.importedAt))&&typeof source.publishedText==='string'&&typeof source.snapshotHash==='string'&&/^[a-f0-9]{64}$/.test(source.snapshotHash)&&
  quota&&quota.limit>=1&&quota.resetAfter>=1&&['limit','used','remaining','resetAfter'].every(key=>Number.isSafeInteger(quota[key])&&quota[key]>=0)&&validDay(quota.day)&&
  typeof meta?.accounting?.alreadyConsulted==='boolean'&&typeof meta.accounting.charged==='boolean'&&
  (!Object.hasOwn(meta.accounting,'cacheEnabled')||typeof meta.accounting.cacheEnabled==='boolean');
}
// Bound the response too; never retain upstream diagnostics or include them in errors.
async function ownDataEnvelope(response){
 const max=65536;if(Number(response.headers.get('content-length'))>max){await response.body?.cancel().catch(()=>{});throw ownDataFailure('OwnData devolvió una respuesta inválida.');}
 const reader=response.body?.getReader();if(!reader)throw ownDataFailure('OwnData devolvió una respuesta inválida.');
 const chunks=[];let length=0;
 try{for(;;){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>max){await reader.cancel();throw Error();}chunks.push(value);}return JSON.parse(Buffer.concat(chunks).toString('utf8'));}
 catch{throw ownDataFailure('OwnData devolvió una respuesta inválida.');}finally{reader.releaseLock();}
}
export function validateOwnDataRuc(value){
 if(typeof value!=='string'||!/^[1-9][0-9]{0,8}(?:-[0-9])?$/.test(value))throw ownDataFailure('OwnData requiere un RUC numérico de hasta 9 dígitos, sin cero inicial.',400,'INVALID_RUC_FORMAT');
 const [base,digit]=value.split('-');let sum=0,weight=2;
 for(const character of [...base].reverse()){sum+=Number(character)*weight;weight=weight===11?2:weight+1;}
 const remainder=sum%11,expected=String(remainder>1?11-remainder:0);
 if(digit!==undefined&&digit!==expected)throw ownDataFailure('El dígito verificador del RUC no coincide. Corregilo antes de consultar.',400,'INVALID_RUC_DV');
 return value;
}
function subjectKindOption(value){
 const kind=value??'unknown';if(!['unknown','individual','legal_entity'].includes(kind))fail('Indicá si la ficha es de una persona o empresa.',400);return kind;
}
function retryAfterSeconds(response){
 const value=response.headers.get('retry-after');if(!value)return null;
 if(/^\d+$/.test(value.trim())){const seconds=Number(value);return Number.isSafeInteger(seconds)&&seconds>=1&&seconds<=86400?seconds:null;}
 const until=Date.parse(value);if(!Number.isFinite(until))return null;const seconds=Math.ceil((until-Date.now())/1000);return seconds>=1&&seconds<=86400?seconds:null;
}
export function createOwnDataRucProvider({baseUrl,apiKey,fetcher=fetch,timeoutMs=12000,allowedHosts=outboundAllowlist()}={}){
 if(baseUrl!==OWNDATA_RUC_URL||typeof apiKey!=='string'||!apiKey.trim()||/[\r\n]/.test(apiKey)||apiKey.startsWith('pk_'))throw ownDataFailure('OwnData no está configurado con endpoint y clave secreta de servidor autorizados.',503,'OWNDATA_CONFIGURATION_ERROR');
 return {name:'owndata-ruc-provider',async lookup(input,{subjectKind='unknown'}={}){
  const ruc=validateOwnDataRuc(input),kind=subjectKindOption(subjectKind);let response;
  const query=kind==='individual'?'?nameMethods=full&subjectKind=individual':'';
  try{response=await safeFetch(`${baseUrl}/${encodeURIComponent(ruc)}${query}`,{headers:{Accept:'application/json','X-API-Key':apiKey},credentials:'omit',signal:AbortSignal.timeout(timeoutMs)},{fetchImpl:fetcher,allowedHosts,label:'OwnData'});}catch{throw ownDataFailure('No se pudo conectar con OwnData. Podés ingresar los datos manualmente.',503,'OWNDATA_UNAVAILABLE');}
  // Non-JSON error bodies are never exposed. Real HTTP failures remain distinguishable.
  let envelope;try{envelope=await ownDataEnvelope(response);}catch(error){if(response.ok)throw error;}
  const code=envelope?.error?.code,retryAfter=response.status===429?retryAfterSeconds(response):null;
  const providerError=(message,status,safeCode)=>Object.assign(ownDataFailure(message,status,safeCode),{providerStatus:response.status,...(retryAfter?{retryAfter}:{})});
  if(response.status===404&&code==='REGISTERED_RUC_NOT_FOUND')return null;
  if(typeof code==='string'&&Object.hasOwn(ownDataErrors,code)){
   const [status,message]=ownDataErrors[code];throw providerError(message,status,code);
  }
  if(response.status===401)throw providerError('OwnData no autorizó la clave secreta del servidor. Revisá su vigencia y activación.',503,'OWNDATA_AUTHENTICATION_FAILED');
  if(response.status===403)throw providerError('OwnData no autorizó el permiso o plan del servidor.',503,'OWNDATA_PERMISSION_DENIED');
  if(response.status===429)throw providerError('OwnData limitó las consultas. Intentá más tarde.',429,'OWNDATA_RATE_LIMITED');
  if(response.status===503)throw providerError('OwnData o su dataset no está disponible. Podés ingresar los datos manualmente.',503,'OWNDATA_UNAVAILABLE');
  if(!response.ok||envelope?.error)throw ownDataFailure('OwnData no está disponible. Podés ingresar los datos manualmente.');
  const data=envelope?.data,provenance=envelope?.meta?.provenance;
  const base=Number.isSafeInteger(data?.ruc)?String(data.ruc):data?.ruc;
  const dv=Number.isSafeInteger(data?.dv)?String(data.dv):data?.dv;
  // Fiscal status is deliberately ignored, including unknown types and values.
  if(!data||!nonempty(data.nameOfficial)||typeof base!=='string'||typeof dv!=='string'||data.fullRuc!==`${base}-${dv}`||
   (Object.hasOwn(data,'equivalenceRaw')&&data.equivalenceRaw!==null&&typeof data.equivalenceRaw!=='string')||
   (Object.hasOwn(data,'sourcePartition')&&(!Number.isSafeInteger(data.sourcePartition)||data.sourcePartition<0||data.sourcePartition>9))||!ownDataMetadata(envelope.meta))throw ownDataFailure('OwnData devolvió una ficha o procedencia inválida.');
  try{validateOwnDataRuc(data.fullRuc);}catch{throw ownDataFailure('OwnData devolvió un RUC o dígito verificador inválido.');}
  if(ruc.includes('-')?data.fullRuc!==ruc:base!==ruc)throw ownDataFailure('El RUC devuelto por OwnData no coincide con la consulta.');
  const full=kind==='individual'?envelope?.namePresentation?.values?.full:null;
  if(full!==undefined&&full!==null&&(typeof full!=='string'||!full.trim()||full.length>160))throw ownDataFailure('OwnData devolvió una presentación de nombre inválida.');
  return {name:data.nameOfficial,...(typeof full==='string'?{display_name:full}:{}),ruc:base,dv,fullRuc:data.fullRuc,publicationDateText:provenance.publicationDate};
 }};
}
export function configuredRucProvider(settings,{fetcher=fetch}={}){
 return settings.providerKind==='owndata'?createOwnDataRucProvider({baseUrl:settings.providerUrl,apiKey:settings.ownDataApiKey,fetcher,timeoutMs:settings.timeoutMs}):createRucProvider({baseUrl:settings.providerUrl,fetcher,timeoutMs:settings.timeoutMs});
}
export async function assertUniqueClientRuc(c,organizationId,taxId,exceptClientId=null){
 const digits=rucDigits(taxId);if(!digits)return;
 const params=exceptClientId?[organizationId,digits,exceptClientId]:[organizationId,digits];
 const excluded=exceptClientId?' and id<>$3':'';
 const found=await c.query(`select id,name from agency_clients where organization_id=$1 and regexp_replace(coalesce(tax_id,''),'[^0-9]','','g')=$2${excluded} limit 1`,params);
 if(found.rows.length)fail('Ya existe un cliente con este RUC en tu empresa. Buscalo antes de crear otro.',409);
}
export function rucRecord(value,requested,{source='ruc-provider'}={}){
 if(!value||typeof value!=='object'||typeof value.name!=='string'||!value.name.trim())fail('El proveedor no devolvió una ficha válida',502);
 const full=normalizeRuc(value.fullRuc||`${value.ruc}-${value.dv}`);
 if(!full.includes('-')||(requested.includes('-')?full!==requested:full.split('-')[0]!==requested))fail('El RUC recibido no coincide con la consulta',502);
 return {name:text(value.name,160),...(source===OWNDATA_SOURCE&&typeof value.display_name==='string'?{display_name:text(value.display_name,160)}:{}),tax_id:full,tax_state:text(value.state||'',60),source,publication_date:text(value.publicationDateText||'',30)};
}
const parsedCache=value=>typeof value==='string'?JSON.parse(value):value;
async function cachedRecord(c,ruc){
 const row=(await c.query('select record,no_result from agency_ruc_lookup_cache where lookup_key=$1 and expires_at>now()',[ruc])).rows[0];
 return row?{record:row.no_result?null:parsedCache(row.record),cached:true}:null;
}
async function writeCache(c,ruc,record,seconds){
 await c.query(`insert into agency_ruc_lookup_cache(lookup_key,record,no_result,expires_at,updated_at)
  values($1,$2::jsonb,$3,now()+($4::text||' seconds')::interval,now())
  on conflict(lookup_key) do update set record=excluded.record,no_result=excluded.no_result,expires_at=excluded.expires_at,updated_at=excluded.updated_at`,[ruc,record?JSON.stringify(record):null,!record,seconds]);
}
async function consumeQuota(c,limit){
 await c.query("insert into scale_ruc_usage(month) values(date_trunc('month',current_date)::date) on conflict do nothing");
 const usage=await c.query("update scale_ruc_usage set used=used+1 where month=date_trunc('month',current_date)::date and used<$1 returning used",[limit]);
 if(!usage.rows.length)fail('Se alcanzó el límite mensual de consultas. Podés agregar el cliente manualmente.',429);
 return Number(usage.rows[0].used);
}
async function lookupCachedOrProvider({db,ruc,provider,config,force=false,subjectKind='unknown'}){
 let c=await db.connect();
 try{
  // Separate provider cache namespaces: switching providers must not present legacy results as OwnData.
  const cacheKey=provider.name==='owndata-ruc-provider'?'owndata:v2:live:'+subjectKind+':'+ruc:ruc;
  if(provider.name==='owndata-ruc-provider')validateOwnDataRuc(ruc);
  if(!force){const cached=await cachedRecord(c,cacheKey);if(cached)return {...cached,record:cached.record&&provider.name==='owndata-ruc-provider'?{name:cached.record.name,...(subjectKind==='individual'&&typeof cached.record.display_name==='string'?{display_name:text(cached.record.display_name,160)}:{}),tax_id:cached.record.tax_id,tax_state:'',source:OWNDATA_SOURCE,publication_date:cached.record.publication_date}:cached.record,remaining:null};}
  await c.query('begin');const used=await consumeQuota(c,config.monthlyLimit);await c.query('commit');
  let raw;
  try{raw=await provider.lookup(ruc,{subjectKind});}catch(error){if(error.rucProviderError)throw error;throw Object.assign(Error('La consulta externa no está disponible. Podés agregar el cliente manualmente.'),{status:503});}
  let record;
  try{record=raw?rucRecord(raw,ruc,{source:provider.name==='owndata-ruc-provider'?OWNDATA_SOURCE:'ruc-provider'}):null;}catch{throw Object.assign(Error('La consulta externa devolvió una respuesta inválida. Podés agregar el cliente manualmente.'),{status:503});}
  await writeCache(c,cacheKey,record,record?config.cacheTtlSeconds:config.noResultTtlSeconds);
  return {record,cached:false,remaining:config.monthlyLimit-used};
 }catch(error){try{await c.query('rollback');}catch{}throw error;}finally{c.release();}
}
export async function rucLookup({req,res,url,db,session,body,send,provider,config,fetcher=fetch}){
 if(!['/api/agency/ruc-lookup','/api/agency/clients/from-ruc'].includes(url.pathname)&&!/^\/api\/agency\/clients\/\d+\/ruc-refresh$/.test(url.pathname))return false;
 let c,tx=false;
 try{
  const user=await session(req);if(!user)fail('No autenticado',401);
  if(!roleCan(user,'clients.manage'))fail('Sin permiso para gestionar clientes',403);
  if(!url.pathname.endsWith('from-ruc'))assertDemoEffectAllowed(user,'lookup');
  if(req.method!=='POST')fail('Método no permitido',405);
  if(!url.pathname.endsWith('from-ruc')&&!await throttle(db,'ruc-lookup:'+user.id,RUC_LOOKUPS_PER_WINDOW))fail('Hiciste muchas consultas de RUC seguidas. Esperá unos minutos.',429);
  const b=await body(req);
  const refresh=url.pathname.match(/^\/api\/agency\/clients\/(\d+)\/ruc-refresh$/);
  if(url.pathname.endsWith('from-ruc')){
   const ruc=normalizeRuc(b.ruc);if(!ruc.includes('-'))fail('Confirmá el RUC completo con su dígito verificador');
   const name=text(b.name,120),legal=text(b.legal_name,160);if(name.length<2||legal.length<2)fail('Revisá nombre y razón social');
   c=await db.connect();await c.query('begin');tx=true;
   await c.query('select id from organizations where id=$1 for update',[user.organization_id]);
   await assertUniqueClientRuc(c,user.organization_id,ruc);
   await c.query("select set_config('app.current_user',$1,true),set_config('app.current_ip',$2,true)",[String(user.id),req.socket.remoteAddress||'']);
   const client=(await c.query('insert into agency_clients(organization_id,name,legal_name,tax_id) values($1,$2,$3,$4) returning *',[user.organization_id,name,legal,ruc])).rows[0];
   await c.query('commit');tx=false;send(res,201,{client});return true;
  }
  const subjectKind=subjectKindOption(b.subjectKind);
  const settings=config||rucLookupConfig();
  const service=provider||configuredRucProvider(settings,{fetcher});
  if(refresh){
   c=await db.connect();const client=(await c.query('select * from agency_clients where id=$1 and organization_id=$2',[refresh[1],user.organization_id])).rows[0];
   c.release();c=null;
   if(!client)fail('Cliente no encontrado',404);
   const ruc=normalizeRuc(client.tax_id);if(!ruc.includes('-'))fail('El cliente debe tener un RUC completo con dígito verificador para actualizarse');
   const found=await lookupCachedOrProvider({db,ruc,provider:service,config:settings,force:true,subjectKind});
   if(!found.record){send(res,200,{client,record:null,updated:false,remaining:found.remaining});return true;}
   if(b.apply!==true){send(res,200,{client,record:found.record,updated:false,remaining:found.remaining});return true;}
   c=await db.connect();await c.query('begin');tx=true;
   await c.query("select set_config('app.current_user',$1,true),set_config('app.current_ip',$2,true)",[String(user.id),req.socket.remoteAddress||'']);
   const updated=(await c.query(`update agency_clients set ruc_legal_name=$1,ruc_tax_state=$2,ruc_source=$3,ruc_refreshed_at=now(),updated_at=now()
    where id=$4 and organization_id=$5 returning *`,[found.record.name,found.record.tax_state,found.record.source,client.id,user.organization_id])).rows[0];
   await c.query('commit');tx=false;send(res,200,{client:updated,record:found.record,updated:true,remaining:found.remaining});return true;
  }
  const ruc=normalizeRuc(b.ruc);
  const found=await lookupCachedOrProvider({db,ruc,provider:service,config:settings,subjectKind});
  send(res,200,{record:found.record,cached:found.cached,remaining:found.remaining});return true;
 }catch(error){if(tx)await c.query('rollback');console.error(JSON.stringify({event:'ruc_lookup_error',status:error.status||503}));if(error.rucProviderError&&error.status===429&&error.retryAfter)res.setHeader?.('Retry-After',String(error.retryAfter));send(res,error.status||503,{error:error.status?error.message:'No se pudo consultar el RUC. Intentá más tarde o agregá el cliente manualmente.',...(error.rucProviderError?{code:error.code,...(Number.isInteger(error.providerStatus)&&error.providerStatus>=400&&error.providerStatus<=599?{provider_status:error.providerStatus}:{}),...(error.status===429&&error.retryAfter?{retry_after:error.retryAfter}:{})}:{})});return true;}finally{c?.release();}
}

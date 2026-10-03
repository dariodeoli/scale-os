import crypto from 'node:crypto';
import dns from 'node:dns/promises';
import {roleCan} from './permissions.js';
import {decodeJwtPayload, pkcePair} from './social-auth.js';

// SSO Fase 2A (#159): OIDC por organización (Entra ID / Google Workspace).
// Reutiliza oauth_states (PKCE + nonce) y oauth_handoffs de la Fase 1, y deja
// una bitácora propia en organization_sso_events. Sin SAML: eso queda para una
// fase posterior vía broker, según la evaluación aprobada.
const fail=(message,status=400,code='')=>{throw Object.assign(new Error(message),{status,code});};

export const SSO_EVENTS=['login','jit_created','linked','error'];

// Dominios de correo público que nunca pueden representar a una organización.
const PUBLIC_EMAIL_DOMAINS=new Set([
 'gmail.com','googlemail.com','hotmail.com','outlook.com','live.com','msn.com',
 'yahoo.com','yahoo.es','yahoo.com.ar','ymail.com','icloud.com','me.com','mac.com',
 'aol.com','proton.me','protonmail.com','zoho.com','mail.com','gmx.com','gmx.net',
 'yandex.com','yandex.ru','tutanota.com','tutamail.com','fastmail.com',
]);

/** Normaliza y valida un dominio corporativo (sin protocolo, minúsculas). */
export function normalizeDomain(value){
 const raw=String(value??'').trim().toLowerCase().replace(/^https?:\/\//,'');
 if(!raw)fail('Indicá el dominio del correo.');
 if(/[/?#@:\[\]\s]/.test(raw))fail('Escribí solo el dominio, sin protocolo, puerto ni ruta.');
 const domain=raw.replace(/^\.+|\.+$/g,'');
 if(domain.length<4||domain.length>253)fail('El dominio no es válido.');
 if(/^\d{1,3}(\.\d{1,3}){3}$/.test(domain))fail('No se permiten direcciones IP como dominio.');
 const labels=domain.split('.');
 if(labels.length<2)fail('El dominio debe incluir una extensión (por ejemplo, empresa.com).');
 for(const label of labels){
  if(label.length>63||!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(label))fail('El dominio no es válido.');
 }
 if(PUBLIC_EMAIL_DOMAINS.has(domain))fail('No se puede usar un dominio de correo público (Gmail, Hotmail, Outlook…).');
 return domain;
}

/** Token de verificación por DNS TXT, aleatorio por dominio. */
export function newVerificationToken(){
 return crypto.randomBytes(24).toString('hex');
}

/**
 * Busca el registro TXT `scale-os-verify=<token>` del dominio. `resolveTxt` es
 * inyectable para tests; los errores de DNS (sin registro, sin propagación) se
 * tratan como «todavía no verificado», nunca como fallo del endpoint.
 */
export async function verifyDomainDns(domain,token,resolveTxt=dns.resolveTxt){
 if(!domain||!token)return false;
 let records;
 try{records=await resolveTxt(domain);}catch{return false;}
 if(!Array.isArray(records))return false;
 const expected=`scale-os-verify=${String(token).toLowerCase()}`;
 return records.some(record=>{
  const value=(Array.isArray(record)?record.join(''):String(record??'')).trim().toLowerCase();
  return value===expected;
 });
}

const httpsUrl=(value,label)=>{
 let url;
 try{url=new URL(String(value??'').trim());}
 catch{fail(`${label} debe ser una URL válida.`);}
 if(url.protocol!=='https:'||url.username||url.password)fail(`${label} debe ser una URL https.`);
 if(url.search||url.hash)fail(`${label} no debe incluir parámetros ni fragmentos.`);
 return url.href.replace(/\/$/,'');
};

/** Config/validación de un proveedor OIDC (partial para PATCH). */
export function providerInput(input,{partial=false}={}){
 const source=input&&typeof input==='object'&&!Array.isArray(input)?input:{};
 const allowed=['kind','issuer','client_id','clientId','client_secret','clientSecret','discovery_url','discoveryUrl','active'];
 if(Object.keys(source).some(key=>!allowed.includes(key)))fail('Campos de proveedor inválidos.');
 const valueOf=(snake,camel)=>Object.hasOwn(source,snake)?source[snake]:source[camel];
 const result={};
 if(Object.hasOwn(source,'kind')){
  if(source.kind!=='oidc')fail('Tipo de proveedor inválido.');
  result.kind='oidc';
 }
 const issuer=valueOf('issuer','issuer');
 if(issuer!==undefined)result.issuer=httpsUrl(issuer,'El emisor (issuer)');
 const clientId=valueOf('client_id','clientId');
 if(clientId!==undefined){
  const value=typeof clientId==='string'?clientId.trim():'';
  if(!value||value.length>500)fail('El identificador de cliente (client_id) es obligatorio.');
  result.clientId=value;
 }
 const clientSecret=valueOf('client_secret','clientSecret');
 if(clientSecret!==undefined){
  const value=typeof clientSecret==='string'?clientSecret.trim():'';
  if(!value||value.length>2000)fail('El secreto de cliente (client_secret) es obligatorio.');
  result.clientSecret=value;
 }
 const discovery=valueOf('discovery_url','discoveryUrl');
 if(Object.hasOwn(source,'discovery_url')||Object.hasOwn(source,'discoveryUrl')){
  result.discoveryUrl=discovery===undefined||discovery===null||discovery===''?null:httpsUrl(discovery,'La URL de descubrimiento (discovery_url)');
 }
 if(Object.hasOwn(source,'active')){
  if(typeof source.active!=='boolean')fail('Estado del proveedor inválido.');
  result.active=source.active;
 }
 if(!partial){
  if(!result.issuer||!result.clientId||!result.clientSecret)fail('Completá el emisor, el client_id y el client_secret del proveedor.');
  result.kind='oidc';
  if(!Object.hasOwn(result,'discoveryUrl'))result.discoveryUrl=null;
  if(!Object.hasOwn(result,'active'))result.active=true;
 }else if(!Object.keys(result).length){
  fail('No hay cambios para guardar.');
 }
 return result;
}

const discoveryCache=new Map();
const DISCOVERY_TTL_MS=600000;

/** Vacía el cache de discovery (tests y cambios de configuración). */
export function clearDiscoveryCache(){
 discoveryCache.clear();
}

export function discoveryUrlFor(provider){
 return provider.discovery_url||`${String(provider.issuer||'').replace(/\/$/,'')}/.well-known/openid-configuration`;
}

const httpsEndpoint=value=>{
 if(typeof value!=='string')return null;
 try{
  const url=new URL(value);
  return url.protocol==='https:'?url.href:null;
 }catch{return null;}
};

/**
 * Lee y cachea la metadata OIDC. La configuración pública se resuelve por
 * `discovery_url` o por `issuer/.well-known/openid-configuration`; el emisor
 * descubierto debe coincidir con el configurado. `fetchImpl` es inyectable.
 */
export async function fetchDiscovery(provider,{fetchImpl=fetch,force=false}={}){
 const url=discoveryUrlFor(provider);
 const cached=discoveryCache.get(url);
 if(!force&&cached&&cached.expires>Date.now())return cached.value;
 const response=await fetchImpl(url,{headers:{accept:'application/json'}});
 if(!response||!response.ok)fail('No se pudo leer la configuración del proveedor de identidad.',502,'DISCOVERY_FALLIDO');
 const data=await response.json().catch(()=>null);
 if(!data||typeof data!=='object'||Array.isArray(data))fail('El proveedor de identidad devolvió una configuración inválida.',502,'DISCOVERY_INVALIDA');
 const authorizationEndpoint=httpsEndpoint(data.authorization_endpoint);
 const tokenEndpoint=httpsEndpoint(data.token_endpoint);
 if(!authorizationEndpoint||!tokenEndpoint)fail('La configuración del proveedor está incompleta (authorization_endpoint/token_endpoint).',502,'DISCOVERY_INCOMPLETA');
 const expectedIssuer=String(provider.issuer||'').replace(/\/$/,'');
 const discoveredIssuer=typeof data.issuer==='string'?data.issuer.replace(/\/$/,''):expectedIssuer;
 if(discoveredIssuer!==expectedIssuer)fail('El proveedor no coincide con el emisor configurado.',502,'EMISOR_INCORRECTO');
 const value={authorizationEndpoint,tokenEndpoint,userinfoEndpoint:httpsEndpoint(data.userinfo_endpoint),issuer:discoveredIssuer};
 discoveryCache.set(url,{expires:Date.now()+DISCOVERY_TTL_MS,value});
 return value;
}

/** Proveedor activo cuyo dominio verificado corresponde al correo. */
export async function providerForEmail(db,email){
 const normalized=String(email??'').trim().toLowerCase();
 const at=normalized.lastIndexOf('@');
 if(at<0)return null;
 const domain=normalized.slice(at+1);
 if(!domain)return null;
 return (await db.query(`select p.*,d.domain,o.slug as organization_slug from organization_email_domains d
  join organization_identity_providers p on p.organization_id=d.organization_id
  join organizations o on o.id=d.organization_id
  where d.domain=$1 and d.verified_at is not null and p.active and p.kind='oidc' and o.active
  order by p.id limit 1`,[domain])).rows[0]||null;
}

/**
 * JIT provisioning: resuelve o crea la identidad `oidc:<providerId>` y la
 * membresía con el rol mínimo (viewer) para que administración la ajuste.
 * Un acceso removido localmente no se reactiva solo por volver a iniciar sesión.
 */
export async function jitProvision(db,{organizationId,provider,profile}){
 const subject=String(profile?.subject||'').trim();
 const email=String(profile?.email||'').trim().toLowerCase();
 if(!organizationId||!provider?.id)fail('Proveedor de organización inválido.');
 if(!subject||!email||profile?.emailVerified!==true)fail('El proveedor no confirmó un correo verificado.',401,'CORREO_NO_VERIFICADO');
 const providerKey=`oidc:${provider.id}`;
 const linked=(await db.query('select user_id from user_social_identities where provider=$1 and subject=$2',[providerKey,subject])).rows[0];
 let userId,created=false,linkedNow=false;
 if(linked){
  userId=linked.user_id;
  await db.query('update user_social_identities set last_login_at=now() where provider=$1 and subject=$2',[providerKey,subject]);
 }else{
  const existing=(await db.query('select id from users where lower(email)=lower($1)',[email])).rows[0];
  if(existing){userId=existing.id;linkedNow=true;}
  else{
   userId=(await db.query("insert into users(email,password_hash,email_verified_at,role) values($1,'!oidc-no-password',now(),'viewer') on conflict(email) do update set email=excluded.email returning id",[email])).rows[0].id;
   created=true;
  }
  await db.query(`insert into user_social_identities(user_id,provider,subject,email_at_link,last_login_at) values($1,$2,$3,$4,now())
   on conflict(provider,subject) do update set last_login_at=now(),email_at_link=excluded.email_at_link`,[userId,providerKey,subject,email]);
 }
 const membership=(await db.query(`insert into organization_members(organization_id,user_id,role) values($1,$2,'viewer')
  on conflict(organization_id,user_id) do nothing returning role`,[organizationId,userId])).rows[0];
 if(!membership){
  const current=(await db.query('select role,active,removed_at,purged_at from organization_members where organization_id=$1 and user_id=$2',[organizationId,userId])).rows[0];
  if(!current||!current.active||current.removed_at||current.purged_at)fail('Tu acceso a esta empresa no está activo. Pedile a administración que te vuelva a invitar.',403,'ACCESO_REMOVIDO');
 }
 if(created)await recordSsoEvent(db,{organizationId,providerId:provider.id,userId,event:'jit_created',email,details:{subject}});
 else if(linkedNow)await recordSsoEvent(db,{organizationId,providerId:provider.id,userId,event:'linked',email,details:{subject}});
 return {userId,created,linked:linkedNow,providerKey};
}

/** Bitácora SSO por organización (login, JIT, vinculación, error). */
export async function recordSsoEvent(db,{organizationId,providerId=null,userId=null,event,email=null,details={}}){
 if(!SSO_EVENTS.includes(event))fail('Evento SSO inválido.');
 await db.query(`insert into organization_sso_events(organization_id,provider_id,user_id,event,email,details)
  values($1,$2,$3,$4,$5,$6::jsonb)`,[organizationId,providerId,userId,event,email,String(JSON.stringify(details??{}))]);
}

/** Redirect URI registrada en los IdP: override por env, default host admin. */
export function oidcRedirectUri(env=process.env){
 const configured=String(env.OIDC_REDIRECT_URI||'').trim();
 if(configured)return configured;
 const admin=String(env.ADMIN_URL||'https://admin.scaleparaguay.com').replace(/\/$/,'');
 return `${admin}/api/auth/oidc/callback`;
}

const publicProvider=row=>({
 id:row.id,kind:row.kind,issuer:row.issuer,client_id:row.client_id,discovery_url:row.discovery_url,
 active:row.active,client_secret_set:Boolean(row.client_secret),created_at:row.created_at,updated_at:row.updated_at,
});
const publicDomain=row=>({
 id:row.id,domain:row.domain,verified:Boolean(row.verified_at),verified_at:row.verified_at,
 verification_method:row.verification_method,created_at:row.created_at,txt_value:`scale-os-verify=${row.verification_token}`,
});

/**
 * Administración del SSO por organización (owner/admin, capability
 * `settings.manage`): proveedores OIDC y dominios de correo. Los GET nunca
 * devuelven `client_secret`.
 */
export async function organizationSso({req,res,url,db,session,body,send,resolveTxt}){
 if(!url.pathname.startsWith('/api/agency/sso/'))return false;
 try{
  const user=await session(req);if(!user)fail('No autenticado',401);
  if(!roleCan(user,'settings.manage'))fail('Tu rol no permite configurar el acceso SSO.',403,'SIN_PERMISO');
  const org=user.organization_id;
  const verifyRoute=url.pathname.match(/^\/api\/agency\/sso\/domains\/(\d+)\/verify$/);
  const providerRoute=url.pathname.match(/^\/api\/agency\/sso\/providers(?:\/(\d+))?$/);
  const domainRoute=url.pathname.match(/^\/api\/agency\/sso\/domains(?:\/(\d+))?$/);
  if(verifyRoute){
   if(req.method!=='POST')fail('Método no permitido',405);
   const domain=(await db.query('select * from organization_email_domains where id=$1 and organization_id=$2',[verifyRoute[1],org])).rows[0];
   if(!domain)fail('Dominio no encontrado',404,'DOMINIO_NO_ENCONTRADO');
   if(domain.verified_at)return send(res,200,{domain:publicDomain(domain),verified:true,already:true});
   const verified=await verifyDomainDns(domain.domain,domain.verification_token,resolveTxt);
   if(!verified)return send(res,200,{domain:publicDomain(domain),verified:false,message:'Todavía no encontramos el registro TXT. Verificá el DNS y volvé a intentar (la propagación puede demorar).'});
   const updated=(await db.query("update organization_email_domains set verified_at=now(),verification_method='dns_txt',updated_at=now() where id=$1 and organization_id=$2 returning *",[domain.id,org])).rows[0];
   return send(res,200,{domain:publicDomain(updated),verified:true});
  }
  if(providerRoute){
   const providerId=providerRoute[1];
   if(req.method==='GET'&&!providerId){
    const rows=(await db.query('select * from organization_identity_providers where organization_id=$1 order by id',[org])).rows;
    return send(res,200,{providers:rows.map(publicProvider)});
   }
   if(req.method==='POST'&&!providerId){
    const parsed=providerInput(await body(req));
    let row;
    try{
     row=(await db.query(`insert into organization_identity_providers(organization_id,kind,issuer,client_id,client_secret,discovery_url,active,created_by_user_id)
      values($1,$2,$3,$4,$5,$6,$7,$8) returning *`,[org,parsed.kind,parsed.issuer,parsed.clientId,parsed.clientSecret,parsed.discoveryUrl,parsed.active,user.id])).rows[0];
    }catch(error){
     if(error.code==='23505')fail('Ya existe un proveedor con ese emisor para esta empresa.',409,'PROVEEDOR_DUPLICADO');
     throw error;
    }
    return send(res,201,{provider:publicProvider(row)});
   }
   if(req.method==='PATCH'&&providerId){
    const parsed=providerInput(await body(req),{partial:true});
    const columns=[];const values=[];
    if(parsed.issuer!==undefined){values.push(parsed.issuer);columns.push(`issuer=$${values.length}`);}
    if(parsed.clientId!==undefined){values.push(parsed.clientId);columns.push(`client_id=$${values.length}`);}
    if(parsed.clientSecret!==undefined){values.push(parsed.clientSecret);columns.push(`client_secret=$${values.length}`);}
    if(Object.hasOwn(parsed,'discoveryUrl')){values.push(parsed.discoveryUrl);columns.push(`discovery_url=$${values.length}`);}
    if(parsed.active!==undefined){values.push(parsed.active);columns.push(`active=$${values.length}`);}
    values.push(providerId,org);
    let row;
    try{
     row=(await db.query(`update organization_identity_providers set ${columns.join(',')},updated_at=now() where id=$${values.length-1} and organization_id=$${values.length} returning *`,values)).rows[0];
    }catch(error){
     if(error.code==='23505')fail('Ya existe un proveedor con ese emisor para esta empresa.',409,'PROVEEDOR_DUPLICADO');
     throw error;
    }
    if(!row)fail('Proveedor no encontrado',404,'PROVEEDOR_NO_ENCONTRADO');
    return send(res,200,{provider:publicProvider(row)});
   }
   if(req.method==='DELETE'&&providerId){
    const row=(await db.query('delete from organization_identity_providers where id=$1 and organization_id=$2 returning id',[providerId,org])).rows[0];
    if(!row)fail('Proveedor no encontrado',404,'PROVEEDOR_NO_ENCONTRADO');
    return send(res,200,{ok:true});
   }
   fail('Método no permitido',405);
  }
  if(domainRoute){
   const domainId=domainRoute[1];
   if(req.method==='GET'&&!domainId){
    const rows=(await db.query('select * from organization_email_domains where organization_id=$1 order by id',[org])).rows;
    return send(res,200,{domains:rows.map(publicDomain)});
   }
   if(req.method==='POST'&&!domainId){
    const input=await body(req);
    const domain=normalizeDomain(input?.domain);
    const token=newVerificationToken();
    let row;
    try{
     row=(await db.query(`insert into organization_email_domains(organization_id,domain,verification_token,created_by_user_id)
      values($1,$2,$3,$4) returning *`,[org,domain,token,user.id])).rows[0];
    }catch(error){
     if(error.code==='23505')fail('Ese dominio ya está registrado. Si es tuyo, pedí a la otra organización que lo libere o contactá a soporte.',409,'DOMINIO_DUPLICADO');
     throw error;
    }
    return send(res,201,{domain:publicDomain(row),instructions:{type:'TXT',name:domain,value:`scale-os-verify=${token}`}});
   }
   if(req.method==='DELETE'&&domainId){
    const row=(await db.query('delete from organization_email_domains where id=$1 and organization_id=$2 returning id',[domainId,org])).rows[0];
    if(!row)fail('Dominio no encontrado',404,'DOMINIO_NO_ENCONTRADO');
    return send(res,200,{ok:true});
   }
   fail('Método no permitido',405);
  }
  fail('Ruta de SSO no encontrada',404,'RUTA_NO_ENCONTRADA');
 }catch(error){
  send(res,error.status||500,{...(error.code?{code:error.code}:{}),error:error.status?error.message:'No se pudo completar la operación de SSO.'});
  return true;
 }
}

/** Valida el id_token del proveedor (iss/aud/exp/nonce; el canje fue por TLS). */
function validateIdToken(idToken,{provider,nonce}){
 const payload=decodeJwtPayload(idToken);
 const expectedIssuer=String(provider.issuer||'').replace(/\/$/,'');
 const issuer=String(payload.iss||'').replace(/\/$/,'');
 if(issuer&&issuer!==expectedIssuer)fail('El proveedor devolvió un token de otro emisor.',401,'TOKEN_INVALIDO');
 const audiences=(Array.isArray(payload.aud)?payload.aud:[payload.aud]).map(value=>String(value??''));
 if(!audiences.includes(String(provider.client_id)))fail('El proveedor devolvió un token para otro cliente.',401,'TOKEN_INVALIDO');
 if(!(Number(payload.exp)*1000>Date.now()))fail('El token del proveedor venció.',401,'TOKEN_VENCIDO');
 if(nonce&&payload.nonce&&String(payload.nonce)!==String(nonce))fail('El nonce del proveedor no coincide.',401,'NONCE_INVALIDO');
 return payload;
}

const cleanName=value=>String(value||'').replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,120);

/**
 * Inicia el flujo OIDC: resuelve el proveedor por `?org=<id|slug>` o por
 * `?email=` contra los dominios verificados, guarda state + PKCE + nonce y
 * redirige al authorize del IdP.
 */
export async function oidcStart({req,res,url,db,send,oauthStateCookie,fetchImpl=fetch,env=process.env}){
 try{
  const org=url.searchParams.get('org'),email=url.searchParams.get('email');
  if(!org&&!email)fail('Indicá la organización o el correo para iniciar el acceso SSO.',400,'PARAMETRO_AUSENTE');
  let provider;
  if(org){
   const byId=/^\d+$/.test(org);
   provider=(await db.query(`select p.*,o.slug as organization_slug from organization_identity_providers p
    join organizations o on o.id=p.organization_id
    where ${byId?'p.organization_id=$1':'o.slug=$1'} and p.active and p.kind='oidc' and o.active
    order by p.id limit 1`,[org])).rows[0];
   if(!provider)fail('La organización no tiene acceso SSO configurado.',404,'SSO_NO_CONFIGURADO');
  }else{
   provider=await providerForEmail(db,email);
   if(!provider)fail('No hay un proveedor de identidad para ese correo.',404,'SSO_NO_DISPONIBLE');
  }
  const discovery=await fetchDiscovery(provider,{fetchImpl});
  const state=crypto.randomBytes(32).toString('hex');
  const {verifier,challenge}=pkcePair();
  const nonce=crypto.randomBytes(32).toString('hex');
  const redirectUri=oidcRedirectUri(env);
  await db.query("insert into oauth_states(state,organization_slug,redirect_uri,expires_at,provider,code_verifier,nonce) values($1,$2,$3,now()+interval '10 minutes',$4,$5,$6)",[state,provider.organization_slug||'',redirectUri,`oidc:${provider.id}`,verifier,nonce]);
  const params=new URLSearchParams({client_id:provider.client_id,response_type:'code',redirect_uri:redirectUri,scope:'openid email profile',state,code_challenge:challenge,code_challenge_method:'S256',nonce});
  const separator=discovery.authorizationEndpoint.includes('?')?'&':'?';
  res.writeHead(302,{Location:`${discovery.authorizationEndpoint}${separator}${params}`,'Set-Cookie':oauthStateCookie(state,600,'oidc')});
  res.end();
  return true;
 }catch(error){
  send(res,error.status||500,{...(error.code?{code:error.code}:{}),error:error.status?error.message:'No se pudo iniciar el acceso SSO.'});
  return true;
 }
}

/**
 * Callback OIDC: valida state single-use (cookie en GET; PKCE+nonce en POST),
 * canjea el código, obtiene userinfo, resuelve/crea la identidad con JIT y
 * emite el handoff existente. El destino de error es fijo (nunca redirect del
 * request).
 */
export async function oidcCallback({req,res,url,db,send,parseCookies,oauthStateCookie,fields,fetchImpl=fetch,env=process.env}){
 const appUrl=String(env.APP_URL||'https://app.scaleparaguay.com').replace(/\/$/,'');
 const failure=message=>{
  res.writeHead(302,{Location:`${appUrl}/?authError=${encodeURIComponent(message+' Intentá nuevamente desde esta pantalla.')}`,'Set-Cookie':oauthStateCookie('',0,'oidc')});
  res.end();
  return true;
 };
 try{
  const read=fields||{};
  const state=String(read.state||'');
  if(req.method==='GET'&&(!state||parseCookies(req).scale_oauth_state_oidc!==state))return send(res,400,{code:'STATE_INVALIDO',error:'Sesión SSO inválida o vencida.'});
  const saved=state?(await db.query("delete from oauth_states where state=$1 and provider like 'oidc:%' and expires_at>now() returning redirect_uri,code_verifier,nonce,provider",[state])).rows[0]:null;
  if(!saved)return send(res,400,{code:'STATE_INVALIDO',error:'Sesión SSO inválida o vencida.'});
  const providerId=Number(String(saved.provider).slice('oidc:'.length));
  const provider=(await db.query(`select p.*,o.slug as organization_slug from organization_identity_providers p
   join organizations o on o.id=p.organization_id where p.id=$1 and p.active and p.kind='oidc' and o.active`,[providerId])).rows[0];
  if(!provider)return failure('El acceso SSO de la organización ya no está disponible.');
  if(read.error||!read.code)return failure('No se completó el acceso con el proveedor de identidad.');
  let discovery;
  try{discovery=await fetchDiscovery(provider,{fetchImpl});}
  catch(error){return failure(error.status?error.message:'No se pudo leer la configuración del proveedor.');}
  let tokenData;
  try{
   const response=await fetchImpl(discovery.tokenEndpoint,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded',accept:'application/json'},body:new URLSearchParams({grant_type:'authorization_code',code:String(read.code),redirect_uri:saved.redirect_uri,client_id:provider.client_id,client_secret:provider.client_secret,code_verifier:saved.code_verifier||''})});
   if(!response||!response.ok)return failure('No se pudo validar el acceso con el proveedor.');
   tokenData=await response.json().catch(()=>null);
   if(!tokenData||typeof tokenData!=='object'||Array.isArray(tokenData))return failure('El proveedor no devolvió una respuesta válida.');
  }catch(error){
   if(error?.status)return failure(error.message);
   return failure('No se pudo completar la conexión con el proveedor.');
  }
  let claims={};
  if(typeof tokenData.id_token==='string'&&tokenData.id_token){
   try{claims=validateIdToken(tokenData.id_token,{provider,nonce:saved.nonce});}
   catch(error){return failure(error.status?error.message:'El proveedor devolvió una credencial inválida.');}
  }
  let profile=null;
  if(discovery.userinfoEndpoint&&typeof tokenData.access_token==='string'&&tokenData.access_token){
   try{
    const response=await fetchImpl(discovery.userinfoEndpoint,{headers:{authorization:`Bearer ${tokenData.access_token}`,accept:'application/json'}});
    if(!response||!response.ok)return failure('No se pudo obtener el perfil del proveedor.');
    profile=await response.json().catch(()=>null);
    if(!profile||typeof profile!=='object'||Array.isArray(profile))return failure('El proveedor no devolvió un perfil válido.');
   }catch(error){
    if(error?.status)return failure(error.message);
    return failure('No se pudo obtener el perfil del proveedor.');
   }
  }else{
   profile=claims;
  }
  const subject=String(profile.sub||claims.sub||'').trim();
  const email=String(profile.email||profile.preferred_username||claims.email||claims.preferred_username||'').trim().toLowerCase();
  if(!subject||!email)return failure('El proveedor no confirmó un correo verificado.');
  if(profile.email_verified===false)return failure('El proveedor no confirmó un correo verificado.');
  const domainProvider=await providerForEmail(db,email);
  if(domainProvider&&String(domainProvider.organization_id)!==String(provider.organization_id))return failure('Ese correo pertenece a otra organización.');
  const closed=(await db.query(`select 1 from users u join account_closure_requests r on r.user_id=u.id
   where lower(u.email)=lower($1) and r.cancelled_at is null and r.recoverable_until>now()`,[email])).rows.length;
  if(closed)return failure('Esta cuenta tiene un cierre solicitado. Recuperala primero con correo y contraseña.');
  const client=typeof db.connect==='function'?await db.connect():null;
  const runner=client||db;
  let ticket;
  try{
   if(client)await client.query('begin');
   const provision=await jitProvision(runner,{organizationId:provider.organization_id,provider,profile:{subject,email,emailVerified:true,name:cleanName(profile.name),picture:typeof profile.picture==='string'?profile.picture:null}});
   await recordSsoEvent(runner,{organizationId:provider.organization_id,providerId:provider.id,userId:provision.userId,event:'login',email,details:{subject}});
   ticket=crypto.randomBytes(32).toString('hex');
   await runner.query("insert into oauth_handoffs(token_hash,user_id,organization_id,expires_at,normal_login) values($1,$2,$3,now()+interval '60 seconds',true)",[crypto.createHash('sha256').update(ticket).digest('hex'),provision.userId,provider.organization_id]);
   if(client)await client.query('commit');
  }catch(error){
   if(client)await client.query('rollback').catch(()=>false);
   if(error?.status)return failure(error.message);
   return failure('No se pudo completar el acceso SSO.');
  }finally{
   client?.release();
  }
  res.writeHead(302,{Location:`${appUrl}/core-api/api/auth/oidc/complete?ticket=${ticket}`,'Set-Cookie':oauthStateCookie('',0,'oidc')});
  res.end();
  return true;
 }catch(error){
  send(res,error.status||500,{...(error.code?{code:error.code}:{}),error:error.status?error.message:'No se pudo completar el acceso SSO.'});
  return true;
 }
}

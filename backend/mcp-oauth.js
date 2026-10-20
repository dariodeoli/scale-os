import crypto from 'node:crypto';
import {roleCan} from './permissions.js';
import {subscriptionState} from './subscription-billing.js';
import {throttleClient} from './request-guard.js';
export const MCP_SCOPES=Object.freeze(['scale:read','scale:write']);
export const mcpHash=value=>crypto.createHash('sha256').update(String(value)).digest('hex');
const opaque=()=>crypto.randomBytes(32).toString('base64url');
const fail=(error,status=400,description=error)=>{throw Object.assign(new Error(description),{status,oauthError:error});};
const object=value=>{if(!value||typeof value!=='object'||Array.isArray(value))fail('invalid_request');return value;};
const params=value=>{const p=value instanceof URLSearchParams?value:new URLSearchParams(value);for(const key of new Set(p.keys()))if(p.getAll(key).length!==1)fail('invalid_request',400,'Parámetros OAuth duplicados');return Object.fromEntries(p);};
const scopes=value=>{if(typeof value!=='string')fail('invalid_scope');const values=[...new Set(value.split(' ').filter(Boolean))];if(!values.length||values.some(v=>!MCP_SCOPES.includes(v)))fail('invalid_scope');return values;};
const exact=(a,b)=>typeof a==='string'&&typeof b==='string'&&a.length===b.length&&crypto.timingSafeEqual(Buffer.from(a),Buffer.from(b));
const cookieHash=req=>mcpHash(String(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('scale_session='))||'no-session');
const browserSessionId=req=>{try{return decodeURIComponent(String(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('scale_session='))?.slice(14)||'');}catch{return '';}};
const safeRedirect=value=>{try{const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password||u.hash||value.length>2048)fail('invalid_redirect_uri');return value;}catch{fail('invalid_redirect_uri');}};
export function mcpConfiguration({issuer=process.env.SCALE_MCP_ISSUER||'https://api.scaleparaguay.com',appOrigin=process.env.APP_URL||'https://app.scaleparaguay.com'}={}){
 const origin=new URL(issuer),app=new URL(appOrigin);if(origin.protocol!=='https:'||origin.username||origin.password||origin.pathname!=='/'||origin.search||origin.hash||app.protocol!=='https:'||app.username||app.password||app.pathname!=='/'||app.search||app.hash)throw Error('MCP requires canonical HTTPS origins');
 return {issuer:origin.origin,appOrigin:app.origin,resource:origin.origin+'/mcp'};
}
export async function mcpLiveActor(db,connection,{subscription=subscriptionState,lock=false}={}){
 const actor=(await db.query(`select u.id,m.organization_id,m.role,o.name as organization_name,o.slug as organization_slug,o.demo_owner_user_id,o.demo_source_id from users u join organization_members m on m.user_id=u.id join organizations o on o.id=m.organization_id where u.id=$1 and m.organization_id=$2 and u.deleted_at is null and u.anonymized_at is null and m.active and m.removed_at is null and o.active and o.demo_owner_user_id is null and o.demo_source_id is null and not exists(select 1 from account_closure_requests a where a.user_id=u.id and a.cancelled_at is null and a.recoverable_until>now())${lock?' for share of u,m':''}`,[connection.user_id,connection.organization_id])).rows[0];
 if(!actor)return null;
 actor.capabilities=Object.fromEntries((await db.query('select capability,allowed from agency_role_permissions where organization_id=$1 and role=$2',[actor.organization_id,actor.role])).rows.map(x=>[x.capability,x.allowed]));
 if(!(await subscription(db,actor)).hasAccess)return null;return actor;
}
export function createMcpOAuth({db,session,configuration=mcpConfiguration(),subscription=subscriptionState}){
 const cfg=configuration;
 const audit=async(actor,connection,action,status)=>db.query('insert into agency_mcp_audit(organization_id,user_id,connection_id,action,status) values($1,$2,$3,$4,$5)',[actor?.organization_id||null,actor?.id||null,connection||null,action,status]);
 const json=(res,status,data,headers={})=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store',Pragma:'no-cache',...headers});res.end(JSON.stringify(data));return true;};
 const redirect=(res,url)=>{res.writeHead(302,{Location:url,'Cache-Control':'no-store','Referrer-Policy':'no-referrer'});res.end();return true;};
 async function input(req){const chunks=[];let bytes=0;for await(const chunk of req){const buffer=Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk);bytes+=buffer.length;if(bytes>32768)fail('invalid_request',413);chunks.push(buffer);}const text=Buffer.concat(chunks,bytes).toString('utf8');try{return (req.headers['content-type']||'').split(';')[0]==='application/x-www-form-urlencoded'?params(text):object(JSON.parse(text));}catch(error){if(error.oauthError)throw error;fail('invalid_request');}}
 async function browserActor(req){const a=await session(req);if(!a)fail('login_required',401,'Ingresá para administrar conexiones');const actor=await mcpLiveActor(db,{user_id:a.id,organization_id:a.organization_id},{subscription});if(!actor)fail('access_denied',403);return actor;}
 function browserOrigin(req){if(req.headers.origin!==cfg.appOrigin)fail('access_denied',403,'Origen de consentimiento no permitido');}
 const asRedirect=(r,fields)=>{const target=new URL(r.redirect_uri);for(const [k,v] of Object.entries(fields))target.searchParams.set(k,v);if(r.state)target.searchParams.set('state',r.state);return target.href;};
 async function tokenPair(c,connection){const access=opaque(),refresh=opaque();await c.query('insert into agency_mcp_tokens(connection_id,access_hash,refresh_hash) values($1,$2,$3)',[connection.id,mcpHash(access),mcpHash(refresh)]);return {access_token:access,token_type:'Bearer',expires_in:3600,refresh_token:refresh,scope:connection.scopes.join(' ')};}
 async function authenticate(req){const h=req.headers.authorization;if(typeof h!=='string'||!/^Bearer [A-Za-z0-9_-]{43}$/.test(h))return null;const row=(await db.query('select c.*,t.id as token_id from agency_mcp_tokens t join agency_mcp_connections c on c.id=t.connection_id where t.access_hash=$1 and c.resource=$2 and t.expires_at>now() and t.revoked_at is null and c.revoked_at is null',[mcpHash(h.slice(7)),cfg.resource])).rows[0];if(!row)return null;const actor=await mcpLiveActor(db,row,{subscription});if(!actor){await db.query('update agency_mcp_connections set revoked_at=coalesce(revoked_at,now()) where id=$1',[row.id]);return null;}return {connection:row,actor,scopes:row.scopes};}
 async function handle(req,res,url){
  const p=url.pathname,management=p==='/api/agency/mcp/connections'||/^\/api\/agency\/mcp\/connections\/[a-f0-9-]{36}$/.test(p)||p==='/api/agency/mcp/authorization';
  if(!management&&!['/.well-known/oauth-protected-resource','/.well-known/oauth-protected-resource/mcp','/.well-known/oauth-authorization-server','/oauth/register','/oauth/authorize','/oauth/token','/oauth/revoke'].includes(p))return false;
  try{
   if(p.startsWith('/.well-known/')){if(req.method!=='GET')return json(res,405,{error:'method_not_allowed'});return json(res,200,p.includes('oauth-protected-resource')?{resource:cfg.resource,authorization_servers:[cfg.issuer],scopes_supported:MCP_SCOPES,bearer_methods_supported:['header'],resource_name:'Scale OS'}:{issuer:cfg.issuer,authorization_endpoint:cfg.issuer+'/oauth/authorize',token_endpoint:cfg.issuer+'/oauth/token',registration_endpoint:cfg.issuer+'/oauth/register',revocation_endpoint:cfg.issuer+'/oauth/revoke',response_types_supported:['code'],grant_types_supported:['authorization_code','refresh_token'],token_endpoint_auth_methods_supported:['none'],code_challenge_methods_supported:['S256'],scopes_supported:MCP_SCOPES});}
   if(!await throttleClient(db,req,'mcp:'+p,management?120:p==='/oauth/register'?12:120))fail('slow_down',429);
   if(management){
    const actor=await browserActor(req);
    if(p==='/api/agency/mcp/connections'){
     if(req.method!=='GET')fail('invalid_request',405);
     const nonce=opaque();await db.query('delete from agency_mcp_browser_nonces where expires_at<now()');await db.query('insert into agency_mcp_browser_nonces(token_hash,user_id,organization_id,session_hash) values($1,$2,$3,$4)',[mcpHash(nonce),actor.id,actor.organization_id,cookieHash(req)]);
     const rows=(await db.query('select c.id,a.name as "clientName",c.scopes,c.created_at as "createdAt",c.last_used_at as "lastUsedAt",c.revoked_at as "revokedAt" from agency_mcp_connections c join agency_mcp_clients a on a.id=c.client_id where c.user_id=$1 and c.organization_id=$2 order by c.created_at desc limit 100',[actor.id,actor.organization_id])).rows;
     return json(res,200,{mcpUrl:cfg.resource,organization:{id:String(actor.organization_id),name:actor.organization_name},connections:rows,capabilities:{manage:true},csrfToken:nonce});
    }
    if(p.includes('/connections/')){
     if(req.method!=='DELETE')fail('invalid_request',405);browserOrigin(req);const b=await input(req),key=p.split('/').at(-1);
     const c=await db.connect();try{await c.query('begin');
      const nonce=(await c.query('delete from agency_mcp_browser_nonces where token_hash=$1 and user_id=$2 and organization_id=$3 and session_hash=$4 and expires_at>now() returning token_hash',[mcpHash(b.csrfToken),actor.id,actor.organization_id,cookieHash(req)])).rows[0];if(!nonce)fail('access_denied',403,'La confirmación venció; actualizá la página');
      const row=(await c.query('update agency_mcp_connections set revoked_at=coalesce(revoked_at,now()) where id=$1 and user_id=$2 and organization_id=$3 returning id',[key,actor.id,actor.organization_id])).rows[0];if(!row)fail('not_found',404);
      await c.query('insert into agency_mcp_audit(organization_id,user_id,connection_id,action,status) values($1,$2,$3,$4,$5)',[actor.organization_id,actor.id,key,'revoke',200]);await c.query('commit');return json(res,200,{revoked:true,id:key});
     }catch(e){await c.query('rollback');throw e;}finally{c.release();}
    }
    const key=url.searchParams.get('request');
    if(req.method==='GET'){
     if(!/^[A-Za-z0-9_-]{43}$/.test(key||''))fail('invalid_request');const nonce=opaque();
     const row=(await db.query('update agency_mcp_authorizations set bound_user_id=$2,organization_id=$3,csrf_hash=$4,session_hash=$5 where request_hash=$1 and expires_at>now() and consumed_at is null returning *',[mcpHash(key),actor.id,actor.organization_id,mcpHash(nonce),cookieHash(req)])).rows[0];if(!row)fail('invalid_request',410,'La solicitud venció o ya fue utilizada');
     const client=(await db.query('select name from agency_mcp_clients where id=$1',[row.client_id])).rows[0];return json(res,200,{request:key,client:{name:client.name,redirectUri:row.redirect_uri},organization:{id:String(actor.organization_id),name:actor.organization_name},scopes:row.scopes,expiresAt:row.expires_at,csrfToken:nonce});
    }
    if(req.method!=='POST')fail('invalid_request',405);browserOrigin(req);const b=await input(req);if(typeof b.approve!=='boolean'||!/^[A-Za-z0-9_-]{43}$/.test(b.request||''))fail('invalid_request');
    const c=await db.connect();try{await c.query('begin');const row=(await c.query('select * from agency_mcp_authorizations where request_hash=$1 and expires_at>now() and consumed_at is null for update',[mcpHash(b.request)])).rows[0];if(!row||String(row.bound_user_id)!==String(actor.id)||String(row.organization_id)!==String(actor.organization_id)||!exact(row.csrf_hash,mcpHash(b.csrfToken))||row.session_hash!==cookieHash(req))fail('access_denied',403,'La confirmación venció; actualizá la página');
     let target;if(!b.approve){await c.query('update agency_mcp_authorizations set consumed_at=now() where request_hash=$1',[row.request_hash]);target=asRedirect(row,{error:'access_denied'});}else{
      const recentSession=(await c.query("select created_at from sessions where id=$1 and user_id=$2 and expires_at>now() and created_at>=now()-interval '15 minutes'",[browserSessionId(req),actor.id])).rows[0];
      const connection=crypto.randomUUID(),code=opaque();await c.query('insert into agency_mcp_connections(id,client_id,organization_id,user_id,scopes,resource,reauthenticated_at) values($1,$2,$3,$4,$5,$6,$7)',[connection,row.client_id,actor.organization_id,actor.id,row.scopes,row.resource,recentSession?.created_at||null]);await c.query("update agency_mcp_authorizations set consumed_at=now(),connection_id=$2,code_hash=$3,code_expires_at=now()+interval '60 seconds' where request_hash=$1",[row.request_hash,connection,mcpHash(code)]);target=asRedirect(row,{code});
     }await c.query('commit');await audit(actor,null,b.approve?'consent.approve':'consent.deny',200);return json(res,200,{redirectUrl:target});
    }catch(e){await c.query('rollback');throw e;}finally{c.release();}
   }
   if(p==='/oauth/register'){
    if(req.method!=='POST')fail('invalid_request',405);const b=await input(req);if(!Array.isArray(b.redirect_uris)||!b.redirect_uris.length||b.redirect_uris.length>5)fail('invalid_client_metadata');const redirects=b.redirect_uris.map(safeRedirect);if(b.token_endpoint_auth_method&&b.token_endpoint_auth_method!=='none')fail('invalid_client_metadata');if(b.grant_types&&(!Array.isArray(b.grant_types)||b.grant_types.some(x=>!['authorization_code','refresh_token'].includes(x))))fail('invalid_client_metadata');if(b.response_types&&JSON.stringify(b.response_types)!=='["code"]')fail('invalid_client_metadata');const name=typeof b.client_name==='string'?b.client_name.trim():'';if(name.length<2||name.length>100||/[\x00-\x1f]/.test(name))fail('invalid_client_metadata');const client=opaque();await db.query('insert into agency_mcp_clients(id,name,redirect_uris) values($1,$2,$3::jsonb)',[client,name,JSON.stringify(redirects)]);return json(res,201,{client_id:client,client_name:name,redirect_uris:redirects,token_endpoint_auth_method:'none',grant_types:['authorization_code','refresh_token'],response_types:['code'],scope:MCP_SCOPES.join(' ')});
   }
   if(p==='/oauth/authorize'){
    if(req.method!=='GET')fail('invalid_request',405);const b=params(url.searchParams);const client=(await db.query('select * from agency_mcp_clients where id=$1',[b.client_id||''])).rows[0];if(!client)fail('invalid_client');const registered=typeof client.redirect_uris==='string'?JSON.parse(client.redirect_uris):client.redirect_uris;if(!registered.includes(b.redirect_uri))fail('invalid_redirect_uri');if(b.resource!==cfg.resource)fail('invalid_target');if(b.response_type!=='code'||b.code_challenge_method!=='S256'||!/^[A-Za-z0-9_-]{43}$/.test(b.code_challenge||''))fail('invalid_request');const granted=scopes(b.scope||MCP_SCOPES.join(' '));if(b.state!==undefined&&(typeof b.state!=='string'||b.state.length>1024||/[\x00-\x1f]/.test(b.state)))fail('invalid_request');const key=opaque();await db.query('insert into agency_mcp_authorizations(request_hash,client_id,redirect_uri,resource,scopes,state,challenge) values($1,$2,$3,$4,$5,$6,$7)',[mcpHash(key),client.id,b.redirect_uri,cfg.resource,granted,b.state||'',b.code_challenge]);return redirect(res,cfg.appOrigin+'/mcp/autorizar?request='+key);
   }
   if(p==='/oauth/token'){
    if(req.method!=='POST')fail('invalid_request',405);const b=await input(req);if(b.resource!==cfg.resource)fail('invalid_target');const c=await db.connect();try{await c.query('begin');let connection;
     if(b.grant_type==='authorization_code'){
      const row=(await c.query('select * from agency_mcp_authorizations where code_hash=$1 and code_expires_at>now() and code_consumed_at is null for update',[mcpHash(b.code)])).rows[0];if(!row||row.client_id!==b.client_id||row.redirect_uri!==b.redirect_uri||row.resource!==b.resource||typeof b.code_verifier!=='string'||! /^[A-Za-z0-9._~-]{43,128}$/.test(b.code_verifier)||!exact(row.challenge,crypto.createHash('sha256').update(b.code_verifier).digest('base64url')))fail('invalid_grant');connection=(await c.query('select * from agency_mcp_connections where id=$1 and revoked_at is null for update',[row.connection_id])).rows[0];if(!connection||!await mcpLiveActor(c,connection,{subscription}))fail('invalid_grant');await c.query('update agency_mcp_authorizations set code_consumed_at=now() where request_hash=$1',[row.request_hash]);
     }else if(b.grant_type==='refresh_token'){
      const token=(await c.query('select * from agency_mcp_tokens where refresh_hash=$1 for update',[mcpHash(b.refresh_token)])).rows[0];if(!token)fail('invalid_grant');connection=(await c.query('select * from agency_mcp_connections where id=$1 for update',[token.connection_id])).rows[0];if(!connection||connection.client_id!==b.client_id||connection.resource!==cfg.resource||connection.revoked_at)fail('invalid_grant');if(token.refresh_used_at){await c.query('update agency_mcp_connections set revoked_at=now() where id=$1',[connection.id]);await c.query('commit');fail('invalid_grant');}if(token.revoked_at||new Date(token.refresh_expires_at)<=new Date()||!await mcpLiveActor(c,connection,{subscription}))fail('invalid_grant');if(b.scope&&scopes(b.scope).some(x=>!connection.scopes.includes(x)))fail('invalid_scope');if(b.scope)connection.scopes=scopes(b.scope);await c.query('update agency_mcp_connections set scopes=$2 where id=$1',[connection.id,connection.scopes]);await c.query('update agency_mcp_tokens set refresh_used_at=now(),revoked_at=now() where id=$1',[token.id]);
     }else fail('unsupported_grant_type');
     const pair=await tokenPair(c,connection);await c.query('commit');return json(res,200,pair);
    }catch(e){await c.query('rollback');throw e;}finally{c.release();}
   }
   if(p==='/oauth/revoke'){
    if(req.method!=='POST')fail('invalid_request',405);const b=await input(req);await db.query('update agency_mcp_connections set revoked_at=coalesce(revoked_at,now()) where client_id=$2 and id in(select connection_id from agency_mcp_tokens where access_hash=$1 or refresh_hash=$1)',[mcpHash(b.token),b.client_id||'']);return json(res,200,{});
   }
  }catch(error){return json(res,error.status||500,{error:error.oauthError||'server_error',error_description:error.oauthError?error.message:'No se pudo completar la conexión'});}
  return false;
 }
 return {handle,authenticate,configuration:cfg};
}

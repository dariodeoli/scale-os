import {fail} from './suite-validation.js';
import {roles} from './permissions.js';
const defaults=()=>({version:1,startup:'summary',production:{clientId:'',mine:false,week:false}});
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
export function validateWorkspacePreferencePatch(input){
 if(!object(input)||Buffer.byteLength(JSON.stringify(input))>32768||!Object.keys(input).length||Object.keys(input).some(key=>!['version','startup','production','columns'].includes(key)))fail('Preferencias inválidas');
 if(Object.hasOwn(input,'version')&&input.version!==1)fail('Versión de preferencias inválida');
 if(Object.hasOwn(input,'startup')&&!['summary','production','my-day'].includes(input.startup))fail('Inicio inválido');
 if(Object.hasOwn(input,'production')){
  const p=input.production;
  if(!object(p)||Object.keys(p).some(key=>!['clientId','mine','week'].includes(key)))fail('Filtros inválidos');
  if(Object.hasOwn(p,'clientId')&&(typeof p.clientId!=='string'||p.clientId!==''&&!/^[1-9]\d{0,18}$/.test(p.clientId)||p.clientId!==''&&BigInt(p.clientId)>9223372036854775807n))fail('Cliente inválido');
  for(const key of ['mine','week'])if(Object.hasOwn(p,key)&&typeof p[key]!=='boolean')fail('Filtro inválido');
 }
 if(Object.hasOwn(input,'columns')){
  if(!object(input.columns)||Object.keys(input.columns).length>100)fail('Columnas inválidas');
  for(const [list,entry] of Object.entries(input.columns)){
   if(!/^[a-z0-9:/_.-]{1,160}$/.test(list)||['__proto__','constructor','prototype'].includes(list)||!object(entry)||Object.keys(entry).some(key=>!['order','hidden'].includes(key)))fail('Columnas inválidas');
   for(const field of ['order','hidden'])if(!Array.isArray(entry[field])||entry[field].length>32||new Set(entry[field]).size!==entry[field].length||entry[field].some(key=>typeof key!=='string'||!/^[a-zA-Z0-9][a-zA-Z0-9_.:-]{0,63}$/.test(key)||['__proto__','constructor','prototype'].includes(key)))fail('Columnas inválidas');
  }
 }
 return input;
}
export async function workspacePreferences({req,res,url,db,session,body,send}){
 if(url.pathname!=='/api/agency/workspace-preferences')return false;
 let client;
 res.setHeader?.('Cache-Control','private, no-store');
 try{
  const user=await session(req);if(!user)fail('No autenticado',401);
  if(!roles.includes(user.role))fail('Sin acceso al espacio',403);
  const org=user.organization_id;
  // This is a stale-tab guard, never an authorization source. Identity comes
  // exclusively from the authenticated session and locked active membership.
  if(req.headers?.['x-scale-preference-scope']!==`${user.id}:${org}`)fail('La sesión cambió. Recargá tus preferencias.',409);
  if(!['GET','PATCH'].includes(req.method))fail('Método no permitido',405);
  if(req.headers?.['if-none-match']&&req.headers['if-none-match']!=='*')fail('Condición de preferencias inválida');
  const importOnly=req.method==='PATCH'&&req.headers?.['if-none-match']==='*';
  const input=req.method==='PATCH'?validateWorkspacePreferencePatch(await body(req)):null;
  client=await db.connect();await client.query('begin');
  if(!(await client.query('select 1 from organization_members m join organizations o on o.id=m.organization_id where m.organization_id=$1 and m.user_id=$2 and m.active and m.removed_at is null and o.active for share of m,o',[org,user.id])).rows.length)fail('Sin acceso activo a esta empresa',403);
  if(input&&!importOnly)await client.query('insert into agency_workspace_preferences(organization_id,user_id) values($1,$2) on conflict do nothing',[org,user.id]);
  const record=(await client.query('select preferences from agency_workspace_preferences where organization_id=$1 and user_id=$2'+(input?' for update':''),[org,user.id])).rows[0];
  const old=record?.preferences||defaults();
  let preferences=input?{...old,...input,version:1,production:{...old.production,...input.production},...(old.columns||input.columns?{columns:{...old.columns,...input.columns}}:{})}:old;
  if(preferences.production.clientId){
   const exists=(await client.query('select 1 from agency_clients where organization_id=$1 and id=$2',[org,preferences.production.clientId])).rows.length;
   if(!exists&&input?.production?.clientId)fail('El cliente no pertenece a esta empresa');
   if(!exists)preferences={...preferences,production:{...preferences.production,clientId:''}};
  }
  if(importOnly){const inserted=await client.query('insert into agency_workspace_preferences(organization_id,user_id,preferences) values($1,$2,$3) on conflict do nothing returning user_id',[org,user.id,JSON.stringify(preferences)]);if(!inserted.rows.length)fail('Las preferencias ya se guardaron desde otro dispositivo. Recargá las preferencias de la cuenta.',412);}
  else if(input)await client.query('update agency_workspace_preferences set preferences=$3,updated_at=now() where organization_id=$1 and user_id=$2',[org,user.id,JSON.stringify(preferences)]);
  await client.query('commit');send(res,200,{preferences,stored:!!input||!!record,user_id:String(user.id),organization_id:String(org)});return true;
 }catch(error){if(client)await client.query('rollback');send(res,error.status||500,{error:error.status?error.message:'No se pudieron guardar las preferencias. Intentá de nuevo.'});return true;}
 finally{client?.release();}
}

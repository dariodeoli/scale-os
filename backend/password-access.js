import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import {throttle,throttleClient} from './request-guard.js';
const hash=v=>crypto.createHash('sha256').update(v).digest('hex');
const commonPasswords=new Set(['12345678','123456789','123456789012','password','password1','password123456','passwordpassword','qwertyuiop123','adminadminadmin','scaleos123456','contrasena','contraseña']);
export function validatePassword(value,email=''){
 if(typeof value!=='string'||value.length<8||value.length>128)throw Object.assign(Error('Usá una contraseña de 8 a 128 caracteres.'),{status:400});
 const normalized=value.toLowerCase(),local=String(email).split('@')[0].toLowerCase();
 if(commonPasswords.has(normalized)||(local.length>=4&&normalized.includes(local)))throw Object.assign(Error('Elegí una contraseña menos predecible.'),{status:400});
 return true;
}
// El límite vive en request-guard.js (fuente única); se re-exporta por compatibilidad.
export {throttle};
export async function passwordAccess({req,res,url,db,body,send,sendReset,emailAvailable=true}){
 if(!['/api/auth/password/request','/api/auth/password/reset'].includes(url.pathname))return false;
 if(req.method!=='POST'){send(res,405,{error:'Método no permitido'});return true;}
 let c;
 try{
  const b=await body(req);
  if(url.pathname.endsWith('/request')){
   if(!emailAvailable){send(res,503,{error:'La recuperación por correo todavía no está disponible. Usá Google o contactá al administrador.'});return true;}
   const email=typeof b.email==='string'?b.email.trim().toLowerCase():'';
   // Primero el tope por cliente y por correo; recién después se consulta si la cuenta existe.
   const clientAllowed=await throttleClient(db,req,'reset',10);
   const limited=clientAllowed&&await throttle(db,'reset:'+email,3);
   const validInput=!email.endsWith('@demo.example.invalid')&&/^\S+@\S+\.\S+$/.test(email);
   let accountFound=false,tokenCreated=false,deliveryAccepted=null;
   if(limited&&validInput){
    const account=(await db.query('select id from users where email=$1 and exists(select 1 from organization_members m where m.user_id=users.id and m.active=true)',[email])).rows[0];
    accountFound=Boolean(account);
    if(account){const token=crypto.randomBytes(32).toString('hex');await db.query("insert into password_resets(token_hash,user_id,expires_at) values($1,$2,now()+interval '1 hour')",[hash(token),account.id]);tokenCreated=true;deliveryAccepted=await sendReset(email,token).catch(()=>false);}
   }
   console.info(JSON.stringify({event:'password_reset_delivery',validInput,throttleAllowed:limited,accountFound,tokenCreated,deliveryAccepted}));
   send(res,202,{message:'Si ese correo tiene acceso, recibirá un enlace para establecer su contraseña.'});return true;
  }
  if(typeof b.token!=='string'||!/^[a-f0-9]{64}$/.test(b.token)){send(res,400,{error:'El enlace no es válido.'});return true;}
  try{validatePassword(b.password);}catch(error){send(res,error.status||400,{error:error.message});return true;}
  c=await db.connect();await c.query('begin');const saved=(await c.query('delete from password_resets where token_hash=$1 and expires_at>now() returning user_id',[hash(b.token)])).rows[0];
  if(!saved){await c.query('rollback');send(res,400,{error:'El enlace venció o ya fue utilizado. Solicitá otro.'});return true;}
  // Compare-and-set: si otro pedido cambió la contraseña mientras se calculaba el hash, este no la pisa.
  const previous=(await c.query('select password_hash from users where id=$1',[saved.user_id])).rows[0];
  const passwordHash=await bcrypt.hash(b.password,12);
  const changed=previous&&(await c.query('update users set password_hash=$1 where id=$2 and password_hash=$3 returning id',[passwordHash,saved.user_id,previous.password_hash])).rows[0];
  if(!changed){await c.query('rollback');send(res,409,{code:'PASSWORD_CHANGED_CONCURRENTLY',error:'La contraseña se cambió en otro pedido al mismo tiempo. Solicitá un enlace nuevo.'});return true;}await c.query('delete from sessions where user_id=$1',[saved.user_id]);await c.query('delete from password_resets where user_id=$1',[saved.user_id]);await c.query('commit');send(res,200,{ok:true});return true;
 }catch(e){if(c)await c.query('rollback');console.error(JSON.stringify({event:'password_reset_error',code:e.code}));send(res,500,{error:'No se pudo completar la operación'});return true;}finally{c?.release();}
}

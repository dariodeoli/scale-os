import bcrypt from 'bcryptjs';
import {fail} from './suite-validation.js';
import {loginOrganization} from './default-organization.js';

// Presence in users is not permission to enroll again. Only an unfinished,
// unverified first trial may continue its enrollment without an agency yet.
export async function registrationIdentity(db,email){
 const user=(await db.query(`select u.*,exists(select 1 from organization_members m where m.user_id=u.id)
  or exists(select 1 from os_trial_registrations t where t.user_id=u.id)
  or exists(select 1 from agency_access_requests r where r.user_id=u.id)
  or exists(select 1 from account_closure_requests a where a.user_id=u.id) as has_history,
  exists(select 1 from auth_email_verifications v where v.user_id=u.id and v.purpose='trial' and v.used_at is null) as unfinished_trial
  from users u where u.email=$1`,[email])).rows[0];
 return {user,existing:Boolean(user&&(user.is_demo_guest||user.email_verified_at||user.has_history||!user.unfinished_trial))};
}
export async function existingAccount(db,user){
 if(user.is_demo_guest)fail('Usá tu cuenta personal, no una sesión de demostración.',403);
 if((await db.query('select 1 from account_closure_requests where user_id=$1 and cancelled_at is null and recoverable_until>now()',[user.id])).rows.length)
  throw Object.assign(Error('Esta cuenta tiene un cierre solicitado. Podés recuperarla desde Recuperar cuenta.'),{status:403,code:'ACCOUNT_CLOSURE_PENDING'});
 const selected=await loginOrganization(db,{userId:user.id,orderByName:true});
 if(selected)return {userId:user.id,organizationId:selected.organization_id,existing:true,pending:false,redirect:selected.is_default?'/':'/?chooseCompany=1'};
 const pending=(await db.query(`select l.organization_id from agency_access_requests r
  join agency_invite_links l on l.id=r.link_id join organizations o on o.id=l.organization_id
  where r.user_id=$1 and r.status='pending' and o.active and l.revoked_at is null
  and l.used_at is null and l.expires_at>now() and o.demo_owner_user_id is null
  and o.demo_source_id is null and o.slug<>'scale-demo-controles-20260908'
  order by r.created_at desc,r.id desc limit 1`,[user.id])).rows[0];
 if(pending)return {userId:user.id,organizationId:pending.organization_id,existing:true,pending:true,redirect:'/acceso-pendiente'};
 fail('Usuario sin organización asignada',403);
}
export async function passwordAccount(db,email,password,{allowUnknown=false}={}){
 const user=(await db.query('select id,password_hash,email_verified_at,is_demo_guest from users where email=$1',[email])).rows[0];
 if(!user&&allowUnknown)return null;
 if(!user||!user.email_verified_at||user.is_demo_guest||!await bcrypt.compare(password,user.password_hash).catch(()=>false))fail('Credenciales inválidas',401);
 return existingAccount(db,user);
}

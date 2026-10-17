import crypto from 'node:crypto';
import {registrationIdentity,existingAccount} from './existing-account.js';
import {startTrial} from './subscription-billing.js';
import {ensurePipelineStages} from './pipeline-stages.js';
import {ensureInventoryCategories} from './inventory-reservations.js';
import {grantConsent} from './personal-data.js';
const fail=(message,status=400)=>{throw Object.assign(Error(message),{status});};
export function trialDetails(params){
 if(params.get('signup')!=='1')return null;
 if(params.get('invite'))fail('Usá la invitación o el registro de una agencia nueva, no ambos.');
 return {};
}
export function trialDetailsFromInput(input={}){
 const name=(typeof input.company==='string'?input.company:'').trim(),currency=input.currency;
 if(name.length<2||name.length>160||/[\u0000-\u001f\u007f]/.test(name)||!['USD','PYG'].includes(currency)||input.consent!==true)fail('Completá el nombre de tu agencia, la moneda y aceptá las condiciones de la prueba.');
 if(input.invite)fail('Usá la invitación o el registro de una agencia nueva, no ambos.');
 return {name,currency};
}
// The Google callback owns the transaction. Profile must have been verified by
// Google's token/userinfo exchange, never supplied by a browser request body.
// `method` deja en la evidencia cómo se verificó el correo (google | password).
export async function registerTrial(c,profile,details,{method='google'}={}){
 const email=String(profile.email||'').trim().toLowerCase();
 if(profile.email_verified!==true||!/^\S+@\S+\.\S+$/.test(email))fail('Verificá tu correo con Google.',403);
 await c.query('select pg_advisory_xact_lock(hashtextextended($1,0))',['trial-registration:'+email]);
 // Invitation acceptance also locks the identity row. Read its history only
 // after that lock, so a concurrent enrollment cannot miss committed access.
 await c.query('select id from users where email=$1 for update',[email]);
 const identity=await registrationIdentity(c,email);
 if(identity.existing)return existingAccount(c,identity.user);
 // Existing identities need no agency form; validate new enrollment lazily.
 if(typeof details==='function')details=details();
 const user=identity.user||(await c.query("insert into users(email,password_hash,role) values($1,'!google-trial-no-password','viewer') returning id",[email])).rows[0];
 const org=(await c.query('insert into organizations(slug,name) values($1,$2) returning id',['agencia-'+crypto.randomUUID(),details.name])).rows[0];
 await c.query("select set_config('app.current_user',$1,true),set_config('app.current_organization',$2,true)",[String(user.id),String(org.id)]);
 await c.query("insert into organization_members(organization_id,user_id,role) values($1,$2,'owner')",[org.id,user.id]);
 await ensurePipelineStages(c,org.id);
 await ensureInventoryCategories(c,org.id);
 await c.query('insert into agency_settings(organization_id,default_currency) values($1,$2)',[org.id,details.currency]);
 const candidate=String(profile.name||'').trim().slice(0,120),name=candidate.length>=2?candidate:email.slice(0,120);
 await c.query('insert into agency_user_profiles(organization_id,user_id,full_name) values($1,$2,$3) on conflict(organization_id,user_id) do nothing',[org.id,user.id,name]);
 await startTrial(c,org.id,details.currency);
 await c.query("insert into os_trial_registrations(user_id,organization_id,consent_version) values($1,$2,'2026-09-10:30d-10usd-50000pyg-2d-grace')",[user.id,org.id]);
 // PDP (#112): el alta registra la aceptación del aviso vigente por finalidad.
 await grantConsent(c,{organizationId:org.id,subjectKind:'user',subjectId:String(user.id),purpose:'account',source:'registration',grantedByUserId:user.id,evidence:{method,terms_accepted:true}});
 await grantConsent(c,{organizationId:org.id,subjectKind:'user',subjectId:String(user.id),purpose:'service',source:'registration',grantedByUserId:user.id,evidence:{method,terms_accepted:true}});
 return {userId:user.id,organizationId:org.id,created:true};
}

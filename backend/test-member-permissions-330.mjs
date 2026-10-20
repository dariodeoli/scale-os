import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {migrationOrder} from './scripts/migration-order.mjs';
import {CAPABILITIES,rolePermissions,roleCan,loadActorPermissions,permissionPolicy} from './permissions.js';
import {suite} from './agency-suite.js';
import {inviteLinks} from './invite-links.js';
import {agencyCore} from './agency-core.js';
process.env.INVITE_LINK_SECRET??='test-member-policy330-secret-length32';
const pg=new PGlite();
try{
 await pg.exec(await fs.readFile(new URL('./schema.sql',import.meta.url),'utf8'));
 for(const file of [...migrationOrder,'20261020_member_permissions.sql'])await pg.exec(await fs.readFile(new URL('./migrations/'+file,import.meta.url),'utf8'));
 const query=(sql,args)=>pg.query(sql,args),db={query,connect:async()=>({query,release(){}})},one=async(sql,args)=>(await query(sql,args)).rows[0];
 const org=(await one("insert into organizations(slug,name) values('member-policy330','Policy330') returning id")).id,other=(await one("insert into organizations(slug,name) values('member-policy330-other','Other policy330') returning id")).id;
 const actors={};for(const role of ['owner','admin','management','finance','editor','viewer']){
  const id=(await one('insert into users(email,password_hash) values($1,\'unused\') returning id',[role+'-policy330@example.invalid'])).id;
  await query('insert into organization_members(organization_id,user_id,role) values($1,$2,$3)',[org,id,role]);actors[role]={id,organization_id:org,role};
 }
 const manager=actors.management;
 const live=async actor=>({...actor,capabilities:await loadActorPermissions(db,actor)});
 async function call(path='/api/agency/permissions',method='GET',data={},actor=manager){let response;
  const user=actor&&await live(actor),ctx={req:{method,headers:{},socket:{remoteAddress:'permission-policy-fixture'}},res:{},url:new URL(path,'https://test.invalid'),db,session:async()=>user,body:async()=>data,send:(_,status,result)=>{response={status,...result};return true;},auditContext:async()=>{},sendInvitation:async()=>true};
  let handled=false;for(const handler of [rolePermissions,inviteLinks,suite,agencyCore])if(await handler(ctx)){handled=true;break;}assert(handled);return response;
 }
 for(const cap of ['settings.manage','contracts.view','contracts.manage','contracts.issue','accounts.manage','payments.manage','finance.view','permissions.manage'])assert(roleCan(manager,cap),cap);
 for(const cap of ['salary.view','finance.balance.view']){assert.equal(roleCan(manager,cap),false);assert.equal(roleCan({...manager,capabilities:{[cap]:true}},cap),false,'manager hard denial '+cap);}
 assert(roleCan(actors.finance,'salary.view'),'existing finance salary default preserved');
 let result=await call();assert.equal(result.status,200,JSON.stringify(result));assert(result.policy.permissionRoles.includes('finance'));assert(!result.policy.editableRoles.includes('finance'),'cannot assign salary-bearing role');assert.equal(result.policy.canResetRoles,false);
 assert(result.roles.every(role=>!['owner','admin','management'].includes(role)));assert(result.capabilities.every(cap=>!['salary.view','finance.balance.view'].includes(cap.id)));assert(result.capabilities.every(cap=>cap.defaults.every(role=>!['owner','admin','management'].includes(role))));
 const financeInvite=await call('/api/agency/invite-links','POST',{role:'finance',mode:'single'},actors.owner);assert.equal(financeInvite.status,200);
 const inviteMetadata=await call('/api/agency/invite-links');assert.equal(inviteMetadata.status,200);assert.equal(inviteMetadata.links.find(link=>String(link.id)===String(financeInvite.id)).url,null,'manager cannot obtain a salary-granting bearer invitation issued by an owner');
 assert.equal((await call('/api/agency/invite-links','POST',{role:'finance',mode:'single'})).status,403,'cannot issue salary-bearing invitation');
 assert.equal((await call(undefined,'PATCH',{role:'editor',capability:'clients.manage',allowed:false})).status,200);
 assert.equal((await call(undefined,'PATCH',{role:'editor',capability:'salary.view',allowed:true})).status,403);
 assert.equal((await call(undefined,'PATCH',{role:'management',capability:'clients.manage',allowed:true})).status,403);
 assert.equal((await call(undefined,'PATCH',{role:'admin',capability:'clients.manage',allowed:false})).status,403);
 assert.equal((await call(undefined,'PATCH',{role:null,capability:null,allowed:null})).status,403);
 const endpoint='/api/agency/members/'+actors.editor.id+'/permissions';
 result=await call(endpoint);assert.equal(result.status,200);assert(result.capabilities.every(cap=>!['salary.view','finance.balance.view'].includes(cap.id)));
 assert.equal((await call(endpoint,'PATCH',{capability:'clients.manage',allowed:true})).status,200);
 let actor=await live(actors.editor);assert.equal(roleCan(actor,'clients.manage'),true,'member grant overrides role denial');
 assert.equal((await call(endpoint,'PATCH',{capability:'clients.manage',allowed:false})).status,200);assert.equal(roleCan(await live(actors.editor),'clients.manage'),false);
 assert.equal((await call(endpoint,'PATCH',{capability:'clients.manage',allowed:null})).status,200);assert.equal(roleCan(await live(actors.editor),'clients.manage'),false,'reset restores role denial');
 assert.equal((await call(endpoint,'PATCH',{capability:'salary.view',allowed:true})).status,403);
 assert.equal((await call('/api/agency/members/'+manager.id+'/permissions','PATCH',{capability:'clients.manage',allowed:true})).status,403,'no self permission editing');
 assert.equal((await call('/api/agency/members/'+actors.admin.id+'/permissions')).status,403,'cannot inspect superior member overrides');
 assert.equal((await call('/api/agency/members/'+actors.viewer.id+'/permissions','PATCH',{capability:'clients.manage',allowed:true},{...manager,organization_id:other})).status,403,'membership checked in tenant');
 assert.equal((await call('/api/agency/members/'+actors.viewer.id,'PATCH',{role:'admin'})).status,403,'no promotion above manager');
 assert.equal((await call('/api/agency/members/'+actors.viewer.id,'PATCH',{role:'finance'})).status,403,'no indirect salary grant via role');
 assert.equal((await call('/api/agency/members/'+actors.viewer.id,'PATCH',{role:'editor',expected_role:'viewer',expected_active:true})).status,200,'allowed subordinate role edit');
 assert.equal((await call('/api/agency/members/'+manager.id,'PATCH',{active:false})).status,403,'no self access edits');
 assert.equal((await call('/api/agency/members/'+actors.finance.id,'PATCH',{active:false})).status,200,'can suspend lower finance access without granting salary');
 assert.equal((await call('/api/agency/members/'+actors.finance.id,'PATCH',{active:true})).status,403,'reactivation cannot indirectly grant salary');
 const members=await call('/api/agency/members');assert.equal(members.status,200);assert.equal(members.members.find(row=>String(row.id)===String(manager.id)).access_editable,false);assert.equal(members.members.find(row=>String(row.id)===String(actors.admin.id)).permissions_editable,false);
 assert.equal((await call(endpoint,'PATCH',{capability:'clients.manage',allowed:true},actors.admin)).status,200,'admin manages lower members');
 assert.equal((await call(undefined,'PATCH',{role:'editor',capability:'clients.manage',allowed:true},actors.admin)).status,200,'admin manages lower role policy');
 await query("insert into agency_member_permissions(organization_id,user_id,capability,allowed) values($1,$2,'permissions.manage',false)",[org,manager.id]);assert.equal((await call()).status,403,'individual denial revokes policy management immediately');
 const audit=(await query("select * from agency_operation_audit where table_name='agency_member_permissions' and actor=$1",[String(manager.id)])).rows;assert(audit.length>=3,'member overrides audited');
 console.log('PASS member permissions330: manager business defaults, hard salary/Balance denials, filtered role/person policy, hierarchy, no self/promotion/indirect salary grant, per-member precedence/reset/live revocation, tenant and audit.');
}finally{await pg.close();}

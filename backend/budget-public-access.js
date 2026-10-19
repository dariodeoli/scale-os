import {visibleRecord} from './record-lifecycle.js';
import {zoneTodaySql} from './business-time.js';

// Shared with the existing /p/:token route. Printing adds current tenant/lifecycle
// restrictions; viewing an old public proposal keeps its existing behavior.
export async function sharedBudget(c,token,{organizationId=null,requireCurrent=false}={}){
 if(typeof token!=='string'||!/^[A-Za-z0-9_-]{16,128}$/.test(token))return null;
 const values=[token];
 let filter='b.public_token=$1 and b.share_enabled=true';
 if(organizationId!==null){values.push(organizationId);filter+=' and b.organization_id=$2';}
 if(requireCurrent){
  filter+=` and b.status in ('sent','accepted') and (b.valid_until is null or b.valid_until>=${zoneTodaySql}) and ${visibleRecord('b','budgets')}
   and exists(select 1 from agency_clients c where c.id=b.client_id and c.organization_id=b.organization_id and c.active and ${visibleRecord('c','clients')})`;
 }
 return (await c.query(`select b.id,b.organization_id from agency_budgets b where ${filter} for update of b`,values)).rows[0]||null;
}

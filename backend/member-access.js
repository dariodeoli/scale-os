import {roleCan} from './permissions.js';
import {fail} from './suite-validation.js';

// Serialize membership changes for a company, then refresh the actor inside the
// lock. A session checked before waiting may belong to an owner just revoked by
// the winning transaction; that actor must never remove the remaining owner.
export async function lockMemberManager(c,user){
 await c.query('select id from organizations where id=$1 for update',[user.organization_id]);
 const actor=(await c.query('select role,active,removed_at from organization_members where organization_id=$1 and user_id=$2',[user.organization_id,user.id])).rows[0];
 if(!actor||!actor.active||actor.removed_at)fail('Tu acceso a esta empresa cambió. Volvé a ingresar.',403);
 const current={...user,role:actor.role};
 if(!roleCan(current,'members.manage'))fail('Tu rol no permite administrar accesos',403);
 return current;
}

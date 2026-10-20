/** Refs #335: privacy inventory never exports share tokens or their hashes. */
async function installed(c){return Boolean((await c.query("select to_regclass('agency_client_intake_submissions') as name")).rows[0]?.name);}
// Match verified subject identity only within its organization; an unreviewed
// form is included when it uses the same primary email or nonempty tax ID.
const subjectMatch=`(s.client_id=c.id or l.client_id=c.id or (nullif(c.email,'') is not null and lower(s.payload->>'email')=lower(c.email)) or (nullif(c.tax_id,'') is not null and regexp_replace(s.payload->>'tax_id','[^0-9]','','g')=regexp_replace(c.tax_id,'[^0-9]','','g')))`;
export async function exportClientIntake(c,organizationId,clientId){
 if(!await installed(c))return [];
 return (await c.query(`select s.payload,s.status,s.created_at,s.reviewed_at,s.notice_version,s.consent_at,l.scope from agency_client_intake_submissions s join agency_client_intake_links l on l.id=s.link_id and l.organization_id=s.organization_id join agency_clients c on c.organization_id=s.organization_id where c.organization_id=$1 and c.id=$2 and ${subjectMatch} order by s.id`,[organizationId,clientId])).rows;
}
export async function suppressClientIntake(c,organizationId,clientId){
 if(!await installed(c))return;
 // Locking/suppression happens in the same client transaction as the canonical PDP flow.
 const links=(await c.query(`select distinct l.id from agency_client_intake_submissions s join agency_client_intake_links l on l.id=s.link_id and l.organization_id=s.organization_id join agency_clients c on c.organization_id=s.organization_id where c.organization_id=$1 and c.id=$2 and ${subjectMatch}`,[organizationId,clientId])).rows.map(row=>row.id);
 await c.query('delete from agency_client_intake_links where organization_id=$1 and (client_id=$2 or id=any($3::bigint[]))',[organizationId,clientId,links]);
}

import crypto from 'node:crypto';
// Sesión del portal del cliente, compartida entre el portal y el autoservicio
// de protección de datos (scale-os#112) sin crear dependencias circulares.
const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
const readCookie=req=>Object.fromEntries((req.headers?.cookie||'').split(';').filter(Boolean).map(value=>{const at=value.indexOf('=');return[value.slice(0,at).trim(),decodeURIComponent(value.slice(at+1))];}));

export async function readClientPortalSession(db,req){
 const raw=readCookie(req)['__Host-scale_client_session'];
 if(!raw||!/^[a-f0-9]{64}$/.test(raw))return null;
 const row=(await db.query(`select s.token_hash,u.id,u.email,u.full_name,u.organization_id,u.client_id
  from client_portal_sessions s join client_portal_users u on u.id=s.portal_user_id
  where s.token_hash=$1 and s.expires_at>now() and u.disabled_at is null`,[hash(raw)])).rows[0]||null;
 if(row)await db.query('update client_portal_sessions set last_seen_at=now() where token_hash=$1',[row.token_hash]);
 return row;
}

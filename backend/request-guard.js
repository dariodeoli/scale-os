import crypto from 'node:crypto';

// Límite por cliente (IP con hash) para endpoints públicos que, si se
// los deja sin tope, permiten enumerar si un correo, un enlace o un RUC existe.
// Regla (guía superadmin §6): el límite corre ANTES de cualquier consulta que
// revele existencia; la llave por correo sola no alcanza porque el atacante
// rota correos. Nunca guarda la IP en crudo: solo un hash con sal del servidor.
const hash=v=>crypto.createHash('sha256').update(v).digest('hex');
// Contador por llave (con hash) en ventana fija de 15 minutos. Atómico: un solo upsert.
export async function throttle(db,key,max=8){
 const row=(await db.query("insert into auth_throttles(key,count,expires_at) values($1,1,now()+interval '15 minutes') on conflict(key) do update set count=case when auth_throttles.expires_at<now() then 1 else auth_throttles.count+1 end,expires_at=case when auth_throttles.expires_at<now() then now()+interval '15 minutes' else auth_throttles.expires_at end returning count",[hash(key)])).rows[0];return row.count<=max;
}

export function requestClientKey(req){
 const headers=req?.headers||{};
 const forwarded=String(headers['x-forwarded-for']||'').split(',')[0].trim();
 const ip=forwarded||req?.socket?.remoteAddress||'';
 if(!ip)return 'unknown';
 const salt=process.env.THROTTLE_HASH_SALT||process.env.SESSION_SECRET||'scale-os-request-guard';
 return crypto.createHash('sha256').update(`${salt}|${ip}`).digest('hex').slice(0,32);
}

/** Ventana de 15 minutos (la de `throttle`) por alcance y cliente. */
export async function throttleClient(db,req,scope,max){
 return throttle(db,`${scope}:client:${requestClientKey(req)}`,max);
}

/** Corta con 429 si el cliente superó el tope del alcance. */
export async function requireClientBudget(db,req,scope,max,message='Demasiados intentos. Esperá 15 minutos.'){
 if(!await throttleClient(db,req,scope,max))throw Object.assign(new Error(message),{status:429});
}

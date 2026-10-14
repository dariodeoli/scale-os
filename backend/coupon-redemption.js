import {randomUUID} from 'node:crypto';
// Canje de cupones: única fuente para el canje de la empresa (/api/billing/coupon-redeem)
// y para la aplicación desde el superadmin (/api/platform/agencies/:id/coupons/apply).
// Debe ejecutarse dentro de una transacción abierta (`c`); no hace commit.
const fail=(message,status=400,code='BILLING_INVALID')=>{throw Object.assign(new Error(message),{status,code});};
export const couponExpired=coupon=>Boolean(coupon?.expires_at)&&new Date(coupon.expires_at).getTime()<=Date.now();
export async function redeemCoupon(c,{code=null,couponId=null,organizationId,userId,defaultCurrency='PYG'}){
 const coupon=(await c.query(`select id,code,max_redemptions,discount_type,discount_value,currency,expires_at,organization_id,(select count(*)::int from platform_coupon_redemptions r where r.coupon_id=platform_coupons.id) as used from platform_coupons where ${couponId!==null?'id=$1':'code=$1'} and active for update`,[couponId!==null?couponId:code])).rows[0];
 if(!coupon)fail('Cupón inválido o desactivado',400);
 if(couponExpired(coupon))fail('El cupón venció',409);
 if(coupon.organization_id!==null&&String(coupon.organization_id)!==String(organizationId))fail('Este cupón no corresponde a tu empresa',409);
 // El conteo se relee después de tomar el lock del cupón: la subconsulta de arriba usa la
 // foto de la sentencia (anterior a la espera del lock) y no ve canjes que otra empresa
 // confirmó mientras tanto, así que dos canjes concurrentes podían pasar el límite.
 if(coupon.max_redemptions!==null){
  const used=Number((await c.query('select count(*)::int as n from platform_coupon_redemptions where coupon_id=$1',[coupon.id])).rows[0]?.n??0);
  coupon.used=used;
  if(used>=Number(coupon.max_redemptions))fail('Este cupón ya alcanzó su límite de usos',400);
 }
 if((await c.query('select 1 from platform_coupon_redemptions where coupon_id=$1 and organization_id=$2',[coupon.id,organizationId])).rows[0])fail('Tu empresa ya canjeó este cupón',409);
 let sub=(await c.query('select due_at,paid_through_at from organization_subscriptions where organization_id=$1 for update',[organizationId])).rows[0];
 if(!sub){
  // Coupons also work before any trial or payment: the granted period opens
  // the subscription runway for companies that never enrolled.
  await c.query(`insert into organization_subscriptions(organization_id,currency,binding_token) values($1,$2,$3) on conflict(organization_id) do nothing`,[organizationId,defaultCurrency??'PYG',randomUUID()]);
  sub=(await c.query('select due_at,paid_through_at from organization_subscriptions where organization_id=$1 for update',[organizationId])).rows[0];
 }
 const base=new Date(Math.max(Date.now(),sub.paid_through_at?new Date(sub.paid_through_at).getTime():new Date(sub.due_at).getTime()));
 if(coupon.discount_type==='days'){
  const days=Number(coupon.discount_value);
  base.setDate(base.getDate()+days);
  const due=new Date(Math.max(base.getTime(),new Date(sub.due_at).getTime()));
  await c.query('update organization_subscriptions set paid_through_at=$2,due_at=$3,updated_at=now() where organization_id=$1',[organizationId,base.toISOString(),due.toISOString()]);
  const internal=(await c.query('select expires_at from platform_subscription_states where organization_id=$1 for update',[organizationId])).rows[0];
  if(internal&&internal.expires_at){
   const extended=new Date(Math.max(Date.now(),new Date(internal.expires_at).getTime()));
   extended.setDate(extended.getDate()+days);
   await c.query('update platform_subscription_states set expires_at=$2,updated_at=now() where organization_id=$1',[organizationId,extended.toISOString()]);
  }
  await c.query('insert into platform_coupon_redemptions(coupon_id,organization_id,months_granted,redeemed_by_user_id) values($1,$2,0,$3)',[coupon.id,organizationId,userId]);
  return {coupon,days,months:0,message:`Cupón canjeado: se agregaron ${days} día${days===1?'':'s'} gratis a tu suscripción.`};
 }
 base.setMonth(base.getMonth()+1);
 const due=new Date(Math.max(base.getTime(),new Date(sub.due_at).getTime()));
 await c.query('update organization_subscriptions set paid_through_at=$2,due_at=$3,updated_at=now() where organization_id=$1',[organizationId,base.toISOString(),due.toISOString()]);
 await c.query('insert into platform_coupon_redemptions(coupon_id,organization_id,months_granted,redeemed_by_user_id) values($1,$2,1,$3)',[coupon.id,organizationId,userId]);
 return {coupon,days:0,months:1,message:'Cupón canjeado: se agregó un mes a tu suscripción.'};
}

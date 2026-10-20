import {normalizarBanco,BANCOS_Y_FINANCIERAS_PARAGUAY} from 'owncoding-ui/financial-metadata';
import {roleCan} from './permissions.js';
import {currencies} from './currencies.js';
import {fail,text,id} from './suite-validation.js';
import {visibleRecord} from './record-lifecycle.js';
import {financeRetry,financeRemember} from './finance-idempotency.js';
const fields=new Set(['name','accountType','currency','institution','accountNumber','holderName','custodianUserId','alias','holderTaxId','accountSubtype','expectedRevision','requestId']);
function institution(value){const raw=text(value||'',180);return BANCOS_Y_FINANCIERAS_PARAGUAY.find(name=>normalizarBanco(name.replace(/^Banco\s+/i,''))===normalizarBanco(raw.replace(/^Banco\s+/i,'')))||raw||null;}
function values(body,old={}){
 if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).some(key=>!fields.has(key)))fail('Campos de cuenta inválidos');
 const take=(key,column,fallback=null)=>Object.hasOwn(body,key)?body[key]:old[column]??fallback;
 const accountType=take('accountType','account_type','bank'),currency=take('currency','currency','PYG');
 if(!['bank','cash','digital','investment'].includes(accountType)||!currencies.includes(currency))fail('Tipo de cuenta o moneda inválidos');
 const bank=institution(take('institution','institution')),number=text(take('accountNumber','account_number')||'',180)||null,holder=text(take('holderName','holder_name')||'',180)||null;
 const alias=text(take('alias','alias')||'',120)||null,tax=text(take('holderTaxId','holder_tax_id')||'',40)||null;
 if(tax&&!/^[0-9A-Za-z.-]{3,40}$/.test(tax))fail('Documento o RUC del titular inválido');
 const subtype=take('accountSubtype','account_subtype');if(subtype!==null&&!['savings','checking'].includes(subtype))fail('Elegí ahorro o corriente');
 if(accountType!=='bank'&&subtype)fail('Sólo una cuenta bancaria admite ahorro o corriente');
 const custodian=take('custodianUserId','custodian_user_id'),custodianId=custodian===null||custodian===''?null:id(custodian);
 const generated=[bank||({bank:'Cuenta bancaria',cash:'Efectivo',digital:'Cuenta digital',investment:'Inversión'}[accountType]),subtype==='savings'?'Ahorro':subtype==='checking'?'Corriente':null,holder,number?number.slice(-4):null].filter(Boolean).join(' · ');
 const name=text(take('name','name')||generated,240);if(name.length<2)fail('Nombre de cuenta inválido');
 return {name,accountType,currency,institution:bank,accountNumber:number,holderName:holder,custodianUserId:custodianId,alias,holderTaxId:tax,accountSubtype:subtype};
}
export async function financeAccounts({req,res,url,db,session,body,send}){
 const match=url.pathname.match(/^\/api\/agency\/accounts(?:\/([1-9]\d*))?$/);if(!match||!['GET','POST','PATCH'].includes(req.method)||match[1]&&req.method!=='PATCH')return false;
 let c;
 try{
  const user=await session(req);if(!user)fail('No autenticado',401);if(!roleCan(user,'accounts.manage'))fail('Sin permiso para gestionar cuentas',403);
  if(req.method==='GET'){
   const rows=(await db.query(`select a.*,u.email as custodian_email,coalesce(nullif(i.full_name,''),nullif(p.full_name,''),u.email) as custodian_name,coalesce(i.photo_url,p.photo_url) as custodian_photo_url from bank_accounts a left join users u on u.id=a.custodian_user_id left join organization_person_identity i on i.organization_id=a.organization_id and i.user_id=a.custodian_user_id left join agency_collaborators p on p.organization_id=a.organization_id and p.user_id=a.custodian_user_id where a.organization_id=$1 and ${visibleRecord('a','accounts')} order by a.active desc,a.name`,[user.organization_id])).rows;send(res,200,{accounts:rows});return true;
  }
  if(req.method==='PATCH'&&!match[1])fail('Indicá la cuenta',400);const input=await body(req);c=await db.connect();await c.query('begin');await c.query("select set_config('app.current_user',$1,true),set_config('app.current_ip',$2,true)",[String(user.id),req.socket?.remoteAddress||'']);
  const kind=req.method==='POST'?'account-create':`account-update:${match[1]}`,retry=await financeRetry(c,user,kind,input,{required:req.method==='PATCH'});
  if(retry){await c.query('commit');send(res,200,retry.response);return true;}
  let old={};if(req.method==='PATCH'){
   old=(await c.query(`select * from bank_accounts a where a.id=$1 and a.organization_id=$2 and ${visibleRecord('a','accounts')} for update`,[match[1],user.organization_id])).rows[0];if(!old)fail('Cuenta no disponible',404);
   if(!Number.isSafeInteger(input.expectedRevision)||input.expectedRevision!==old.revision)fail('La cuenta cambió. Recargá antes de guardar.',409);
  }
  const value=values(input,old);
  if(value.custodianUserId&&!(await c.query('select 1 from organization_members where organization_id=$1 and user_id=$2 and active and removed_at is null',[user.organization_id,value.custodianUserId])).rows.length)fail('El custodio debe tener acceso activo a esta empresa',400);
  if(old.id&&value.currency!==old.currency&&(Number(old.balance)!==0||(await c.query('select 1 from agency_cash_movements where organization_id=$1 and account_id=$2 limit 1',[user.organization_id,old.id])).rows.length))fail('Una cuenta con movimientos conserva su moneda',409);
  const args=[user.organization_id,value.name,value.accountType,value.currency,value.institution,value.accountNumber,value.holderName,value.custodianUserId,value.alias,value.holderTaxId,value.accountSubtype];
  const account=old.id?(await c.query('update bank_accounts set name=$2,account_type=$3,currency=$4,institution=$5,account_number=$6,holder_name=$7,custodian_user_id=$8,alias=$9,holder_tax_id=$10,account_subtype=$11,revision=revision+1,updated_at=clock_timestamp() where organization_id=$1 and id=$12 returning *',[...args,old.id])).rows[0]:(await c.query('insert into bank_accounts(organization_id,name,account_type,currency,institution,account_number,holder_name,custodian_user_id,alias,holder_tax_id,account_subtype) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) returning *',args)).rows[0];
  const result={account};await financeRemember(c,user,kind,input,result,old.id?200:201);await c.query('commit');send(res,old.id?200:201,result);
 }catch(error){if(c)await c.query('rollback');send(res,error.status||500,{error:error.status?error.message:'No se pudo guardar la cuenta'});}finally{c?.release();}return true;
}

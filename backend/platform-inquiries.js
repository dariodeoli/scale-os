import crypto from 'node:crypto';
import {actor} from './platform-admin.js';
import {text as validText,email as validEmail,phone as validPhone,option} from './suite-validation.js';
import {emailShell,emailFacts,emailParagraph,line} from './email-brand.js';

// Consultas de la landing (formulario «¿Tenés alguna duda?»). El formulario público
// sigue entrando por /api/public/contact (public-experience.js); acá viven el
// registro de la consulta, el aviso por correo al dueño de la plataforma y la
// bandeja del panel global (GET/PATCH /api/platform/inquiries).
export const DEFAULT_PLATFORM_CONTACT_EMAIL='dariodeoli@gmail.com';
export const INQUIRY_STATUSES=['new','contacted','closed'];
const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
const COLUMNS='i.id,i.name,i.company,i.email,i.whatsapp,i.message,i.consent,i.source,i.source_url,i.status,i.note,i.handled_at,i.created_at,i.updated_at,u.email as handled_by_email';

// Destino del aviso: PLATFORM_CONTACT_EMAIL o la dirección pedida por el dueño.
export function platformContactEmail(value=process.env.PLATFORM_CONTACT_EMAIL){
 const raw=typeof value==='string'?value.trim().toLowerCase():'';
 return /^[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+$/.test(raw)?raw:DEFAULT_PLATFORM_CONTACT_EMAIL;
}

// Huella del visitante sin IP ni user agent en crudo: hash con sal del servidor.
export function clientHash(req){
 const headers=req?.headers||{};
 const ip=String(headers['x-forwarded-for']||'').split(',')[0].trim()||req?.socket?.remoteAddress||'';
 const agent=String(headers['user-agent']||'').slice(0,400);
 if(!ip&&!agent)return null;
 const salt=process.env.INQUIRY_HASH_SALT||process.env.SESSION_SECRET||'scale-os-platform-inquiries';
 return crypto.createHash('sha256').update(`${salt}|${ip}|${agent}`).digest('hex').slice(0,32);
}

// Normaliza la consulta con las reglas compartidas (suite-validation.js).
export function inquiryInput({name,company,email,phone,message,consent,sourceUrl}){
 const url=typeof sourceUrl==='string'?sourceUrl.trim().slice(0,400):'';
 return {
  name:validText(name,120),
  company:validText(company,120),
  email:validEmail(email),
  whatsapp:validPhone(phone||null),
  message:validText(message||'',2000),
  consent:consent===true,
  sourceUrl:/^https?:\/\//i.test(url)?validText(url,400):null,
 };
}

export async function recordInquiry(db,input,req){
 const data=inquiryInput(input);
 return (await db.query(`insert into platform_inquiries(name,company,email,whatsapp,message,consent,source,source_url,client_hash)
  values($1,$2,$3,$4,$5,$6,'landing',$7,$8) returning id,name,company,email,whatsapp,message,consent,source_url,status,created_at`,
  [data.name,data.company,data.email,data.whatsapp,data.message,data.consent,data.sourceUrl,clientHash(req)])).rows[0];
}

const waLink=value=>{const digits=String(value||'').replace(/\D/g,'');return digits?`https://wa.me/${digits}`:'';};
const panelUrl=appUrl=>{
 try{const url=new URL(String(appUrl||'https://app.scaleparaguay.com'));url.pathname=url.pathname.replace(/\/$/,'')+'/superadmin';url.search='?vista=consultas';url.hash='';return url.href;}
 catch{return 'https://app.scaleparaguay.com/superadmin?vista=consultas';}
};

// Correo al dueño de la plataforma. Layout v3 compartido: emailShell/emailFacts
// escapan todo dato; el texto plano usa `line` para no inyectar encabezados.
export function inquiryEmail({inquiry,appUrl}){
 const name=line(inquiry.name),company=line(inquiry.company),email=line(inquiry.email);
 const whatsapp=line(inquiry.whatsapp||''),message=String(inquiry.message||'').trim();
 const href=panelUrl(appUrl);
 const subject=`Nueva consulta desde la landing: ${name} · ${company}`.slice(0,180);
 const rows=[['Nombre',name],['Empresa o agencia',company],['Correo',email],['WhatsApp',whatsapp||'No indicado'],['Autorizó contacto',inquiry.consent===false?'No':'Sí']];
 const text=[
  `Nueva consulta desde la landing de Scale OS`,'',
  ...rows.map(([k,v])=>`${k}: ${v}`),
  ...(whatsapp?[`Abrir WhatsApp: ${waLink(whatsapp)}`]:[]),'',
  'Qué necesita:',message||'(sin mensaje)','',
  `Ver en el panel: ${href}`,'',
  'Respondé este correo para escribirle directamente a la persona.',
  'Scale OS · Administración global · Desarrollado por Owncoding',
 ].join('\n');
 const html=emailShell({
  eyebrow:'Administración global',
  title:'Nueva consulta desde la landing',
  lead:`${name} (${company}) completó el formulario «¿Tenés alguna duda?».`,
  body:emailFacts(rows)+emailParagraph('Qué necesita:')+emailParagraph(message||'(sin mensaje)'),
  cta:{label:'Ver en el panel',href},
  footer:'Respondé este correo para escribirle directamente a la persona.',
  footerNote:'Scale OS · Administración global · Desarrollado por Owncoding',
  preheader:`${name} · ${company}`,
 });
 return {subject,text,html,reply_to:email};
}

// Envía el aviso sin romper el pedido público: cualquier falla se registra sin PII.
export async function notifyInquiry({send,inquiry,appUrl,to=platformContactEmail(),log=console}){
 try{
  const ok=await send({to,message:inquiryEmail({inquiry,appUrl}),idempotencyKey:'platform-inquiry-'+inquiry.id});
  if(!ok)log.warn?.(JSON.stringify({event:'platform_inquiry_email_failed',inquiry_id:String(inquiry.id)}));
  return Boolean(ok);
 }catch(error){
  log.warn?.(JSON.stringify({event:'platform_inquiry_email_failed',inquiry_id:String(inquiry.id),reason:error?.name||'Error'}));
  return false;
 }
}

const integer=(value,fallback)=>{if(value===null||value==='')return fallback;const n=Number(value);return Number.isSafeInteger(n)&&n>=0?n:fallback;};
async function counts(db){
 const rows=(await db.query('select status,count(*)::int as total from platform_inquiries group by status')).rows;
 return Object.fromEntries(INQUIRY_STATUSES.map(status=>[status,rows.find(row=>row.status===status)?.total||0]));
}

export async function platformInquiries({req,res,url,db,session,body,send}){
 if(url.pathname!=='/api/platform/inquiries'&&!url.pathname.startsWith('/api/platform/inquiries/'))return false;
 try{
  const {user,role}=await actor(db,session,req);
  if(url.pathname==='/api/platform/inquiries'){
   if(req.method!=='GET')fail('Método no permitido',405);
   const limit=Math.min(100,Math.max(1,integer(url.searchParams.get('limit'),25))),offset=integer(url.searchParams.get('offset'),0);
   const statusParam=url.searchParams.get('status')||'';
   const status=statusParam?(INQUIRY_STATUSES.includes(statusParam)?statusParam:fail('Estado inválido')):'';
   const where=status?'where i.status=$3':'';
   const values=status?[limit,offset,status]:[limit,offset];
   const total=Number((await db.query(`select count(*)::int as n from platform_inquiries i ${status?'where i.status=$1':''}`,status?[status]:[])).rows[0].n);
   const rows=(await db.query(`select ${COLUMNS} from platform_inquiries i left join users u on u.id=i.handled_by /*demo-ok: quién atendió la consulta*/ ${where} order by i.created_at desc,i.id desc limit $1 offset $2`,values)).rows;
   send(res,200,{inquiries:rows,limit,offset,total,hasMore:offset+rows.length<total,counts:await counts(db)});return true;
  }
  const match=url.pathname.match(/^\/api\/platform\/inquiries\/([1-9]\d{0,17})$/);
  if(!match)fail('Consulta no encontrada.',404);
  if(req.method!=='PATCH')fail('Método no permitido',405);
  if(role!=='admin')fail('Solo un administrador global puede hacer cambios.',403);
  const input=await body(req);
  if(!input||typeof input!=='object'||Array.isArray(input))fail('Solicitud inválida.');
  if(Object.keys(input).some(key=>!['status','note'].includes(key)))fail('La solicitud contiene campos no permitidos.');
  if(input.status===undefined&&input.note===undefined)fail('Indicá el estado o la nota.');
  const current=(await db.query('select id,status,note from platform_inquiries where id=$1',[match[1]])).rows[0];
  if(!current)fail('Consulta no encontrada.',404);
  // PATCH: solo se revalida el campo que cambia; el otro queda tal cual.
  let status=current.status,note=current.note;
  if(input.status!==undefined){try{status=option(input.status,INQUIRY_STATUSES);}catch{fail('Estado inválido');}}
  if(input.note!==undefined){if(input.note===null)note=null;else{try{note=validText(input.note,2000)||null;}catch{fail('La nota admite hasta 2000 caracteres.');}}}
  const handled=status!==current.status;
  await db.query(`update platform_inquiries set status=$2,note=$3,updated_at=now()${handled?',handled_by=$4,handled_at=now()':''} where id=$1`,handled?[current.id,status,note,user.id]:[current.id,status,note]);
  await db.query('insert into platform_audit_log(actor_user_id,action,target_type,target_id,metadata) values($1,$2,$3,$4,$5::jsonb)',[user.id,'inquiry.update','platform_inquiry',String(current.id),JSON.stringify({status,...(input.note!==undefined?{note_changed:true}:{})})]);
  const row=(await db.query(`select ${COLUMNS} from platform_inquiries i left join users u on u.id=i.handled_by /*demo-ok: quién atendió la consulta*/ where i.id=$1`,[current.id])).rows[0];
  send(res,200,{inquiry:row,counts:await counts(db)});return true;
 }catch(error){
  send(res,error.status||500,{error:error.status?error.message:'No se pudo completar la solicitud'});return true;
 }
}

import {assertRecordAvailable} from './record-lifecycle.js';
export const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
export const text=(v,max=2000)=>typeof v==='string'&&v.length<=max?v.trim():fail('Texto inválido');
export const id=v=>/^\d+$/.test(String(v))&&Number(v)>0?String(v):fail('Identificador inválido');
export const optId=v=>v===undefined||v===null||v===''?null:id(v);
export const option=(v,values)=>values.includes(v)?v:fail('Opción inválida');
export const amount=v=>{const n=Number(v);if(!Number.isFinite(n)||n<0||n>999999999999)fail('Importe inválido');return Math.round(n*100)/100;};
export const date=v=>{if(!v)return null;if(v instanceof Date)v=v.toISOString().slice(0,10);const d=new Date(v);if(!/^\d{4}-\d{2}-\d{2}$/.test(v)||!Number.isFinite(d.getTime())||d.toISOString().slice(0,10)!==v)fail('Fecha inválida');return v;};
export const email=v=>{if(!v)return null;const e=text(v,254).toLowerCase();if(!/^\S+@\S+\.\S+$/.test(e))fail('Correo inválido');return e;};
const phoneCountries=['595','598','54','55','56','57','51','52','591','1','34','351'];
export const phone=v=>{
 if(v===undefined||v===null||v==='')return null;
 if(typeof v!=='string'||v.length>50)fail('Teléfono inválido');
 const raw=v.trim(),digits=raw.replace(/\D/g,'');
 if(!digits)fail('Teléfono inválido');
 let country='',national=digits;
 if(raw.startsWith('+')){
  country=phoneCountries.find(code=>digits.startsWith(code))||'';
  if(!country)fail('Teléfono inválido: usá un código de país conocido, por ejemplo +595 981 123 456.');
  national=digits.slice(country.length);
 }
 national=national.replace(/^0+/,'');
 const valid=national&&(country==='595'?national.length===8||national.length===9:national.length>=6&&national.length<=12);
 if(!valid)fail('Teléfono inválido: en Paraguay 9 dígitos para móvil u 8 para fijo; en el resto, 6 a 12. Ej.: +595 981 123 456.');
 return `+${country||'595'} ${national}`;
};
export const serial=v=>text(v,120).replace(/[\s\-_]+/g,'').toUpperCase();
export {externalLink as link} from './media-policy.js';
export function items(v){if(!Array.isArray(v)||!v.length||v.length>100)fail('Agregá entre 1 y 100 ítems');return v.map(x=>{const description=text(x.description,500),quantity=Number(x.quantity),unitPrice=amount(x.unitPrice??x.unit_price);if(!description||!Number.isFinite(quantity)||quantity<=0||quantity>999999)fail('Ítem inválido');const total=amount(quantity*unitPrice);return{description,quantity,unitPrice,total};});}
export async function owned(c,table,key,org){const row=(await c.query(`select * from ${table} where id=$1 and organization_id=$2 for update`,[id(key),org])).rows[0];if(!row)fail('Registro no encontrado',404);await assertRecordAvailable(c,table,row);return row;}

// Internal tasks share these rules across every create/edit endpoint.
export function taskTime(value){
 if(value===null||value===undefined||value==='')return null;
 if(typeof value!=='string'||!/^([01]\d|2[0-3]):[0-5]\d$/.test(value))fail('Hora inválida');
 return value;
}
export function taskChecklist(value){
 if(!Array.isArray(value)||value.length>100)fail('Máximo 100 pasos de checklist');
 const seen=new Set();
 return value.map(item=>{
  if(!item||typeof item!=='object'||Array.isArray(item))fail('Paso de checklist inválido');
  const key=text(item.id,80),label=text(item.text,500);
  if(!/^[a-zA-Z0-9_-]+$/.test(key)||seen.has(key)||!label||typeof item.completed!=='boolean')fail('Paso de checklist inválido');
  seen.add(key);return{id:key,text:label,completed:item.completed};
 });
}
export function taskMaterials(value){
 if(!Array.isArray(value)||value.length>40)fail('Máximo 40 enlaces de materiales');
 return value.map(item=>{
  if(!item||typeof item!=='object'||Array.isArray(item))fail('Material inválido');
  const raw=text(item.url,2000);let parsed;
  try{parsed=new URL(raw);}catch{fail('El material necesita un enlace HTTPS válido');}
  if(parsed.protocol!=='https:'||!parsed.hostname||parsed.username||parsed.password)fail('El material necesita un enlace HTTPS válido');
  return{label:text(item.label??'',120)||parsed.hostname,url:parsed.href};
 });
}

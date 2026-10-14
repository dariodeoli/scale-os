// Precarga del lanzador local (`dev-local.mjs`): intercepta el envío a Resend y
// deja cada correo en un buzón JSONL local (y su enlace en consola), para poder
// verificar el registro, invitaciones y recuperaciones sin proveedor real.
// Nunca se carga en producción: solo `dev-local.mjs` la pasa con `--import`.
import {appendFileSync} from 'node:fs';

const mailbox=process.env.SCALE_DEV_MAILBOX;
const realFetch=globalThis.fetch;
const localLinks=text=>String(text||'').replace(/https:\/\/(localhost|127\.0\.0\.1)(:\d+)?/g,'http://$1$2');

globalThis.fetch=async(input,init={})=>{
 const url=typeof input==='string'?input:input?.url;
 if(url==='https://api.resend.com/emails'){
  const message=JSON.parse(init.body||'{}');
  const entry={at:new Date().toISOString(),to:message.to,subject:message.subject,text:localLinks(message.text),html:localLinks(message.html)};
  if(mailbox)appendFileSync(mailbox,JSON.stringify(entry)+'\n');
  const links=[...new Set((entry.text+' '+entry.html).match(/http:\/\/(localhost|127\.0\.0\.1)[^\s"'<>]*/g)||[])];
  console.log(JSON.stringify({event:'dev_local_mail',to:entry.to,subject:entry.subject,links}));
  return new Response(JSON.stringify({id:'dev-local'}),{status:200,headers:{'Content-Type':'application/json'}});
 }
 return realFetch(input,init);
};

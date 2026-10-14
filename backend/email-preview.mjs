// Renders every transactional email template to a local HTML file for review.
import {writeFileSync,mkdirSync} from 'node:fs';
import {invitationEmail,resetEmail,verificationEmail,destructiveReauthEmail,accessGrantedEmail} from './invitation-email.js';
import {trialStartedEmail,suspensionEmail,paymentFailedEmail} from './billing-email.js';
import {notificationEmail} from './notifications.js';
import {clientPortalResetEmail,clientPortalInviteEmail} from './client-portal.js';
import {EMAIL_TEMPLATE_VERSION} from './email-brand.js';

const appUrl='https://app.scaleparaguay.com';
const samples=[
 {label:'Invitación',message:invitationEmail({email:'lucia.acosta@demo.example.invalid',organizationName:'Agencia Horizonte',role:'editor',appUrl})},
 {label:'Establecer contraseña',message:resetEmail({token:'a'.repeat(64),appUrl})},
 {label:'Verificar correo',message:verificationEmail({token:'b'.repeat(64),appUrl})},
 {label:'Código de eliminación',message:destructiveReauthEmail({code:'12345678'})},
 {label:'Notificación operativa',message:notificationEmail({title:'Nueva pieza lista para revisión',body:'Cliente Aurora Café · Proyecto Campaña Septiembre · Pieza "Spot 30s"',organization_name:'Agencia Horizonte',work_order_id:'42'},appUrl)},
 {label:'Acceso habilitado',message:accessGrantedEmail({email:'lucia.acosta@demo.example.invalid',organizationName:'Agencia Horizonte',role:'editor',appUrl})},
 {label:'Prueba iniciada',message:trialStartedEmail({email:'x@demo.example.invalid',organizationName:'Agencia Horizonte',trialEndsOn:'2026-11-13T12:00:00Z',appUrl})},
 {label:'Acceso suspendido',message:suspensionEmail({organizationName:'Agencia Horizonte',appUrl})},
 {label:'Pago fallido',message:paymentFailedEmail({organizationName:'Agencia Horizonte',appUrl})},
 {label:'Portal de cliente · invitación',message:clientPortalInviteEmail({organizationName:'Agencia Horizonte',clientName:'Aurora Café',url:'https://app.scaleparaguay.com/cliente/invitacion?token=demo'})},
 {label:'Portal de cliente · contraseña',message:clientPortalResetEmail({token:'c'.repeat(64)})},
];
const body=samples.map(({label,message})=>`<section style="border:1px solid #ddd;border-radius:10px;padding:12px;margin:16px 0"><h2 style="margin:4px 0">${label}</h2><p style="margin:4px 0;color:#555"><strong>Asunto:</strong> ${message.subject}</p><iframe title="${label}" style="width:100%;height:640px;border:0" srcdoc="${message.html.replace(/"/g,'&quot;')}"></iframe><details><summary>Texto plano</summary><pre style="white-space:pre-wrap">${message.text}</pre></details></section>`).join('\n');
const page=`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Correos Scale OS · ${EMAIL_TEMPLATE_VERSION}</title></head><body style="font:14px/1.5 Arial,sans-serif;max-width:900px;margin:auto;padding:24px"><h1>Correos Scale OS · ${EMAIL_TEMPLATE_VERSION}</h1>${body}</body></html>`;
// Uso: node email-preview.mjs [directorio]. Escribe un índice y un HTML por correo.
const dir=process.argv[2]||'/tmp';
mkdirSync(dir,{recursive:true});
const out=`${dir}/scale-emails-${EMAIL_TEMPLATE_VERSION}.html`;
writeFileSync(out,page);
samples.forEach(({message},i)=>writeFileSync(`${dir}/email-${String(i+1).padStart(2,'0')}.html`,message.html));
console.log(out);

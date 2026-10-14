import assert from 'node:assert/strict';
import {EMAIL_TEMPLATE_VERSION,EMAIL_LOGO_URL,emailShell,emailHref} from './email-brand.js';
import {invitationEmail,resetEmail,verificationEmail,accessGrantedEmail,destructiveReauthEmail} from './invitation-email.js';
import {trialStartedEmail,suspensionEmail,paymentFailedEmail} from './billing-email.js';
import {notificationEmail} from './notifications.js';
import {clientPortalResetEmail,clientPortalInviteEmail} from './client-portal.js';

const appUrl='https://app.scaleparaguay.com',evil='Agencia <b>&"x"</b>',token='a'.repeat(64);
const emails={
 invitation:{m:invitationEmail({email:'a@example.invalid',organizationName:evil,role:'editor',appUrl}),cta:true},
 reset:{m:resetEmail({token,appUrl}),cta:true},
 verification:{m:verificationEmail({token,appUrl}),cta:true},
 access:{m:accessGrantedEmail({email:'a@example.invalid',organizationName:evil,role:'viewer',appUrl}),cta:true},
 code:{m:destructiveReauthEmail({code:'12345678'}),cta:false},
 trial:{m:trialStartedEmail({email:'a@example.invalid',organizationName:evil,trialEndsOn:'2026-10-16T12:00:00Z',appUrl}),cta:true},
 suspension:{m:suspensionEmail({organizationName:evil,appUrl}),cta:true},
 failed:{m:paymentFailedEmail({organizationName:evil,appUrl}),cta:true},
 notification:{m:notificationEmail({title:evil,body:'<i>x</i>',organization_name:evil,work_order_id:'4'},appUrl),cta:true},
 portalReset:{m:clientPortalResetEmail({token}),cta:true},
 portalInvite:{m:clientPortalInviteEmail({organizationName:evil,clientName:evil,url:'https://app.scaleparaguay.com/cliente/x?a=1&b=2'}),cta:true},
};
assert.equal(EMAIL_TEMPLATE_VERSION,'v2.0.0');
for(const [name,{m,cta}] of Object.entries(emails)){
 const h=m.html;
 assert.ok(h.startsWith('<!doctype html><html lang="es">'),name+' lang es');
 assert.ok(h.includes(`template-version" content="${EMAIL_TEMPLATE_VERSION}"`),name+' shared layout');
 assert.ok(h.includes('name="color-scheme"'),name+' color-scheme');
 assert.ok(h.includes('max-width:600px')&&h.includes('role="presentation"'),name+' 600px table layout');
 assert.ok(h.includes(`<img src="${EMAIL_LOGO_URL}"`)&&h.includes('alt="Scale OS"'),name+' brand logo');
 assert.ok(/display:none[^"]*mso-hide:all">[^<]+/.test(h),name+' hidden preheader');
 assert.ok(h.includes('padding:40px')&&h.includes('padding:32px')&&h.includes('padding:16px!important')&&h.includes('padding:24px!important'),name+' padding scale');
 assert.ok(!/<script|<iframe|<main/.test(h),name+' no unsafe/legacy markup');
 assert.ok(/<h1[^>]*>/.test(h),name+' heading');
 assert.ok(typeof m.text==='string'&&m.text.length>20&&m.text.includes('Owncoding'),name+' text alternative');
 assert.ok(!h.includes('<b>')&&!h.includes('<i>x'),name+' user markup is not injected');
 if(cta){
  assert.ok(/<a href="[^"]+" target="_blank" style="[^"]*padding:14px 32px[^"]*font-size:16px[^"]*line-height:20px/.test(h),name+' bulletproof CTA (48px)');
  assert.ok(h.includes('Si el botón no funciona'),name+' fallback link');
  assert.equal((h.match(/Si el botón no funciona[^]*?<a href="([^"]+)"/)||[])[1],(h.match(/<a href="([^"]+)" target="_blank"/)||[])[1],name+' fallback equals CTA');
 }else{
  assert.ok(h.includes('monospace')&&h.includes('letter-spacing:8px')&&h.includes('12345678'),name+' code is large monospaced');
 }
}
for(const name of ['invitation','access','trial','suspension','failed','notification','portalInvite'])assert.ok(emails[name].m.html.includes('Agencia &lt;b&gt;&amp;&quot;x&quot;&lt;/b&gt;'),name+' escapes interpolated names');
assert.ok(emails.portalInvite.m.html.includes('a=1&amp;b=2'),'hrefs escaped once');
assert.ok(!emailShell({title:'T',lead:'L'}).includes('Si el botón no funciona'),'no CTA, no fallback');
assert.ok(emailShell({title:'T',preheader:'P'}).includes('>P&nbsp;'),'explicit preheader');
// Regresión: el href del CTA y del respaldo solo admite https (o http://localhost);
// javascript:, data:, otros esquemas, credenciales o basura caen al origen de la app.
const ctaHrefs=html=>[...html.matchAll(/<a href="([^"]+)"/g)].map(m=>m[1]);
for(const bad of ['javascript:alert(1)','JaVaScRiPt:alert(1)',' javascript:alert(1)','data:text/html,<script>x</script>','vbscript:x','mailto:a@b.example','http://evil.example/x','https://user:pw@evil.example/','not a url']){
 const hrefs=ctaHrefs(emailShell({title:'T',cta:{label:'Abrir',href:bad}}));
 assert.equal(hrefs.length,2,'CTA and fallback rendered for '+JSON.stringify(bad));
 for(const href of hrefs)assert.ok(/^https:\/\/[^/"]+\/?$/.test(href)&&!/javascript|data:|vbscript|mailto|evil/i.test(href),'unsafe href falls back to the app origin: '+JSON.stringify(bad)+' -> '+href);
}
assert.equal(emailHref('https://app.scaleparaguay.com/cliente/x?a=1&b=2'),'https://app.scaleparaguay.com/cliente/x?a=1&b=2','https links are kept');
assert.equal(emailHref('http://localhost:3000/x'),'http://localhost:3000/x','http only towards localhost (tests)');
console.log('PASS: every transactional email uses the shared layout (600px tables, preheader, CTA + fallback, logo, text alternative, escaped names)');

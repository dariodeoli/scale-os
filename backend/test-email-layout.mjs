import assert from 'node:assert/strict';
import {EMAIL_TEMPLATE_VERSION,EMAIL_LOGO_URL,EMAIL_COLORS,emailShell,emailHref} from './email-brand.js';
import {invitationEmail,resetEmail,verificationEmail,accessGrantedEmail,destructiveReauthEmail} from './invitation-email.js';
import {trialStartedEmail,suspensionEmail,paymentFailedEmail} from './billing-email.js';
import {notificationEmail} from './notifications.js';
import {clientPortalResetEmail,clientPortalInviteEmail} from './client-portal.js';
import {inquiryEmail} from './platform-inquiries.js';

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
 inquiry:{m:inquiryEmail({inquiry:{id:1,name:evil,company:evil,email:'a@example.invalid',whatsapp:'+595 981123456',message:'<script>x</script>',consent:true},appUrl}),cta:true},
};
assert.equal(EMAIL_TEMPLATE_VERSION,'v3.0.0');
// Contraste WCAG de los tokens: texto ≥4.5:1 sobre su fondo en claro y oscuro.
const lum=h=>{const c=[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255).map(v=>v<=.03928?v/12.92:((v+.055)/1.055)**2.4);return .2126*c[0]+.7152*c[1]+.0722*c[2];};
const ratio=(a,b)=>{const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
for(const [mode,t] of Object.entries(EMAIL_COLORS)){
 for(const fg of ['ink','body','muted','link','accent'])for(const bg of ['card','page','panel'])assert.ok(ratio(t[fg],t[bg])>=4.5,`${mode} ${fg} on ${bg} >= 4.5:1 (${ratio(t[fg],t[bg]).toFixed(2)})`);
 assert.ok(ratio(t.buttonText,t.button)>=4.5,mode+' CTA text >= 4.5:1');
}
assert.equal(EMAIL_COLORS.dark.page,'#141016');assert.equal(EMAIL_COLORS.dark.card,'#1f1a22');assert.equal(EMAIL_COLORS.dark.muted,'#c4bccb');
for(const [name,{m,cta}] of Object.entries(emails)){
 const h=m.html;
 assert.ok(h.startsWith('<!doctype html><html lang="es">'),name+' lang es');
 assert.ok(h.includes(`template-version" content="${EMAIL_TEMPLATE_VERSION}"`),name+' shared layout');
 assert.ok(h.includes('<meta name="color-scheme" content="light dark">')&&h.includes('<meta name="supported-color-schemes" content="light dark">')&&h.includes(':root{color-scheme:light dark'),name+' color-scheme light+dark');
 assert.ok(h.includes('@media (prefers-color-scheme: dark){')&&h.includes(`.sx-card{background-color:${EMAIL_COLORS.dark.card}!important`)&&h.includes(`.sx-muted{color:${EMAIL_COLORS.dark.muted}!important}`),name+' dark media query');
 assert.ok(h.includes('[data-ogsc] .sx-ink')&&h.includes('[data-ogsb] .sx-card'),name+' Outlook.com dark hooks');
 // Un solo encabezado: sin banda ciruela, una sola fila de marca y un solo título.
 assert.ok(!h.includes('#31003c')&&!h.includes('sx-head')&&!/text-transform:uppercase/.test(h),name+' no plum header band / eyebrow');
 assert.equal((h.match(/<img /g)||[]).length,1,name+' single logo');
 assert.equal((h.match(/>Scale OS</g)||[]).length,1,name+' brand wordmark once');
 assert.equal((h.match(/<h1/g)||[]).length,1,name+' single title');
 assert.ok(h.indexOf('<img ')<h.indexOf('<h1'),name+' brand row above title');
 // Legibilidad: cuerpo 16px/1.6, título 24px, secundario ≥14px.
 assert.ok(h.includes('font-size:16px;line-height:1.6')&&/<h1[^>]*font-size:24px/.test(h),name+' readable type scale');
 assert.ok(![...h.matchAll(/font-size:(\d+)px/g)].some(m=>+m[1]>1&&+m[1]<14),name+' no text under 14px');
 assert.ok(h.includes('max-width:600px')&&h.includes('role="presentation"'),name+' 600px table layout');
 assert.ok(h.includes(`<img src="${EMAIL_LOGO_URL}"`)&&h.includes('alt="Scale OS"'),name+' brand logo');
 assert.ok(/display:none[^"]*mso-hide:all">[^<]+/.test(h),name+' hidden preheader');
 assert.ok(h.includes('class="sx-card" style="padding:40px')&&h.includes('.sx-card{padding:24px 20px!important}'),name+' padding scale (40px desktop / 20-24px mobile)');
 assert.ok(!/<script|<iframe|<main/.test(h),name+' no unsafe/legacy markup');
 assert.ok(/<h1[^>]*>/.test(h),name+' heading');
 assert.ok(typeof m.text==='string'&&m.text.length>20&&m.text.includes('Owncoding'),name+' text alternative');
 assert.ok(!h.includes('<b>')&&!h.includes('<i>x'),name+' user markup is not injected');
 if(cta){
  assert.ok(/<a href="[^"]+" target="_blank" class="sx-btn" style="[^"]*padding:14px 32px[^"]*font-size:16px[^"]*line-height:20px/.test(h),name+' bulletproof CTA (48px)');
  assert.ok(h.includes('.sx-cta{width:100%!important}')&&h.includes('.sx-btn{display:block!important'),name+' CTA full width on mobile');
  assert.ok(h.includes('Si el botón no funciona'),name+' fallback link');
  assert.equal((h.match(/Si el botón no funciona[^]*?<a href="([^"]+)"/)||[])[1],(h.match(/<a href="([^"]+)" target="_blank"/)||[])[1],name+' fallback equals CTA');
 }else{
  assert.ok(h.includes('monospace')&&h.includes('font-size:32px')&&h.includes('letter-spacing:8px')&&h.includes('12345678'),name+' code is large monospaced');
 }
}
for(const name of ['invitation','access','trial','suspension','failed','notification','portalInvite','inquiry'])assert.ok(emails[name].m.html.includes('Agencia &lt;b&gt;&amp;&quot;x&quot;&lt;/b&gt;'),name+' escapes interpolated names');
assert.ok(emails.portalInvite.m.html.includes('a=1&amp;b=2'),'hrefs escaped once');
assert.ok(!emailShell({title:'T',lead:'L'}).includes('Si el botón no funciona'),'no CTA, no fallback');
assert.ok(emailShell({title:'T',preheader:'P'}).includes('>P&nbsp;'),'explicit preheader');
assert.ok(emailShell({title:'T',eyebrow:'Portal del cliente'}).includes('>Scale OS</span><span class="sx-muted" style="color:#5f5666"> · Portal del cliente</span>'),'context folds into the brand row');
assert.ok(!emailShell({title:'T',eyebrow:'Scale OS'}).includes(' · Scale OS'),'brand is not repeated as context');
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
console.log('PASS: every transactional email uses the shared v3 layout (single header, light+dark, contrast >=4.5:1, 600px tables, preheader, CTA + fallback, logo, text alternative, escaped names)');

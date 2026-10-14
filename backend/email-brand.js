// Shared branded email layout. Template version v2.0.0: único layout para todos
// los correos (tablas + estilos en línea, 600px, preheader oculto, CTA con botón
// a prueba de clientes y enlace de respaldo). Todo dato dinámico se escapa acá.
export const EMAIL_TEMPLATE_VERSION='v2.0.0';
// Mismo activo de marca que sirve la app (public/brand/icon-512.png en APP_URL).
export const EMAIL_LOGO_URL=`${(process.env.APP_URL||'https://app.scaleparaguay.com').replace(/\/$/,'')}/brand/icon-512.png`;
// Origen de respaldo para enlaces: el de APP_URL (o el público de la app).
const LOCAL_HOSTS=['localhost','127.0.0.1'];
const APP_ORIGIN=(()=>{try{const u=new URL(process.env.APP_URL||'');if(u.protocol==='https:'||(u.protocol==='http:'&&LOCAL_HOSTS.includes(u.hostname)))return u.origin;}catch{/* APP_URL ausente o inválida */}return 'https://app.scaleparaguay.com';})();
// El botón y el enlace de respaldo solo admiten https: (http: únicamente hacia localhost,
// para pruebas) y sin credenciales; cualquier otro esquema (javascript:, data:, mailto:…)
// o una URL inválida cae al origen de la app en vez de llegar al correo.
export const emailHref=value=>{
 try{
  const u=new URL(String(value??'').trim());
  const local=u.protocol==='http:'&&LOCAL_HOSTS.includes(u.hostname);
  if((u.protocol==='https:'||local)&&u.hostname&&!u.username&&!u.password)return u.href;
 }catch{/* URL inválida */}
 return APP_ORIGIN;
};
export const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const line=value=>String(value??'').replace(/[\u0000-\u001f\u007f\u2028\u2029]/g,' ').trim();

const FONT="font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const BRAND='#7a1f8f',INK='#251c29',BODY='#3f3745',MUTED='#6b6270',RULE='#e8e3ea';

// Párrafo de cuerpo (texto escapado). Usar para contenido adicional al lead.
export const emailParagraph=text=>`<p style="margin:0 0 16px;${FONT};font-size:15px;line-height:1.6;color:${BODY}">${escape(text)}</p>`;

// Ficha de datos clave/valor (claves fijas del template, valores escapados).
export const emailFacts=rows=>`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;border:1px solid ${RULE};border-radius:8px;background-color:#f9f6fb"><tr><td style="padding:16px 20px">${rows.map(([k,v],i)=>`<p style="margin:${i?'8px':'0'} 0 0;${FONT};font-size:14px;line-height:1.5;color:${BODY}"><strong style="color:#4d065b">${escape(k)}:</strong> ${escape(v)}</p>`).join('')}</td></tr></table>`;

// Código de un solo uso: grande, monoespaciado y espaciado.
export const emailCode=code=>`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 8px"><tr><td align="center" style="padding:20px 16px;border:1px solid ${RULE};border-radius:8px;background-color:#f9f6fb;font-family:'SFMono-Regular',Menlo,Consolas,'Courier New',monospace;font-size:32px;line-height:1.2;font-weight:bold;letter-spacing:8px;color:#4d065b">${escape(code)}</td></tr></table>`;

export function emailShell({eyebrow='Scale OS',title='',lead='',body='',cta=null,footer='',footerNote='',preheader=''}){
 const safeEyebrow=escape(line(eyebrow));
 const safeTitle=escape(line(title));
 const safeLead=escape(lead);
 const safePreheader=escape(line(preheader||lead||title).slice(0,140));
 const href=cta?.label&&cta?.href?escape(emailHref(cta.href)):'';
 const ctaBlock=href
  ?`<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:8px auto 0"><tr><td align="center" bgcolor="${BRAND}" style="border-radius:8px;background-color:${BRAND}"><a href="${href}" target="_blank" style="display:inline-block;padding:14px 32px;border-radius:8px;background-color:${BRAND};color:#ffffff;${FONT};font-size:16px;line-height:20px;font-weight:bold;text-decoration:none">${escape(cta.label)}</a></td></tr></table>`+
   `<p style="margin:16px 0 0;text-align:center;${FONT};font-size:13px;line-height:1.5;color:${MUTED};word-break:break-all">Si el botón no funciona, copiá y pegá esta dirección en tu navegador:<br><a href="${href}" style="color:${BRAND};text-decoration:underline">${href}</a></p>`
  :'';
 const safeFooter=escape(line(footer));
 const safeFooterNote=escape(line(footerNote));
 return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light dark"><meta name="supported-color-schemes" content="light dark"><meta name="template-version" content="${EMAIL_TEMPLATE_VERSION}"><title>${safeTitle}</title><style>@media only screen and (max-width:620px){.sx-outer{padding:16px!important}.sx-card{padding:24px!important}.sx-head{padding:16px 24px!important}.sx-title{font-size:22px!important}}</style></head><body style="margin:0;padding:0;background-color:#f4f2f5;color:${INK};${FONT}">`+
  `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;font-size:1px;line-height:1px;mso-hide:all">${safePreheader}${'&nbsp;&zwnj;'.repeat(40)}</div>`+
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f2f5"><tr><td align="center" class="sx-outer" style="padding:32px">`+
  `<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px">`+
  `<tr><td class="sx-head" style="padding:20px 40px;background-color:#31003c;border-radius:12px 12px 0 0"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding-right:12px;vertical-align:middle"><img src="${EMAIL_LOGO_URL}" width="36" height="36" alt="Scale OS" style="display:block;border:0;border-radius:8px"></td><td style="vertical-align:middle;${FONT};font-size:12px;line-height:1.3;font-weight:bold;letter-spacing:2px;text-transform:uppercase;color:#f7acff">${safeEyebrow}</td></tr></table></td></tr>`+
  `<tr><td class="sx-card" style="padding:40px;background-color:#ffffff;border:1px solid ${RULE};border-top:0;border-radius:0 0 12px 12px">`+
  `<h1 class="sx-title" style="margin:0 0 16px;${FONT};font-size:26px;line-height:1.3;font-weight:bold;color:${INK}">${safeTitle}</h1>`+
  `${safeLead?`<p style="margin:0 0 24px;${FONT};font-size:16px;line-height:1.6;color:${BODY}">${safeLead}</p>`:''}${body}${ctaBlock}`+
  `${safeFooter?`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:32px 0 0"><tr><td style="border-top:1px solid ${RULE};padding-top:20px;${FONT};font-size:13px;line-height:1.6;color:${MUTED}">${safeFooter}</td></tr></table>`:''}`+
  `</td></tr>`+
  `<tr><td align="center" style="padding:24px 16px 0;${FONT};font-size:12px;line-height:1.6;color:${MUTED}">${safeFooterNote}</td></tr>`+
  `</table></td></tr></table></body></html>`;
}

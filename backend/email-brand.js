// Shared branded email layout. Template version v3.0.0: único layout para todos
// los correos (tablas + estilos en línea, 600px, preheader oculto, CTA con botón
// a prueba de clientes y enlace de respaldo). Todo dato dinámico se escapa acá.
// v3: un solo encabezado (fila de marca compacta + título, sin banda de color),
// claro/oscuro (estilos en línea = claro; `prefers-color-scheme` y los ganchos
// de Outlook.com `[data-ogsc]`/`[data-ogsb]` = oscuro) y contraste ≥4.5:1.
export const EMAIL_TEMPLATE_VERSION='v3.0.0';
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
const MONO="font-family:'SFMono-Regular',Menlo,Consolas,'Courier New',monospace";
// Tokens de color. Claro = estilos en línea (también lo que invierte Gmail);
// oscuro = overrides por clase. Contraste medido (WCAG): texto secundario
// 6.98:1 claro / 9.28:1 oscuro; botón blanco sobre marca 6.79:1 / 5.82:1.
export const EMAIL_COLORS={
 light:{page:'#f4f2f5',card:'#ffffff',ink:'#1f1724',body:'#3a3240',muted:'#5f5666',rule:'#e4dee7',panel:'#f8f5fa',accent:'#4d065b',link:'#7a1f8f',button:'#8e2fa4',buttonText:'#ffffff',logo:'#4d065b'},
 dark:{page:'#141016',card:'#1f1a22',ink:'#f3eef5',body:'#e4dce8',muted:'#c4bccb',rule:'#3a3240',panel:'#2a232e',accent:'#e2a8ff',link:'#e2a8ff',button:'#9a3ab0',buttonText:'#ffffff',logo:'#4d065b'},
};
const C=EMAIL_COLORS.light,D=EMAIL_COLORS.dark;

// Overrides de modo oscuro por clase (Apple Mail, iOS, Outlook app, Thunderbird…)
// y los mismos para Outlook.com, que marca el correo con data-ogsc/data-ogsb.
const darkRules=pre=>[
 `${pre}.sx-page{background-color:${D.page}!important}`,
 `${pre}.sx-card{background-color:${D.card}!important;border-color:${D.rule}!important}`,
 `${pre}.sx-ink{color:${D.ink}!important}`,
 `${pre}.sx-body{color:${D.body}!important}`,
 `${pre}.sx-muted{color:${D.muted}!important}`,
 `${pre}.sx-rule{border-color:${D.rule}!important}`,
 `${pre}.sx-panel{background-color:${D.panel}!important;border-color:${D.rule}!important}`,
 `${pre}.sx-accent{color:${D.accent}!important}`,
 `${pre}.sx-link{color:${D.link}!important}`,
 `${pre}.sx-btn-bg{background-color:${D.button}!important}`,
 `${pre}.sx-btn{background-color:${D.button}!important;color:${D.buttonText}!important}`,
].join('');
const STYLE=':root{color-scheme:light dark;supported-color-schemes:light dark}'+
 'body{margin:0;padding:0;-webkit-text-size-adjust:100%}'+
 `@media (prefers-color-scheme: dark){${darkRules('')}}`+
 // Outlook.com: data-ogsc = color de texto, data-ogsb = fondo.
 `[data-ogsc] .sx-ink{color:${D.ink}!important}[data-ogsc] .sx-body{color:${D.body}!important}[data-ogsc] .sx-muted{color:${D.muted}!important}[data-ogsc] .sx-accent,[data-ogsc] .sx-link{color:${D.link}!important}[data-ogsc] .sx-btn{color:${D.buttonText}!important}`+
 `[data-ogsb] .sx-page{background-color:${D.page}!important}[data-ogsb] .sx-card{background-color:${D.card}!important}[data-ogsb] .sx-panel{background-color:${D.panel}!important}[data-ogsb] .sx-btn,[data-ogsb] .sx-btn-bg{background-color:${D.button}!important}`+
 '@media only screen and (max-width:620px){.sx-outer{padding:12px!important}.sx-card{padding:24px 20px!important}.sx-title{font-size:22px!important}.sx-code{font-size:28px!important;letter-spacing:6px!important}.sx-cta{width:100%!important}.sx-btn{display:block!important;padding:14px 16px!important}}';

// Párrafo de cuerpo (texto escapado). Usar para contenido adicional al lead.
export const emailParagraph=text=>`<p class="sx-body" style="margin:0 0 16px;${FONT};font-size:16px;line-height:1.6;color:${C.body}">${escape(text)}</p>`;

// Ficha de datos clave/valor (claves fijas del template, valores escapados).
export const emailFacts=rows=>`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="sx-panel" style="margin:0 0 24px;border:1px solid ${C.rule};border-radius:8px;background-color:${C.panel}"><tr><td style="padding:16px 20px">${rows.map(([k,v],i)=>`<p class="sx-body" style="margin:${i?'8px':'0'} 0 0;${FONT};font-size:15px;line-height:1.5;color:${C.body}"><strong class="sx-accent" style="color:${C.accent}">${escape(k)}:</strong> ${escape(v)}</p>`).join('')}</td></tr></table>`;

// Código de un solo uso: grande, monoespaciado y espaciado.
export const emailCode=code=>`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 8px"><tr><td align="center" class="sx-panel sx-accent sx-code" style="padding:20px 16px;border:1px solid ${C.rule};border-radius:8px;background-color:${C.panel};${MONO};font-size:32px;line-height:1.2;font-weight:bold;letter-spacing:8px;color:${C.accent}">${escape(code)}</td></tr></table>`;

// Fila de marca: el ícono sobre su propio cuadrado ciruela (se lee en fondo claro
// y oscuro) + «Scale OS»; el contexto (empresa, portal…) va en la misma fila.
const brandRow=context=>`<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px"><tr>`+
 `<td width="32" height="32" bgcolor="${C.logo}" style="width:32px;height:32px;border-radius:8px;background-color:${C.logo};vertical-align:middle"><img src="${EMAIL_LOGO_URL}" width="32" height="32" alt="Scale OS" style="display:block;width:32px;height:32px;border:0;border-radius:8px"></td>`+
 `<td style="padding-left:10px;vertical-align:middle;${FONT};font-size:16px;line-height:1.3"><span class="sx-ink" style="font-weight:bold;color:${C.ink}">Scale OS</span>${context?`<span class="sx-muted" style="color:${C.muted}"> · ${context}</span>`:''}</td>`+
 `</tr></table>`;

export function emailShell({eyebrow='',title='',lead='',body='',cta=null,footer='',footerNote='',preheader=''}){
 const context=line(eyebrow);
 // «Scale OS» ya está en la fila de marca: no se repite como contexto.
 const safeContext=/^scale os$/i.test(context)?'':escape(context);
 const safeTitle=escape(line(title));
 const safeLead=escape(lead);
 const safePreheader=escape(line(preheader||lead||title).slice(0,140));
 const href=cta?.label&&cta?.href?escape(emailHref(cta.href)):'';
 const ctaBlock=href
  ?`<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" class="sx-cta" style="margin:8px auto 0"><tr><td align="center" bgcolor="${C.button}" class="sx-btn-bg" style="border-radius:8px;background-color:${C.button}"><a href="${href}" target="_blank" class="sx-btn" style="display:inline-block;padding:14px 32px;border-radius:8px;background-color:${C.button};color:${C.buttonText};${FONT};font-size:16px;line-height:20px;font-weight:bold;text-decoration:none;text-align:center">${escape(cta.label)}</a></td></tr></table>`+
   `<p class="sx-muted" style="margin:20px 0 0;text-align:center;${FONT};font-size:14px;line-height:1.5;color:${C.muted};word-break:break-all">Si el botón no funciona, copiá y pegá esta dirección en tu navegador:<br><a href="${href}" class="sx-link" style="color:${C.link};text-decoration:underline">${href}</a></p>`
  :'';
 const safeFooter=escape(line(footer));
 const safeFooterNote=escape(line(footerNote));
 return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light dark"><meta name="supported-color-schemes" content="light dark"><meta name="template-version" content="${EMAIL_TEMPLATE_VERSION}"><title>${safeTitle}</title><style>${STYLE}</style></head><body class="sx-page" style="margin:0;padding:0;background-color:${C.page};color:${C.ink};${FONT}">`+
  `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;font-size:1px;line-height:1px;mso-hide:all">${safePreheader}${'&nbsp;&zwnj;'.repeat(40)}</div>`+
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="sx-page" style="background-color:${C.page}"><tr><td align="center" class="sx-outer" style="padding:32px 16px">`+
  `<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px">`+
  `<tr><td class="sx-card" style="padding:40px;background-color:${C.card};border:1px solid ${C.rule};border-radius:12px">`+
  brandRow(safeContext)+
  `<h1 class="sx-title sx-ink" style="margin:0 0 16px;${FONT};font-size:24px;line-height:1.3;font-weight:bold;color:${C.ink}">${safeTitle}</h1>`+
  `${safeLead?`<p class="sx-body" style="margin:0 0 24px;${FONT};font-size:16px;line-height:1.6;color:${C.body}">${safeLead}</p>`:''}${body}${ctaBlock}`+
  `${safeFooter?`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:32px 0 0"><tr><td class="sx-rule sx-muted" style="border-top:1px solid ${C.rule};padding-top:20px;${FONT};font-size:14px;line-height:1.6;color:${C.muted}">${safeFooter}</td></tr></table>`:''}`+
  `</td></tr>`+
  `${safeFooterNote?`<tr><td align="center" class="sx-muted" style="padding:20px 16px 0;${FONT};font-size:14px;line-height:1.6;color:${C.muted}">${safeFooterNote}</td></tr>`:''}`+
  `</table></td></tr></table></body></html>`;
}

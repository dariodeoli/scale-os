import type {Metadata} from 'next';
import {AccessLayout} from '../access-layout';
import {PRIVACY_NOTICE,PRIVACY_NOTICE_PATH,PRIVACY_RIGHTS_CHANNEL,PRIVACY_SECTIONS,type PrivacyNoticeState} from '../privacy-notice';

export const metadata:Metadata={
 title:'Política de Privacidad',
 description:'Aviso de Privacidad versionado de Scale OS: finalidades, derechos del titular y canales de contacto (Ley N° 7593/2025).',
 // La política pública vive en el host del sitio (sistema); el resto de los
 // hosts la sirven sólo como referencia interna sin indexar (middleware).
 alternates:{canonical:'https://sistema.scaleparaguay.com/privacidad'},
 openGraph:{type:'article',url:'https://sistema.scaleparaguay.com/privacidad',title:'Política de Privacidad · Scale OS',description:'Finalidades, derechos del titular y canales de contacto (Ley N° 7593/2025).'},
};

const STATE_LABEL:Record<PrivacyNoticeState,string>={revision:'Texto en revisión del responsable',aprobado:'Versión aprobada por el responsable'};
const STATE_CLASS:Record<PrivacyNoticeState,string>={revision:'border-warn/40 text-warn',aprobado:'border-ok/40 text-ok'};

// Política de Privacidad pública y versionada (Ley N° 7593/2025, Refs #113).
// El cuerpo sale de `app/privacy-notice.ts` (fuente única); el texto final lo
// aprueba el dueño y el estado visible lo declara. Sin datos personales en la
// URL y sin scripts: sólo lectura.
export default function PrivacyPolicyPage(){
 const notice=PRIVACY_NOTICE;
 return <AccessLayout wide eyebrow="Ley N° 7593/2025 · Protección de datos personales">
  <header className="grid gap-2">
   <h1 className="text-2xl font-bold tracking-tight text-fore">Política de Privacidad</h1>
   <p className="flex flex-wrap items-center gap-2 text-xs text-mute">
    <span className={`inline-flex w-fit items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[.08em] ${STATE_CLASS[notice.estado]}`}>Aviso {notice.version} · {notice.fechaLabel}</span>
    <span className={`inline-flex w-fit items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[.08em] ${STATE_CLASS[notice.estado]}`}>{STATE_LABEL[notice.estado]}</span>
   </p>
   <p className="max-w-prose text-sm text-mute">Este aviso explica en lenguaje claro qué datos personales tratamos en {notice.producto}, para qué, con quién se comparten, cuánto los conservamos y cómo ejercer tus derechos. Está versionado: al aceptar una finalidad guardamos la versión vigente.</p>
  </header>
  <nav aria-label="Secciones del aviso" className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
   {PRIVACY_SECTIONS.map(section=><a key={section.id} className="text-fono-dark hover:underline" href={`#${section.id}`}>{section.title}</a>)}
  </nav>
  <div className="grid gap-5">
   {PRIVACY_SECTIONS.map(section=><section key={section.id} id={section.id} aria-labelledby={`${section.id}-title`} className="grid gap-2 border-t border-ink-600 pt-4">
    <h2 id={`${section.id}-title`} className="text-[15px] font-semibold text-fore">{section.title}</h2>
    {section.paragraphs.map((paragraph,index)=><p key={index} className="max-w-prose text-[13px] leading-relaxed text-mute">{paragraph}</p>)}
    {section.items?<ul className="grid list-disc gap-1 pl-5 text-[13px] leading-relaxed text-mute">{section.items.map((item,index)=><li key={index}>{item}</li>)}</ul>:null}
    {section.id==='derechos'?<RightsChannel/>:null}
   </section>)}
  </div>
  <p className="border-t border-ink-600 pt-4 text-[11.5px] text-mute">
   Ruta pública permanente: <a className="text-fono-dark hover:underline" href={PRIVACY_NOTICE_PATH}>{PRIVACY_NOTICE_PATH}</a>. La versión vigente y su fecha se muestran arriba; las versiones anteriores se conservan y se entregan por el canal de derechos.
  </p>
 </AccessLayout>;
}

/** Canal de derechos visible: WhatsApp publicado + formulario alternativo. */
function RightsChannel(){
 const channel=PRIVACY_RIGHTS_CHANNEL;
 return <div className="grid gap-2 rounded-lg border border-ink-600 bg-ink-900/40 p-3" data-testid="canal-derechos">
  <strong className="text-[12.5px] text-fore">Canal de derechos · respuesta dentro de {channel.slaDias} días corridos</strong>
  <div className="flex flex-wrap items-center gap-2 text-xs">
   <a className="secondary" href={channel.whatsappUrl} target="_blank" rel="noopener noreferrer">{channel.whatsappLabel}</a>
   <a className="secondary" href={channel.contactFormUrl} target="_blank" rel="noopener noreferrer">{channel.contactFormLabel}</a>
  </div>
  <p className="text-[11.5px] text-mute">Si ya tenés cuenta, «Mis datos» en tu perfil inicia el pedido y muestra el estado con su vencimiento.</p>
 </div>;
}

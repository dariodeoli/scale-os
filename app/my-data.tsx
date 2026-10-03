"use client";
import {useEffect,useState} from 'react';
import {AlertTriangle,Download} from 'lucide-react';
import {StateChip,ErrorBlock,LoadingBlock} from './ui-v2';
import {listDateFull,dueTone} from './list-format';
import {Dialog} from './dialog';
import {notify} from './feedback';
import {PRIVACY_NOTICE,PRIVACY_PURPOSES,PRIVACY_RIGHTS_CHANNEL,type PrivacyPurpose} from './privacy-notice';
import {PrivacyApiUnavailableError,loadPrivacyData,pendingPrivacyConsents,requestPrivacyAction,revokePrivacyConsent,type PrivacyConsent,type PrivacyData,type PrivacyRequest,type PrivacyRequestKind,type PrivacyRequestStatus} from './privacy-data';

/**
 * «Mis datos» (Ley N° 7593/2025, Refs #113): zona visible de privacidad del
 * titular. Reúne el resumen de datos y finalidades, la descarga de una copia,
 * los pedidos de derechos (acceso, rectificación, supresión, oposición) con su
 * estado y SLA, y la revocación de consentimientos.
 *
 * Sin la base del API (#112) la vista cae al puente local documentado: muestra
 * sólo registros reales (los guardados en este dispositivo) y el canal de
 * derechos; nunca simula pedidos, estados ni exportaciones.
 */

type ProfileData = {email:string;full_name?:string|null};

const CARD='grid gap-2 rounded-xl border border-ink-600 bg-ink-800 p-3';
const KICKER='font-mono text-[10px] uppercase tracking-[.13em] text-mute';
const ACTION='min-h-11 md:min-h-9';
const REQUEST_TYPES:Array<{value:PrivacyRequestKind;label:string}>=[
 {value:'acceso',label:'Acceso y copia de mis datos'},
 {value:'rectificacion',label:'Rectificación de un dato inexacto'},
 {value:'supresion',label:'Supresión de datos'},
 {value:'oposicion',label:'Oposición a un tratamiento'},
];
const STATUS_LABEL:Record<PrivacyRequestStatus,string>={recibida:'Recibida',identidad:'Verificando identidad',resuelta:'Resuelta',rechazada:'Rechazada'};
const STATUS_TONE:Record<PrivacyRequestStatus,'ok'|'warn'|'mute'|'bad'|'info'>={recibida:'info',identidad:'warn',resuelta:'ok',rechazada:'bad'};
const TYPE_LABEL:Record<PrivacyRequestKind,string>={acceso:'Acceso',rectificacion:'Rectificación',supresion:'Supresión',oposicion:'Oposición',portabilidad:'Portabilidad'};

/** Días corridos restantes hasta el vencimiento del SLA (≤30 días). */
function slaLabel(due:string):{label:string;vencido:boolean}{
 const target=new Date(due);
 if(Number.isNaN(target.getTime()))return {label:'Sin vencimiento informado',vencido:false};
 const days=Math.ceil((target.getTime()-Date.now())/86400000);
 if(days<0)return {label:`Venció hace ${Math.abs(days)} día${Math.abs(days)===1?'':'s'}`,vencido:true};
 if(days===0)return {label:'Vence hoy',vencido:true};
 return {label:`Vence en ${days} día${days===1?'':'s'}`,vencido:false};
}

function ConsentState({consent}:{consent:PrivacyConsent|undefined}){
 if(!consent)return <StateChip tone="mute">Sin registro accesible</StateChip>;
 if(!consent.aceptado)return <StateChip tone="warn">Revocado {listDateFull(consent.fecha,'')}</StateChip>;
 return <StateChip tone="ok">Aceptado {consent.version} · {listDateFull(consent.fecha,'')}</StateChip>;
}

export function MyDataPanel({profile,close}:{profile:ProfileData;close:()=>void}){
 const [data,setData]=useState<PrivacyData|null>(null),[error,setError]=useState(''),[retry,setRetry]=useState(0);
 const [requestType,setRequestType]=useState<PrivacyRequestKind|null>(null),[revoking,setRevoking]=useState<string>('');
 useEffect(()=>{
  let alive=true;setError('');
  void loadPrivacyData().then(value=>{if(alive)setData(value);}).catch(cause=>{if(alive)setError(cause instanceof Error?cause.message:'No se pudo consultar tus datos.');});
  return()=>{alive=false;};
 },[retry]);
 const latest=(purpose:string)=>data?.consents.slice().reverse().find(consent=>consent.finalidad===purpose);
 const revoke=async(purpose:PrivacyPurpose)=>{
  setRevoking(purpose.id);
  try{
   const result=await revokePrivacyConsent(purpose.id,false);
   notify({tone:'success',message:'Consentimiento revocado. Dejamos de tratar ese dato para esa finalidad.'});
   if(result==='local')notify({tone:'warning',message:'La base del API está pendiente; el registro quedó en este dispositivo.'});
   setRetry(value=>value+1);
  }catch(cause){notify({tone:'error',message:cause instanceof Error?cause.message:'No se pudo revocar el consentimiento.'});}
  finally{setRevoking('');}
 };
 const addRequest=(request:PrivacyRequest)=>setData(current=>current?{...current,requests:[request,...current.requests]}:current);
 const bridge=data?.source==='bridge';
 return <Dialog variant="drawer" title={`Mis datos · ${PRIVACY_NOTICE.version}`} close={close}>
  <div className="grid gap-4">
   <section className={CARD} aria-labelledby="my-data-summary">
    <p id="my-data-summary" className={KICKER}>Resumen y finalidades</p>
    <p className="text-[13px] leading-relaxed text-mute">Estos son los datos de tu cuenta y las finalidades con las que los tratamos. El detalle completo, con conservación y destinatarios, está en el <a className="text-fono-dark hover:underline" href="/privacidad">Aviso de Privacidad {PRIVACY_NOTICE.version}</a> ({PRIVACY_NOTICE.fechaLabel}).</p>
    <dl className="grid gap-1 text-[13px]">
     <div className="flex flex-wrap items-center gap-x-2"><dt className="font-semibold text-fore">Correo de la cuenta</dt><dd className="break-all text-mute">{profile.email}</dd></div>
     {profile.full_name?<div className="flex flex-wrap items-center gap-x-2"><dt className="font-semibold text-fore">Nombre</dt><dd className="text-mute">{profile.full_name}</dd></div>:null}
    </dl>
    <ul className="grid gap-2">
     {PRIVACY_PURPOSES.map(purpose=><li key={purpose.id} className="grid gap-1 rounded-lg border border-ink-600 px-3 py-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
       <strong className="text-[13px] text-fore">{purpose.label}{purpose.esencial?null:<span className="ml-2 text-[11px] font-normal text-mute">Opcional</span>}</strong>
       <ConsentState consent={latest(purpose.id)}/>
      </div>
      <p className="text-[11.5px] leading-5 text-mute">{purpose.detalle}</p>
      {latest(purpose.id)?.aceptado?<button type="button" className={`text-button w-fit ${ACTION}`} disabled={revoking===purpose.id} onClick={()=>void revoke(purpose)}>{revoking===purpose.id?'Revocando…':'Revocar este consentimiento'}</button>:null}
     </li>)}
    </ul>
   </section>
   {bridge?<section aria-label="Estado de la base de solicitudes" className="grid gap-2 rounded-xl border border-warn/40 bg-warn/10 p-3">
    <p className="flex items-center gap-2 text-[13px] font-semibold text-fore"><AlertTriangle size={15} aria-hidden="true"/>Base de solicitudes en preparación</p>
    <p className="text-[12px] leading-5 text-mute">El registro completo en el servidor, los estados y los vencimientos llegan con la base técnica pendiente (Refs #112). Mientras tanto ves únicamente lo registrado de verdad en este dispositivo y podés ejercer tus derechos por el canal alternativo.</p>
    <RightsLinks/>
   </section>:null}
   <section className={CARD} aria-labelledby="my-data-rights">
    <p id="my-data-rights" className={KICKER}>Ejercer tus derechos</p>
    <p className="text-[13px] leading-relaxed text-mute">Gratis y sin justificar el pedido. La respuesta llega dentro de {PRIVACY_RIGHTS_CHANNEL.slaDias} días corridos; acá ves el estado y el vencimiento de cada solicitud.</p>
    {bridge?<ul className="grid gap-2" aria-label="Derechos con registro en preparación">
     {REQUEST_TYPES.map(type=><li key={type.value} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-lg border border-ink-600 px-3 py-2">
      <span className="text-[13px] text-mute">{type.label}</span>
      <StateChip tone="mute">Próximamente</StateChip>
     </li>)}
    </ul>:<div className="flex flex-wrap gap-2">
     {REQUEST_TYPES.map(type=><button key={type.value} type="button" className={`secondary ${ACTION}`} onClick={()=>setRequestType(type.value)}>{type.label}</button>)}
    </div>}
    {bridge?<p className="text-[11.5px] leading-5 text-mute">Mientras la base técnica esté pendiente, estos pedidos se registran por el canal alternativo de arriba: el equipo los carga y podés seguirlos con tu referencia.</p>:null}
    {data?.exportPath?<a className={`secondary w-fit ${ACTION}`} href={`/core-api${data.exportPath}`}><Download size={15} aria-hidden="true"/>Descargar copia de mis datos</a>:<p className="text-[11.5px] text-mute">{bridge?'La descarga en autoservicio se habilita con la base del API; pedila por el canal alternativo y el equipo la prepara.':'Sin descarga disponible por ahora.'}</p>}
    {data&&data.requests.length?<ul className="grid gap-2" aria-label="Solicitudes registradas">
     {data.requests.map(request=>{const sla=slaLabel(request.due_at);return <li key={request.id} className="grid gap-1 rounded-lg border border-ink-600 px-3 py-2">
      <div className="flex flex-wrap items-center justify-between gap-2"><strong className="text-[13px] text-fore">{TYPE_LABEL[request.tipo]}</strong><StateChip tone={STATUS_TONE[request.estado]}>{STATUS_LABEL[request.estado]}</StateChip></div>
      <span className="text-[11.5px] text-mute">Recibida {listDateFull(request.created_at,'sin fecha')} · <span data-tone={sla.vencido||dueTone(request.due_at,7)?'warn':undefined}>{sla.label}</span></span>
      {request.motivo?<span className="text-[11.5px] text-mute">Motivo: {request.motivo}</span>:null}
     </li>;})}
    </ul>:<p className="text-[11.5px] text-mute">{bridge?'Todavía no hay solicitudes registradas en el servidor.':'No tenés solicitudes registradas.'}</p>}
   </section>
   {error?<ErrorBlock title="No pudimos cargar tus datos" description={error} onRetry={()=>setRetry(value=>value+1)}/>:null}
   {!data&&!error?<LoadingBlock label="Cargando tus datos…" lines={3}/>:null}
   <p className="text-[11.5px] leading-5 text-mute">¿No podés entrar a tu cuenta o preferís otro medio? <RightsLinks inline/>. Este pedido lo atiende {PRIVACY_NOTICE.responsable}.</p>
  </div>
  {requestType?<RequestDialog type={requestType} close={()=>setRequestType(null)} onCreated={request=>{addRequest(request);setRequestType(null);}}/>:null}
 </Dialog>;
}

function RightsLinks({inline=false}:{inline?:boolean}){
 return <span className={inline?'':'flex flex-wrap gap-2'}>
  <a className={inline?'text-fono-dark hover:underline':`secondary ${ACTION}`} href={PRIVACY_RIGHTS_CHANNEL.whatsappUrl} target="_blank" rel="noopener noreferrer">{PRIVACY_RIGHTS_CHANNEL.whatsappLabel}</a>
  {inline?<span aria-hidden="true"> · </span>:null}
  <a className={inline?'text-fono-dark hover:underline':`secondary ${ACTION}`} href={PRIVACY_RIGHTS_CHANNEL.contactFormUrl} target="_blank" rel="noopener noreferrer">{PRIVACY_RIGHTS_CHANNEL.contactFormLabel}</a>
 </span>;
}

/** Pedido de derechos con confirmación reforzada en la supresión. */
function RequestDialog({type,close,onCreated}:{type:PrivacyRequestKind;close:()=>void;onCreated:(request:PrivacyRequest)=>void}){
 const [detail,setDetail]=useState(''),[confirmation,setConfirmation]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const suppression=type==='supresion';
 const label=TYPE_LABEL[type];
 async function submit(){
  if(suppression&&confirmation.trim()!=='Suprimir'){setError('Escribí «Suprimir» para confirmar el pedido.');return;}
  setBusy(true);setError('');
  try{
   const request=await requestPrivacyAction(type,detail.trim());
   notify({tone:'success',message:`Pedido de ${label.toLowerCase()} registrado.`});
   onCreated(request);
  }catch(cause){
   setError(cause instanceof PrivacyApiUnavailableError
    ?`La base de solicitudes todavía no está desplegada (Refs #112). Mientras tanto, usá el canal alternativo y el equipo registra tu pedido.`
    :cause instanceof Error?cause.message:'No se pudo registrar el pedido.');
  }finally{setBusy(false);}
 }
 return <Dialog title={`Pedir ${label.toLowerCase()}`} close={close} busy={busy} size="compact">
  <div className="grid gap-3">
   {suppression?<p className="rounded-lg border border-warn/40 bg-warn/10 px-3 py-2 text-[12px] leading-5 text-mute">La supresión elimina o anonimiza los datos que ya no sean necesarios. El historial financiero y contable auditable se conserva por obligación fiscal, con acceso restringido y sin otras finalidades. La baja de tu cuenta conserva un período recuperable.</p>:null}
   <label className="grid gap-1.5 text-xs text-mute">Detalle {suppression?'de tu pedido':'o datos a corregir'} <small className="text-mute">Opcional</small>
    <textarea value={detail} onChange={event=>setDetail(event.target.value)} maxLength={2000} rows={3} className="min-h-24 rounded-lg border border-ink-500 bg-ink-800 px-3 py-2 text-base text-fore outline-none transition focus:border-fono focus:ring-1 focus:ring-fono/40 md:text-sm" placeholder={suppression?'Qué datos querés suprimir y por qué':'Qué necesitás corregir'}/>
   </label>
   {suppression?<label className="grid gap-1.5 text-xs text-mute">Escribí <b className="text-fore">Suprimir</b> para confirmar<input value={confirmation} onChange={event=>setConfirmation(event.target.value)} autoComplete="off" className={`${ACTION} h-11 rounded-lg border border-ink-500 bg-ink-800 px-3 text-base text-fore outline-none transition focus:border-fono focus:ring-1 focus:ring-fono/40 md:h-9 md:text-sm`}/></label>:null}
   <p className="text-[11.5px] leading-5 text-mute">La respuesta llega dentro de {PRIVACY_RIGHTS_CHANNEL.slaDias} días corridos y vas a ver el estado en «Mis datos».</p>
   <div className="flex flex-wrap items-center gap-2">
    <button type="button" className={`primary ${ACTION}`} disabled={busy} onClick={()=>void submit()}>{busy?'Enviando…':`Enviar pedido de ${label.toLowerCase()}`}</button>
    <button type="button" className={`secondary ${ACTION}`} disabled={busy} onClick={close}>Cancelar</button>
   </div>
   {error?<p role="alert" className="error">{error}</p>:null}
   {error?<RightsLinks/>:null}
  </div>
 </Dialog>;
}

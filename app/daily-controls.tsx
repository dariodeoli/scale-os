"use client";
import {ActorIdentity} from './actor-identity';
import {SaveActions} from './save-actions';
import {completeSave} from './save-completion';
import {useRef,useState,type FormEvent} from 'react';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {api,Dialog,Editor,money} from './operations';
import {EmailField} from './email-field';
import {SelectCustom,AmountInput} from './profile-controls';
import {parseStatementCsv} from './statement-csv';
import {Copy,Eye,Link2,Link2Off,Undo2,Unlink} from 'lucide-react';
type Account={id:string;name:string;currency:string;active:boolean};
type Row={id:string;[key:string]:unknown};
const str=(r:Row,k:string)=>String(r[k]??'');
const errorText=(e:unknown)=>e instanceof Error?e.message:'No se pudo completar';
export function FXTransferForm({accounts,done}:{accounts:Account[];done:()=>void|Promise<void>}){
 const schema=z.object({fromAccountId:z.string().min(1),toAccountId:z.string().min(1),amount:z.string().refine(v=>Number(v)>0),receivedAmount:z.string().refine(v=>Number(v)>0),transferredOn:z.string().min(1),reference:z.string().max(120)});
 const form=useForm<z.infer<typeof schema>>({resolver:zodResolver(schema),defaultValues:{fromAccountId:'',toAccountId:'',amount:'',receivedAmount:'',transferredOn:new Date().toISOString().slice(0,10),reference:''}});
 const [requestId]=useState(()=>crypto.randomUUID()),[error,setError]=useState('');const v=form.watch(),from=accounts.find(a=>a.id===v.fromAccountId),to=accounts.find(a=>a.id===v.toAccountId);
 const saving=useRef(false),[savingNow,setSavingNow]=useState(false);
 const pending=form.formState.isSubmitting||savingNow;
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();
  // Lock before asynchronous validation: a second submit cannot clear RHF's
  // isSubmitting state or start another write while the first is unresolved.
  if(saving.current)return;
  saving.current=true;setSavingNow(true);setError('');
  try{
   await form.handleSubmit(async values=>{
    if(from?.currency===to?.currency&&Number(values.amount)!==Number(values.receivedAmount))throw new Error('En la misma moneda, los importes deben coincidir');
    await api('/api/agency/transfers',{...values,requestId});
    await done();
   })(event);
  }catch(e){setError(errorText(e));}
  finally{saving.current=false;setSavingNow(false);}
 }
 return <form className="form-stack ops-form-grid" noValidate aria-busy={pending} onSubmit={submit}>
  <p className="form-note ops-wide">Esto registra el movimiento; no ordena una transferencia al banco. Indicá los importes reales de salida y entrada.</p>
  <SelectCustom label="Cuenta de origen" disabled={pending} value={v.fromAccountId} choices={accounts.filter(a=>a.active).map(a=>({value:a.id,label:`${a.name} · ${a.currency}`}))} onChange={value=>form.setValue('fromAccountId',value)}/>
  <SelectCustom label="Cuenta de destino" disabled={pending} value={v.toAccountId} choices={accounts.filter(a=>a.active&&a.id!==v.fromAccountId).map(a=>({value:a.id,label:`${a.name} · ${a.currency}`}))} onChange={value=>form.setValue('toAccountId',value)}/>
  <label>Sale ({from?.currency||'moneda de origen'})<AmountInput disabled={pending} value={v.amount} currency={from?.currency||'PYG'} onChange={value=>form.setValue('amount',value)}/></label>
  <label>Llega ({to?.currency||'moneda de destino'})<AmountInput disabled={pending} value={v.receivedAmount} currency={to?.currency||'PYG'} onChange={value=>form.setValue('receivedAmount',value)}/></label>
  <label>Fecha<input type="date" disabled={pending} {...form.register('transferredOn')}/></label><label>Referencia<input disabled={pending} {...form.register('reference')}/></label>
  {from&&to&&Number(v.amount)>0&&Number(v.receivedAmount)>0&&<p className="ops-wide">{money(v.amount,from.currency)} → {money(v.receivedAmount,to.currency)}{from.currency!==to.currency?` · Cambio: 1 ${from.currency} = ${new Intl.NumberFormat('es-PY',{maximumFractionDigits:8}).format(Number(v.receivedAmount)/Number(v.amount))} ${to.currency}`:''}</p>}
  {Object.keys(form.formState.errors).length>0&&<p role="alert" className="error ops-wide">Elegí ambas cuentas, fecha e importes positivos.</p>}{error&&<p role="alert" className="error ops-wide">{error}</p>}
  <SaveActions pending={pending}><button className="primary ops-wide" disabled={pending}>{pending?'Guardando…':'Registrar transferencia'}</button></SaveActions>
 </form>;
}
export function ReceiptReversal({payment,refresh}:{payment:{id:string;amount:string;currency:string;reversal_id?:string|null;reversal_reason?:string|null};refresh:()=>Promise<void>}){
 const [open,setOpen]=useState(false);if(payment.reversal_id)return <small>Revertido · {payment.reversal_reason}</small>;
 return <><button className="text-button warn" onClick={()=>setOpen(true)}><Undo2 size={14}/>Revertir cobro</button>{open&&<Dialog title="Revertir cobro" close={()=>setOpen(false)}><p>Se descontarán {money(payment.amount,payment.currency)} de la cuenta original y volverá a quedar pendiente en la factura. El cobro y esta corrección permanecerán en el historial.</p><Editor fields={[{key:'reason',label:'Motivo',type:'textarea'},{key:'confirmation',label:'Escribí REVERTIR para confirmar'}]} defaults={{reason:'',confirmation:''}} save={async v=>{if(v.confirmation!=='REVERTIR')throw new Error('Escribí REVERTIR para confirmar');await api(`/api/agency/payments/${payment.id}/reverse`,{reason:v.reason});await completeSave(()=>setOpen(false),refresh);}}/></Dialog>}</>;
}
export function ClientReviewControl({orderId}:{orderId:string}){
 const [open,setOpen]=useState(false),[rows,setRows]=useState<Row[]>([]),[url,setUrl]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 async function load(){setRows((await api<{reviews:Row[]}>(`/api/agency/work-orders/${orderId}/client-review`)).reviews);}
 async function perform(fn:()=>Promise<void>){setBusy(true);setError('');try{await fn();}catch(e){setError(errorText(e));}finally{setBusy(false);}}
 return <><button className="secondary" onClick={()=>{setOpen(true);void perform(load);}}>Revisión del cliente</button>{open&&<Dialog title="Compartir pieza para aprobación" close={()=>setOpen(false)}><p className="form-note">Primero completá las aprobaciones internas y agregá el enlace del archivo. El enlace de revisión vence en siete días. No se envía automáticamente.</p><button className="primary" disabled={busy} onClick={()=>void perform(async()=>{const d=await api<{url:string}>(`/api/agency/work-orders/${orderId}/client-review`,{});setUrl(d.url);await load();})}>Crear enlace para esta versión</button>{url&&<p><a href={url} target="_blank" rel="noreferrer">{url}</a></p>}{error&&<p role="alert" className="error">{error}</p>}{!rows.length&&!busy&&<p className="empty-copy">Todavía no hay enlaces de revisión para esta pieza.</p>}{rows.map(r=><article className="ops-card" key={r.id}><h3>{({pending:'Pendiente',approved:'Aprobado',changes:'Cambios solicitados',revoked:'Desactivado'} as Record<string,string>)[str(r,'status')]}</h3><p>Enlace creado por <ActorIdentity name={str(r,'actor_name')} photoUrl={str(r,'actor_photo_url')} verified={r.actor_verified===true} timestamp={str(r,'created_at')}/></p>{str(r,'reviewer_name')&&<p>Respuesta del cliente <ActorIdentity name={str(r,'reviewer_name')} timestamp={str(r,'responded_at')}/></p>}<p>{str(r,'feedback')}</p><small>Vence: {str(r,'expires_at').slice(0,10)}</small>{r.status==='pending'&&<button className="text-button danger" disabled={busy} onClick={()=>void perform(async()=>{await api(`/api/agency/work-orders/${orderId}/client-review/${r.id}/revoke`,{});setUrl('');await load();})}><Link2Off size={14}/>Desactivar enlace</button>}</article>)}</Dialog>}</>;
}
export function ClientReviewPreview({title,assetUrl}:{title:string;assetUrl?:string|null}){
 const [open,setOpen]=useState(false);
 return <><button className="secondary" type="button" onClick={()=>setOpen(true)}><Eye size={14}/>Ver como cliente</button>{open&&<Dialog title="Vista previa del cliente" close={()=>setOpen(false)}>
  <p className="form-note">Así ve el cliente el enlace de revisión. Las acciones están desactivadas: no se envía nada ni cambia el estado de la pieza.</p>
  <article className="client-review-preview" aria-label="Vista previa de la revisión del cliente">
   <p className="review-eyebrow">REVISIÓN DE CONTENIDO</p>
   <h3>{title}</h3>
   <p>Revisá la pieza y dejá tu respuesta. El archivo se abre en su servicio de origen.</p>
   {assetUrl?<a className="button" href={assetUrl} target="_blank" rel="noreferrer">Abrir pieza</a>:<p className="form-note">Esta versión todavía no tiene enlace de archivo. Agregalo en Enlaces para que el cliente pueda abrirla.</p>}
   <label>Nombre completo<input disabled placeholder="Nombre y apellido" autoComplete="off"/></label>
   <label>Comentarios o cambios<textarea disabled rows={3} placeholder="Qué te gustaría ajustar"/></label>
   <div className="inline-actions review-preview-actions"><button className="primary" type="button" disabled>Aprobar esta versión</button><button className="secondary" type="button" disabled>Solicitar cambios</button></div>
   <p className="form-note">El enlace real vence a los siete días. El nombre declarado no equivale a una firma digital verificada.</p>
  </article>
 </Dialog>}</>;
}
export function ClientPortalDeliveryControl({orderId,title,assetUrl}:{orderId:string;title:string;assetUrl:string}){
 const [open,setOpen]=useState(false),[delivery,setDelivery]=useState<Row|null>(null),[error,setError]=useState('');
 async function load(){setDelivery((await api<{delivery:Row|null}>(`/api/agency/work-orders/${orderId}/client-portal-delivery`)).delivery);}
 return <><button className="secondary" onClick={()=>{setOpen(true);void load().catch(e=>setError(errorText(e)));}}>Portal del cliente</button>{open&&<Dialog title="Entregable para el portal" close={()=>setOpen(false)}><p className="form-note">Sólo se publica esta pieza aprobada. El cliente ve este enlace y puede comentar, aprobar o pedir cambios; no accede al panel interno.</p>{delivery?.visible?<><p className="success">Publicado · versión {str(delivery,'version')}</p><button className="text-button danger" onClick={async()=>{try{await api(`/api/agency/work-orders/${orderId}/client-portal-delivery`,{visible:false},'PATCH');await load();}catch(e){setError(errorText(e));}}}><Link2Off size={14}/>Quitar del portal</button></>:<Editor fields={[{key:'title',label:'Título'},{key:'summary',label:'Contexto para el cliente',type:'textarea',optional:true},{key:'assetName',label:'Nombre del enlace'},{key:'assetUrl',label:'Enlace HTTPS del archivo',type:'url'}]} defaults={{title,summary:'',assetName:'Abrir archivo',assetUrl}} save={async values=>{await api(`/api/agency/work-orders/${orderId}/client-portal-delivery`,values);await load();}}/>}{error&&<p className="error" role="alert">{error}</p>}</Dialog>}</>;
}
export function ClientPortalAccess({clientId}:{clientId:string}){
 const [open,setOpen]=useState(false),[email,setEmail]=useState(''),[url,setUrl]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[grants,setGrants]=useState<Row[]>([]);
 async function load(){setGrants((await api<{grants:Row[]}>(`/api/agency/clients/${clientId}/client-portal-invites`)).grants);}
 async function perform(fn:()=>Promise<void>){setBusy(true);setError('');try{await fn();}catch(e){setError(errorText(e));}finally{setBusy(false);}}
 const active=grants.filter(g=>g.active===true);
 return <><button className="secondary" onClick={()=>{setOpen(true);void perform(load);}}>Acceso del cliente</button>{open&&<Dialog title="Acceso del cliente" close={()=>setOpen(false)}><div className="form-stack"><p className="form-note">Generá un enlace personal para el correo elegido. Copialo y envialo sólo a esa persona.</p><label>Correo del cliente<EmailField value={email} onChange={setEmail} disabled={busy}/></label><button className="primary" disabled={!email||busy} onClick={()=>void perform(async()=>{const result=await api<{url:string}>(`/api/agency/clients/${clientId}/client-portal-invites`,{email});setUrl(result.url);setEmail('');await load();})}>Generar invitación</button>{url&&<><p className="success">Invitación creada. Vence en siete días.</p><input aria-label="Enlace de invitación" value={url} readOnly onFocus={event=>event.currentTarget.select()}/><button className="text-button" onClick={()=>void navigator.clipboard?.writeText(url)}><Copy size={14}/>Copiar enlace</button></>}{active.length>0&&active.map(g=><article className="ops-card" key={String(g.id)}><h3>{str(g,'full_name')||str(g,'email')}</h3><p>{str(g,'email')}</p><small>Acceso desde {str(g,'granted_at').slice(0,10)}</small><button className="text-button danger" disabled={busy} onClick={()=>void perform(async()=>{await api(`/api/agency/clients/${clientId}/portal-access/grants/${String(g.id)}/revoke`,{});await load();})}><Link2Off size={14}/>Revocar acceso</button></article>)}{!active.length&&!busy&&<p className="empty-copy">Todavía no hay accesos activos al portal.</p>}{error&&<p className="error" role="alert">{error}</p>}</div></Dialog>}</>;
}
export function ReconciliationWorkspace({accounts}:{accounts:Account[]}){
 const [csv,setCsv]=useState('id,fecha,importe,referencia\n');
 const [accountId,setAccountId]=useState(''),[lines,setLines]=useState<Row[]>([]),[moves,setMoves]=useState<Row[]>([]),[importing,setImporting]=useState(false),[matching,setMatching]=useState<Row|null>(null),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false);
 const currency=accounts.find(a=>a.id===accountId)?.currency||'PYG';
 async function load(id=accountId){const d=await api<{lines:Row[];movements:Row[]}>(`/api/agency/reconciliation?accountId=${id}`);setLines(d.lines);setMoves(d.movements);}
 return <section className="panel"><h2>Conciliación por extracto</h2><p className="form-note">Compará el extracto con los movimientos registrados. Importar y conciliar no modifica saldos. El cruce automático exige fecha, importe y referencia exactos, sin coincidencias ambiguas.</p><SelectCustom label="Cuenta a conciliar" value={accountId} choices={accounts.map(a=>({value:a.id,label:`${a.name} · ${a.currency}`}))} onChange={value=>{setAccountId(value);setLines([]);setMoves([]);setBusy(true);void load(value).catch(e=>setNotice(errorText(e))).finally(()=>setBusy(false));}}/>{accountId&&<><div className="inline-actions"><button className="secondary" disabled={busy} onClick={()=>setImporting(true)}>Importar CSV</button><button className="secondary" disabled={busy} onClick={async()=>{setBusy(true);try{const d=await api<{matched:number}>(`/api/agency/reconciliation/${accountId}/auto`,{});setNotice(`${d.matched} coincidencias conciliadas.`);await load();}catch(e){setNotice(errorText(e));}finally{setBusy(false);}}}>Conciliar coincidencias exactas</button></div><p>{lines.filter(l=>!l.match_id).length} pendientes de {lines.length} movimientos importados (hasta 1.000 visibles).</p>{lines.length?<div className="statement-row-head" aria-hidden="true"><span>Extracto</span><span>Monto</span><span>Acciones</span></div>:null}{lines.map(l=><div className="payment-row statement-row" key={l.id}><div><b>{str(l,'booked_on').slice(0,10)} · {str(l,'reference')||str(l,'external_id')}</b><small>{l.match_id?'Conciliado':'Pendiente'}</small></div><b>{money(str(l,'amount'),currency)}</b>{l.match_id?<button className="text-button danger" disabled={busy} onClick={async()=>{setBusy(true);try{await api(`/api/agency/reconciliation/${l.id}/unmatch`,{});await load();}catch(e){setNotice(errorText(e));}finally{setBusy(false);}}}><Unlink size={14}/>Desvincular</button>:<button className="text-button positive" disabled={busy} onClick={()=>setMatching(l)}><Link2 size={14}/>Conciliar</button>}</div>)}</>}{notice&&<p role="status">{notice}</p>}
 {importing&&<Dialog title="Importar extracto CSV" close={()=>setImporting(false)}><p>Copiá el CSV con encabezado <code>id,fecha,importe,referencia</code>. Fecha YYYY-MM-DD; importe positivo para ingresos y negativo para egresos, sin miles y con punto decimal. El ID debe ser único por cuenta.</p><div className="form-stack"><label>Archivo CSV<input type="file" accept=".csv,text/csv" onChange={async e=>{const file=e.target.files?.[0];if(!file)return;if(file.size>800000){setNotice('El archivo supera 800 KB');return;}setCsv(await file.text());}}/></label></div><Editor key={csv} fields={[{key:'csv',label:'Contenido del CSV',type:'textarea'}]} defaults={{csv}} save={async v=>{const d=await api<{imported:number}>('/api/agency/reconciliation',{accountId,lines:parseStatementCsv(v.csv)});setNotice(`${d.imported} filas nuevas importadas.`);await load();setImporting(false);}}/></Dialog>}
 {matching&&<Dialog title="Vincular movimiento" close={()=>setMatching(null)}><p>{money(str(matching,'amount'),currency)} · {str(matching,'reference')}</p><Editor fields={[{key:'movement',label:'Movimiento registrado del mismo importe',choices:moves.filter(m=>Number(m.amount)===Number(matching.amount)).map(m=>({value:`${str(m,'movement_type')}:${str(m,'movement_id')}`,label:`${str(m,'booked_on').slice(0,10)} · ${str(m,'movement_type')} · ${str(m,'reference')}`}))}]} defaults={{movement:''}} save={async v=>{const [movement_type,movement_id]=v.movement.split(':');await api(`/api/agency/reconciliation/${matching.id}/match`,{movement_type,movement_id});await load();setMatching(null);}}/></Dialog>}
 </section>;
}

"use client";
import {ActorIdentity} from './actor-identity';
import {SaveActions} from './save-actions';
import {completeSave} from './save-completion';
import {useRef,useState,type ChangeEvent,type FormEvent} from 'react';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {api,Dialog,Editor} from './operations';
import {EmailField} from './email-field';
import {SelectCustom,AmountInput} from './profile-controls';
import {parseStatementCsv} from './statement-csv';
import {listDateShort} from './list-format';
import {movementValue,matchingMovements,reconciliationPending,transferPreview,type StatementLine} from './treasury-data';
import {useReconciliation} from './use-reconciliation';
import {todayInAsuncion} from './field-rules';
import {Aviso,Button,Card,EmptyState,ErrorState,FormField,IconAction,Input,Nota,cn} from 'owncoding-ui';
import {LoadingBlock,MoneyText,StateChip} from './ui-v2';
import {Copy,Eye,Link2,Link2Off,Undo2,Unlink} from 'lucide-react';
type Account={id:string;name:string;currency:string;active:boolean};
type Row={id:string;[key:string]:unknown};
const str=(r:Row,k:string)=>String(r[k]??'');
const errorText=(e:unknown)=>e instanceof Error?e.message:'No se pudo completar';
export function FXTransferForm({accounts,done}:{accounts:Account[];done:()=>void|Promise<void>}){
 const schema=z.object({fromAccountId:z.string().min(1),toAccountId:z.string().min(1),amount:z.string().refine(v=>Number(v)>0),receivedAmount:z.string().refine(v=>Number(v)>0),transferredOn:z.string().min(1),reference:z.string().max(120)});
 const form=useForm<z.infer<typeof schema>>({resolver:zodResolver(schema),defaultValues:{fromAccountId:'',toAccountId:'',amount:'',receivedAmount:'',transferredOn:todayInAsuncion(),reference:''}});
 const [requestId]=useState(()=>crypto.randomUUID()),[error,setError]=useState('');const v=form.watch(),from=accounts.find(a=>a.id===v.fromAccountId),to=accounts.find(a=>a.id===v.toAccountId);const transfer=transferPreview({fromCurrency:from?.currency,toCurrency:to?.currency,amount:v.amount,receivedAmount:v.receivedAmount});
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
    if(transfer.mismatch)throw new Error('En la misma moneda, los importes deben coincidir');
    await api('/api/agency/transfers',{...values,requestId});
    await done();
   })(event);
  }catch(e){setError(errorText(e));}
  finally{saving.current=false;setSavingNow(false);}
 }
 return <form className="grid gap-3 sm:grid-cols-2" noValidate aria-busy={pending} onSubmit={submit}>
  <Nota tono="neutro" className="sm:col-span-2">Esto registra el movimiento; no ordena una transferencia al banco. Indicá los importes reales de salida y entrada.</Nota>
  <SelectCustom label="Cuenta de origen" disabled={pending} value={v.fromAccountId} choices={accounts.filter(a=>a.active).map(a=>({value:a.id,label:`${a.name} · ${a.currency}`}))} onChange={value=>form.setValue('fromAccountId',value)}/>
  <SelectCustom label="Cuenta de destino" disabled={pending} value={v.toAccountId} choices={accounts.filter(a=>a.active&&a.id!==v.fromAccountId).map(a=>({value:a.id,label:`${a.name} · ${a.currency}`}))} onChange={value=>form.setValue('toAccountId',value)}/>
  <FormField label={`Sale (${from?.currency||'moneda de origen'})`} htmlFor="transfer-amount"><AmountInput id="transfer-amount" disabled={pending} value={v.amount} currency={from?.currency||'PYG'} onChange={value=>form.setValue('amount',value)}/></FormField>
  <FormField label={`Llega (${to?.currency||'moneda de destino'})`} htmlFor="transfer-received"><AmountInput id="transfer-received" disabled={pending} value={v.receivedAmount} currency={to?.currency||'PYG'} onChange={value=>form.setValue('receivedAmount',value)}/></FormField>
  <FormField label="Fecha" htmlFor="transfer-date"><Input id="transfer-date" type="date" className="w-40" disabled={pending} {...form.register('transferredOn')}/></FormField>
  <FormField label="Referencia" htmlFor="transfer-reference"><Input id="transfer-reference" maxLength={120} disabled={pending} {...form.register('reference')}/></FormField>
  {from&&to&&Number(v.amount)>0&&Number(v.receivedAmount)>0?<Nota tono="info" className="sm:col-span-2"><span className="inline-flex flex-wrap items-baseline gap-1"><MoneyText valor={v.amount} currency={from.currency}/> → <MoneyText valor={v.receivedAmount} currency={to.currency}/>{transfer.rate!==null?` · Cambio: 1 ${from.currency} = ${new Intl.NumberFormat('es-PY',{maximumFractionDigits:8}).format(transfer.rate)} ${to.currency}`:''}</span></Nota>:null}
  {Object.keys(form.formState.errors).length>0?<Aviso tono="error" className="sm:col-span-2">Elegí ambas cuentas, fecha e importes positivos.</Aviso>:null}
  {error?<Aviso tono="error" className="sm:col-span-2">{error}</Aviso>:null}
  <SaveActions pending={pending}><Button type="submit" disabled={pending} className="w-full sm:w-auto">{pending?'Guardando…':'Registrar transferencia'}</Button></SaveActions>
 </form>;
}
export function ReceiptReversal({payment,refresh}:{payment:{id:string;amount:string;currency:string;reversal_id?:string|null;reversal_reason?:string|null};refresh:()=>Promise<void>}){
 const [open,setOpen]=useState(false);if(payment.reversal_id)return <small>Revertido · {payment.reversal_reason}</small>;
 return <><button className="text-button warn" onClick={()=>setOpen(true)}><Undo2 size={14}/>Revertir cobro</button>{open&&<Dialog title="Revertir cobro" close={()=>setOpen(false)}><p>Se descontarán <MoneyText valor={payment.amount} currency={payment.currency}/> de la cuenta original y volverá a quedar pendiente en la factura. El cobro y esta corrección permanecerán en el historial.</p><Editor fields={[{key:'reason',label:'Motivo',type:'textarea'},{key:'confirmation',label:'Escribí REVERTIR para confirmar'}]} defaults={{reason:'',confirmation:''}} save={async v=>{if(v.confirmation!=='REVERTIR')throw new Error('Escribí REVERTIR para confirmar');await api(`/api/agency/payments/${payment.id}/reverse`,{reason:v.reason});await completeSave(()=>setOpen(false),refresh);}}/></Dialog>}</>;
}
export function ClientReviewControl({orderId}:{orderId:string}){
 const [open,setOpen]=useState(false),[rows,setRows]=useState<Row[]>([]),[url,setUrl]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[confirming,setConfirming]=useState('');
 async function load(){setRows((await api<{reviews:Row[]}>(`/api/agency/work-orders/${orderId}/client-review`)).reviews);}
 async function perform(fn:()=>Promise<void>){setBusy(true);setError('');try{await fn();}catch(e){setError(errorText(e));}finally{setBusy(false);}}
 return <><button className="secondary" onClick={()=>{setOpen(true);setConfirming('');void perform(load);}}>Revisión del cliente</button>{open&&<Dialog title="Compartir pieza para aprobación" close={()=>setOpen(false)}><p className="form-note">Primero completá las aprobaciones internas y agregá el enlace del archivo. El enlace de revisión vence en siete días. No se envía automáticamente.</p><button className="primary" disabled={busy} onClick={()=>void perform(async()=>{const d=await api<{url:string}>(`/api/agency/work-orders/${orderId}/client-review`,{});setUrl(d.url);await load();})}>Crear enlace para esta versión</button>{url&&<p><a href={url} target="_blank" rel="noreferrer">{url}</a></p>}{error&&<p role="alert" className="error">{error}</p>}{busy&&!rows.length?<p role="status">Cargando enlaces de revisión…</p>:null}{!rows.length&&!busy&&<p className="empty-copy">Todavía no hay enlaces de revisión para esta pieza.</p>}{rows.map(r=><article className="ops-card" key={r.id}><h3>{({pending:'Pendiente',approved:'Aprobado',changes:'Cambios solicitados',revoked:'Desactivado'} as Record<string,string>)[str(r,'status')]}</h3><p>Enlace creado por <ActorIdentity name={str(r,'actor_name')} photoUrl={str(r,'actor_photo_url')} verified={r.actor_verified===true} timestamp={str(r,'created_at')}/></p>{str(r,'reviewer_name')&&<p>Respuesta del cliente <ActorIdentity name={str(r,'reviewer_name')} timestamp={str(r,'responded_at')}/></p>}<p>{str(r,'feedback')}</p><small>Vence: {listDateShort(str(r,'expires_at'))}</small>{r.status==='pending'&&(confirming===String(r.id)?<span className="inline-actions"><span role="alert">¿Desactivar este enlace?</span><button className="secondary danger" disabled={busy} onClick={()=>void perform(async()=>{await api(`/api/agency/work-orders/${orderId}/client-review/${r.id}/revoke`,{});setUrl('');setConfirming('');await load();})}>Confirmar</button><button className="secondary" disabled={busy} onClick={()=>setConfirming('')}>Cancelar</button></span>:<button className="text-button danger" disabled={busy} onClick={()=>setConfirming(String(r.id))}><Link2Off size={14}/>Desactivar enlace</button>)}</article>)}</Dialog>}</>;
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
 const [open,setOpen]=useState(false),[delivery,setDelivery]=useState<Row|null>(null),[loaded,setLoaded]=useState(false),[error,setError]=useState(''),[confirming,setConfirming]=useState(false);
 async function load(){setDelivery((await api<{delivery:Row|null}>(`/api/agency/work-orders/${orderId}/client-portal-delivery`)).delivery);setLoaded(true);}
 function start(){setOpen(true);setDelivery(null);setLoaded(false);setError('');setConfirming(false);void load().catch(e=>setError(errorText(e)));}
 return <><button className="secondary" onClick={start}>Portal del cliente</button>{open&&<Dialog title="Entregable para el portal" close={()=>setOpen(false)}><p className="form-note">Sólo se publica esta pieza aprobada. El cliente ve este enlace y puede comentar, aprobar o pedir cambios; no accede al panel interno.</p>{!loaded?(error?null:<p role="status">Cargando entregable…</p>):delivery?.visible?<><p className="success">Publicado · versión {str(delivery,'version')}</p>{confirming?<span className="inline-actions"><span role="alert">¿Quitar esta pieza del portal?</span><button className="secondary danger" onClick={async()=>{try{await api(`/api/agency/work-orders/${orderId}/client-portal-delivery`,{visible:false},'PATCH');setConfirming(false);await load();}catch(e){setError(errorText(e));}}}>Confirmar</button><button className="secondary" onClick={()=>setConfirming(false)}>Cancelar</button></span>:<button className="text-button danger" onClick={()=>setConfirming(true)}><Link2Off size={14}/>Quitar del portal</button>}</>:<Editor fields={[{key:'title',label:'Título'},{key:'summary',label:'Contexto para el cliente',type:'textarea',optional:true},{key:'assetName',label:'Nombre del enlace'},{key:'assetUrl',label:'Enlace HTTPS del archivo',type:'url'}]} defaults={{title,summary:'',assetName:'Abrir archivo',assetUrl}} save={async values=>{await api(`/api/agency/work-orders/${orderId}/client-portal-delivery`,values);await load();}}/>}{error&&<p className="error" role="alert">{error}</p>}</Dialog>}</>;
}
export function ClientPortalAccess({clientId}:{clientId:string}){
 const [open,setOpen]=useState(false),[email,setEmail]=useState(''),[url,setUrl]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[confirming,setConfirming]=useState(''),[grants,setGrants]=useState<Row[]>([]),[invites,setInvites]=useState<Row[]>([]);
 async function load(){
  // El API ya devuelve las invitaciones pendientes junto a los accesos (issue #22).
  const data=await api<{grants:Row[];invites:Row[]}>(`/api/agency/clients/${clientId}/client-portal-invites`);
  setGrants(data.grants);setInvites(data.invites||[]);
 }
 async function perform(fn:()=>Promise<void>){setBusy(true);setError('');try{await fn();}catch(e){setError(errorText(e));}finally{setBusy(false);}}
 const active=grants.filter(g=>g.active===true);
 const pendingInvites=invites.filter(invite=>!invite.accepted_at&&!invite.revoked_at);
 const inviteExpired=(invite:Row)=>Boolean(invite.expires_at)&&new Date(String(invite.expires_at)).getTime()<=Date.now();
 return <><button className="secondary" onClick={()=>{setOpen(true);setConfirming('');void perform(load);}}>Acceso del cliente</button>{open&&<Dialog title="Acceso del cliente" close={()=>setOpen(false)}><div className="form-stack"><p className="form-note">Generá un enlace personal para el correo elegido. Copialo y envialo sólo a esa persona.</p><label>Correo del cliente<EmailField value={email} onChange={setEmail} disabled={busy}/></label><button className="primary" disabled={!email||busy} onClick={()=>void perform(async()=>{const result=await api<{url:string}>(`/api/agency/clients/${clientId}/client-portal-invites`,{email});setUrl(result.url);setEmail('');await load();})}>Generar invitación</button>{url&&<><p className="success">Invitación creada. Vence en siete días.</p><input aria-label="Enlace de invitación" value={url} readOnly onFocus={event=>event.currentTarget.select()}/><button className="text-button" onClick={()=>void navigator.clipboard?.writeText(url)}><Copy size={14}/>Copiar enlace</button></>}{busy&&!grants.length&&!invites.length?<p role="status">Cargando accesos…</p>:null}{pendingInvites.length>0&&<section aria-label="Invitaciones pendientes"><h3>Invitaciones pendientes</h3>{pendingInvites.map(invite=><article className="ops-card" key={`invite-${String(invite.id)}`}><h3>{str(invite,'email_normalized')}</h3><small>{inviteExpired(invite)?'Vencida':'Pendiente de ingreso'} · vence {listDateShort(str(invite,'expires_at'))}</small>{inviteExpired(invite)?null:<button className="text-button danger" disabled={busy} onClick={()=>void perform(async()=>{await api(`/api/agency/client-portal-invites/${String(invite.id)}/revoke`,{},'POST');await load();})}><Link2Off size={14}/>Revocar invitación</button>}</article>)}</section>}{active.length>0&&active.map(g=><article className="ops-card" key={String(g.id)}><h3>{str(g,'full_name')||str(g,'email')}</h3><p>{str(g,'email')}</p><small>Acceso desde {listDateShort(str(g,'granted_at'))}</small>{confirming===String(g.id)?<span className="inline-actions"><span role="alert">¿Revocar este acceso?</span><button className="secondary danger" disabled={busy} onClick={()=>void perform(async()=>{await api(`/api/agency/clients/${clientId}/portal-access/grants/${String(g.id)}/revoke`,{});setConfirming('');await load();})}>Confirmar</button><button className="secondary" disabled={busy} onClick={()=>setConfirming('')}>Cancelar</button></span>:<button className="text-button danger" disabled={busy} onClick={()=>setConfirming(String(g.id))}><Link2Off size={14}/>Revocar acceso</button>}</article>)}{!active.length&&!pendingInvites.length&&!busy&&<p className="empty-copy">Todavía no hay accesos activos al portal.</p>}{error&&<p className="error" role="alert">{error}</p>}</div></Dialog>}</>;
}
// Plantilla compartida por el encabezado y las filas del extracto (fila finita,
// con scroll horizontal silencioso cuando no entra).
const STATEMENT_COLS='grid-cols-[minmax(0,1fr)_7rem_8.5rem_5rem]';
const STATEMENT_HEAD='grid gap-x-2 border-b border-ink-600 px-2 pb-1.5 text-[10px] font-bold uppercase tracking-[.06em] text-mute';
const STATEMENT_ROW='grid min-h-11 items-center gap-x-2 border-b border-ink-600/60 px-2 py-1 transition-colors last:border-0 hover:bg-ink-700/40';
export function ReconciliationWorkspace({accounts}:{accounts:Account[]}){
 const [csv,setCsv]=useState('id,fecha,importe,referencia\n');
 const [accountId,setAccountId]=useState(''),[importing,setImporting]=useState(false),[matching,setMatching]=useState<StatementLine|null>(null),[notice,setNotice]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const {lines,movements,load,reset}=useReconciliation();
 const currency=accounts.find(a=>a.id===accountId)?.currency||'PYG';
 async function perform(fn:()=>Promise<void>){setBusy(true);setError('');try{await fn();}catch(cause){setError(errorText(cause));}finally{setBusy(false);}}
 return <Card className="grid gap-3">
  <div className="grid gap-1">
   <h3 className="text-sm font-semibold text-fore">Conciliación por extracto</h3>
   <p className="text-xs text-mute">Compará el extracto con los movimientos registrados. Importar y conciliar no modifica saldos. El cruce automático exige fecha, importe y referencia exactos, sin coincidencias ambiguas.</p>
  </div>
  <div className="w-full sm:w-72"><SelectCustom label="Cuenta a conciliar" value={accountId} choices={accounts.map(a=>({value:a.id,label:`${a.name} · ${a.currency}`}))} onChange={value=>{setAccountId(value);reset();setNotice('');setError('');if(value)void perform(()=>load(value));}}/></div>
  {accountId?<>
   <div className="flex flex-wrap gap-2">
    <Button variant="outline" disabled={busy} onClick={()=>setImporting(true)}>Importar CSV</Button>
    <Button variant="outline" disabled={busy} onClick={()=>void perform(async()=>{const d=await api<{matched:number}>(`/api/agency/reconciliation/${accountId}/auto`,{});setNotice(`${d.matched} coincidencias conciliadas.`);await load(accountId);})}>Conciliar coincidencias exactas</Button>
   </div>
   <p className="text-sm text-mute">{reconciliationPending(lines)} pendientes de {lines.length} movimientos importados (hasta 1.000 visibles).</p>
   {busy&&!lines.length?<LoadingBlock label="Cargando extracto…" lines={2}/>:null}
   {lines.length?<div className="min-w-0 overflow-x-auto" role="table" aria-label="Movimientos del extracto"><div className="min-w-[40rem]">
    <div role="row" className={cn(STATEMENT_HEAD,STATEMENT_COLS)}><span role="columnheader">Extracto</span><span role="columnheader">Estado</span><span role="columnheader" className="text-right">Monto</span><span role="columnheader" className="text-right">Acciones</span></div>
    <div role="rowgroup">{lines.map(l=><div role="row" className={cn(STATEMENT_ROW,STATEMENT_COLS)} key={l.id}>
     <span className="min-w-0 text-sm"><b className="font-semibold text-fore">{listDateShort(l.booked_on)||'—'}</b><small className="ml-2 text-xs text-mute">{l.reference||l.external_id}</small></span>
     <span className="min-w-0"><StateChip tone={l.match_id?'ok':'warn'}>{l.match_id?'Conciliado':'Pendiente'}</StateChip></span>
     <span className={cn('min-w-0','text-right')}><MoneyText valor={l.amount} currency={currency}/></span>
     <span className={cn('min-w-0','flex justify-end')}>{l.match_id
      ?<IconAction icon="close" tone="bad" label={`Desvincular movimiento: ${l.reference||l.external_id}`} disabled={busy} onClick={()=>void perform(async()=>{await api(`/api/agency/reconciliation/${l.id}/unmatch`,{});await load(accountId);})}/>
      :<IconAction icon="check" tone="ok" label={`Conciliar ${l.reference||l.external_id}`} disabled={busy} onClick={()=>setMatching(l)}/>}</span>
    </div>)}</div>
   </div></div>:<EmptyState compact title="Sin movimientos importados para esta cuenta."/>}
  </>:<EmptyState compact title="Elegí una cuenta para conciliar el extracto."/>}
  {notice?<Aviso tono="ok">{notice}</Aviso>:null}
  {error&&!lines.length?<ErrorState title="No se pudo cargar el extracto" description={error} onRetry={()=>void perform(()=>load(accountId))}/>:null}
  {error&&lines.length?<Aviso tono="error">{error}</Aviso>:null}
  {importing&&<Dialog title="Importar extracto CSV" close={()=>setImporting(false)}><p>Copiá el CSV con encabezado <code>id,fecha,importe,referencia</code>. Fecha YYYY-MM-DD; importe positivo para ingresos y negativo para egresos, sin miles y con punto decimal. El ID debe ser único por cuenta.</p><div className="grid gap-3"><FormField label="Archivo CSV" htmlFor="reconciliation-file"><Input id="reconciliation-file" type="file" accept=".csv,text/csv" onChange={async (e:ChangeEvent<HTMLInputElement>)=>{const file=e.target.files?.[0];if(!file)return;if(file.size>800000){setError('El archivo supera 800 KB');return;}setCsv(await file.text());}}/></FormField></div><Editor key={csv} fields={[{key:'csv',label:'Contenido del CSV',type:'textarea'}]} defaults={{csv}} save={async v=>{const d=await api<{imported:number}>('/api/agency/reconciliation',{accountId,lines:parseStatementCsv(v.csv)});setNotice(`${d.imported} filas nuevas importadas.`);await load(accountId);setImporting(false);}}/></Dialog>}
  {matching&&<Dialog title="Vincular movimiento" close={()=>setMatching(null)}><p><MoneyText valor={matching.amount} currency={currency}/> · {matching.reference}</p><Editor fields={[{key:'movement',label:'Movimiento registrado del mismo importe',choices:matchingMovements(matching,movements).map(m=>({value:movementValue(m),label:`${listDateShort(m.booked_on)} · ${m.movement_type} · ${m.reference}`}))}]} defaults={{movement:''}} save={async v=>{const [movement_type,movement_id]=v.movement.split(':');await api(`/api/agency/reconciliation/${matching.id}/match`,{movement_type,movement_id});await load(accountId);setMatching(null);}}/></Dialog>}
 </Card>;
}

"use client";
// Editor único de clientes (#184 C1/C3): «Nuevo cliente», ⋯ «Editar cliente»,
// «Editar» de la ficha y «Cargar plan» abren este mismo componente. Secciones
// Identidad · Contacto · Fiscal · Plan y pago · Enlaces (plegables; en móvil,
// pasos). Alta y edición comparten campos y validadores (client-editor-data).
import {useEffect,useRef,useState} from 'react';
import {Aviso,AvisoPrivacidad} from 'owncoding-ui';
import {api,Dialog,Editor} from './operations';
import {roleCan} from './capabilities';
import {completeSave} from './save-completion';
import {ClientAppearance} from './client-identity';
import {FinanceHistoryDialog} from './finance-history';
import {financeHistory} from './finance-detail-data';
import {RucConfirmCard,lookupRuc,rucApplyValues,type RucRecord} from './client-ruc';
import {CLIENT_CREATE_DEFAULTS,clientCreatePayload,clientEditDefaults,clientFields,clientPatchPayload,planTermsPayload,type ClientRecord,type PlanTermsResponse} from './client-editor-data';
import {PRIVACY_POLICY_URL,PRIVACY_RIGHTS_URL,PRIVACY_CLIENT_FINALITY,PRIVACY_CLIENT_DETAIL} from './privacy-links';

export type SavedClient={id:string;name:string;email:string|null;phone:string|null;active:boolean;[key:string]:unknown};
const errorText=(cause:unknown)=>cause instanceof Error?cause.message:'No se pudo completar';
type PendingRuc={record:RucRecord;resolve:(values:Record<string,string>)=>void;reject:(error:Error)=>void};

export function ClientEditor({mode,clientId,record=null,plan=null,planRequired=false,onSaved,onCreated}:{
  mode:'create'|'edit';
  clientId?:string;
  record?:ClientRecord|null;
  plan?:PlanTermsResponse|null;
  planRequired?:boolean;
  /** Edición guardada: el contenedor cierra y refresca. */
  onSaved?:()=>Promise<void>|void;
  /** Alta guardada; `keepOpen` con «Guardar y crear otro». */
  onCreated?:(client:SavedClient,keepOpen:boolean)=>void;
}){
  const [pending,setPending]=useState<PendingRuc|null>(null),[notice,setNotice]=useState('');
  const pendingRef=useRef<PendingRuc|null>(null);
  // RUC aplicado en esta edición: al guardar se refresca la ficha tributaria (estado, fuente y fecha) en el API.
  const rucAppliedRef=useRef(false);
  const planRequest=useRef<{signature:string;id:string}|null>(null);
  pendingRef.current=pending;
  useEffect(()=>()=>{pendingRef.current?.reject(new Error('Consulta cancelada.'));},[]);
  // La consulta devuelve un registro, no escribe: la promesa del campo sólo se
  // resuelve con «Aplicar»; «Descartar» la rechaza y la ficha queda como estaba.
  const rucLookup={label:'Buscar',run:async(ruc:string)=>{
    const found=await lookupRuc(ruc);
    return new Promise<Record<string,string>>((resolve,reject)=>{
      pendingRef.current?.reject(new Error('Consulta reemplazada por una nueva.'));
      const next:PendingRuc={record:found,resolve,reject};
      pendingRef.current=next;setPending(next);
    });
  }};
  const rucAfter=pending?<RucConfirmCard record={pending.record}
    onApply={()=>{const current=pending;setPending(null);rucAppliedRef.current=true;current.resolve(rucApplyValues(current.record));}}
    onDiscard={()=>{const current=pending;setPending(null);current.reject(new Error('Descartaste los datos del RUC; la ficha no cambió.'));}}/>:null;
  const restricted=record?.contact_restricted===true;
  const fields=clientFields({mode,plan,planRequired,restricted,rucLookup,rucAfter});
  const defaults=mode==='create'?CLIENT_CREATE_DEFAULTS:clientEditDefaults(record,plan);
  async function create(values:Record<string,string>,keepOpen:boolean){
    const data=await api<{client:SavedClient}>('/api/agency/clients',clientCreatePayload(values));
    if(keepOpen)setNotice(`Cliente «${data.client.name}» creado. Podés cargar el siguiente.`);
    onCreated?.(data.client,keepOpen);
  }
  async function edit(values:Record<string,string>){
    const {client,planTouched}=clientPatchPayload(values,defaults);
    let terms:ReturnType<typeof planTermsPayload>|null=null;
    if(plan&&(planTouched||(planRequired&&!plan.terms))){
      const signature=JSON.stringify(values);
      if(planRequest.current?.signature!==signature)planRequest.current={signature,id:crypto.randomUUID()};
      terms=planTermsPayload(values,plan,planRequest.current.id);
    }
    if(client)await api(`/api/agency/clients/${clientId}`,client,'PATCH');
    if(terms)await api(`/api/agency/clients/${clientId}/commercial-terms`,terms,'PATCH');
    if(rucAppliedRef.current){rucAppliedRef.current=false;await api(`/api/agency/clients/${clientId}/ruc-refresh`,{apply:true}).catch(()=>undefined);}
    await onSaved?.();
  }
  return <>
    {notice&&<Aviso tono="ok" como="div" role="status" compact>{notice}</Aviso>}
    <Editor key={`${mode}:${String(record?.updated_at??'')}:${plan?plan.terms?.updatedAt||'loaded':'off'}`} columns fields={fields} defaults={defaults}
      label={mode==='create'?'Crear cliente':'Guardar'} collapseSections={!planRequired}
      save={values=>mode==='create'?create(values,false):edit(values)}
      secondaryAction={mode==='create'?{label:'Guardar y crear otro',save:values=>create(values,true)}:undefined}/>
  </>;
}

/** Diálogo del editor: en edición carga la ficha (y los términos comerciales con permiso). */
/** «Cargar plan y pago» abre el mismo editor con la sección del plan obligatoria: su título lo dice. */
export const CLIENT_PLAN_DESCRIPTION='Elegí el plan contratado y sus condiciones de pago. El resto de la ficha sigue editable en las otras secciones.';
export function clientEditorTitle(mode:'create'|'edit',planMode:boolean,name:string){
  if(mode==='create')return 'Nuevo cliente';
  if(planMode)return name?`Plan y pago · ${name}`:'Plan y pago del cliente';
  return 'Editar cliente';
}
export function ClientEditorDialog({mode,clientId,role,canManageTerms,planFocus=false,close,refresh,onCreated}:{
  mode:'create'|'edit';
  clientId?:string;
  role:string;
  canManageTerms?:boolean;
  /** Entrada «Cargar plan»: todas las secciones abiertas y el plan completo es obligatorio. */
  planFocus?:boolean;
  close:()=>void;
  refresh:()=>Promise<void>;
  onCreated?:(client:SavedClient,keepOpen:boolean)=>void;
}){
  const [record,setRecord]=useState<ClientRecord|null>(null),[plan,setPlan]=useState<PlanTermsResponse|null>(null),[error,setError]=useState(''),[planError,setPlanError]=useState(''),[historyOpen,setHistoryOpen]=useState(false);
  const canPlan=mode==='edit'&&(canManageTerms??roleCan(role,'commercial-terms.manage'));
  async function load(){
    if(mode!=='edit')return;
    setError('');setPlanError('');
    try{
      setRecord((await api<{record:ClientRecord}>(`/api/agency/clients/${clientId}`)).record);
      if(canPlan)try{
        const terms=await api<PlanTermsResponse>(`/api/agency/clients/${clientId}/commercial-terms`);
        try{const history=financeHistory(await api(`/api/agency/clients/${clientId}/plan-history`));if(!history)throw Error('El historial recibió datos inválidos.');terms.historyRevision=history.revision;}catch(cause){setPlanError(errorText(cause));}
        setPlan(terms);
      }catch(cause){setPlanError(errorText(cause));}
    }catch(cause){setError(errorText(cause));}
  }
  useEffect(()=>{void load();},[clientId,mode]);// eslint-disable-line react-hooks/exhaustive-deps
  const ready=mode==='create'||(record!==null&&(!canPlan||plan!==null||planError!==''));
  const planMode=planFocus&&canPlan;
  return <Dialog title={clientEditorTitle(mode,planMode,String(record?.name??''))} close={close}>
    {planMode?<p className="form-note mb-3">{CLIENT_PLAN_DESCRIPTION}</p>:null}
    {/* Finalidad declarada donde la agencia carga datos de un tercero (#114). */}
    <AvisoPrivacidad finalidad={PRIVACY_CLIENT_FINALITY} detalle={PRIVACY_CLIENT_DETAIL} politicaUrl={PRIVACY_POLICY_URL} derechosUrl={PRIVACY_RIGHTS_URL} compact className="mb-3"/>
    {error&&<Aviso tono="error" compact role="alert">{error}</Aviso>}
    {mode==='edit'&&record&&<ClientAppearance id={String(clientId)} name={String(record.name??'')} logo={String(record.logo_url??'')} color={String(record.color_key??'')} legalName={String(record.legal_name??'')} representativeName={String(record.legal_representative_name??'')} linked={record.legal_representative_same_as_client===true} restricted={record.contact_restricted===true} refresh={async()=>{await refresh();await load();}}/>}
    {canPlan&&record?<button type="button" className="secondary mb-3" onClick={()=>setHistoryOpen(true)}>Historial del plan</button>:null}
    {historyOpen&&clientId&&record?<FinanceHistoryDialog kind="plan" id={clientId} name={String(record.name??'')} close={()=>setHistoryOpen(false)}/>:null}
    {planError&&<Aviso tono="error" compact role="alert">{planError}</Aviso>}
    {ready?<ClientEditor mode={mode} clientId={clientId} record={record} plan={plan} planRequired={planFocus&&canPlan} onCreated={onCreated} onSaved={()=>completeSave(close,refresh)}/>:!error&&<p role="status">Cargando cliente…</p>}
  </Dialog>;
}

// Contrato de datos del ClientEditor (#184): campos por sección, validadores y
// payloads. Alta y edición comparten los mismos campos y las mismas reglas; el
// API revalida siempre (backend/suite-validation.js). Funciones puras.
import {MENSAJE_RUC,normalizeTaxId,taxIdValid} from 'owncoding-ui';
import type {Field} from './operations';
import {PHONE_HELP} from './field-rules';
import {clientStatuses} from './client-status';
import {isWholeTransport} from './amount-format';
import {buildSocialLinks,clientLinksDefaults} from './client-links';

export const CLIENT_SECTIONS={identity:'Identidad',contact:'Contacto',tax:'Fiscal',plan:'Plan y pago',links:'Enlaces'} as const;
export type ClientSectionName=typeof CLIENT_SECTIONS[keyof typeof CLIENT_SECTIONS];

export type ClientRecord={id?:string;[key:string]:unknown};
export type PlanTerms={planId:string;planName:string;recurringAmount:string|number;currency:'PYG'|'USD';startsOn:string;endsOn:string|null;cadence:'monthly'|'interval'|'once';intervalMonths:number;invoiceRequired:boolean;commissionRecipientId:string|null;commissionMode:'none'|'percentage'|'fixed';commissionValue:string|number|null;updatedAt:string};
export type PlanTermsResponse={clientId:string;archived:boolean;terms:PlanTerms|null;plans:{id:string;name:string}[];collaborators:{id:string;full_name:string}[]};

const isDate=(value:string)=>/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value));
const str=(record:ClientRecord|null|undefined,key:string)=>String(record?.[key]??'');

export const nameError=(value:string)=>value.trim().length<2?'Escribí el nombre del cliente.':null;
export const taxIdError=(value:string)=>!value.trim()||taxIdValid(normalizeTaxId(value)||'')?null:MENSAJE_RUC;
const httpsError=(value:string)=>{if(!value.trim())return null;try{const url=new URL(value.trim());return url.protocol==='https:'&&!url.username&&!url.password?null:'Pegá un enlace HTTPS válido.';}catch{return 'Pegá un enlace HTTPS válido.';}};

const PLAN_KEYS=['plan_plan_id','plan_amount','plan_currency','plan_cadence','plan_interval','plan_starts_on','plan_ends_on','plan_invoice_required'];
const LINK_KEYS=['website','instagram','whatsapp','other'];
const CLIENT_KEYS=['name','email','phone','lifecycle_status','tax_id','legal_name','notes'];

export type ClientFieldOptions={
  mode:'create'|'edit';
  /** Plan y pago sólo existe al editar y con la capacidad de términos comerciales. */
  plan?:PlanTermsResponse|null;
  /** Se abrió para cargar el plan: los campos vacíos son obligatorios. */
  planRequired?:boolean;
  /** Contacto y datos fiscales reservados por rol (Ley 7593/2025): se muestran bloqueados. */
  restricted?:boolean;
  rucLookup?:Field['lookup'];
  rucAfter?:Field['after'];
};

export function clientFields({mode,plan=null,planRequired=false,restricted=false,rucLookup,rucAfter}:ClientFieldOptions):Field[]{
  const S=CLIENT_SECTIONS;
  const fields:Field[]=[
    {key:'name',label:'Nombre',section:S.identity,maxLength:120,validate:nameError},
    ...(mode==='edit'?[{key:'lifecycle_status',label:'Estado del servicio',section:S.identity,choices:clientStatuses,help:'Pausar o cancelar el cliente pausa o cancela sus proyectos activos.'} as Field]:[]),
    {key:'notes',label:'Notas',type:'textarea',optional:true,section:S.identity,maxLength:2000},
    {key:'email',label:'Correo',type:'email',optional:true,section:S.contact,disabled:restricted},
    {key:'phone',label:'Teléfono / WhatsApp',type:'phone',optional:true,section:S.contact,help:PHONE_HELP,disabled:restricted},
    {key:'tax_id',label:'RUC',optional:true,section:S.tax,maxLength:14,disabled:restricted,validate:taxIdError,help:'Podés pegarlo con puntos o espacios; se guarda normalizado. «Buscar» consulta al proveedor y pide tu confirmación antes de aplicar nada.',lookup:rucLookup,after:rucAfter},
    {key:'legal_name',label:'Razón social',optional:true,section:S.tax,maxLength:160,disabled:restricted,help:'Nombre legal para facturas y documentos. Si coincide con el nombre comercial, podés dejarla vacía.'},
  ];
  if(mode==='edit'&&plan){
    const optional=!plan.terms&&!planRequired;
    fields.push(
      {key:'plan_plan_id',label:'Plan',optional:true,choices:[{value:'',label:'Plan personalizado (precio manual)'},...plan.plans.map(item=>({value:String(item.id),label:item.name}))],section:S.plan},
      {key:'plan_amount',label:'Cuánto paga por mes',type:'money',integer:true,optional,currencyKey:'plan_currency',section:S.plan,help:'Solo los roles que gestionan los términos comerciales editan este importe; finanzas lo consulta en la ficha.'},
      {key:'plan_currency',label:'Moneda',choices:[{value:'PYG',label:'PYG · Guaraníes'},{value:'USD',label:'USD · Dólares'}],section:S.plan},
      {key:'plan_cadence',label:'Frecuencia de cobro',choices:[{value:'monthly',label:'Fijo mensual'},{value:'interval',label:'Cada varios meses'},{value:'once',label:'Única vez (no recurrente)'}],section:S.plan,help:'Solo el fijo mensual se proyecta en la previsión financiera.'},
      {key:'plan_interval',label:'Cada cuántos meses',choices:['2','3','4','6','12'].map(value=>({value,label:`${value} meses`})),section:S.plan,help:'Aplica solo con "Cada varios meses".'},
      {key:'plan_starts_on',label:'Inicio comercial',type:'date',optional,section:S.plan},
      {key:'plan_ends_on',label:'Fin del plan · Opcional',type:'date',optional:true,section:S.plan},
      {key:'plan_invoice_required',label:'Factura comercial del cliente',choices:[{value:'true',label:'Sí'},{value:'false',label:'No'}],section:S.plan},
    );
  }
  if(mode==='edit'){
    fields.push(
      {key:'website',label:'Web',type:'url',optional:true,section:S.links,disabled:restricted,validate:httpsError},
      {key:'instagram',label:'Instagram',type:'url',optional:true,section:S.links,disabled:restricted,validate:httpsError},
      {key:'whatsapp',label:'WhatsApp (enlace)',type:'url',optional:true,section:S.links,disabled:restricted,validate:httpsError,help:'Para WhatsApp podés usar https://wa.me/ seguido del número con código de país.'},
      {key:'other',label:'Otros: nombre | enlace (uno por línea)',type:'textarea',optional:true,wide:true,section:S.links,disabled:restricted},
    );
  }
  return fields;
}

export function clientEditDefaults(record:ClientRecord|null,plan:PlanTermsResponse|null):Record<string,string>{
  const base:Record<string,string>={name:str(record,'name'),email:str(record,'email'),phone:str(record,'phone'),lifecycle_status:str(record,'lifecycle_status'),tax_id:str(record,'tax_id'),legal_name:str(record,'legal_name'),notes:str(record,'notes'),...clientLinksDefaults(record?.social_links)};
  if(!plan)return base;
  const terms=plan.terms;
  return {...base,plan_plan_id:terms?.planId||'',plan_amount:terms?String(terms.recurringAmount):'',plan_currency:terms?.currency||'PYG',plan_cadence:terms?.cadence||'monthly',plan_interval:['2','3','4','6','12'].includes(String(terms?.intervalMonths||''))?String(terms?.intervalMonths):'3',plan_starts_on:terms?.startsOn||'',plan_ends_on:terms?.endsOn||'',plan_invoice_required:terms?String(terms.invoiceRequired):'true'};
}
export const CLIENT_CREATE_DEFAULTS:Record<string,string>={name:'',email:'',phone:'',tax_id:'',legal_name:'',notes:''};

/** Alta: mismo cuerpo que el formulario anterior (el API normaliza y revalida). */
export function clientCreatePayload(values:Record<string,string>){
  const payload:Record<string,string>={name:(values.name||'').trim(),email:values.email||'',phone:values.phone||'',tax_id:normalizeTaxId(values.tax_id||'')||'',legal_name:(values.legal_name||'').trim()};
  if((values.notes||'').trim())payload.notes=values.notes.trim();
  return payload;
}

/**
 * Edición: el PATCH lleva sólo lo que cambió. Un campo que no se tocó se
 * conserva tal cual en el API (legado y datos reservados por rol incluidos).
 */
export function clientPatchPayload(values:Record<string,string>,defaults:Record<string,string>){
  const changed=(key:string)=>(values[key]??'')!==(defaults[key]??'');
  const client:Record<string,unknown>={};
  for(const key of CLIENT_KEYS){
    if(!changed(key))continue;
    client[key]=key==='tax_id'?(normalizeTaxId(values[key]||'')||''):key==='name'||key==='legal_name'?(values[key]||'').trim():values[key];
  }
  if(LINK_KEYS.some(changed))client.social_links=buildSocialLinks(values);
  return {client:Object.keys(client).length?client:null,planTouched:PLAN_KEYS.some(changed)};
}

/** Cuerpo del PATCH de /commercial-terms (mismo contrato de siempre); lanza el mensaje si falta algo. */
export function planTermsPayload(values:Record<string,string>,plan:PlanTermsResponse){
  if(!isWholeTransport(values.plan_amount,false))throw Error('Ingresá un importe mensual entero positivo.');
  if(!isDate(values.plan_starts_on))throw Error('Completá la fecha real de inicio comercial.');
  if(values.plan_ends_on&&(!isDate(values.plan_ends_on)||values.plan_ends_on<values.plan_starts_on))throw Error('La fecha de fin debe ser válida y posterior al inicio.');
  const active=plan.terms;
  return {planId:values.plan_plan_id,recurringAmount:values.plan_amount,currency:values.plan_currency,startsOn:values.plan_starts_on,endsOn:values.plan_ends_on||null,cadence:values.plan_cadence,intervalMonths:Number(values.plan_interval||1),invoiceRequired:values.plan_invoice_required==='true',commissionRecipientId:active?.commissionMode==='none'?null:active?.commissionRecipientId||null,commissionMode:active?.commissionMode||'none',commissionValue:active?.commissionMode==='none'?null:active?.commissionValue??null};
}

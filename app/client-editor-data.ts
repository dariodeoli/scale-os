// Contrato de datos del ClientEditor (#184): campos por sección, validadores y
// payloads. Alta y edición comparten los mismos campos y las mismas reglas; el
// API revalida siempre (backend/suite-validation.js). Funciones puras.
import {MENSAJE_RUC,normalizeTaxId,taxIdValid} from 'owncoding-ui/core';
import type {Field} from './operations';
import {PHONE_HELP} from './field-rules';
import {clientLegalName} from './client-identity-data';
import {todayAsuncion} from './client-format';
import {commercialChangeContext} from './commercial-change-context';
import {clientStatuses} from './client-status';
import {isWholeTransport,normalizeWholeMoney} from './amount-format';
import {buildSocialLinks,clientLinksDefaults} from './client-links';

export const CLIENT_SECTIONS={identity:'Identidad',contact:'Contacto',tax:'Fiscal',legal:'Datos para contratos',plan:'Plan y pago',links:'Enlaces'} as const;
export type ClientSectionName=typeof CLIENT_SECTIONS[keyof typeof CLIENT_SECTIONS];

export type ClientRecord={id?:string;[key:string]:unknown};
export type PlanTerms={planId:string;planName:string;recurringAmount:string|number;currency:'PYG'|'USD';startsOn:string;endsOn:string|null;cadence:'monthly'|'interval'|'once';intervalMonths:number;invoiceRequired:boolean;commissionRecipientId:string|null;commissionMode:'none'|'percentage'|'fixed';commissionValue:string|number|null;updatedAt:string};
export type PlanTermsResponse={clientId:string;archived:boolean;terms:PlanTerms|null;revision?:string;historyRevision?:string;plans:{id:string;name:string}[];collaborators:{id:string;full_name:string}[]};

const isDate=(value:string)=>/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value));
const str=(record:ClientRecord|null|undefined,key:string)=>String(record?.[key]??'');

export const nameError=(value:string)=>value.trim().length<2?'Escribí el nombre del cliente.':null;
export const taxIdError=(value:string)=>!value.trim()||taxIdValid(normalizeTaxId(value)||'')?null:MENSAJE_RUC;
const httpsError=(value:string)=>{if(!value.trim())return null;try{const url=new URL(value.trim());return url.protocol==='https:'&&!url.username&&!url.password?null:'Pegá un enlace HTTPS válido.';}catch{return 'Pegá un enlace HTTPS válido.';}};

const PLAN_KEYS=['plan_plan_id','plan_amount','plan_currency','plan_cadence','plan_interval','plan_starts_on','plan_ends_on','plan_invoice_required','plan_effective_from','plan_reason'];
const LINK_KEYS=['website','instagram','whatsapp','other'];
export const CLIENT_LEGAL_KEYS=['address','city','department','document_type','document_number','legal_representative_name','legal_representative_document','legal_representative_role','party_type'] as const;
export const CLIENT_REPRESENTATIVE_LINK='legal_representative_same_as_client';
const CLIENT_KEYS=[CLIENT_REPRESENTATIVE_LINK,...CLIENT_LEGAL_KEYS,'name','email','phone','lifecycle_status','tax_id','legal_name','notes'];

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
    {key:'name',label:'Nombre del cliente',section:S.identity,span:6,maxLength:120,validate:nameError},
    ...(mode==='edit'?[{key:'lifecycle_status',label:'Estado del servicio',section:S.identity,choices:clientStatuses,help:'Pausar o cancelar el cliente pausa o cancela sus proyectos activos.'} as Field]:[]),
    {key:'legal_name',label:'Razón social / nombre legal',optional:true,section:S.identity,span:6,maxLength:160,disabled:restricted,help:'Si está vacío, se usa el nombre del cliente.'},
    {key:'legal_representative_name',label:'Responsable legal',optional:true,section:S.identity,span:6,maxLength:160,disabled:restricted||(values=>values[CLIENT_REPRESENTATIVE_LINK]==='true'),valueFrom:values=>values[CLIENT_REPRESENTATIVE_LINK]==='true'?clientLegalName(values):undefined},
    {key:CLIENT_REPRESENTATIVE_LINK,label:'El responsable legal es el mismo cliente',type:'checkbox',section:S.identity,span:12,disabled:restricted,help:'Vincula sólo los nombres: usa la razón social si está completa, o el nombre del cliente. Los documentos y el cargo se editan por separado.'},
    {key:'notes',label:'Notas',type:'textarea',optional:true,section:S.identity,maxLength:2000},
    {key:'email',label:'Correo',type:'email',optional:true,section:S.contact,disabled:restricted},
    {key:'phone',label:'Teléfono / WhatsApp',type:'phone',optional:true,section:S.contact,help:PHONE_HELP,disabled:restricted},
    {key:'tax_id',label:'RUC',optional:true,section:S.tax,maxLength:14,disabled:restricted,validate:taxIdError,help:'Podés pegarlo con puntos o espacios; se guarda normalizado. «Buscar» consulta al proveedor y pide tu confirmación antes de aplicar nada.',lookup:rucLookup,after:rucAfter},
    {key:'party_type',label:'Tipo de parte contratante',optional:true,section:S.legal,disabled:restricted,choices:[{value:'',label:'Sin definir'},{value:'person',label:'Persona física'},{value:'company',label:'Empresa / persona jurídica'}],help:'Se declara manualmente; no se deduce del RUC.'},
    {key:'document_type',label:'Tipo de documento',optional:true,section:S.legal,disabled:restricted,choices:[{value:'',label:'Sin definir'},{value:'ci',label:'Cédula de identidad'},{value:'ruc',label:'RUC'},{value:'passport',label:'Pasaporte'},{value:'other',label:'Otro'}]},
    {key:'document_number',label:'Número de documento',optional:true,section:S.legal,maxLength:80,disabled:restricted},
    {key:'address',label:'Domicilio contractual',optional:true,section:S.legal,maxLength:400,disabled:restricted},
    {key:'city',label:'Ciudad',optional:true,section:S.legal,maxLength:120,disabled:restricted},
    {key:'department',label:'Departamento',optional:true,section:S.legal,maxLength:120,disabled:restricted},
    {key:'legal_representative_document',label:'Documento del representante legal',optional:true,section:S.legal,maxLength:80,disabled:restricted},
    {key:'legal_representative_role',label:'Cargo del representante legal',optional:true,section:S.legal,maxLength:120,disabled:restricted},
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
      {key:'plan_effective_from',label:'Vigente desde',type:'date',optional:true,section:S.plan,help:'Primer día del mes desde el que rige este cambio; no reemplaza el inicio comercial.'},
      {key:'plan_reason',label:'Motivo del cambio',type:'textarea',optional:true,section:S.plan,maxLength:1000,help:'Obligatorio al modificar el plan o sus condiciones (5 a 1000 caracteres).'},
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
  const base:Record<string,string>={[CLIENT_REPRESENTATIVE_LINK]:record?.[CLIENT_REPRESENTATIVE_LINK]===true?'true':'false',...Object.fromEntries(CLIENT_LEGAL_KEYS.map(key=>[key,str(record,key)])),name:str(record,'name'),email:str(record,'email'),phone:str(record,'phone'),lifecycle_status:str(record,'lifecycle_status'),tax_id:str(record,'tax_id'),legal_name:str(record,'legal_name'),notes:str(record,'notes'),...clientLinksDefaults(record?.social_links)};
  if(!plan)return base;
  const terms=plan.terms;
  return {...base,plan_effective_from:todayAsuncion().slice(0,7)+'-01',plan_reason:'',plan_plan_id:terms?.planId||'',plan_amount:terms?(normalizeWholeMoney(terms.recurringAmount)??String(terms.recurringAmount)):'',plan_currency:terms?.currency||'PYG',plan_cadence:terms?.cadence||'monthly',plan_interval:['2','3','4','6','12'].includes(String(terms?.intervalMonths||''))?String(terms?.intervalMonths):'3',plan_starts_on:terms?.startsOn||'',plan_ends_on:terms?.endsOn||'',plan_invoice_required:terms?String(terms.invoiceRequired):'true'};
}
export const CLIENT_CREATE_DEFAULTS:Record<string,string>={[CLIENT_REPRESENTATIVE_LINK]:'false',...Object.fromEntries(CLIENT_LEGAL_KEYS.map(key=>[key,''])),name:'',email:'',phone:'',tax_id:'',legal_name:'',notes:''};

/** Alta: mismo cuerpo que el formulario anterior (el API normaliza y revalida). */
export function clientCreatePayload(values:Record<string,string>){
  const payload:Record<string,unknown>={[CLIENT_REPRESENTATIVE_LINK]:values[CLIENT_REPRESENTATIVE_LINK]==='true',name:(values.name||'').trim(),email:values.email||'',phone:values.phone||'',tax_id:normalizeTaxId(values.tax_id||'')||'',legal_name:(values.legal_name||'').trim()};
  for(const key of CLIENT_LEGAL_KEYS)if((values[key]||'').trim())payload[key]=values[key].trim();
  if(values[CLIENT_REPRESENTATIVE_LINK]==='true')payload.legal_representative_name=clientLegalName(values);
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
    client[key]=key===CLIENT_REPRESENTATIVE_LINK?values[key]==='true':key==='tax_id'?(normalizeTaxId(values[key]||'')||''):key==='name'||key==='legal_name'||CLIENT_LEGAL_KEYS.some(field=>field===key)?(values[key]||'').trim():values[key];
  }
  if(LINK_KEYS.some(changed))client.social_links=buildSocialLinks(values);
  return {client:Object.keys(client).length?client:null,planTouched:PLAN_KEYS.some(changed)};
}

/** Cuerpo del PATCH de /commercial-terms (mismo contrato de siempre); lanza el mensaje si falta algo. */
export function planTermsPayload(values:Record<string,string>,plan:PlanTermsResponse,requestId:string){
  const context=commercialChangeContext({effectiveFrom:values.plan_effective_from,reason:values.plan_reason||''},plan.historyRevision,requestId);
  const recurringAmount=normalizeWholeMoney(values.plan_amount);
  if(recurringAmount===null||!isWholeTransport(recurringAmount,false))throw Error('Ingresá un importe mensual entero positivo.');
  if(!isDate(values.plan_starts_on))throw Error('Completá la fecha real de inicio comercial.');
  if(values.plan_ends_on&&(!isDate(values.plan_ends_on)||values.plan_ends_on<values.plan_starts_on))throw Error('La fecha de fin debe ser válida y posterior al inicio.');
  const active=plan.terms;
  return {...context,planId:values.plan_plan_id,recurringAmount,currency:values.plan_currency,startsOn:values.plan_starts_on,endsOn:values.plan_ends_on||null,cadence:values.plan_cadence,intervalMonths:Number(values.plan_interval||1),invoiceRequired:values.plan_invoice_required==='true',commissionRecipientId:active?.commissionMode==='none'?null:active?.commissionRecipientId||null,commissionMode:active?.commissionMode||'none',commissionValue:active?.commissionMode==='none'?null:active?.commissionValue??null};
}

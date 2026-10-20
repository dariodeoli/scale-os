import {friendlyTransportError} from './data-cache';
export type ContractSource={source:string;record_id?:string;verified_at?:string};
export type ContractModel={key:string;name:string;agreement_type:string;body:string;required_fields:string[]};
export type ContractTemplate={id:string;name:string;agreement_type:string;body:string;required_fields:string[];revision:number};
export type ContractRecord={id:string;title:string;body:string;template_id:string;variables:Record<string,string>;sources:Record<string,ContractSource>;revision:number;required_fields?:string[];updated_at?:string;client_id?:string;collaborator_id?:string;bank_account_id?:string};
export type ContractVersion={id:string;version:number;created_at:string};
export type ContractConfig={capabilities:{view:boolean;create:boolean;edit:boolean;templates_manage:boolean;issue:boolean;bank_data_view:boolean;assist:boolean};clients:{id:string;name:string;legal_name?:string|null;logo_url?:string|null}[];collaborators:{id:string;name:string;photo_url?:string|null}[];bank_accounts:{id:string;name:string}[];budgets?:{id:string;name:string;client_id:string}[];plans?:{id:string;name:string}[]};
export class ContractRequestError extends Error{constructor(message:string,public status:number){super(message);}}
export async function contractRequest<T>(path:string,body?:unknown,method='POST',signal?:AbortSignal):Promise<T>{
 let response:Response;
 try{response=await fetch(`/core-api${path}`,{method:body===undefined?'GET':method,credentials:'include',cache:'no-store',signal:signal??(body===undefined?AbortSignal.timeout(15000):undefined),headers:body===undefined?{}:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});}catch(cause){throw friendlyTransportError(cause);}
 let data:unknown;
 try{data=await response.json();}catch{throw new ContractRequestError(response.ok?'El servidor devolvió una respuesta inválida. Reintentá.':response.status>=500?'El servidor no pudo completar la operación. Probá de nuevo en unos segundos.':`No se pudo completar la operación (HTTP ${response.status}).`,response.status);}
 if(!response.ok)throw new ContractRequestError(response.status===409?'El documento cambió en otra sesión. Tu edición se conserva; recargá explícitamente para usar la versión actual.':isRecord(data)&&typeof data.error==='string'?data.error:'No se pudo completar la operación.',response.status);
 return data as T;
}
export const contractMessage=(error:unknown)=>error instanceof Error?error.message:'No se pudo completar la operación.';
export function renderContractText(body:string,variables:Record<string,string>,allowed:string[]){const whitelist=new Set(allowed);return body.replace(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g,(token,key)=>whitelist.has(key)&&variables[key]?.trim()?variables[key]:token);}
export function contractMissing(body:string,variables:Record<string,string>,required:string[]=[]){return [...new Set([...required,...Array.from(body.matchAll(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g),match=>match[1])])].filter(key=>!variables[key]?.trim());}
export function manualContractSources(previous:Record<string,ContractSource>,before:Record<string,string>,after:Record<string,string>){const sources={...previous};for(const [key,value] of Object.entries(after))if(value!==before[key])sources[key]={source:'manual'};return sources;}

const variableNames:Record<string,string>={
 'company.name':'Nombre de mi empresa','company.tax_id':'RUC de mi empresa','company.legal_representative_name':'Representante legal de mi empresa','counterparty.tax_id':'RUC del cliente / contraparte','counterparty.legal_representative_name':'Representante legal del cliente / contraparte','bank.institution':'Banco','bank.holder_name':'Titular de la cuenta',
 'company.legal_name':'Razón social de mi empresa','company.trade_name':'Nombre comercial de mi empresa','company.ruc':'RUC de mi empresa','company.address':'Domicilio de mi empresa','company.city':'Ciudad de mi empresa','company.department':'Departamento de mi empresa','company.legal_representative':'Representante de mi empresa','company.legal_representative_document':'Documento del representante de mi empresa','company.legal_representative_role':'Cargo del representante de mi empresa','company.email':'Correo de mi empresa','company.phone':'Teléfono de mi empresa',
 'counterparty.signer_name':'Firmante del cliente / contraparte','counterparty.signer_document':'Documento del firmante del cliente / contraparte','counterparty.name':'Nombre o razón social del cliente / contraparte','counterparty.legal_name':'Razón social del cliente / contraparte','counterparty.ruc':'RUC del cliente / contraparte','counterparty.document_type':'Tipo de documento del cliente / contraparte','counterparty.document':'Documento del cliente / contraparte','counterparty.document_number':'Número de documento del cliente / contraparte','counterparty.party_type':'Tipo de persona del cliente / contraparte','counterparty.address':'Domicilio del cliente / contraparte','counterparty.city':'Ciudad del cliente / contraparte','counterparty.department':'Departamento del cliente / contraparte','counterparty.legal_representative':'Representante del cliente / contraparte','counterparty.legal_representative_document':'Documento del representante del cliente / contraparte','counterparty.legal_representative_role':'Cargo del representante del cliente / contraparte','counterparty.email':'Correo del cliente / contraparte','counterparty.phone':'Teléfono del cliente / contraparte',
 'agreement.type':'Tipo de contrato','agreement.signed_on':'Fecha de firma','agreement.signing_city':'Ciudad de firma','agreement.title':'Nombre del servicio','agreement.scope':'Alcance del servicio','agreement.deliverables':'Contenido y entregables','agreement.exclusions':'Servicios excluidos','agreement.payment_terms':'Condiciones de pago','agreement.delivery_terms':'Plazos y condiciones de entrega','agreement.renewal_terms':'Renovación','agreement.cancellation_terms':'Cancelación y terminación','agreement.corrections_terms':'Revisiones y correcciones','agreement.client_obligations':'Responsabilidades del cliente','agreement.intellectual_property':'Propiedad intelectual','agreement.portfolio_terms':'Uso en portafolio','agreement.confidentiality_terms':'Confidencialidad','agreement.jurisdiction':'Jurisdicción','agreement.amount_in_words':'Importe en letras','agreement.tax_terms':'Impuestos y facturación','agreement.plan_name':'Plan elegido','agreement.notes':'Observaciones','agreement.amount':'Importe del contrato','agreement.currency':'Moneda del contrato','agreement.starts_on':'Inicio de vigencia','agreement.ends_on':'Fin de vigencia',
 'bank.bank_name':'Banco','bank.account_number':'Número de cuenta','bank.account_holder':'Titular de cuenta','bank.currency':'Moneda de la cuenta','bank.account_type':'Tipo de cuenta',
};
export function contractVariableLabel(key:string){return variableNames[key]||key.replace(/^(company|counterparty|agreement|bank)\./,prefix=>({'company.':'Mi empresa · ','counterparty.':'Cliente / contraparte · ','agreement.':'Condiciones · ','bank.':'Banco · '}[prefix]||'')).replace(/_/g,' ');}
export function contractVariableSection(key:string){return key.startsWith('company.')?'Mi empresa':key.startsWith('counterparty.')?'Cliente o contraparte':key.startsWith('bank.')?'Datos bancarios':'Contenido y condiciones';}
export const contractMultilineVariables=new Set(['agreement.scope','agreement.deliverables','agreement.exclusions','agreement.payment_terms','agreement.delivery_terms','agreement.renewal_terms','agreement.cancellation_terms','agreement.corrections_terms','agreement.client_obligations','agreement.intellectual_property','agreement.portfolio_terms','agreement.confidentiality_terms','agreement.tax_terms','agreement.notes']);
export function mergeContractAutofill(draft:ContractRecord,incoming:{variables:Record<string,string>;sources:Record<string,ContractSource>},replace=false){
 const variables={...draft.variables},sources={...draft.sources};
 for(const [key,value] of Object.entries(incoming.variables))if(value.trim()&&(replace||!variables[key]?.trim())){variables[key]=value;sources[key]=incoming.sources[key]||{source:'manual'};}
 return {...draft,variables,sources};
}

const isRecord=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value);
const named=(row:unknown)=>isRecord(row)&&(typeof row.id==='string'||typeof row.id==='number')&&typeof row.name==='string';
const invalid=()=>new Error('El servidor devolvió datos incompletos de contratos. Reintentá.');
/** Validate before committing state: an HTML/partial success must stay a retryable error. */
export function contractConfig(value:unknown):ContractConfig{
 if(!isRecord(value)||!isRecord(value.capabilities)||typeof value.capabilities.view!=='boolean')throw invalid();
 if(value.capabilities.view===false)return value as ContractConfig;
 if(!['create','edit','templates_manage','issue','bank_data_view','assist'].every(key=>typeof (value.capabilities as Record<string,unknown>)[key]==='boolean')||!['clients','collaborators','bank_accounts'].every(key=>Array.isArray(value[key])&&(value[key] as unknown[]).every(named))||!['budgets','plans'].every(key=>value[key]===undefined||Array.isArray(value[key])&&(value[key] as unknown[]).every(named)))throw invalid();
 return value as ContractConfig;
}
export function contractList(value:unknown):ContractRecord[]{
 if(!isRecord(value)||!Array.isArray(value.contracts)||!value.contracts.every(row=>isRecord(row)&&(typeof row.id==='string'||typeof row.id==='number')&&typeof row.title==='string'))throw invalid();
 return value.contracts as ContractRecord[];
}
export function contractTemplates(value:unknown):{templates:ContractTemplate[];variables:string[]}{
 if(!isRecord(value)||!Array.isArray(value.templates)||!value.templates.every(row=>named(row)&&isRecord(row)&&typeof row.body==='string'&&Array.isArray(row.required_fields)&&row.required_fields.every(key=>typeof key==='string'))||!Array.isArray(value.variables)||!value.variables.every(key=>typeof key==='string'))throw invalid();
 return value as {templates:ContractTemplate[];variables:string[]};
}

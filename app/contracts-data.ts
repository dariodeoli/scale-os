export type ContractSource={source:string;record_id?:string;verified_at?:string};
export type ContractTemplate={id:string;name:string;agreement_type:string;body:string;required_fields:string[];revision:number};
export type ContractRecord={id:string;title:string;body:string;template_id:string;variables:Record<string,string>;sources:Record<string,ContractSource>;revision:number;required_fields?:string[];updated_at?:string;client_id?:string;collaborator_id?:string;bank_account_id?:string};
export type ContractVersion={id:string;version:number;created_at:string};
export type ContractConfig={capabilities:{view:boolean;create:boolean;edit:boolean;templates_manage:boolean;issue:boolean;bank_data_view:boolean;assist:boolean};clients:{id:string;name:string}[];collaborators:{id:string;name:string}[];bank_accounts:{id:string;name:string}[]};
export class ContractRequestError extends Error{constructor(message:string,public status:number){super(message);}}
export async function contractRequest<T>(path:string,body?:unknown,method='POST',signal?:AbortSignal):Promise<T>{
 const response=await fetch(`/core-api${path}`,{method:body===undefined?'GET':method,credentials:'include',cache:'no-store',signal,headers:body===undefined?{}:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
 const data=await response.json().catch(()=>({error:'El servidor devolvió una respuesta inválida.'}));
 if(!response.ok)throw new ContractRequestError(response.status===409?'El documento cambió en otra sesión. Tu edición se conserva; recargá explícitamente para usar la versión actual.':data.error||'No se pudo completar la operación.',response.status);
 return data as T;
}
export const contractMessage=(error:unknown)=>error instanceof Error?error.message:'No se pudo completar la operación.';
export function renderContractText(body:string,variables:Record<string,string>,allowed:string[]){const whitelist=new Set(allowed);return body.replace(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g,(token,key)=>whitelist.has(key)&&variables[key]?.trim()?variables[key]:token);}
export function contractMissing(body:string,variables:Record<string,string>,required:string[]=[]){return [...new Set([...required,...Array.from(body.matchAll(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g),match=>match[1])])].filter(key=>!variables[key]?.trim());}
export function manualContractSources(previous:Record<string,ContractSource>,before:Record<string,string>,after:Record<string,string>){const sources={...previous};for(const [key,value] of Object.entries(after))if(value!==before[key])sources[key]={source:'manual'};return sources;}

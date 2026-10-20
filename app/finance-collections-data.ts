/** Validate financial reads before publishing any partial response to the UI. */
export type CollectionNamed={id:string;name:string;active?:boolean;client_id?:string|null;logo_url?:string|null;legal_name?:string|null;tax_id?:string|null;institution?:string|null;custodian_name?:string|null;custodian_photo_url?:string|null};
export type CollectionInvoice={id:string;number:string;client_id:string;currency:string;total:string;paid_amount:string;status:string};
export type CollectionsContext={clients:CollectionNamed[];projects:CollectionNamed[];plans:CollectionNamed[];accounts:(CollectionNamed&{currency:string})[];invoices:CollectionInvoice[];receivers?:{id:string;full_name:string;photo_url?:string|null}[];truncated?:Record<string,boolean>};
const record=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value);
const identifier=(value:unknown)=>typeof value==='string'||typeof value==='number';
const named=(value:unknown)=>record(value)&&identifier(value.id)&&typeof value.name==='string';
export const invalidCollections=()=>new Error('El servidor devolvió datos incompletos de cobranza. Reintentá.');
export function collectionsContext(value:unknown):CollectionsContext{
 if(!record(value)||!['clients','projects','plans','accounts','invoices'].every(key=>Array.isArray(value[key])))throw invalidCollections();
 if(!['clients','projects','plans','accounts'].every(key=>(value[key] as unknown[]).every(named))||!(value.accounts as Record<string,unknown>[]).every(row=>typeof row.currency==='string')||!(value.invoices as unknown[]).every(row=>record(row)&&identifier(row.id)&&identifier(row.client_id)&&['number','currency','status'].every(key=>typeof row[key]==='string')&&identifier(row.total)&&identifier(row.paid_amount)))throw invalidCollections();
 if(value.receivers!==undefined&&(!Array.isArray(value.receivers)||!value.receivers.every(row=>record(row)&&identifier(row.id)&&typeof row.full_name==='string')))throw invalidCollections();
 return value as CollectionsContext;
}
export function collectionRows<T>(value:unknown,key:string):T[]{
 if(!record(value)||!Array.isArray(value[key])||!(value[key] as unknown[]).every(row=>record(row)&&identifier(row.id)))throw invalidCollections();
 return value[key] as T[];
}

export type DueAlert={id:string;type:string;name:string;due:string;context?:string};
export type Total={currency:string;total:string};
export type CommercialDashboard={activeClients:number;activeProspects:number;expectedMonthlyBilling?:Total[]};
type UnknownRecord=Record<string,unknown>;

const isRecord=(value:unknown):value is UnknownRecord=>typeof value==='object'&&value!==null&&!Array.isArray(value);
const count=(value:unknown)=>typeof value==='number'&&Number.isInteger(value)&&value>=0?value:null;
const amount=(value:unknown)=>{
 if((typeof value!=='string'||!value.trim())&&typeof value!=='number')return null;
 const parsed=Number(value);
 return Number.isFinite(parsed)?parsed:null;
};

/** Converts the canonical control-center response without guessing a currency or a missing billing total. */
export function normalizeCommercialDashboard(value:unknown):CommercialDashboard{
 if(!isRecord(value))throw Error('No se pudo validar el resumen comercial.');
 const activeClients=count(value.active_clients),activeProspects=count(value.active_prospects);
 if(activeClients===null||activeProspects===null)throw Error('No se pudo validar el resumen comercial.');
 const summary:CommercialDashboard={activeClients,activeProspects};
 if(value.contracted_billing===undefined||value.contracted_billing===null)return summary;
 if(!isRecord(value.contracted_billing))throw Error('No se pudo validar el resumen comercial.');
 if(value.contracted_billing.available===false){
  if(value.contracted_billing.reason!=='permission')throw Error('No se pudo validar el resumen comercial.');
  return summary;
 }
 if(!Array.isArray(value.contracted_billing.records))throw Error('No se pudo validar el resumen comercial.');
 const totals=new Map<string,number>();
 for(const record of value.contracted_billing.records){
  if(!isRecord(record)||typeof record.currency!=='string'||!/^[A-Z]{3}$/.test(record.currency)||amount(record.net_monthly)===null)throw Error('No se pudo validar el resumen comercial.');
  const currency=record.currency,netMonthly=amount(record.net_monthly)!;
  totals.set(currency,(totals.get(currency)||0)+netMonthly);
 }
 summary.expectedMonthlyBilling=Array.from(totals,([currency,total])=>({currency,total:String(total)})).sort((a,b)=>a.currency.localeCompare(b.currency));
 return summary;
}
export function normalizeSearch(value:string){return value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLocaleLowerCase('es');}
/** Group presentation only. Keep every identity for inspection and editing. */
export function groupDueAlerts(alerts:DueAlert[]){
 const groups=new Map<string,{key:string;name:string;due:string;type:string;items:DueAlert[]}>();
 for(const alert of alerts){
  const due=alert.due.slice(0,10),key=JSON.stringify([alert.type,normalizeSearch(alert.name),due]);
  const group=groups.get(key)||{key,name:alert.name.trim(),due,type:alert.type,items:[]};
  group.items.push(alert);groups.set(key,group);
 }
 return Array.from(groups.values()).sort((a,b)=>a.due.localeCompare(b.due)||a.name.localeCompare(b.name,'es'));
}
export function shortDate(value:string){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value.slice(0,10)))return 'Sin fecha';
 const date=new Date(value.slice(0,10)+'T12:00:00Z');
 return Number.isNaN(date.valueOf())?'Sin fecha':date.toLocaleDateString('es-PY',{day:'numeric',month:'short',timeZone:'UTC'});
}

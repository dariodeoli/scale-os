export type DueAlert={id:string;type:string;name:string;due:string;context?:string};
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

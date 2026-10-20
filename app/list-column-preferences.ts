/** Self-owned display preferences; keys never authorize fields or data. */
export type ListColumnPreference={order:string[];hidden:string[]};
export type ListColumnPreferences=Record<string,ListColumnPreference>;
export type ConfigurableColumn={key:string;label:string;align?:'start'|'center'|'end';required?:boolean;description?:string};
const keyPattern=/^[a-zA-Z0-9][a-zA-Z0-9_.:-]{0,63}$/;
export function parseListColumnPreferences(value:unknown):ListColumnPreferences{
 if(!value||typeof value!=='object'||Array.isArray(value))return {};
 const result:ListColumnPreferences={};
 for(const [list,entry] of Object.entries(value).slice(0,100)){
  if(!/^[a-z0-9:/_.-]{1,160}$/.test(list)||['__proto__','constructor','prototype'].includes(list)||!entry||typeof entry!=='object'||Array.isArray(entry))continue;
  const row=entry as Partial<ListColumnPreference>;
  const clean=(keys:unknown)=>Array.isArray(keys)?[...new Set(keys.filter((key):key is string=>typeof key==='string'&&keyPattern.test(key)&&!['__proto__','constructor','prototype'].includes(key)))].slice(0,32):[];
  result[list]={order:clean(row.order),hidden:clean(row.hidden)};
 }
 return result;
}
export function columnListKey(pathname:string,label:string){
 const slug=label.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9_.-]+/g,'-').replace(/^-|-$/g,'');
 return `${pathname.replace(/[^a-z0-9/_.-]/gi,'').toLowerCase()}:${slug}`.slice(0,160);
}
export function resolveListColumns(columns:ConfigurableColumn[],preference?:ListColumnPreference,pinnedActions=false){
 const available=columns.map(column=>column.key),saved=preference?.order??[];
 let order=[...new Set([...saved.filter(key=>available.includes(key)),...available])];
 if(pinnedActions&&available.length){const pinned=available[available.length-1];order=[...order.filter(key=>key!==pinned),pinned];}
 const required=new Set(columns.filter((column,index)=>column.required||index===0).map(column=>column.key));
 const hidden=new Set((preference?.hidden??[]).filter(key=>available.includes(key)&&!required.has(key)));
 return {order,hidden,required,indices:order.filter(key=>!hidden.has(key)).map(key=>available.indexOf(key))};
}
/** Tailwind track lists used by the canonical dense tables. Inline tracks keep
 * each header and its data cell together when the display order changes. */
export function listGridTracks(template:string,count:number,variables=''):string[]|null{
 const variable=template.match(/grid-cols-\[var\((--[a-zA-Z0-9-]+)\)\]/)?.[1];
 if(variable){const value=variables.match(new RegExp('\\['+variable+':([^\\]]+)\\]'))?.[1];return value?listGridTracks(`grid-cols-[${value}]`,count):null;}
 const arbitrary=template.match(/(?:^|\s)grid-cols-\[([^\]]+)\](?:\s|$)/)?.[1];
 if(arbitrary){let depth=0,track='',tracks:string[]=[];for(const char of arbitrary){if(char==='(')depth++;if(char===')')depth--;if(char==='_'&&depth===0){tracks.push(track);track='';}else track+=char==='_'?' ':char;}tracks.push(track);return tracks.length===count?tracks:null;}
 return new RegExp(`(?:^|\\s)grid-cols-${count}(?:\\s|$)`).test(template)?Array(count).fill('minmax(0,1fr)'):null;
}

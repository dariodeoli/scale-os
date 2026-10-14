// Períodos de las métricas del panel global (guía §3). Lógica pura, sin base:
// rango en días de Asunción, el período anterior de IGUAL duración y las piezas
// SQL para agrupar por día local (nunca en UTC).
export const ZONE='America/Asuncion';
export const MAX_DAYS=180;
const DAY=/^\d{4}-\d{2}-\d{2}$/;
const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
export const iso=date=>date.toISOString().slice(0,10);
export const shift=(date,days)=>new Date(date.getTime()+days*86400000);
export function parseDay(value,label){
 if(!DAY.test(value||''))fail(`${label} debe tener formato AAAA-MM-DD.`);
 const date=new Date(value+'T00:00:00Z');
 if(Number.isNaN(date.getTime())||date.toISOString().slice(0,10)!==value)fail(`${label} no es una fecha válida.`);
 return date;
}
/** Hoy en Asunción como fecha UTC a las 00:00 (el día de calendario local). */
export const todayAsuncion=(now=new Date())=>parseDay(new Intl.DateTimeFormat('en-CA',{timeZone:ZONE,year:'numeric',month:'2-digit',day:'2-digit'}).format(now),'Hoy');
/** Período pedido (`from`/`to`, por defecto los últimos 30 días) y el anterior de igual duración. */
export function periodFromQuery(searchParams,{now=new Date(),defaultDays=30}={}){
 const toRaw=searchParams.get('to'),fromRaw=searchParams.get('from');
 const to=toRaw?parseDay(toRaw,'to'):todayAsuncion(now);
 const from=fromRaw?parseDay(fromRaw,'from'):shift(to,-(defaultDays-1));
 if(from>to)fail('El rango es inválido: from es posterior a to.');
 const days=Math.round((to-from)/86400000)+1;
 if(days>MAX_DAYS)fail(`El rango máximo es de ${MAX_DAYS} días.`);
 return period(from,to);
}
export function period(from,to){
 const days=Math.round((to-from)/86400000)+1,prevFrom=shift(from,-days);
 return {from,to,days,prevFrom,f:iso(from),t:iso(to),p:iso(prevFrom),pt:iso(shift(from,-1)),
  range:{from:iso(from),to:iso(to),days,previous_from:iso(prevFrom),previous_to:iso(shift(from,-1)),timezone:ZONE}};
}
/** Columna timestamptz convertida a la hora local de Asunción. */
export const local=column=>`(${column} at time zone '${ZONE}')`;
/** Día local de Asunción de una columna timestamptz. */
export const localDay=column=>`${local(column)}::date`;
// Rango sargable sobre la columna cruda (índices de 20261014_usage_indexes): el filtro por
// día local (`at time zone`) no puede usar un índice, así que se le suma un rango sobre el
// timestamptz con un día de margen a cada lado. Es un superconjunto del filtro local, que
// sigue aplicándose: los resultados no cambian. Los marcadores permiten a los tests
// quitarlo y comparar que la salida sea idéntica.
export const midnight=day=>`((${day})::timestamp at time zone '${ZONE}')`;
export const indexed=sql=>`/*idx:start*/ and ${sql} /*idx:end*/`;
export const rawRange=(column,fromDay,toDayExclusive)=>indexed(`${column}>=${midnight(fromDay)}-interval '1 day' and ${column}<${midnight(toDayExclusive)}+interval '1 day'`);

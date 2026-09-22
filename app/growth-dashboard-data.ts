// Capa de datos de Métricas / crecimiento (SOS-COM, campaña #41 / spec #43 §3).
// Funciones puras sobre los eventos reales de `GET /api/metrics`:
// {name,event_date,count} con name ∈ page_view | mobile_view | whatsapp_click.
export type GrowthMetricName='page_view'|'mobile_view'|'whatsapp_click';

export type GrowthEvent={name:string;event_date:string;count:number};

export const GROWTH_METRICS:{name:GrowthMetricName;label:string}[]=[
 {name:'page_view',label:'Páginas vistas'},
 {name:'mobile_view',label:'Vistas desde móvil'},
 {name:'whatsapp_click',label:'Clics en WhatsApp'},
];

export type GrowthWindow={currentStart:Date;previousStart:Date;end:Date;dayKeys:string[]};

/** Clave YYYY-MM-DD en calendario local (el shell ya usa hora del dispositivo). */
export const growthDayKey=(date:Date)=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;

/** Ventana actual (days) y la anterior de igual largo, con sus claves diarias. */
export function growthWindow(days:number,today:Date=new Date()):GrowthWindow{
 const end=new Date(today.getFullYear(),today.getMonth(),today.getDate());
 const currentStart=new Date(end);currentStart.setDate(end.getDate()-days+1);
 const previousStart=new Date(currentStart);previousStart.setDate(currentStart.getDate()-days);
 const dayKeys=Array.from({length:days},(_,index)=>{const date=new Date(currentStart);date.setDate(date.getDate()+index);return growthDayKey(date);});
 return {currentStart,previousStart,end,dayKeys};
}

/** Suma de un evento en la ventana actual o la anterior. */
export function growthSum(events:readonly GrowthEvent[],name:string,window:GrowthWindow,previous=false):number{
 const from=previous?window.previousStart:window.currentStart;
 const to=previous?window.currentStart:new Date(window.end.getFullYear(),window.end.getMonth(),window.end.getDate()+1);
 return events.filter(event=>event.name===name&&event.event_date>=growthDayKey(from)&&event.event_date<growthDayKey(to)).reduce((total,event)=>total+event.count,0);
}

/** Serie diaria de un evento dentro de la ventana. */
export function metricSeries(events:readonly GrowthEvent[],name:string,window:GrowthWindow){
 return window.dayKeys.map(day=>({day,count:events.filter(event=>event.event_date===day&&event.name===name).reduce((total,event)=>total+event.count,0)}));
}

/** Variación porcentual contra el período anterior; null sin base. */
export function growthVariation(current:number,previous:number):number|null{
 return previous?((current-previous)/previous*100):null;
}

export function growthSeries(events:readonly GrowthEvent[],days:number,today=new Date()){
 const window=growthWindow(days,today);
 const sum=(name:string,previous=false)=>growthSum(events,name,window,previous);
 const metrics=GROWTH_METRICS.map(metric=>{
  const current=sum(metric.name),previous=sum(metric.name,true);
  return {name:metric.name,label:metric.label,current,previous,variation:growthVariation(current,previous),points:metricSeries(events,metric.name,window)};
 });
 return {sum,points:metrics[0].points,metrics};
}

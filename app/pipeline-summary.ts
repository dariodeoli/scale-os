// Capa de datos del pipeline (SOS-COM, campaña #41 / spec #43 §2).
// Funciones puras: resumen ejecutivo y totales por etapa del tablero.
// Campos reales de `agency_leads` (schema + migración de etapas):
// id,name,email,phone,stage,amount,currency,probability,notes,client_id,created_at,updated_at.
export type LeadStageKind='open'|'won'|'lost';

export type LeadStage={
 id?:string;
 slug:string;
 label:string;
 position:number;
 active:boolean;
 kind:LeadStageKind;
};

export type LeadOpportunity={
 id?:string|number;
 name?:string;
 email?:string|null;
 phone?:string|null;
 stage?:string;
 amount?:string|number|null;
 currency?:string|null;
 probability?:string|number|null;
 notes?:string|null;
 client_id?:string|number|null;
 created_at?:string|null;
 updated_at?:string|null;
};

export type StageTotals={
 stage:string;
 label:string;
 count:number;
 /** Σ amount × probability/100 por moneda (mismo cálculo que la columna). */
 weighted:Record<string,number>;
 /** Σ amount por moneda, sin ponderar (dato secundario del rediseño). */
 open:Record<string,number>;
};

// Un monto vacío o inválido es dato ausente, nunca 0: no se inventan totales.
function numeroDe(value:unknown):number|null{
 if(value===null||value===undefined)return null;
 const raw=String(value).trim();
 if(raw==='')return null;
 const numero=Number(raw);
 return Number.isFinite(numero)?numero:null;
}

export function pipelineSummary(rows:readonly LeadOpportunity[]){
 const open=rows.filter(r=>!['won','lost'].includes(String(r.stage)));
 const amounts:Record<string,number>={};
 for(const row of open){const amount=numeroDe(row.amount);if(amount===null)continue;const currency=String(row.currency||'PYG');amounts[currency]=(amounts[currency]||0)+amount;}
 return{open:open.length,won:rows.filter(r=>r.stage==='won').length,web:rows.filter(r=>String(r.notes||'').startsWith('Origen: landing Scale OS.')).length,amounts};
}

/**
 * Σ amount × probability/100 por moneda (la definición única del ponderado del
 * pipeline): la columna del tablero y los totales por etapa leen de acá. Un par
 * no numérico se omite en vez de ensuciar la suma con NaN.
 */
export function weightedAmounts(rows:readonly LeadOpportunity[]):Record<string,number>{
 const totals:Record<string,number>={};
 for(const row of rows){
  const amount=numeroDe(row.amount),probability=numeroDe(row.probability);
  if(amount===null||probability===null)continue;
  const currency=String(row.currency||'PYG');
  totals[currency]=(totals[currency]||0)+amount*probability/100;
 }
 return totals;
}

/**
 * Totales por columna del tablero (ponderado y abierto por moneda). Incluye
 * las etapas desconocidas que hoy traen filas históricas, con el slug de label.
 */
export function stageTotals(rows:readonly LeadOpportunity[],stages:readonly LeadStage[]):StageTotals[]{
 const totals=new Map<string,StageTotals>();
 const rowsByStage=new Map<string,LeadOpportunity[]>();
 for(const stage of stages)totals.set(stage.slug,{stage:stage.slug,label:stage.label,count:0,weighted:{},open:{}});
 for(const row of rows){
  const slug=String(row.stage||'');
  if(!slug)continue;
  let entry=totals.get(slug);
  if(!entry){entry={stage:slug,label:slug,count:0,weighted:{},open:{}};totals.set(slug,entry);}
  entry.count+=1;
  const list=rowsByStage.get(slug);
  if(list)list.push(row);else rowsByStage.set(slug,[row]);
  const amount=numeroDe(row.amount);
  if(amount!==null){const currency=String(row.currency||'PYG');entry.open[currency]=(entry.open[currency]||0)+amount;}
 }
 for(const [slug,entry] of totals)entry.weighted=weightedAmounts(rowsByStage.get(slug)||[]);
 return [...totals.values()];
}

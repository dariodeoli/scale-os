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

export function pipelineSummary(rows:readonly LeadOpportunity[]){
 const open=rows.filter(r=>!['won','lost'].includes(String(r.stage)));
 const amounts:Record<string,number>={};
 for(const row of open){const currency=String(row.currency||'PYG'),amount=Number(row.amount);if(Number.isFinite(amount))amounts[currency]=(amounts[currency]||0)+amount;}
 return{open:open.length,won:rows.filter(r=>r.stage==='won').length,web:rows.filter(r=>String(r.notes||'').startsWith('Origen: landing Scale OS.')).length,amounts};
}

/**
 * Totales por columna del tablero (ponderado y abierto por moneda). Incluye
 * las etapas desconocidas que hoy traen filas históricas, con el slug de label.
 */
export function stageTotals(rows:readonly LeadOpportunity[],stages:readonly LeadStage[]):StageTotals[]{
 const totals=new Map<string,StageTotals>();
 for(const stage of stages)totals.set(stage.slug,{stage:stage.slug,label:stage.label,count:0,weighted:{},open:{}});
 for(const row of rows){
  const slug=String(row.stage||'');
  if(!slug)continue;
  let entry=totals.get(slug);
  if(!entry){entry={stage:slug,label:slug,count:0,weighted:{},open:{}};totals.set(slug,entry);}
  entry.count+=1;
  const currency=String(row.currency||'PYG');
  const amount=Number(row.amount);
  const probability=Number(row.probability);
  if(Number.isFinite(amount))entry.open[currency]=(entry.open[currency]||0)+amount;
  if(Number.isFinite(amount)&&Number.isFinite(probability))entry.weighted[currency]=(entry.weighted[currency]||0)+amount*probability/100;
 }
 return [...totals.values()];
}

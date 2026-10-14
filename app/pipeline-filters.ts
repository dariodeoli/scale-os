// Filtros del pipeline (SOS-COM, Refs #182): una sola derivación para el
// tablero y la lista. Solo usa campos que el API ya entrega en la lista de
// oportunidades; no hay «responsable» en `agency_leads`, así que no se filtra
// por él (nunca se inventa un dato).
import {normalizeSearch} from './client-directory-data';
import type {LeadOpportunity} from './pipeline-summary';

export type LeadFilters={query:string;stage:string;currency:string};
export const NO_LEAD_FILTERS:LeadFilters={query:'',stage:'',currency:''};

export const leadFiltersActive=(filters:LeadFilters)=>Boolean(filters.query.trim()||filters.stage||filters.currency);

/** Nombre, contacto (correo/teléfono) y notas; etapa y moneda por igualdad. */
export function filterLeads<T extends LeadOpportunity>(rows:readonly T[],filters:LeadFilters):T[]{
 const term=normalizeSearch(filters.query);
 return rows.filter(row=>{
  if(filters.stage&&String(row.stage||'')!==filters.stage)return false;
  if(filters.currency&&String(row.currency||'PYG')!==filters.currency)return false;
  if(!term)return true;
  return [row.name,row.email,row.phone,row.notes].some(value=>normalizeSearch(value).includes(term));
 });
}

/** Monedas presentes en la lista cargada, para el filtro (sin catálogo inventado). */
export function leadCurrencies(rows:readonly LeadOpportunity[]){
 return [...new Set(rows.map(row=>String(row.currency||'PYG')))].sort();
}

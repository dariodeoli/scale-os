/** Opt-in company locality integrity; the inherited catalog is not an official registry. */
import {LOCALITIES_PARAGUAY,resolveLocality} from 'owncoding-ui/utils';
export const LOCALITY_CATALOG_VERSION='owncoding-ui@0.68.19';
const source='owncoding-locality-catalog-non-official';
const records=LOCALITIES_PARAGUAY.map(({id,city,department})=>({id,city,department}));
export function companyLocalityCatalog(){return {version:LOCALITY_CATALOG_VERSION,status:'inherited-catalog',identifier_scheme:'owncoding-internal',source:LOCALITIES_PARAGUAY[0]?.provenance?.source||'OwnCoding inherited locality catalog',source_url:LOCALITIES_PARAGUAY[0]?.provenance?.sourceUrl||null,official:false,records};}
export function companyLocalityProfile(profile){
 const locality=profile.provenance?.locality;
 return {...profile,locality_id:locality?.status==='selected-catalog'&&typeof locality.id==='string'?locality.id:null,locality_catalog_version:locality?.status==='selected-catalog'?locality.catalog_version:null};
}
export class CompanyLocalityValidationError extends Error{constructor(message,fieldErrors){super(message);this.status=400;this.fieldErrors=fieldErrors;}}
const invalid=(message,fieldErrors)=>{throw new CompanyLocalityValidationError(message,fieldErrors);};
export function companyLocalityProvenance(body,old,pair,actorId){
 const provenance={...(old.provenance||{})};
 const changed=pair.city!==(old.city||'')||pair.department!==(old.department||'');
 if(Object.hasOwn(body,'locality_id')&&body.locality_id!==null){
  if(typeof body.locality_id!=='string'||!body.locality_id)invalid('Elegí una localidad del catálogo o ingreso manual.',{locality_id:'La localidad seleccionada no es válida.'});
  if(body.locality_catalog_version!==LOCALITY_CATALOG_VERSION)invalid('El catálogo cambió. Recargá antes de seleccionar una localidad.',{locality_id:'Recargá el catálogo y volvé a elegir.'});
  const byId=resolveLocality(body.locality_id);
  if(byId.status!=='resolved'||byId.matchedBy!=='id')invalid('La localidad seleccionada no está en el catálogo.',{locality_id:'Elegí un identificador disponible o ingreso manual.'});
  const byPair=resolveLocality(pair.city,pair.department);
  if(byPair.status!=='resolved'||byPair.matchedBy!=='name'||byPair.record.id!==byId.record.id)invalid('Ciudad y departamento no corresponden a la localidad seleccionada.',{locality_id:'Revisá la localidad seleccionada.',city:'La ciudad debe corresponder a la localidad seleccionada.',department:'El departamento debe corresponder a la localidad seleccionada.'});
  const selected={source:`${source}:${LOCALITY_CATALOG_VERSION}`,updated_by:String(actorId)};
  provenance.city=selected;provenance.department={...selected};
  provenance.locality={id:byId.record.id,catalog_version:LOCALITY_CATALOG_VERSION,identifier_scheme:'owncoding-internal',status:'selected-catalog',source,official:false,selected_by:String(actorId),selected_at:new Date().toISOString()};
 }else if(changed||Object.hasOwn(body,'locality_id')){
  provenance.city={source:'manual',updated_by:String(actorId)};provenance.department={source:'manual',updated_by:String(actorId)};
  provenance.locality={id:null,catalog_version:null,status:'manual',source:'manual',updated_by:String(actorId)};
 }
 return provenance;
}

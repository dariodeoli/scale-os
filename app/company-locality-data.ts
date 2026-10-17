/** API metadata only: deliberately no OwnCoding catalog/engine import in the client bundle. */
export type CompanyLocality={id:string;city:string;department:string};
export type CompanyLocalityCatalog={version:string;source:string;status:string;official:boolean;records:CompanyLocality[]};
export function selectedCompanyLocality(catalog:CompanyLocalityCatalog|null,id:string){return catalog?.records.find(row=>row.id===id);}
export function companyLocalityError(catalog:CompanyLocalityCatalog|null,values:Record<string,string>){
 if(!values.locality_id)return null;
 const selected=selectedCompanyLocality(catalog,values.locality_id);
 if(!selected)return 'Elegí una localidad disponible o ingreso manual.';
 return selected.city===values.city&&selected.department===values.department?null:'Ciudad y departamento deben corresponder a la localidad seleccionada.';
}

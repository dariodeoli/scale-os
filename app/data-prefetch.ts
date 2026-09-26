import {dataFetch,hasDataScope} from './data-cache';

// Intent-only warming of existing short-lived list caches. Never prefetch access
// decisions, company edit data, reservations/versions, or live visitor tracking.
const paths:Record<string,readonly string[]>={
 Pipeline:['/leads'],
 Inventario:['/inventory','/inventory-categories'],
 Estudio:['/studio-spaces'],
 // Comisiones es quien consume cuentas, pagos y cargos (issue #67): antes la
 // entrada vivía bajo «Equipo» y gastaba una ronda que esa sección no usaba.
 Comisiones:['/accounts','/payouts','/job-roles'],
 'Historial de trabajo':['/productivity/history?limit=10&offset=0'],
 'Configuración':['/exchange-rates'],
};
export async function prefetchSectionData(section:string,expectedScope:string){
 if(!hasDataScope(expectedScope))return;
 await Promise.allSettled((paths[section]||[]).map(path=>
  dataFetch('/core-api/api/agency'+path,{credentials:'include'})));
}

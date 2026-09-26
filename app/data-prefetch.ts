import {dataFetch,hasDataScope} from './data-cache';

// Intent-only warming of existing short-lived list caches. Never prefetch access
// decisions, company edit data, reservations/versions, or live visitor tracking.
const paths:Record<string,readonly string[]>={
 Pipeline:['/leads'],
 Inventario:['/inventory','/inventory-categories'],
 Estudio:['/studio-spaces'],
 // Issue #67: Comisiones es quien consume cuentas, pagos y cargos (el prefetch
 // vivía bajo «Equipo», que no usaba esos datos); Finanzas y Previsión calientan
 // las cuentas al abrir (misma lectura, una sola vez por sesión).
 Comisiones:['/accounts','/payouts','/job-roles'],
 Finanzas:['/accounts'],
 'Previsión':['/accounts'],
 'Historial de trabajo':['/productivity/history?limit=10&offset=0'],
 'Configuración':['/exchange-rates'],
};
export async function prefetchSectionData(section:string,expectedScope:string){
 if(!hasDataScope(expectedScope))return;
 await Promise.allSettled((paths[section]||[]).map(path=>
  dataFetch('/core-api/api/agency'+path,{credentials:'include'})));
}

import {roleCan} from './capabilities';
import {currentAsuncionMonth} from './client-format';
import {dataFetch,hasDataScope} from './data-cache';

/**
 * Precarga de métricas clave (#139, coordina con DSN #138).
 *
 * Al conocer la identidad, la sección pedida arranca sus agregados en paralelo
 * con los datos del shell, en vez de esperar la cadena identidad → listas →
 * widgets. Las respuestas usan la misma clave del caché corto que consumen
 * `api()` y `useForecast()`, así el widget repinta con el dato ya en camino (o
 * con su esqueleto) sin una segunda espera. Solo se adelantan lecturas que la
 * capacidad del rol realmente permite; el API sigue revalidando cada una.
 */
const paths:Record<string,(role:string)=>readonly string[]>={
 Resumen:(role)=>[
  ...(roleCan(role,'finance.view')?['/dashboard']:[]),
  ...(roleCan(role,'billing.view')?['/control-center']:[]),
 ],
 // El panel de Salarios de Finanzas lee el mes corriente sin horizonte.
 Finanzas:(role)=>roleCan(role,'finance.view')?[`/forecast?month=${currentAsuncionMonth()}`]:[],
 // Mismos parámetros que la ventana inicial de Informes (12 meses + anterior).
 Informes:(role)=>roleCan(role,'reports.view')?[`/reports?month=${currentAsuncionMonth()}&months=12&previous=1`]:[],
};

/** Rutas de KPI (bajo `/api/agency`) que corresponden a la sección y al rol. */
export function metricsForSection(section:string,role:string){
 return (paths[section]||(()=>[]))(role);
}

export async function prefetchSectionMetrics(section:string,expectedScope:string,role:string){
 if(!hasDataScope(expectedScope))return;
 await Promise.allSettled(metricsForSection(section,role).map(path=>
  dataFetch('/core-api/api/agency'+path,{credentials:'include'})));
}

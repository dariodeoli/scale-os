/**
 * Capa pura del tablero de Producción por columna (campaña #57, refs #44).
 *
 * El tablero carga por etapa con el contrato del API:
 *   - `?counts=1&limit=1&fields=id` → `stage_counts` exactos por etapa.
 *   - `?status=<etapa>&limit=N&fields=<proyección>` → ventana de la columna con
 *     `page.hasMore` para pedir la siguiente.
 * Con filtros activos (cliente/mías/semana) la columna se pide completa: el
 * contrato no filtra por cliente ni fecha, así que recortarla daría conteos
 * incompletos; sin filtros se usa la ventana y "Ver más" alcanza el resto.
 *
 * Acá vive solo lo puro y testeable; el transporte y el estado, en
 * `use-board-data.ts`.
 */
import {statuses,type Status} from './production-board';
import type {WorkOrder} from './workspace-types';

/** Piezas por columna antes de "Ver más" (el pedido va +1 para saber si hay más).
 * 50 mantiene el primer pintado liviano: medido con 1.200 órdenes, la carga del
 * tablero baja ~70% y con 3.000 ~88%; el resto queda a un clic por columna y los
 * totales exactos se ven siempre. */
export const BOARD_COLUMN_WINDOW=50;
/** Ventana del planificador (Mi día, Calendario, Lista y lotes) y del buscador. */
export const BOARD_PLANNER_WINDOW=300;

export type BoardColumns=Record<string,WorkOrder[]>;
export type BoardCounts=Record<string,number>;
export type BoardHasMore=Record<string,boolean>;
export type BoardFilters={clientId:string;mine:boolean;week:boolean;userId:string;today:string};

/** ¿Los filtros del tablero están activos? (entonces la columna va completa). */
export function boardFiltersActive(filters:BoardFilters):boolean{
 return Boolean(filters.clientId||filters.mine||filters.week);
}

/** URL de una columna: ventana con tope, o completa cuando hay filtros. */
export function boardColumnUrl(status:Status,fields:string,{window=BOARD_COLUMN_WINDOW,offset=0,full=false}:{window?:number;offset?:number;full?:boolean}={}):string{
 const query=[`status=${encodeURIComponent(status)}`,`fields=${fields}`];
 if(!full){query.push(`limit=${window+1}`);if(offset)query.push(`offset=${offset}`);}
 return `/api/agency/work-orders?${query.join('&')}`;
}

/** URL de los totales por etapa (contrato #57). */
export const boardCountsUrl='/api/agency/work-orders?counts=1&limit=1&fields=id';

/** URL de la ventana del planificador. */
export function boardPlannerUrl(fields:string,window=BOARD_PLANNER_WINDOW):string{
 return `/api/agency/work-orders?limit=${window}&fields=${fields}`;
}

/** Cada etapa del dominio arranca con su columna (aunque no tenga piezas). */
export function emptyColumns():BoardColumns{
 return Object.fromEntries(statuses.map(status=>[status.id,[] as WorkOrder[]]));
}

/** Normaliza la ventana de una columna: tope pedido +1 ⇒ hasMore. */
export function readColumnPage(orders:WorkOrder[],window=BOARD_COLUMN_WINDOW):{orders:WorkOrder[];hasMore:boolean}{
 return {orders:orders.slice(0,window),hasMore:orders.length>window};
}

/** Une una página siguiente sin duplicar por id (el API pagina por offset). */
export function mergeColumnPage(current:WorkOrder[],page:WorkOrder[]):WorkOrder[]{
 const seen=new Set(current.map(order=>String(order.id)));
 return [...current,...page.filter(order=>!seen.has(String(order.id)))];
}

/** Reparte órdenes por etapa (respaldo del modo ventana y de la ventana del planificador). */
export function groupOrdersByStatus(orders:WorkOrder[]):BoardColumns{
 const columns=emptyColumns();
 for(const order of orders)if(columns[order.status])columns[order.status].push(order);
 return columns;
}

/** Conteos por etapa derivados de una lista (respaldo si no hay `stage_counts`). */
export function countsFromOrders(orders:WorkOrder[]):BoardCounts{
 const counts:BoardCounts=Object.fromEntries(statuses.map(status=>[status.id,0]));
 for(const order of orders)if(order.status in counts)counts[order.status]+=1;
 return counts;
}

/** Mueve una tarjeta entre columnas (optimista) y devuelve la etapa de origen. */
export function moveOrderInColumns(columns:BoardColumns,id:string,toStatus:Status):{columns:BoardColumns;from:string|null}{
 const key=String(id);
 let from:string|null=null;
 const next:BoardColumns={};
 for(const [status,rows] of Object.entries(columns)){
  const kept=rows.filter(order=>String(order.id)!==key);
  if(kept.length!==rows.length)from=status;
  next[status]=kept;
 }
 if(!from)return {columns,from:null};
 const card=columns[from].find(order=>String(order.id)===key);
 if(card&&next[toStatus])next[toStatus]=[{...card,status:toStatus},...next[toStatus]];
 return {columns:next,from};
}

/** Ajusta los conteos exactos tras un movimiento optimista. */
export function adjustCounts(counts:BoardCounts,from:string|null,to:string):BoardCounts{
 if(!from||from===to)return counts;
 const next={...counts};
 if(from in next)next[from]=Math.max(0,next[from]-1);
 if(to in next)next[to]=next[to]+1;
 return next;
}

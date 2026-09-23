"use client";
/**
 * Datos del tablero de Producción por columna (campaña #57, refs #44).
 *
 * Cada etapa se pide con `?status=<etapa>&limit=<ventana>` y los totales
 * exactos con `?counts=1`; con filtros activos (cliente/mías/semana) la columna
 * va completa porque el contrato no filtra por cliente ni fecha. "Ver más"
 * extiende la ventana con `offset` sin perder el tope por pedido.
 *
 * El planificador (Mi día, Calendario, Lista y lotes) usa una ventana única.
 * El movimiento entre etapas es optimista con cola por orden y reversión, y
 * después de confirmar se refrescan los conteos exactos (una lectura de ~200 B).
 */
import {useCallback,useEffect,useRef,useState} from 'react';
import {api} from './operations';
import {notify} from './feedback';
import {ORDER_FIELDS_BOARD} from './shell-data';
import {statuses,type Status} from './production-board';
import type {WorkOrder} from './workspace-types';
import {BOARD_COLUMN_WINDOW,BOARD_PLANNER_WINDOW,adjustCounts,boardColumnUrl,boardCountsUrl,boardFiltersActive,boardPlannerUrl,countsFromOrders,emptyColumns,groupOrdersByStatus,mergeColumnPage,moveOrderInColumns,readColumnPage,type BoardColumns,type BoardCounts,type BoardFilters,type BoardHasMore} from './board-data';

type OrdersResponse={workOrders:WorkOrder[];page?:{limit:number;offset:number;hasMore:boolean}};
type CountsResponse={stage_counts?:BoardCounts};
export type BoardData={
 counts:BoardCounts;columns:BoardColumns;hasMore:BoardHasMore;
 loading:boolean;loadingMore:string|null;error:string;lastUpdated:Date|null;
 plannerOrders:WorkOrder[];
 loadMore:(status:Status)=>void;
 move:(id:string,toStatus:Status)=>void;
 reload:()=>Promise<void>;
};

export function useBoardData({board,planner,filters,refresh}:{board:boolean;planner?:boolean;filters:BoardFilters;refresh:number}):BoardData{
 const [counts,setCounts]=useState<BoardCounts>({});
 const [columns,setColumns]=useState<BoardColumns>(()=>emptyColumns());
 const [hasMore,setHasMore]=useState<BoardHasMore>({});
 const [plannerOrders,setPlannerOrders]=useState<WorkOrder[]>([]);
 const [loading,setLoading]=useState(true),[loadingMore,setLoadingMore]=useState<string|null>(null),[error,setError]=useState(''),[lastUpdated,setLastUpdated]=useState<Date|null>(null);
 const [token,setToken]=useState(0);
 const columnsRef=useRef(columns);columnsRef.current=columns;
 const versions=useRef(new Map<string,number>());
 const queue=useRef(new Map<string,Promise<void>>());
 const loadMoreRef=useRef<string|null>(null);
 const {clientId,mine,week}=filters;
 const filtered=boardFiltersActive(filters);

 useEffect(()=>{
  let live=true;
  async function load(){
   setLoading(true);setError('');
   try{
    if(!board){
     if(!planner)return;
     const data=await api<OrdersResponse>(boardPlannerUrl(ORDER_FIELDS_BOARD,BOARD_PLANNER_WINDOW));
     if(!live)return;
     const orders=data.workOrders||[];
     setPlannerOrders(orders);setColumns(groupOrdersByStatus(orders));setCounts(countsFromOrders(orders));setHasMore({});
     setLastUpdated(new Date());
     return;
    }
    const [countsData,...pages]=await Promise.all([
     api<CountsResponse>(boardCountsUrl),
     ...statuses.map(async status=>{
      const data=await api<OrdersResponse>(boardColumnUrl(status.id,ORDER_FIELDS_BOARD,{full:filtered}));
      const rows=data.workOrders||[];
      const window=filtered?{orders:rows,hasMore:false}:readColumnPage(rows,BOARD_COLUMN_WINDOW);
      return {status:status.id,orders:window.orders,hasMore:filtered?false:Boolean(data.page?.hasMore)};
     }),
    ]);
    if(!live)return;
    const nextColumns=emptyColumns(),nextHasMore:BoardHasMore={};
    for(const page of pages){nextColumns[page.status]=page.orders;nextHasMore[page.status]=page.hasMore;}
    setColumns(nextColumns);setHasMore(nextHasMore);
    setCounts(countsData.stage_counts||countsFromOrders(pages.flatMap(page=>page.orders)));
    setLastUpdated(new Date());
   }catch(cause){
    if(live)setError(cause instanceof Error?cause.message:'No se pudo cargar el tablero.');
   }finally{if(live)setLoading(false);}
  }
  void load();
  return ()=>{live=false;};
 },[board,planner,filtered,clientId,mine,week,refresh,token]);

 /** Refresco liviano de los totales exactos (el listado se revalida al reentrar). */
 const refreshCounts=useCallback(()=>{
  void api<CountsResponse>(boardCountsUrl).then(data=>{if(data.stage_counts)setCounts(data.stage_counts);}).catch(()=>undefined);
 },[]);

 const loadMore=useCallback((status:Status)=>{
  if(loadMoreRef.current)return;
  loadMoreRef.current=status;setLoadingMore(status);
  const current=columnsRef.current[status]||[];
  void api<OrdersResponse>(boardColumnUrl(status,ORDER_FIELDS_BOARD,{offset:current.length}))
   .then(data=>{
    const rows=data.workOrders||[];
    const window=readColumnPage(rows,BOARD_COLUMN_WINDOW);
    setColumns(prev=>({...prev,[status]:mergeColumnPage(prev[status]||[],window.orders)}));
    setHasMore(prev=>({...prev,[status]:Boolean(data.page?.hasMore??window.hasMore)}));
   })
   .catch(cause=>notify({tone:'error',message:cause instanceof Error?cause.message:'No se pudieron traer más piezas.'}))
   .finally(()=>{loadMoreRef.current=null;setLoadingMore(null);});
 },[]);

 const move=useCallback((id:string,toStatus:Status)=>{
  const before=columnsRef.current;
  const {columns:next,from}=moveOrderInColumns(before,id,toStatus);
  if(!from||from===toStatus)return;
  setColumns(next);setCounts(current=>adjustCounts(current,from,toStatus));
  const version=(versions.current.get(id)||0)+1;versions.current.set(id,version);
  const previous=queue.current.get(id)||Promise.resolve();
  const mutation=previous.catch(()=>undefined).then(async()=>{
   await api(`/api/agency/work-orders/${id}`,{status:toStatus},'PATCH');
  });
  queue.current.set(id,mutation);
  void mutation.then(()=>{refreshCounts();}).catch((cause:unknown)=>{
   if((versions.current.get(id)||0)===version){
    setColumns(before);
    setCounts(current=>adjustCounts(current,toStatus,from));
   }
   notify({tone:'error',message:cause instanceof Error?cause.message:'No se pudo mover la pieza.'});
  }).finally(()=>{if(queue.current.get(id)===mutation)queue.current.delete(id);});
 },[refreshCounts]);

 const reload=useCallback(async()=>{setToken(current=>current+1);},[]);
 return {counts,columns,hasMore,loading,loadingMore,error,lastUpdated,plannerOrders,loadMore,move,reload};
}

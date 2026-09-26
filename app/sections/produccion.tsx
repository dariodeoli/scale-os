"use client";
import dynamic from 'next/dynamic';
import {useCallback,useEffect,useMemo,useRef,useState,type Dispatch,type SetStateAction} from 'react';
import {ArrowUpRight, ChevronLeft, ChevronRight, Plus, RotateCcw, SlidersHorizontal} from 'lucide-react';
import {DndContext, DragOverlay, KeyboardSensor, MouseSensor, TouchSensor, useSensor, useSensors, type DragEndEvent} from '@dnd-kit/core';
import {Aviso, Button, SegmentedField, Select} from 'owncoding-ui';
import {EmptyBlock} from '../ui-v2';
import {BoardPresence} from '../presence';
import {KanbanColumn, statuses, type Status, type WorkOrderCard} from '../production-board';
import {defaultWorkspacePreferences, type WorkspacePreferences} from '../workspace-preferences';
import {boardFiltersActive, boardVisibleWindow, boardWindowLabel} from '../board-data';
import {useBoardData} from '../use-board-data';
import {filterProductionOrders} from '../production-filter';
import {useLocalCalendarDay} from '../use-workspace-preferences';
import type {Client, Project, User, WorkOrder} from '../workspace-types';
const WorkPlanner=dynamic(()=>import('../productivity-ui').then(m=>m.WorkPlanner));

// Producción (tablero kanban, mi día, calendario y lista y lotes) — contenido v2
// (campaña #41, spec #44). Desde #57 el TABLERO carga por columna con el contrato
// del API (`?status=` + `?counts=1`): totales exactos por etapa y ventana por
// columna con "Ver más"; con filtros activos la columna va completa (el contrato
// no filtra por cliente ni fecha). El planificador usa una ventana única.
type ProduccionSectionProps = {
  productionView: string;
  preferences: WorkspacePreferences;
  changeProductionView: (value: string) => void;
  clients: Client[];
  selectedProductionClient: string;
  setProductionClientId: (clientId: string) => void;
  preferencesReady: boolean;
  setProductionFiltersDialogScope: Dispatch<SetStateAction<string>>;
  preferenceScope: string;
  hasProductionFilters: boolean;
  productionClientId: string;
  preferenceWarning: string;
  updatePreferences: (change: Partial<WorkspacePreferences>) => void;
  projects: Project[];
  user: User | null;
  setActive: (label: string) => void;
  setDetail: Dispatch<SetStateAction<{kind:'client'|'order';id:string;anchor?:string;edit?:boolean} | null>>;
  /** CTA del estado vacío: la sección no es dueña del modal del shell. */
  createOrder?: () => void;
  // Legado del shell: el tablero ya no los usa (carga por columna propia). La
  // limpieza del cableado va con el alcance de datos de DSN (#57).
  productionOrders?: WorkOrder[];
  orders?: WorkOrder[];
  draggedOrderId?: string | null;
  setDraggedOrderId?: Dispatch<SetStateAction<string | null>>;
  onDragEnd?: (event: DragEndEvent) => Promise<void>;
  load?: () => Promise<void>;
};
const VIEW_OPTIONS: [string, string, string][] = [['Tablero','Tablero','grid'],['Mi día','Mi día','clock'],['Calendario','Calendario','calendar'],['Lista y lotes','Lista y lotes','list']];
export function ProduccionSection({productionView, preferences, changeProductionView, clients, selectedProductionClient, setProductionClientId, preferencesReady, setProductionFiltersDialogScope, preferenceScope, hasProductionFilters, productionClientId, preferenceWarning, updatePreferences, projects, user, setActive, setDetail, createOrder}: ProduccionSectionProps){
  const [draggedOrderId,setDraggedOrderId]=useState<string|null>(null);
  const today=useLocalCalendarDay();
  const filters=useMemo(()=>({clientId:selectedProductionClient,mine:preferences.production.mine,week:preferences.production.week,userId:String(user?.id||''),today}),[selectedProductionClient,preferences.production.mine,preferences.production.week,user?.id,today]);
  const filtered=boardFiltersActive(filters);
  const boardData=useBoardData({board:productionView==='Tablero',planner:productionView!=='Tablero',filters,refresh:0});
  // La tarjeta dibuja el logo y el color del cliente: se decoran las filas cargadas.
  const decorate=(order:WorkOrder)=>{const project=projects.find(candidate=>String(candidate.id)===String(order.project_id));const client=clients.find(candidate=>String(candidate.id)===String(project?.client_id));return {...order,client_logo_url:client?.logo_url,client_color_key:client?.color_key};};
  const visibleColumns=useMemo(()=>{
    const out:Record<string,WorkOrderCard[]>={};
    for(const status of statuses){
      const rows=boardData.columns[status.id]||[];
      const shown=filtered?filterProductionOrders(rows,projects,selectedProductionClient,{mine:filters.mine,week:filters.week,userId:filters.userId,today:filters.today}):rows;
      out[status.id]=shown.map(decorate);
    }
    return out;
  },[boardData.columns,filtered,projects,clients,selectedProductionClient,filters.mine,filters.week,filters.userId,filters.today]);
  const totalOrders=Object.values(boardData.counts).reduce((sum,value)=>sum+value,0);
  const visibleOrders=Object.values(visibleColumns).reduce((sum,rows)=>sum+rows.length,0);
  const dragged=Object.values(visibleColumns).flat().find(order=>String(order.id)===String(draggedOrderId));
  // Estados honestos: cargando no se dice "0 órdenes", y con el tablero vacío
  // (sin filtros) no se dibujan siete columnas vacías: va el vacío compacto.
  const boardEmpty=!boardData.loading&&!boardData.error&&!filtered&&totalOrders===0;
  const filteredEmpty=!boardData.loading&&!boardData.error&&filtered&&visibleOrders===0;
  const resetProductionFilters=()=>updatePreferences({production:defaultWorkspacePreferences().production});
  const counterText=boardData.loading&&!totalOrders&&!visibleOrders?'Cargando órdenes…':filtered?`${visibleOrders} de ${totalOrders} órdenes`:totalOrders?`${totalOrders} órdenes`:'Sin órdenes';
  // Indicador del riel: cuántas de las 7 etapas entran en el viewport. Sin él,
  // el tablero parecía no tener más piezas que las de las columnas visibles.
  const boardScroll=useRef<HTMLDivElement|null>(null);
  const [boardWindow,setBoardWindow]=useState<{first:number;last:number;count:number;scrollable:boolean;atStart:boolean;atEnd:boolean}>({first:1,last:statuses.length,count:statuses.length,scrollable:false,atStart:true,atEnd:true});
  const measureBoard=useCallback(()=>{
    const node=boardScroll.current;if(!node)return;
    const viewport=node.getBoundingClientRect();
    const columns=[...node.querySelectorAll<HTMLElement>('[data-column]')].map(column=>column.getBoundingClientRect());
    const visibleRange=boardVisibleWindow(columns,viewport);
    setBoardWindow({...visibleRange,scrollable:node.scrollWidth>node.clientWidth+1,atStart:node.scrollLeft<=1,atEnd:node.scrollLeft+node.clientWidth>=node.scrollWidth-1});
  },[]);
  useEffect(()=>{
    measureBoard();
    const node=boardScroll.current;if(!node)return;
    node.addEventListener('scroll',measureBoard,{passive:true});
    const observer=new ResizeObserver(measureBoard);
    observer.observe(node);
    return()=>{node.removeEventListener('scroll',measureBoard);observer.disconnect();};
  },[measureBoard,productionView,boardData.loading,boardEmpty,filteredEmpty]);
  const scrollBoard=(direction:-1|1)=>{
    const node=boardScroll.current;if(!node)return;
    // Bloque completo: una página = el ancho del riel + el gap entre columnas.
    // Con 4 columnas fluidas por página, el paso cae justo en la etapa 5 (2.ª
    // página) o en el tope de scroll (última página alineada al final).
    const stride=node.clientWidth+12;
    const reduce=typeof window!=='undefined'&&window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    node.scrollBy({left:direction*stride,behavior:reduce?'auto':'smooth'});
  };
  // Mouse con 6 px de margen (no roba el clic de los botones de la tarjeta), touch
  // con pulsación sostenida (no pelea con el scroll del tablero) y teclado.
  const sensors=useSensors(useSensor(MouseSensor,{activationConstraint:{distance:6}}),useSensor(TouchSensor,{activationConstraint:{delay:250,tolerance:8}}),useSensor(KeyboardSensor));
  /** Soltar sobre una columna (`status-x`) o sobre una tarjeta (su etapa). */
  const dropStatus=(overId:string):Status|null=>{
    if(!overId)return null;
    const candidate=overId.startsWith('status-')?overId.slice('status-'.length):Object.entries(boardData.columns).find(([,rows])=>rows.some(order=>String(order.id)===overId))?.[0]||'';
    return statuses.some(status=>status.id===candidate)?candidate as Status:null;
  };
  const onDrop=(event:DragEndEvent)=>{const id=String(event.active.id);setDraggedOrderId(null);const target=dropStatus(String(event.over?.id||''));if(target)boardData.move(id,target);};
  return (
    <>
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <SegmentedField className="[&>button]:min-h-11 md:[&>button]:min-h-8" ariaLabel="Vista de Producción" value={productionView} onChange={(value:string)=>changeProductionView(value)} options={VIEW_OPTIONS}/>
        {productionView!=="Tablero"&&<div className="flex flex-wrap items-center gap-2"><button type="button" className="text-button" onClick={()=>setActive("Proyectos")}>Ver proyectos<ArrowUpRight size={14}/></button></div>}
        {productionView==="Tablero"&&<div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-3">
          <label className="grid w-full gap-1.5 sm:w-64">
            <span className="text-[12px] font-semibold text-mute">Filtrar por cliente</span>
            <Select value={selectedProductionClient} disabled={!preferencesReady} onChange={(event:React.ChangeEvent<HTMLSelectElement>)=>setProductionClientId(event.target.value)}>
              <option value="">Todos los clientes</option>
              {[...clients].sort((a,b) => a.name.localeCompare(b.name, 'es')).map(client => <option key={client.id} value={String(client.id)}>{client.name}</option>)}
            </Select>
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="text-button" disabled={!preferencesReady} onClick={()=>setProductionFiltersDialogScope(preferenceScope)}><SlidersHorizontal size={14}/>Filtros{hasProductionFilters?` · ${Number(!!productionClientId)+Number(preferences.production.mine)+Number(preferences.production.week)}`:''}</button>
            <p className="whitespace-nowrap text-xs tabular-nums text-mute" role="status" aria-live="polite">{counterText}</p>
            {hasProductionFilters && <button type="button" className="text-button" onClick={() => updatePreferences({production:defaultWorkspacePreferences().production})}><RotateCcw size={14}/>Restablecer filtros</button>}
          </div>
        </div>}
      </div>
      {productionView==='Tablero'&&hasProductionFilters&&<p className="mb-3 text-xs text-mute" role="status">Filtros guardados del tablero · Todos los estados. La semana va de lunes a domingo según la hora local de tu dispositivo.{productionClientId&&!selectedProductionClient?' El cliente guardado ya no está disponible; se muestran todos los clientes.':''}</p>}
      {productionView==='Tablero'&&preferenceWarning?<p className="mb-3 text-xs text-mute" role="status">{preferenceWarning}</p>:null}
      {productionView!=="Tablero"&&<WorkPlanner key={productionView} initialView={productionView} orders={boardData.plannerOrders} userId={String(user?.id||'')} role={user?.role||'viewer'} projects={projects} openOrder={id=>setDetail({kind:'order',id})} refresh={boardData.reload} navigate={setActive}/>}
      {productionView==="Tablero"&&
      <section className="grid min-w-0 gap-2" id="produccion" aria-label="Tablero de Producción">
        {boardData.error?<div className="grid gap-2"><Aviso tono="error">No se pudo cargar el tablero: {boardData.error}</Aviso><button type="button" className="text-button justify-self-start" onClick={boardData.reload}>Reintentar</button></div>:null}
        {filteredEmpty?<EmptyBlock compact icon="filter" title="Ninguna orden coincide con los filtros guardados." description={`El tablero tiene ${totalOrders} órdenes. Los filtros de cliente, responsable o semana las dejan fuera.`} action={<Button type="button" variant="outline" onClick={resetProductionFilters}><RotateCcw size={14}/>Restablecer filtros</Button>}/>:null}
        {boardEmpty?<EmptyBlock compact icon="box" title="Todavía no hay órdenes en producción." description="Creá la primera pieza y seguila por las siete etapas hasta publicarla." action={createOrder?<Button type="button" onClick={createOrder}><Plus size={16}/>Nueva pieza</Button>:undefined}/>:null}
        {!boardEmpty&&!filteredEmpty&&<BoardPresence key={String(user?.organization_id)} projectIds={Object.values(visibleColumns).flat().map(order=>String(order.project_id))}><DndContext sensors={sensors} onDragStart={event=>setDraggedOrderId(String(event.active.id))} onDragCancel={()=>setDraggedOrderId(null)} onDragEnd={onDrop}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] text-mute">Arrastrá una orden de una columna a otra para actualizar su estado.</p>
            {boardWindow.scrollable?<div className="flex items-center gap-1" role="group" aria-label="Recorrido del tablero" data-board-window>
              <button type="button" data-board-prev className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-ink-500 text-mute transition hover:border-fono hover:text-fore disabled:opacity-30 md:h-7 md:w-7" aria-label="Ver etapas anteriores" title="Etapas anteriores" disabled={boardWindow.atStart} onClick={()=>scrollBoard(-1)}><ChevronLeft size={14}/></button>
              <span className="whitespace-nowrap text-[11px] tabular-nums text-mute" title={`Se ven las etapas ${boardWindow.first} a ${boardWindow.last} de ${statuses.length}. Usá las flechas o deslizá el tablero.`}>{boardWindowLabel(boardWindow,statuses.length)}</span>
              <button type="button" data-board-next className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-ink-500 text-mute transition hover:border-fono hover:text-fore disabled:opacity-30 md:h-7 md:w-7" aria-label="Ver etapas siguientes" title="Etapas siguientes" disabled={boardWindow.atEnd} onClick={()=>scrollBoard(1)}><ChevronRight size={14}/></button>
            </div>:null}
          </div>
          <div ref={boardScroll} className="silent-scroll flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 [--board-cols:1] sm:[--board-cols:2] lg:[--board-cols:4]" tabIndex={0} role="region" aria-label="Tablero de Producción, desplazable por bloques de etapas">
            {statuses.map((status: (typeof statuses)[number]) => (
              <KanbanColumn
                openOrder={(id,edit)=>setDetail({kind:'order',id,...(edit?{edit:true}:{})})}
                role={user?.role||'viewer'}
                refresh={boardData.reload}
                key={status.id}
                status={status}
                loading={boardData.loading}
                counts={filtered?undefined:boardData.counts[status.id]}
                hasMore={boardData.hasMore[status.id]}
                loadingMore={boardData.loadingMore===status.id}
                onLoadMore={()=>boardData.loadMore(status.id)}
                orders={visibleColumns[status.id]||[]}
              />
            ))}
          </div>
          <DragOverlay>{dragged?<article className="rounded-xl border border-fono/40 bg-ink-800 p-3 shadow-2xl"><strong className="text-sm text-fore">{dragged.title}</strong><p className="text-xs text-mute">{dragged.client_name}</p></article>:null}</DragOverlay>
        </DndContext></BoardPresence>}
      </section>}
    </>
  );
}

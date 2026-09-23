"use client";
import dynamic from 'next/dynamic';
import type {Dispatch, SetStateAction} from 'react';
import {ArrowUpRight, RotateCcw, SlidersHorizontal} from 'lucide-react';
import {DndContext, DragOverlay, type DragEndEvent} from '@dnd-kit/core';
import {SegmentedField, Select} from 'owncoding-ui';
import {EmptyBlock, PageHeader} from '../ui-v2';
import {BoardPresence} from '../presence';
import {KanbanColumn, statuses} from '../production-board';
import {defaultWorkspacePreferences, type WorkspacePreferences} from '../workspace-preferences';
import type {Client, Project, User, WorkOrder} from '../workspace-types';
const WorkPlanner=dynamic(()=>import('../productivity-ui').then(m=>m.WorkPlanner));

// Producción (tablero kanban, mi día, calendario y lista y lotes) — contenido v2
// (campaña #41, spec #44). Extraído de app/scale-workspace.tsx (issue #47): misma
// lógica, mismos props y los filtros guardados por usuario.
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
  productionOrders: WorkOrder[];
  orders: WorkOrder[];
  projects: Project[];
  user: User | null;
  setActive: (label: string) => void;
  setDetail: Dispatch<SetStateAction<{kind:'client'|'order';id:string;anchor?:string;edit?:boolean} | null>>;
  draggedOrderId: string | null;
  setDraggedOrderId: Dispatch<SetStateAction<string | null>>;
  onDragEnd: (event: DragEndEvent) => Promise<void>;
  load: () => Promise<void>;
};
const VIEW_OPTIONS: [string, string, string][] = [['Tablero','Tablero','grid'],['Mi día','Mi día','clock'],['Calendario','Calendario','calendar'],['Lista y lotes','Lista y lotes','list']];
export function ProduccionSection({productionView, preferences, changeProductionView, clients, selectedProductionClient, setProductionClientId, preferencesReady, setProductionFiltersDialogScope, preferenceScope, hasProductionFilters, productionClientId, preferenceWarning, updatePreferences, productionOrders, orders, projects, user, setActive, setDetail, draggedOrderId, setDraggedOrderId, onDragEnd, load}: ProduccionSectionProps){
  const dragged=orders.find(order=>String(order.id)===String(draggedOrderId));
  return (
    <>
      <PageHeader eyebrow="Producción" title={productionView==='Tablero'?'Tablero por etapas':productionView==='Mi día'?'Trabajo diario':productionView} subtitle="Órdenes de trabajo por etapa, con sus responsables, entrega y checklist." actions={<button className="text-button" onClick={()=>setActive("Proyectos")}>Ver proyectos<ArrowUpRight size={14}/></button>}/>
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <SegmentedField ariaLabel="Vista de Producción" value={productionView} onChange={(value:string)=>changeProductionView(value)} options={VIEW_OPTIONS}/>
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
            <p className="whitespace-nowrap text-xs tabular-nums text-mute" role="status" aria-live="polite">{productionOrders.length} de {orders.length} órdenes</p>
            {hasProductionFilters && <button type="button" className="text-button" onClick={() => updatePreferences({production:defaultWorkspacePreferences().production})}><RotateCcw size={14}/>Restablecer filtros</button>}
          </div>
        </div>}
      </div>
      {productionView==='Tablero'&&hasProductionFilters&&<p className="mb-3 text-xs text-mute" role="status">Filtros guardados del tablero · Todos los estados. La semana va de lunes a domingo según la hora local de tu dispositivo.{productionClientId&&!selectedProductionClient?' El cliente guardado ya no está disponible; se muestran todos los clientes.':''}</p>}
      {productionView==='Tablero'&&preferenceWarning?<p className="mb-3 text-xs text-mute" role="status">{preferenceWarning}</p>:null}
      {productionView!=="Tablero"&&<WorkPlanner key={productionView} initialView={productionView} orders={orders} userId={String(user?.id||'')} role={user?.role||'viewer'} projects={projects} openOrder={id=>setDetail({kind:'order',id})} refresh={load} navigate={setActive}/>}
      {productionView==="Tablero"&&
      <section className="grid min-w-0 gap-2" id="produccion" aria-label="Tablero de Producción">
        {hasProductionFilters && productionOrders.length === 0 ? <EmptyBlock title="No hay órdenes que coincidan con estos filtros." description="Restablecé los filtros guardados del tablero para ver todas las piezas." icon="filter"/> : null}
        <BoardPresence key={String(user?.organization_id)} projectIds={productionOrders.map(order=>String(order.project_id))}><DndContext onDragStart={event=>setDraggedOrderId(String(event.active.id))} onDragCancel={()=>setDraggedOrderId(null)} onDragEnd={event=>{setDraggedOrderId(null);void onDragEnd(event);}}>
          <div className="flex snap-x gap-3 overflow-x-auto pb-2" tabIndex={0} role="region" aria-label="Tablero de Producción, desplazable horizontalmente">
            {statuses.map((status: (typeof statuses)[number]) => (
              <KanbanColumn
                openOrder={(id,edit)=>setDetail({kind:'order',id,...(edit?{edit:true}:{})})}
                role={user?.role||'viewer'}
                refresh={load}
                key={status.id}
                status={status}
                orders={productionOrders.map(order=>{const project=projects.find(p=>String(p.id)===String(order.project_id));const client=clients.find(c=>String(c.id)===String(project?.client_id));return {...order,client_logo_url:client?.logo_url,client_color_key:client?.color_key};}).filter(
                  (order) => order.status === status.id,
                )}
              />
            ))}
          </div>
          <DragOverlay>{dragged?<article className="rounded-xl border border-fono/40 bg-ink-800 p-3 shadow-2xl"><strong className="text-sm text-fore">{dragged.title}</strong><p className="text-xs text-mute">{dragged.client_name}</p></article>:null}</DragOverlay>
        </DndContext></BoardPresence>
        <p className="text-[11px] text-mute">Arrastrá una orden de una columna a otra para actualizar su estado.</p>
      </section>}
    </>
  );
}
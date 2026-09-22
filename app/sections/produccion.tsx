"use client";
import dynamic from 'next/dynamic';
import type {Dispatch, SetStateAction} from 'react';
import {ArrowUpRight, RotateCcw, SlidersHorizontal} from 'lucide-react';
import {DndContext, DragOverlay, type DragEndEvent} from '@dnd-kit/core';
import {BoardPresence} from '../presence';
import {SelectCustom} from '../profile-controls';
import {KanbanColumn, statuses, type Status} from '../production-board';
import {defaultWorkspacePreferences, type WorkspacePreferences} from '../workspace-preferences';
import type {Client, Project, User, WorkOrder} from '../workspace-types';
const WorkPlanner=dynamic(()=>import('../productivity-ui').then(m=>m.WorkPlanner));

// Producción (tablero kanban, mi día y filtros guardados).
// Extraído de app/scale-workspace.tsx (issue #47): misma lógica y JSX, sin cambios.
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
export function ProduccionSection({productionView, preferences, changeProductionView, clients, selectedProductionClient, setProductionClientId, preferencesReady, setProductionFiltersDialogScope, preferenceScope, hasProductionFilters, productionClientId, preferenceWarning, updatePreferences, productionOrders, orders, projects, user, setActive, setDetail, draggedOrderId, setDraggedOrderId, onDragEnd, load}: ProduccionSectionProps){
  return (
    <>
            <div className="production-view-menu production-toolbar"><SelectCustom label="Vista de Producción" value={productionView} choices={[{value:"Tablero",label:"Tablero por etapas"},{value:"Mi día",label:"Trabajo diario"},{value:"Calendario",label:"Calendario"},{value:"Lista y lotes",label:"Lista y lotes"}]} onChange={changeProductionView}/>{productionView==="Tablero"&&<div className="production-filters">
                <SelectCustom
                  label="Filtrar por cliente"
                  value={selectedProductionClient}
                  choices={[
                    {value: "", label: "Todos los clientes"},
                    ...[...clients].sort((a,b) => a.name.localeCompare(b.name, 'es')).map(client => ({value: String(client.id), label: client.name})),
                  ]}
                  onChange={setProductionClientId}
                  disabled={!preferencesReady}
                />
                <button type="button" className="text-button" disabled={!preferencesReady} onClick={()=>setProductionFiltersDialogScope(preferenceScope)}><SlidersHorizontal size={14}/>Filtros{hasProductionFilters?` · ${Number(!!productionClientId)+Number(preferences.production.mine)+Number(preferences.production.week)}`:''}</button>
                <p className="production-filter-summary" role="status" aria-live="polite">
                  {productionOrders.length} de {orders.length} órdenes
                </p>
                {hasProductionFilters && <button className="text-button" onClick={() => updatePreferences({production:defaultWorkspacePreferences().production})}><RotateCcw size={14}/>Restablecer filtros</button>}
              </div>}<button className="text-button production-project-link" onClick={()=>setActive("Proyectos")}>Ver proyectos<ArrowUpRight size={14}/></button></div>
            {productionView==='Tablero'&&hasProductionFilters&&<p className="form-note">Filtros guardados del tablero · Todos los estados. La semana va de lunes a domingo según la hora local de tu dispositivo.{productionClientId&&!selectedProductionClient?' El cliente guardado ya no está disponible; se muestran todos los clientes.':''}</p>}
            {productionView==='Tablero'&&preferenceWarning&&<p className="form-note" role="status">{preferenceWarning}</p>}
            {productionView!=="Tablero"&&<WorkPlanner key={productionView} initialView={productionView} orders={orders} userId={String(user?.id||'')} role={user?.role||'viewer'} projects={projects} openOrder={id=>setDetail({kind:'order',id})} refresh={load} navigate={setActive}/>}
            {productionView==="Tablero"&&
            <section className="panel production-panel production-focus" id="produccion">
              {hasProductionFilters && productionOrders.length === 0 && <p className="empty-copy">No hay órdenes que coincidan con estos filtros.</p>}
              <BoardPresence key={String(user?.organization_id)} projectIds={productionOrders.map(order=>String(order.project_id))}><DndContext onDragStart={event=>setDraggedOrderId(String(event.active.id))} onDragCancel={()=>setDraggedOrderId(null)} onDragEnd={event=>{setDraggedOrderId(null);void onDragEnd(event);}}>
                <div className="kanban" tabIndex={0} role="region" aria-label="Tablero de Producción, desplazable horizontalmente">
                  {statuses.map((status) => (
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
                <DragOverlay>{draggedOrderId&&<article className="work-card is-overlay"><strong>{orders.find(o=>String(o.id)===draggedOrderId)?.title}</strong><p>{orders.find(o=>String(o.id)===draggedOrderId)?.client_name}</p></article>}</DragOverlay>
              </DndContext></BoardPresence>
              <p className="board-note">
                Arrastrá una orden de una columna a otra para actualizar su
                estado.
              </p>
            </section>}
          </>
  );
}

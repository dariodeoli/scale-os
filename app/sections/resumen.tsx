"use client";
import dynamic from 'next/dynamic';
import {ArrowUpRight,Plus} from 'lucide-react';
import {ControlCenter} from '../control-center';
import {WorkspaceGuide} from '../workspace-guide';
import {statuses} from '../production-board';
import {DashboardSkeleton, ListPage, SectionLoading, StateChip, type ChipTone} from '../ui-v2';
import type {ComponentProps} from 'react';
import type {Project,Summary,User,WorkOrder} from '../workspace-types';
import {Button as ScaleButton} from "../ui/button";

const WorkPlanner=dynamic(()=>import('../productivity-ui').then(m=>m.WorkPlanner),{loading:()=> <SectionLoading label="Cargando el resumen…" variant="cards"/>});
const InternalTasks=dynamic(()=>import('../work-history').then(m=>m.InternalTasks),{loading:()=> <SectionLoading label="Cargando el resumen…" variant="cards"/>});

// Resumen / Panel (referencia #42, arquetipo dashboard).
// Datos reales: control-center (comercial + financiero), summary del shell y
// stageCounts de las órdenes. ControlCenter, WorkPlanner e InternalTasks se
// embeben tal como están hasta su fase de dominio.
type ResumenSectionProps = {
  dataState?: 'loading' | 'ready' | 'error';
  guideProps: ComponentProps<typeof WorkspaceGuide>;
  user: User | null;
  orders: WorkOrder[];
  load: () => Promise<void>;
  setActive: (label: string) => void;
  summary: Summary;
  stageCounts: Map<string, number>;
  projects: Project[];
  setDetail: (value: {kind: "client" | "order"; id: string; anchor?: string; edit?: boolean} | null) => void;
  /** Alta de orden: el shell la entrega solo a los roles que pueden crear (sin permiso no hay botón). */
  onCreateOrder?: () => void;
};
const STAGE_TONE: Record<string, ChipTone> = {red: 'bad', yellow: 'warn', green: 'ok', blue: 'info', teal: 'info', purple: 'info'};
export function ResumenSection({dataState = 'ready', guideProps, user, orders, load, setActive, summary, stageCounts, projects, setDetail, onCreateOrder}: ResumenSectionProps){
  // Primer dato en camino: esqueleto con la forma real del panel (KPIs +
  // tarjetas), sin pantalla vacía ni cifras inventadas (#138).
  const primaryAction = onCreateOrder ? <ScaleButton type="button" className="primary" onClick={onCreateOrder} variant="primary"><Plus size={18}/> Nueva orden</ScaleButton> : undefined;
  if (dataState === 'loading' && !orders.length && !projects.length && !summary.active_clients) return <ListPage aria-label="Centro de control" primaryAction={primaryAction}><DashboardSkeleton label="Cargando el panel…" kpis={4} cards={3}/></ListPage>;
  return <ListPage aria-label="Centro de control" primaryAction={primaryAction} className="[&>*]:min-w-0">
    <InternalTasks organizationId={String(user?.organization_id||'')} userId={String(user?.id||'')} canView={user?.role==='owner'||user?.capabilities?.['tasks.view']!==false}/>
    <WorkspaceGuide {...guideProps} variant="card"/>
    {/* Reorganización IA: lo que se viene a hacer va primero (señales y
        vencidos → piezas por etapa → trabajo del día) y los resúmenes comercial
        y financiero quedan debajo, como consulta. */}
    <ControlCenter role={user?.role||'viewer'} orders={orders} refresh={load} navigate={setActive} signals={summary} work={<>
      <section className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-ink-600 bg-ink-800 px-4 py-3" aria-label="Piezas por etapa">
        <h2 className="m-0 text-[17px] font-semibold tracking-tight text-fore">Piezas por etapa</h2>
        <div className="flex min-w-0 flex-1 flex-wrap gap-2">
          {statuses.map(status => (
            <StateChip key={status.id} tone={STAGE_TONE[status.tone] ?? 'mute'} title={`${status.label}: ${stageCounts.get(status.id) || 0} pieza(s)`}>
              {status.label} · <b className="tabular-nums">{stageCounts.get(status.id) || 0}</b>
            </StateChip>
          ))}
        </div>
        <ScaleButton type="button" className="text-button" onClick={() => setActive("Producción")} variant="ghost">Abrir Producción<ArrowUpRight size={14}/></ScaleButton>
      </section>
      <WorkPlanner orders={orders} userId={String(user?.id||'')} role={user?.role||'viewer'} projects={projects} openOrder={id=>setDetail({kind:'order',id})} refresh={load} navigate={setActive}/>
    </>}/>
    {/* #100: sin «Métricas operativas» (repetían Producción/Proyectos) y sin un
        segundo CTA a Producción: el panel de piezas ya enlaza al módulo. */}
  </ListPage>;
}

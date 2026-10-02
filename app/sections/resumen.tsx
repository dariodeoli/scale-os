"use client";
import dynamic from 'next/dynamic';
import {ArrowUpRight} from 'lucide-react';
import {ControlCenter} from '../control-center';
import {WorkspaceGuide} from '../workspace-guide';
import {statuses} from '../production-board';
import {DashboardSkeleton, SectionLoading, StateChip, type ChipTone} from '../ui-v2';
import type {ComponentProps} from 'react';
import type {Project,Summary,User,WorkOrder} from '../workspace-types';
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
};
const STAGE_TONE: Record<string, ChipTone> = {red: 'bad', yellow: 'warn', green: 'ok', blue: 'info', teal: 'info', purple: 'info'};
export function ResumenSection({dataState = 'ready', guideProps, user, orders, load, setActive, summary, stageCounts, projects, setDetail}: ResumenSectionProps){
  // Primer dato en camino: esqueleto con la forma real del panel (KPIs +
  // tarjetas), sin pantalla vacía ni cifras inventadas (#138).
  if (dataState === 'loading' && !orders.length && !projects.length && !summary.active_clients) return <DashboardSkeleton label="Cargando el panel…" kpis={4} cards={3}/>;
  return <div className="grid gap-5 [&>*]:min-w-0">
    <WorkspaceGuide {...guideProps} variant="card"/>
    <ControlCenter role={user?.role||'viewer'} orders={orders} refresh={load} navigate={setActive} signals={summary}/>
    <section className="rounded-xl border border-ink-600 bg-ink-800 p-5 max-md:p-4" aria-label="Piezas por etapa">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border-b border-ink-600 pb-2">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[.13em] text-mute">Producción</p>
          <h2 className="m-0 text-[17px] font-semibold tracking-tight text-fore">Piezas por etapa</h2>
        </div>
        <button type="button" className="text-button" onClick={() => setActive("Producción")}>Abrir Producción<ArrowUpRight size={14}/></button>
      </div>
      <div className="flex flex-wrap gap-2">
        {statuses.map(status => (
          <StateChip key={status.id} tone={STAGE_TONE[status.tone] ?? 'mute'} title={`${status.label}: ${stageCounts.get(status.id) || 0} pieza(s)`}>
            {status.label} · <b className="tabular-nums">{stageCounts.get(status.id) || 0}</b>
          </StateChip>
        ))}
      </div>
    </section>
    <WorkPlanner orders={orders} userId={String(user?.id||'')} role={user?.role||'viewer'} projects={projects} openOrder={id=>setDetail({kind:'order',id})} refresh={load} navigate={setActive}/>
    <InternalTasks role={user?.role||'viewer'}/>
    {/* #100: sin «Métricas operativas» (repetían Producción/Proyectos) y sin un
        segundo CTA a Producción: el panel de piezas ya enlaza al módulo. */}
  </div>;
}

"use client";
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {ArrowUpRight} from 'lucide-react';
import {ControlCenter} from '../control-center';
import {WorkspaceGuide} from '../workspace-guide';
import {statuses} from '../production-board';
import type {ComponentProps} from 'react';
import type {Project,Summary,User,WorkOrder} from '../workspace-types';
const WorkPlanner=dynamic(()=>import('../productivity-ui').then(m=>m.WorkPlanner));
const InternalTasks=dynamic(()=>import('../work-history').then(m=>m.InternalTasks));

// Resumen / Panel (Centro de control).
// Extraído de app/scale-workspace.tsx (issue #47): misma lógica y JSX, sin cambios.
type ResumenSectionProps = {
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
export function ResumenSection({guideProps, user, orders, load, setActive, summary, stageCounts, projects, setDetail}: ResumenSectionProps){
  return (
    (
          <>
            <WorkspaceGuide {...guideProps} variant="card"/>
            <ControlCenter role={user?.role||'viewer'} orders={orders} refresh={load} navigate={setActive} signals={summary}/>
            <section className="panel" aria-label="Piezas por etapa">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">PRODUCCIÓN</p>
                  <h2>Piezas por etapa</h2>
                </div>
                <button className="text-button" onClick={() => setActive("Producción")}>Abrir Producción<ArrowUpRight size={14}/></button>
              </div>
              <div className="stage-strip">
                {statuses.map(status => (
                  <span className="stage-chip" key={status.id}>
                    <span className={`dot${status.tone === "red" ? "" : ` ${status.tone}`}`}/>
                    {status.label} <strong>{stageCounts.get(status.id) || 0}</strong>
                  </span>
                ))}
              </div>
            </section>
            <WorkPlanner orders={orders} userId={String(user?.id||'')} role={user?.role||'viewer'} projects={projects} openOrder={id=>setDetail({kind:'order',id})} refresh={load} navigate={setActive}/>
            <InternalTasks role={user?.role||'viewer'}/>
            <div className="metrics-heading"><p className="section-eyebrow">Operación</p><h2>Métricas operativas</h2></div>
            <section className="metrics operational-metrics" aria-label="Métricas operativas">
              <article className="metric violet">
                <span>Proyectos activos</span>
                <strong>{summary.active_projects}</strong>
                <small>Con trabajo en curso</small>
              </article>
              <article className="metric blue">
                <span>Órdenes abiertas</span>
                <strong>{summary.open_orders}</strong>
                <small>Seguimiento diario</small>
              </article>
              <article className="metric green">
                <span>En revisión</span>
                <strong>{orders.filter(order=>order.status==='review').length}</strong>
                <small>Piezas para aprobar</small>
              </article>
            </section>
            <Link className="secondary" href="/produccion">Abrir Producción →</Link>
          </>
        )
  );
}

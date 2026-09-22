"use client";
import {money} from '../operations';
import {moneyKpi} from '../client-format';
import {listDateShort} from '../list-format';
import {roleCan} from '../capabilities';
import {BudgetActions} from '../suite';
import {RemoveRecord} from '../archive-controls';
import {request} from '../workspace-request';
import type {Budget,Invoice,Summary,User} from '../workspace-types';

// Presupuestos (listado de propuestas).
// Extraído de app/scale-workspace.tsx (issue #47): misma lógica y JSX, sin cambios.
type PresupuestosSectionProps = {
  loading: boolean;
  user: User|null;
  budgetsState: 'loading'|'ready'|'error';
  budgets: Budget[];
  invoices: Invoice[];
  budgetKpis: {totals: Map<string, number>; drafts: number; accepted: number; expiring: number};
  summary: Summary;
  loadBudgets: ()=>Promise<void>|void;
  setBudgets: (value: Budget[]) => void;
};
export function PresupuestosSection({loading, user, budgetsState, budgets, invoices, budgetKpis, summary, loadBudgets, setBudgets}: PresupuestosSectionProps){
  return (
    <section className="panel directory">
            <div className="kpi-strip" aria-label="Métricas de presupuestos">
              <article className="kpi-card tone-brand">
                <p className="eyebrow">PROPUESTAS</p>
                <strong>{budgets.length}</strong>
                <div className="kpi-amounts">
                  {budgetKpis.totals.size ? Array.from(budgetKpis.totals).map(([currency, amount]) => (
                    <span key={currency}>{moneyKpi(amount, currency)}</span>
                  )) : <span>Sin propuestas</span>}
                </div>
              </article>
              <article className="kpi-card tone-warning">
                <p className="eyebrow">BORRADORES</p>
                <strong>{budgetKpis.drafts}</strong>
                <small>Sin enviar al cliente</small>
              </article>
              <article className="kpi-card tone-green">
                <p className="eyebrow">ACEPTADAS</p>
                <strong>{budgetKpis.accepted}</strong>
                <small>Con aprobación del cliente</small>
              </article>
              <article className="kpi-card tone-blue">
                <p className="eyebrow">VENCEN ESTA SEMANA</p>
                <strong>{budgetKpis.expiring}</strong>
                <small>Vigencia en los próximos 7 días</small>
              </article>
            </div>
            <p className="directory-summary">{budgets.length} presupuestos · Propuestas y aprobaciones</p>
            {budgetsState === 'error' && budgets.length ? <p className="error" role="alert">No se pudieron actualizar los presupuestos. Se muestra la última lista cargada. <button type="button" className="text-button" onClick={()=>void loadBudgets()}>Reintentar</button></p> : null}
            <div className="budget-hub-grid">
              {budgets.length ? (
                budgets.map((budget) => (
                  <article className="ops-card budget-hub-card" key={budget.id}>
                    <header className="budget-hub-head">
                      <span className="budget-number">{budget.number}</span>
                      <span className="budget-state" data-status={budget.status}>{{draft:'Borrador',sent:'Enviado',accepted:'Aceptado',rejected:'Rechazado',expired:'Vencido'}[budget.status]||budget.status}</span>
                    </header>
                    <h3>{budget.title}</h3>
                    <p className="budget-client">{budget.client_name}</p>
                    <dl className="budget-hub-facts">
                      <div><dt>Ítems</dt><dd>{budget.item_count}</dd></div>
                      <div><dt>Vigencia</dt><dd>{budget.valid_until?listDateShort(budget.valid_until)||'Sin fecha':'Sin fecha'}</dd></div>
                      <div className="budget-hub-fact-amount"><dt>Sin IVA</dt><dd title={money(Number(budget.subtotal),budget.currency)}>{money(Number(budget.subtotal),budget.currency)}</dd></div>
                    </dl>
                    <strong className="budget-hub-total">{money(Number(budget.total),budget.currency)}<small>IVA incl.</small></strong>
                    <footer className="budget-hub-actions"><BudgetActions id={budget.id} canInvoice={roleCan(user?.role,'invoices.manage')} refresh={async()=>setBudgets((await request<{budgets:Budget[]}>('/api/agency/budgets')).budgets)}/><RemoveRecord kind="budgets" id={budget.id} name={budget.title} role={user?.role||'viewer'} done={async()=>setBudgets((await request<{budgets:Budget[]}>('/api/agency/budgets')).budgets)}/></footer>
                  </article>
                ))
              ) : budgetsState === 'loading' ? (
                <p role="status">Cargando presupuestos…</p>
              ) : budgetsState === 'error' ? (
                <p className="error" role="alert">No se pudieron cargar los presupuestos. <button type="button" className="text-button" onClick={()=>void loadBudgets()}>Reintentar</button></p>
              ) : (
                <p className="empty-copy">
                  Todavía no hay presupuestos. Creá el primero con un valor sin
                  IVA.
                </p>
              )}
            </div>
          </section>
  );
}

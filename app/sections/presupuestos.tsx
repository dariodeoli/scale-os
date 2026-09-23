"use client";
import {Aviso} from 'owncoding-ui';
import {moneyKpi} from '../client-format';
import {listDateShort,dueTone} from '../list-format';
import {roleCan} from '../capabilities';
import {BudgetActions} from '../suite';
import {RemoveRecord} from '../archive-controls';
import {request} from '../workspace-request';
import {EmptyBlock,ErrorBlock,Kpi,KpiStrip,ListGrid,ListRow,LoadingBlock,MoneyText,StateChip,type ChipTone,type Column} from '../ui-v2';
import type {Budget,Invoice,Summary,User} from '../workspace-types';

// Presupuestos (SOS-COM, campaña #41 / spec #43 §4).
// Rediseño v2: KPIs, lista finita con encabezado y plantilla compartida,
// estados de carga/vacío/error con reintento. Los datos y callbacks siguen
// llegando del shell (misma API y mismas acciones).
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

const BUDGET_COLUMNS: Column[] = [
  {key:'budget',label:'Presupuesto'},
  {key:'client',label:'Cliente'},
  {key:'status',label:'Estado'},
  {key:'items',label:'Ítems',align:'end'},
  {key:'valid',label:'Vigencia'},
  {key:'subtotal',label:'Sin IVA',align:'end'},
  {key:'total',label:'Total · IVA incl.',align:'end'},
  {key:'actions',label:'Acciones',align:'end'},
];
const BUDGET_TEMPLATE = 'grid-cols-[minmax(26rem,2.2fr)_minmax(16rem,1.4fr)_7rem_4rem_7rem_9rem_9rem_15rem]';
const BUDGET_STATE: Record<string,{label:string;tone:ChipTone}> = {
  draft: {label:'Borrador', tone:'mute'},
  sent: {label:'Enviado', tone:'info'},
  accepted: {label:'Aceptado', tone:'ok'},
  rejected: {label:'Rechazado', tone:'bad'},
  expired: {label:'Vencido', tone:'warn'},
};

export function PresupuestosSection({loading, user, budgetsState, budgets, invoices, budgetKpis, summary, loadBudgets, setBudgets}: PresupuestosSectionProps){
  const canManage = roleCan(user?.role,'budgets.manage');
  const totals = Array.from(budgetKpis.totals);
  const reload = async () => { setBudgets((await request<{budgets:Budget[]}>('/api/agency/budgets')).budgets); };
  const row = (budget: Budget) => {
    const state = BUDGET_STATE[budget.status] || {label: budget.status, tone: 'mute' as ChipTone};
    const valid = listDateShort(budget.valid_until);
    const tone = dueTone(budget.valid_until);
    return <ListRow key={budget.id} template={BUDGET_TEMPLATE} className="budget-row">
      <div className="flex min-w-0 items-baseline gap-2">
        <b className="shrink-0 font-mono text-[11px] font-semibold text-mute">{budget.number}</b>
        <span className="min-w-0 text-[13.5px] font-semibold leading-tight text-fore [overflow-wrap:anywhere]" title={budget.title}>{budget.title}</span>
      </div>
      <span className="min-w-0 text-[12px] leading-tight text-mute [overflow-wrap:anywhere]" title={budget.client_name}>{budget.client_name}</span>
      <span className="min-w-0"><StateChip tone={state.tone}>{state.label}</StateChip></span>
      <span className="whitespace-nowrap text-right text-[12px] tabular-nums text-mute">{budget.item_count}</span>
      <span className="list-date min-w-0 whitespace-nowrap text-[11px] text-mute" data-tone={tone||undefined} title={valid?`Vigencia hasta ${valid}`:'Sin vigencia registrada'}>{valid||'Sin fecha'}</span>
      <span className="text-right"><MoneyText valor={budget.subtotal} currency={budget.currency} className="text-fore"/></span>
      <span className="text-right"><MoneyText valor={budget.total} currency={budget.currency} className="text-[13.5px] text-fore"/></span>
      <span className="flex min-w-0 items-center justify-end gap-2 [&_button.icon-button]:h-8 [&_button.icon-button]:min-h-8 [&_button.icon-button]:w-8 [&_button.icon-button]:min-w-8">
        <BudgetActions id={budget.id} canInvoice={roleCan(user?.role,'invoices.manage')} refresh={reload}/>
        <RemoveRecord kind="budgets" id={budget.id} name={budget.title} role={user?.role||'viewer'} done={reload}/>
      </span>
    </ListRow>;
  };

  return (
    <section className="directory grid gap-4" aria-label="Presupuestos">
      <KpiStrip aria-label="Métricas de presupuestos">
        <Kpi label="Presupuestos" valor={budgets.length} destacado hint={totals.length ? `Total sin IVA: ${totals.map(([currency,value])=>moneyKpi(value,currency)).join(' · ')}` : 'Sin propuestas cargadas'}/>
        <Kpi label="Borradores" valor={budgetKpis.drafts} hint="Sin enviar al cliente"/>
        <Kpi label="Aceptadas" valor={budgetKpis.accepted} hint="Con aprobación del cliente"/>
        <Kpi label="Vencen esta semana" valor={budgetKpis.expiring} hint="Vigencia en los próximos 7 días"/>
      </KpiStrip>

      {budgetsState==='error' && budgets.length ? (
        <Aviso tono="error" como="div" role="alert">No se pudieron actualizar los presupuestos. Se muestra la última lista cargada.{' '}
          <button type="button" className="underline" onClick={()=>void loadBudgets()}>Reintentar</button>
        </Aviso>
      ) : null}

      {budgets.length ? (
        <ListGrid label="Presupuestos" template={BUDGET_TEMPLATE} columns={BUDGET_COLUMNS} minWidthClass="min-w-[90rem]">
          {budgets.map(row)}
        </ListGrid>
      ) : budgetsState==='loading' || loading ? (
        <LoadingBlock label="Cargando presupuestos…" lines={4}/>
      ) : budgetsState==='error' ? (
        <ErrorBlock title="No se pudieron cargar los presupuestos." description="Revisá la conexión y volvé a intentar; no se inventan totales." onRetry={()=>void loadBudgets()}/>
      ) : (
        <EmptyBlock
          icon="receipt"
          title="Todavía no hay presupuestos."
          description={canManage ? 'Creá el primero con «Nuevo presupuesto»: el valor se carga sin IVA y el IVA se define en el documento.' : 'Cuando el equipo cree una propuesta, vas a verla acá con su estado y vigencia.'}
        />
      )}
    </section>
  );
}

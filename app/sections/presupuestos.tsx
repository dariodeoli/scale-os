"use client";
import {useEffect,useState} from 'react';
import {Aviso,Button} from 'owncoding-ui';
import {Plus,Trash2} from 'lucide-react';
import {moneyKpi} from '../client-format';
import {listDateShort,dueTone} from '../list-format';
import {BATCH_LIMITS,limitSelection,roleCan} from '../capabilities';
import {Dialog} from '../dialog';
import {notify} from '../feedback';
import {BudgetActions} from '../suite';
import {RemoveRecord} from '../archive-controls';
import {request} from '../workspace-request';
import {EmptyBlock,ErrorBlock,Kpi,KpiStrip,ListGrid,ListRow,LoadingBlock,MoneyText,StateChip,type ChipTone,type Column} from '../ui-v2';
import {BUDGET_TABLE_MIN_WIDTH,useDenseTableFit} from '../use-dense-table';
import type {Budget,Invoice,Summary,User} from '../workspace-types';

// Presupuestos (SOS-COM, campaña #41 / spec #43 §4).
// Rediseño v2: KPIs, lista finita con encabezado y plantilla compartida,
// estados de carga/vacío/error con reintento. Los datos y callbacks siguen
// llegando del shell (misma API y mismas acciones).
// Ronda 12 (#59): lote con el patrón `bulk-bar` (Equipo/Clientes) — selección
// por fila, tope por llamada, confirmación antes de mover a la papelera y
// refresco contra el contrato real de la lista.
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
  onCreate?: () => void;
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
const errorText=(cause:unknown)=>cause instanceof Error?cause.message:'No se pudo completar la operación';

// Vista tarjeta (anchos medios, #62): mismo contrato que la fila densa
// (número, estado, cliente, ítems, vigencia, sin IVA, total, acciones) en la
// cápsula `budget-hub-card` del sistema. Nada se recorta: el total va completo
// y el pie queda anclado.
function BudgetTile({budget,user,canManage,selected,onToggle,refresh}:{budget:Budget;user:User|null;canManage:boolean;selected:boolean;onToggle:()=>void;refresh:()=>Promise<void>}){
  const state=BUDGET_STATE[budget.status]||{label:budget.status,tone:'mute' as ChipTone};
  const valid=listDateShort(budget.valid_until);
  const tone=dueTone(budget.valid_until);
  return <article className="ops-card budget-hub-card">
    <header className="budget-hub-head">
      <span className="flex min-w-0 items-center gap-2">
        {canManage?<label className="select-check flex h-11 w-11 shrink-0 items-center justify-center md:h-8 md:w-8" title="Seleccionar presupuesto"><input type="checkbox" aria-label={`Seleccionar ${budget.number} · ${budget.title}`} checked={selected} onChange={()=>onToggle()}/></label>:null}
        <b className="shrink-0 font-mono text-[11px] font-semibold text-mute">{budget.number}</b>
      </span>
      <StateChip tone={state.tone}>{state.label}</StateChip>
    </header>
    <h3 className="text-[15px] font-semibold leading-snug text-fore" title={budget.title}>{budget.title}</h3>
    <p className="budget-client truncate" title={budget.client_name}>{budget.client_name}</p>
    <dl className="budget-hub-facts">
      <div><dt>Ítems</dt><dd>{budget.item_count}</dd></div>
      <div><dt>Vigencia</dt><dd className="list-date" data-tone={tone||undefined} title={valid?`Vigencia hasta ${valid}`:'Sin vigencia registrada'}>{valid||'Sin fecha'}</dd></div>
      <div className="budget-hub-fact-amount"><dt>Sin IVA</dt><dd><MoneyText valor={budget.subtotal} currency={budget.currency}/></dd></div>
    </dl>
    <strong className="budget-hub-total"><MoneyText valor={budget.total} currency={budget.currency} className="text-fore"/><small>Total · IVA incl.</small></strong>
    <footer className="budget-hub-actions">
      <BudgetActions id={budget.id} canInvoice={roleCan(user?.role,'invoices.manage')} refresh={refresh}/>
      <RemoveRecord kind="budgets" id={budget.id} name={budget.title} role={user?.role||'viewer'} done={refresh}/>
    </footer>
  </article>;
}

export function PresupuestosSection({loading, user, budgetsState, budgets, invoices, budgetKpis, summary, loadBudgets, setBudgets, onCreate}: PresupuestosSectionProps){
  const canManage = roleCan(user?.role,'budgets.manage');
  // Tabla densa sólo si entra completa; si no, tarjetas (#62).
  const {ref: tableRef, fits: tableFits} = useDenseTableFit(BUDGET_TABLE_MIN_WIDTH);
  const totals = Array.from(budgetKpis.totals);
  const [selected,setSelected]=useState<string[]>([]),[bulkBusy,setBulkBusy]=useState(false),[confirmOpen,setConfirmOpen]=useState(false),[bulkError,setBulkError]=useState('');
  const reload = async () => { setBudgets((await request<{budgets:Budget[]}>('/api/agency/budgets')).budgets); };
  // La selección no sobrevive a un presupuesto que ya no está en la lista.
  useEffect(()=>{setSelected(current=>{const live=new Set(budgets.map(budget=>String(budget.id)));const next=current.filter(id=>live.has(id));return next.length===current.length?current:next;});},[budgets]);
  function toggleSelected(id:string){
    if(selected.includes(id)){setSelected(selected.filter(value=>value!==id));return;}
    if(selected.length>=BATCH_LIMITS.budgets){notify({tone:'warning',message:`El lote admite hasta ${BATCH_LIMITS.budgets} presupuestos. Quitá alguno para sumar otro.`});return;}
    setSelected([...selected,id]);
  }
  function selectVisible(){
    const {selection,capped}=limitSelection(budgets.map(budget=>String(budget.id)),BATCH_LIMITS.budgets);
    setSelected(selection);
    if(capped)notify({tone:'warning',message:`El lote admite hasta ${BATCH_LIMITS.budgets} presupuestos: se seleccionaron los primeros ${BATCH_LIMITS.budgets}.`});
  }
  async function moveToTrash(){
    if(bulkBusy||!selected.length)return;
    const total=selected.length;
    setBulkBusy(true);setBulkError('');
    try{
      const response=await request<{updated:number}>('/api/agency/budgets/batch',{method:'POST',body:JSON.stringify({ids:selected})});
      const moved=Number(response?.updated)||total;
      setSelected([]);setConfirmOpen(false);
      let refreshed=true;
      try{await reload();}catch{refreshed=false;}
      const label=`presupuesto${total===1?'':'s'} movido${total===1?'':'s'} a la papelera`;
      notify(!refreshed?{tone:'warning',message:`${moved} ${label}, pero no se pudo actualizar la lista.`}:moved<total?{tone:'warning',message:`${moved} de ${total} ${label}.`}:{tone:'success',message:`${moved} ${label}.`});
    }catch(cause){setBulkError(errorText(cause));}
    finally{setBulkBusy(false);}
  }
  const selectedTitles = selected.map(id=>budgets.find(budget=>String(budget.id)===id)).filter((budget):budget is Budget=>Boolean(budget)).map(budget=>budget.title);
  const row = (budget: Budget) => {
    const state = BUDGET_STATE[budget.status] || {label: budget.status, tone: 'mute' as ChipTone};
    const valid = listDateShort(budget.valid_until);
    const tone = dueTone(budget.valid_until);
    return <ListRow key={budget.id} template={BUDGET_TEMPLATE} className="budget-row">
      <div role="cell" className="flex min-w-0 items-center gap-2">
        {canManage ? <label className="select-check flex h-11 w-11 shrink-0 items-center justify-center md:h-8 md:w-8" title="Seleccionar presupuesto"><input type="checkbox" aria-label={`Seleccionar ${budget.number} · ${budget.title}`} checked={selected.includes(String(budget.id))} onChange={()=>toggleSelected(String(budget.id))}/></label> : null}
        <span className="flex min-w-0 items-baseline gap-2">
          <b className="shrink-0 font-mono text-[11px] font-semibold text-mute">{budget.number}</b>
          <span className="min-w-0 text-[13.5px] font-semibold leading-tight text-fore [overflow-wrap:anywhere]" title={budget.title}>{budget.title}</span>
        </span>
      </div>
      <span role="cell" className="min-w-0 text-[12px] leading-tight text-mute [overflow-wrap:anywhere]" title={budget.client_name}>{budget.client_name}</span>
      <span role="cell" className="min-w-0"><StateChip tone={state.tone}>{state.label}</StateChip></span>
      <span role="cell" className="whitespace-nowrap text-right text-[12px] tabular-nums text-mute">{budget.item_count}</span>
      <span role="cell" className="list-date min-w-0 whitespace-nowrap text-[11px] text-mute" data-tone={tone||undefined} title={valid?`Vigencia hasta ${valid}`:'Sin vigencia registrada'}>{valid||'Sin fecha'}</span>
      <span role="cell" className="text-right"><MoneyText valor={budget.subtotal} currency={budget.currency} className="text-fore"/></span>
      <span role="cell" className="text-right"><MoneyText valor={budget.total} currency={budget.currency} className="text-[13.5px] text-fore"/></span>
      <span role="cell" className="flex min-w-0 items-center justify-end gap-2 [&_button.icon-button]:h-8 [&_button.icon-button]:min-h-8 [&_button.icon-button]:w-8 [&_button.icon-button]:min-w-8">
        <BudgetActions id={budget.id} canInvoice={roleCan(user?.role,'invoices.manage')} refresh={reload}/>
        <RemoveRecord kind="budgets" id={budget.id} name={budget.title} role={user?.role||'viewer'} done={reload}/>
      </span>
    </ListRow>;
  };

  return (
    <section ref={tableRef} className="directory grid gap-4" aria-label="Presupuestos">
      <KpiStrip aria-label="Métricas de presupuestos">
        <Kpi label="Presupuestos" valor={budgets.length} destacado hint={totals.length ? `Total sin IVA: ${totals.map(([currency,value])=>moneyKpi(value,currency)).join(' · ')}` : 'Sin propuestas cargadas'}/>
        <Kpi label="Borradores" valor={budgetKpis.drafts} hint="Sin enviar al cliente"/>
        <Kpi label="Aceptadas" valor={budgetKpis.accepted} hint="Con aprobación del cliente"/>
        <Kpi label="Vencen esta semana" valor={budgetKpis.expiring} hint="Vigencia en los próximos 7 días"/>
      </KpiStrip>

      {canManage && budgets.length ? <div className="bulk-bar" role="status" aria-live="polite">
        <span className="bulk-count">{selected.length ? <><b>{selected.length}</b> de {BATCH_LIMITS.budgets} seleccionado{selected.length===1?'':'s'}</> : <span className="bulk-hint">Seleccioná varios para operar en lote · máximo {BATCH_LIMITS.budgets}</span>}</span>
        <div className="inline-actions bulk-actions">
          <button type="button" className="text-button min-h-11 md:min-h-8" onClick={selectVisible}>Seleccionar visibles</button>
          {selected.length ? <>
            <button type="button" className="secondary danger min-h-11 md:min-h-10" disabled={bulkBusy} onClick={()=>{setBulkError('');setConfirmOpen(true);}}><Trash2 size={14} aria-hidden="true"/>Mover a la papelera</button>
            <button type="button" className="text-button min-h-11 md:min-h-8" onClick={()=>setSelected([])}>Limpiar</button>
          </> : null}
        </div>
      </div> : null}

      {budgetsState==='error' && budgets.length ? (
        <Aviso tono="error" como="div" role="alert">No se pudieron actualizar los presupuestos. Se muestra la última lista cargada.{' '}
          <button type="button" className="underline" onClick={()=>void loadBudgets()}>Reintentar</button>
        </Aviso>
      ) : null}

      {budgets.length ? (
        tableFits ? (
          <ListGrid label="Presupuestos" template={BUDGET_TEMPLATE} columns={BUDGET_COLUMNS} minWidthClass="min-w-[93rem]" className="com-table-fixed-actions">
            {budgets.map(row)}
          </ListGrid>
        ) : (
          <div className="budget-hub-grid">
            {budgets.map(budget=><BudgetTile key={budget.id} budget={budget} user={user} canManage={canManage} selected={selected.includes(String(budget.id))} onToggle={()=>toggleSelected(String(budget.id))} refresh={reload}/>)}
          </div>
        )
      ) : budgetsState==='loading' || loading ? (
        <LoadingBlock label="Cargando presupuestos…" lines={4}/>
      ) : budgetsState==='error' ? (
        <ErrorBlock title="No se pudieron cargar los presupuestos." description="Revisá la conexión y volvé a intentar; no se inventan totales." onRetry={()=>void loadBudgets()}/>
      ) : (
        <EmptyBlock
          icon="receipt"
          title="Todavía no hay presupuestos."
          description={canManage ? 'Creá el primero: el valor se carga sin IVA y el IVA se define en el documento.' : 'Cuando el equipo cree una propuesta, vas a verla acá con su estado y vigencia.'}
          action={canManage&&onCreate ? <Button type="button" onClick={()=>onCreate()}><Plus aria-hidden="true" size={16}/>Nuevo presupuesto</Button> : undefined}
        />
      )}

      {confirmOpen && <Dialog title="Mover a la papelera" close={()=>{if(!bulkBusy)setConfirmOpen(false);}}>
        <p><strong>{selected.length===1 ? selectedTitles[0] : `${selected.length} presupuestos`}</strong></p>
        {selected.length>1 ? <p>{selectedTitles.slice(0,3).join(' · ')}{selected.length>3 ? ` y ${selected.length-3} más` : ''}</p> : null}
        <p>Se quitarán de las listas activas y quedarán en la Papelera. Podés restaurarlos después.</p>
        <p className="form-note">El enlace público dejará de funcionar. Restaurar el presupuesto no volverá a publicarlo automáticamente.</p>
        {bulkError ? <p className="error" role="alert">{bulkError}</p> : null}
        <div className="inline-actions">
          <button className="secondary" disabled={bulkBusy} onClick={()=>setConfirmOpen(false)}>Cancelar</button>
          <button className="secondary danger" disabled={bulkBusy} onClick={()=>void moveToTrash()}>{bulkBusy?'Procesando…':'Confirmar: mover a papelera'}</button>
        </div>
      </Dialog>}
    </section>
  );
}

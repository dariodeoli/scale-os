"use client";
import {Button} from '../ui/button';

import {useEffect,useMemo,useState} from 'react';
import {Aviso, SegmentedField} from 'owncoding-ui';
import {SearchField} from '../search-field';
import {fechaListaCorta} from 'owncoding-ui';
import {hasDueWarning} from '../list-format';
import {Plus,Trash2} from 'lucide-react';
import {moneyKpi} from '../client-format';
import {BATCH_LIMITS,roleCan} from '../capabilities';
import {ConfirmDialog} from '../dialog';
import {notify} from '../feedback';
import {BudgetActions} from '../suite';
import {RemoveRecord} from '../archive-controls';
import {request} from '../workspace-request';
import {projectedList,BUDGET_LIST_FIELDS} from '../shell-data';
import {BulkBar,EmptyBlock,EmptyCta,ErrorBlock,FilterToolbar,Kpi,KpiStrip,ListActions,ListGrid,ListPage,ListRow,LoadingBlock,MoneyText,StateChip,ViewSwitch,denseTableMinWidth,useBulkSelection,useDenseTableFit,type CollectionView,type Column} from '../ui-v2';
import {SelectCustom} from '../profile-controls';
import {budgetState,filterBudgets,type BudgetFilters} from '../budget-status';
import {EMPTY_WINDOW,useFilasVisibles,windowLabel,type ListWindowState} from '../list-window';
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
  /** Ventana de la lista (#105): filas cargadas, si hay más y el total exacto. */
  windowState?: ListWindowState;
  onLoadMore?: () => Promise<void>|void;
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
// Pistas afinadas (#100, mismo criterio que Clientes en #77): la tabla entra ya
// en 1280 (58rem de pistas + 7 espacios de 8 px + 8 px de padding = 992 px).
const BUDGET_TEMPLATE = 'grid-cols-[minmax(14rem,2fr)_minmax(8rem,1.1fr)_6rem_3.5rem_6rem_8rem_8rem_4.5rem]';
const BUDGET_TABLE_MIN_WIDTH = denseTableMinWidth(58, 8);
/** Vista elegida por la persona (lista/tarjetas), como Clientes: persiste en el navegador y no depende del ancho. */
export const BUDGET_VIEW_KEY='scale:budget-view';
export function readBudgetView():CollectionView{try{return localStorage.getItem(BUDGET_VIEW_KEY)==='grid'?'grid':'list';}catch{return 'list';}}
const errorText=(cause:unknown)=>cause instanceof Error?cause.message:'No se pudo completar la operación';

// Vista tarjeta (anchos medios, #62): mismo contrato que la fila densa
// (número, estado, cliente, ítems, vigencia, sin IVA, total, acciones) en la
// cápsula `budget-hub-card` del sistema. Nada se recorta: el total va completo
// y el pie queda anclado.
function BudgetTile({budget,user,canManage,selected,onToggle,refresh}:{budget:Budget;user:User|null;canManage:boolean;selected:boolean;onToggle:()=>void;refresh:()=>Promise<void>}){
  const state=budgetState(budget.status);
  const valid=fechaListaCorta(budget.valid_until,'Sin fecha');
  const tone=hasDueWarning(budget.valid_until);
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
      <div><dt>Vigencia</dt><dd className="list-date" data-tone={tone||undefined} title={budget.valid_until?`Vigencia hasta ${valid}`:'Sin vigencia registrada'}>{valid}</dd></div>
      <div className="budget-hub-fact-amount"><dt>Sin IVA</dt><dd><MoneyText valor={budget.subtotal} currency={budget.currency}/></dd></div>
    </dl>
    <strong className="budget-hub-total"><MoneyText valor={budget.total} currency={budget.currency} className="text-fore"/><small>Total · IVA incl.</small></strong>
    <footer className="budget-hub-actions">
      <BudgetActions id={budget.id} canInvoice={roleCan(user?.role,'invoices.manage')} refresh={refresh}/>
      <RemoveRecord kind="budgets" id={budget.id} name={budget.title} role={user?.role||'viewer'} done={refresh}/>
    </footer>
  </article>;
}

export function PresupuestosSection({loading, user, budgetsState, budgets, windowState=EMPTY_WINDOW, onLoadMore, invoices, budgetKpis, summary, loadBudgets, setBudgets, onCreate}: PresupuestosSectionProps){
  const [moreBusy,setMoreBusy]=useState(false);
  const cargarMas=async()=>{
    if(moreBusy||!onLoadMore)return;
    setMoreBusy(true);
    try{await onLoadMore();}finally{setMoreBusy(false);}
  };
  const canManage = roleCan(user?.role,'budgets.manage');
  const {ref: tableRef} = useDenseTableFit(BUDGET_TABLE_MIN_WIDTH);
  // Vista elegida por la persona (D1): la lista siempre es la tabla (con scroll
  // horizontal silencioso si no entra) y las tarjetas muestran la misma info.
  const [view,setView]=useState<CollectionView>('list');
  useEffect(()=>{setView(readBudgetView());},[]);
  const changeView=(next:CollectionView)=>{setView(next);try{localStorage.setItem(BUDGET_VIEW_KEY,next);}catch{/* Preferencia opcional de la interfaz. */}};
  // Filtros (F2/F3): estado, cliente y búsqueda; los KPI filtran con el mismo estado.
  const [filters,setFilters]=useState<BudgetFilters>({status:'',client:'',query:''});
  const shown=useMemo(()=>filterBudgets(budgets,filters),[budgets,filters]);
  const clientChoices=useMemo(()=>[{value:'',label:'Todos'},...[...new Set(budgets.map(budget=>budget.client_name).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'es')).map(name=>({value:name,label:name}))],[budgets]);
  const filtersActive=Boolean(filters.status||filters.client||filters.query.trim());
  const kpiFilter=(status:BudgetFilters['status'],text:string,hint:string)=><button type="button" className="text-button min-h-11 !px-0 text-left md:min-h-0" aria-pressed={filters.status===status} title={filters.status===status?'Quitar el filtro':`Filtrar: ${hint}`} onClick={()=>setFilters(current=>({...current,status:current.status===status?'':status}))}>{text}{filters.status===status?' · filtrando':''}</button>;
  // Ventana de montaje (#135 P4): la tabla densa monta sólo el tramo visible;
  // las tarjetas (altura variable) conservan el montaje completo.
  const filasVisibles = useFilasVisibles(tableRef, shown.length);
  const totals = Array.from(budgetKpis.totals);
  const bulk=useBulkSelection({limit:BATCH_LIMITS.budgets,noun:'presupuestos'});
  const selected=bulk.ids;
  const [bulkBusy,setBulkBusy]=useState(false),[confirmOpen,setConfirmOpen]=useState(false),[bulkError,setBulkError]=useState('');
  const reload = async () => { setBudgets((await projectedList('budgets','/api/agency/budgets',BUDGET_LIST_FIELDS,path=>request<{budgets:Budget[]}>(path))).budgets); };
  // La selección no sobrevive a un presupuesto que ya no está en la lista.
  const {prune}=bulk;
  useEffect(()=>{prune(budgets.map(budget=>String(budget.id)));},[budgets,prune]);
  const toggleSelected=bulk.toggle;
  const selectVisible=()=>bulk.selectVisible(shown.map(budget=>String(budget.id)));
  async function moveToTrash(){
    if(bulkBusy||!selected.length)return;
    const total=selected.length;
    setBulkBusy(true);setBulkError('');
    try{
      const response=await request<{updated:number}>('/api/agency/budgets/batch',{method:'POST',body:JSON.stringify({ids:selected})});
      const moved=Number(response?.updated)||total;
      bulk.clear();setConfirmOpen(false);
      let refreshed=true;
      try{await reload();}catch{refreshed=false;}
      const label=`presupuesto${total===1?'':'s'} movido${total===1?'':'s'} a la papelera`;
      notify(!refreshed?{tone:'warning',message:`${moved} ${label}, pero no se pudo actualizar la lista.`}:moved<total?{tone:'warning',message:`${moved} de ${total} ${label}.`}:{tone:'success',message:`${moved} ${label}.`});
    }catch(cause){setBulkError(errorText(cause));}
    finally{setBulkBusy(false);}
  }
  const selectedTitles = selected.map(id=>budgets.find(budget=>String(budget.id)===id)).filter((budget):budget is Budget=>Boolean(budget)).map(budget=>budget.title);
  const row = (budget: Budget) => {
    const state = budgetState(budget.status);
    const valid = fechaListaCorta(budget.valid_until,'Sin fecha');
    const tone = hasDueWarning(budget.valid_until);
    return <ListRow key={budget.id} template={BUDGET_TEMPLATE} className="budget-row">
      <div role="cell" className="flex min-w-0 items-center gap-2">
        {canManage ? <label className="select-check flex h-11 w-11 shrink-0 items-center justify-center md:h-8 md:w-8" title="Seleccionar presupuesto"><input type="checkbox" aria-label={`Seleccionar ${budget.number} · ${budget.title}`} checked={bulk.has(String(budget.id))} onChange={()=>toggleSelected(String(budget.id))}/></label> : null}
        <span className="flex min-w-0 items-baseline gap-2">
          <b className="shrink-0 font-mono text-[11px] font-semibold text-mute">{budget.number}</b>
          <span className="min-w-0 truncate text-[13.5px] font-semibold leading-tight text-fore" title={budget.title}>{budget.title}</span>
        </span>
      </div>
      <span role="cell" className="min-w-0 truncate text-[12px] leading-tight text-mute" title={budget.client_name}>{budget.client_name}</span>
      <span role="cell" className="min-w-0"><StateChip tone={state.tone}>{state.label}</StateChip></span>
      <span role="cell" className="whitespace-nowrap text-right text-[12px] tabular-nums text-mute">{budget.item_count}</span>
      <span role="cell" className="list-date min-w-0 whitespace-nowrap text-[11px] text-mute" data-tone={tone||undefined} title={budget.valid_until?`Vigencia hasta ${valid}`:'Sin vigencia registrada'}>{valid}</span>
      <span role="cell" className="text-right"><MoneyText valor={budget.subtotal} currency={budget.currency} className="text-fore"/></span>
      <span role="cell" className="text-right"><MoneyText valor={budget.total} currency={budget.currency} className="text-[13.5px] text-fore"/></span>
      <ListActions className="[&_button.icon-button]:h-8 [&_button.icon-button]:min-h-8 [&_button.icon-button]:w-8 [&_button.icon-button]:min-w-8">
        <BudgetActions id={budget.id} variant="icon" label={budget.number} canInvoice={roleCan(user?.role,'invoices.manage')} refresh={reload}/>
        <RemoveRecord kind="budgets" id={budget.id} name={budget.title} role={user?.role||'viewer'} done={reload}/>
      </ListActions>
    </ListRow>;
  };

  const createButton=canManage&&onCreate?<Button variant="primary" type="button" className="primary" onClick={()=>onCreate()}><Plus size={18} aria-hidden="true"/> Nuevo presupuesto</Button>:undefined;
  return (
    <ListPage
      rootRef={tableRef}
      className="directory"
      aria-label="Presupuestos"
      primaryAction={<>{createButton}<ViewSwitch value={view} onChange={changeView}/></>}
      toolbar={<FilterToolbar className="mb-0" summary={`${shown.length} de ${windowState.total ?? budgets.length}`}>
        <SegmentedField className="[&>button]:min-h-11 md:[&>button]:min-h-8" ariaLabel="Filtrar por estado" value={filters.status} onChange={(value:string)=>setFilters(current=>({...current,status:value as BudgetFilters['status']}))} options={[['','Todos'],['draft','Borradores'],['sent','Enviados'],['accepted','Aceptados'],['rejected','Rechazados'],['expired','Vencidos']]}/>
        <div className="w-full sm:w-52"><SelectCustom label="Cliente" choices={clientChoices} value={filters.client} onChange={client=>setFilters(current=>({...current,client}))}/></div>
        <SearchField className="w-full sm:w-72" ariaLabel="Buscar presupuesto" value={filters.query} onChange={value=>setFilters(current=>({...current,query:value}))} placeholder="Número, título o cliente…"/>
        {filtersActive?<button type="button" className="text-button min-h-11 md:min-h-8" onClick={()=>setFilters({status:'',client:'',query:''})}>Limpiar filtros</button>:null}
      </FilterToolbar>}
      kpis={<KpiStrip aria-label="Métricas de presupuestos">
        <Kpi label="Presupuestos" valor={windowState.total ?? budgets.length} destacado hint={totals.length ? `Total sin IVA: ${totals.map(([currency,value])=>moneyKpi(value,currency)).join(' · ')}` : 'Sin propuestas cargadas'}/>
        <Kpi label="Borradores" valor={budgetKpis.drafts} hint={kpiFilter('draft','Sin enviar al cliente','borradores')}/>
        <Kpi label="Aceptadas" valor={budgetKpis.accepted} hint={kpiFilter('accepted','Con aprobación del cliente','aceptados')}/>
        <Kpi label="Vencen esta semana" valor={budgetKpis.expiring} hint={kpiFilter('expiring','Vigencia en los próximos 7 días','vencen esta semana')}/>
      </KpiStrip>}
      bulk={canManage ? <BulkBar count={bulk.count} total={BATCH_LIMITS.budgets} role={user?.role} onSelectVisible={selectVisible} onClear={bulk.clear}>
        <Button variant="danger" type="button" className="secondary danger min-h-11 md:min-h-10" disabled={bulkBusy} onClick={()=>{setBulkError('');setConfirmOpen(true);}}><Trash2 size={14} aria-hidden="true"/>Mover a la papelera</Button>
      </BulkBar> : undefined}
    >
      {/* Ventana (#105): contador honesto y «Ver más»; cuando queda lista por
          traer, el aviso aclara que los indicadores cuentan lo cargado. */}
      {windowState.hasMore ? <div className="bulk-bar" role="status" aria-live="polite">
        <span className="bulk-count">{windowLabel(windowState.loaded, windowState.total, 'presupuesto', 'presupuestos')} · los indicadores cuentan lo cargado</span>
        <div className="inline-actions bulk-actions">
          <Button variant="secondary" type="button" className="secondary min-h-11 md:min-h-10" disabled={moreBusy} onClick={()=>void cargarMas()}>{moreBusy?'Cargando…':'Ver más'}</Button>
        </div>
      </div> : null}

      {budgetsState==='error' && budgets.length ? (
        <Aviso tono="error" como="div" role="alert">No se pudieron actualizar los presupuestos. Se muestra la última lista cargada.{' '}
          <button type="button" className="underline" onClick={()=>void loadBudgets()}>Reintentar</button>
        </Aviso>
      ) : null}


      {budgets.length && !shown.length ? (
        <EmptyBlock compact icon="filter" title="Ningún presupuesto coincide con los filtros." description="Probá con otro estado, cliente o búsqueda." action={<Button variant="secondary" type="button" className="secondary" onClick={()=>setFilters({status:'',client:'',query:''})}>Limpiar filtros</Button>}/>
      ) : budgets.length ? (
        view==='list' ? (
          <ListGrid label="Presupuestos" template={BUDGET_TEMPLATE} columns={BUDGET_COLUMNS} minWidthClass="min-w-[62rem]" pinnedActions>
            {filasVisibles.inicio > 0 ? <div role="row" aria-hidden="true" style={{height: filasVisibles.inicio * filasVisibles.altoFila}}/> : null}
            {shown.slice(filasVisibles.inicio, filasVisibles.fin).map(row)}
            {filasVisibles.fin < shown.length ? <div role="row" aria-hidden="true" style={{height: (shown.length - filasVisibles.fin) * filasVisibles.altoFila}}/> : null}
          </ListGrid>
        ) : (
          <div className="budget-hub-grid">
            {shown.map(budget=><BudgetTile key={budget.id} budget={budget} user={user} canManage={canManage} selected={bulk.has(String(budget.id))} onToggle={()=>toggleSelected(String(budget.id))} refresh={reload}/>)}
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
          action={canManage&&onCreate ? <EmptyCta label="Nuevo presupuesto" onClick={()=>onCreate()} icon={<Plus aria-hidden="true" size={16}/>}/> : undefined}
        />
      )}

      {confirmOpen && <ConfirmDialog open variant="danger" title="Mover a la papelera" confirmLabel="Confirmar: mover a papelera" busy={bulkBusy} error={bulkError} onCancel={()=>{if(!bulkBusy)setConfirmOpen(false);}} onConfirm={()=>void moveToTrash()} description={<>
        <p><strong>{selected.length===1 ? selectedTitles[0] : `${selected.length} presupuestos`}</strong></p>
        {selected.length>1 ? <p>{selectedTitles.slice(0,3).join(' · ')}{selected.length>3 ? ` y ${selected.length-3} más` : ''}</p> : null}
        <p>Se quitarán de las listas activas y quedarán en la Papelera. Podés restaurarlos después.</p>
        <p className="form-note">El enlace público dejará de funcionar. Restaurar el presupuesto no volverá a publicarlo automáticamente.</p>
      </>}/>}
    </ListPage>
  );
}

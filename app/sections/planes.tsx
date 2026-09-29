"use client";
import {useEffect,useState} from 'react';
import {Plus,Pencil} from 'lucide-react';
import {Button} from 'owncoding-ui';
import {api,Dialog} from '../operations';
import {roleCan} from '../capabilities';
import {QuoteComposer} from '../quote-composer';
import {PlanComparison} from '../plan-comparison';
import {comparePlans} from '../plan-comparison-data';
import {RemoveRecord} from '../archive-controls';
import {completeSave} from '../save-completion';
import {EmptyBlock,EmptyCta,ErrorBlock,Kpi,KpiStrip,LoadingBlock,MoneyText} from '../ui-v2';
import {EMPTY_WINDOW,LIST_WINDOW,appendPage,readPage,windowLabel,windowStateOf,type ListWindowState} from '../list-window';
import type {ComparablePlan} from '../plan-comparison-data';
import type {User} from '../workspace-types';

// Planes reutilizables (SOS-COM, campaña #41 / spec #43 §5).
// Rediseño v2: KPIs reales, comparador con tabla compartida, alta/edición con
// QuoteComposer y estados de carga/vacío/error con reintento.
type PlanesSectionProps = {
  user: User | null;
};
type PlansState = 'loading'|'ready'|'error';

export function PlanesSection({user}: PlanesSectionProps){
  const [plans,setPlans]=useState<ComparablePlan[]>([]);
  const [state,setState]=useState<PlansState>('loading');
  const [edit,setEdit]=useState<ComparablePlan|'new'|null>(null);
  const canEdit=roleCan(user?.role,'budgets.manage');
  const row=edit&&edit!=='new'?edit:null;

  const [windowState,setWindowState]=useState<ListWindowState>(EMPTY_WINDOW);
  const [moreBusy,setMoreBusy]=useState(false);
  // Ventana (#105): la lista pide una página explícita y «Ver más» trae la
  // siguiente sin duplicar; sin `page` del API se comporta como antes.
  async function load(offset=0, append=false){
    if(!append)setState('loading');
    try{
      const data=await api<{records:ComparablePlan[];page?:unknown}>(`/api/agency/plans?limit=${LIST_WINDOW.plans}${offset>0?`&offset=${offset}`:''}`);
      const page=readPage(data?.page);
      const incoming=Array.isArray(data.records)?data.records:[];
      if(append)setPlans(current=>{const next=appendPage(current,incoming);setWindowState(windowStateOf(page,next.length));return next;});
      else{setPlans(incoming);setWindowState(windowStateOf(page,incoming.length));}
      setState('ready');
    }catch{if(!append)setState('error');}
  }
  useEffect(()=>{void load();},[]);
  const cargarMas=async()=>{
    if(moreBusy)return;
    setMoreBusy(true);
    try{await load(plans.length,true);}finally{setMoreBusy(false);}
  };

  const active=plans.filter(plan=>plan.active!==false);
  const archived=plans.filter(plan=>plan.active===false);
  // Mismo cálculo que la tabla (precio de línea redondeado en el comparador).
  const totals=new Map<string,number>();
  for(const {currency,total} of comparePlans(plans)) if(total!==null) totals.set(currency,(totals.get(currency)||0)+total);
  const valueEntries=[...totals.entries()].sort((a,b)=>a[0].localeCompare(b[0]));

  return (
    <section className="directory grid gap-4" aria-label="Planes reutilizables">
      {/* Franja sin KPIs redundantes (#100): la moneda por plan vive en el
          comparador; acá queda el valor de ítems como dato propio. */}
      <KpiStrip aria-label="Métricas de planes">
        <Kpi label="Planes" valor={windowState.total ?? plans.length} destacado hint={active.length?`${active.length} activo${active.length===1?'':'s'} · ${archived.length} archivado${archived.length===1?'':'s'}`:'Sin planes guardados'}/>
        <Kpi label="Valor de ítems" valor={valueEntries.length?<MoneyText valor={valueEntries[0][1]} currency={valueEntries[0][0]}/>:'—'} hint={valueEntries.length>1?<>{valueEntries.slice(1).map(([currency,value])=><span key={currency}><MoneyText valor={value} currency={currency}/> · </span>)}Sin IVA</>:'Sin IVA · totales guardados'}/>
        <Kpi label="Activos" valor={active.length} hint="Disponibles para presupuestos"/>
        <Kpi label="Archivados" valor={archived.length} hint="Fuera de circulación"/>
      </KpiStrip>

      {/* Ventana (#105): contador honesto + «Ver más» con el aviso de alcance. */}
      {windowState.hasMore ? <div className="bulk-bar" role="status" aria-live="polite">
        <span className="bulk-count">{windowLabel(windowState.loaded, windowState.total, 'plan', 'planes')} · los indicadores cuentan lo cargado</span>
        <div className="inline-actions bulk-actions">
          <button type="button" className="secondary min-h-11 md:min-h-10" disabled={moreBusy} onClick={()=>void cargarMas()}>{moreBusy?'Cargando…':'Ver más'}</button>
        </div>
      </div> : null}

      {state==='error' && plans.length ? (
        <ErrorBlock title="No se pudieron actualizar los planes." description="Se muestra la última lista cargada; reintentá para refrescar." onRetry={()=>void load()}/>
      ) : null}

      {plans.length ? (
        <PlanComparison
          plans={plans}
          acciones={state==='ready'&&canEdit?<Button type="button" className="max-md:min-h-11" onClick={()=>setEdit('new')}><Plus aria-hidden="true" size={16}/> Nuevo plan</Button>:undefined}
          actions={(plan)=><>
            {canEdit?<Button type="button" variant="ghost" className="h-11 px-2 text-xs md:h-9" onClick={()=>setEdit(plan)}><Pencil aria-hidden="true" size={14}/> Editar</Button>:null}
            <RemoveRecord kind="plans" id={plan.id} name={String(plan.name||'')} role={user?.role||'viewer'} done={load}/>
          </>}
        />
      ) : state==='loading' ? (
        <LoadingBlock label="Cargando planes…" lines={4}/>
      ) : state==='error' ? (
        <ErrorBlock title="No se pudieron cargar los planes." description="Revisá la conexión y volvé a intentar." onRetry={()=>void load()}/>
      ) : (
        <EmptyBlock
          icon="package"
          title="Todavía no hay planes guardados."
          description={canEdit?'Creá un plan reutilizable con sus ítems y precios sin IVA; después podés aplicarlo a un presupuesto con un clic.':'Cuando el equipo guarde un plan, vas a ver acá su comparación de ítems, precios y condiciones.'}
          action={canEdit?<EmptyCta label="Nuevo plan" onClick={()=>setEdit('new')} icon={<Plus aria-hidden="true" size={16}/>}/>:undefined}
        />
      )}

      {edit&&canEdit ? (
        <Dialog title={row?'Editar plan':'Nuevo plan'} busy={false} close={()=>setEdit(null)}>
          <QuoteComposer mode="plan" record={row} canReorder={canEdit} done={async()=>{await completeSave(()=>setEdit(null),load);}}/>
        </Dialog>
      ) : null}
    </section>
  );
}

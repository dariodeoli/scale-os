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
import {moneyKpi} from '../client-format';
import {EmptyBlock,ErrorBlock,Kpi,KpiStrip,LoadingBlock} from '../ui-v2';
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

  async function load(){
    try{
      const data=await api<{records:ComparablePlan[]}>('/api/agency/plans');
      setPlans(Array.isArray(data.records)?data.records:[]);
      setState('ready');
    }catch{setState('error');}
  }
  useEffect(()=>{void load();},[]);

  const active=plans.filter(plan=>plan.active!==false);
  const archived=plans.filter(plan=>plan.active===false);
  const currencies=[...new Set(plans.map(plan=>String(plan.currency||'')).filter(Boolean))];
  // Mismo cálculo que la tabla (precio de línea redondeado en el comparador).
  const totals=new Map<string,number>();
  for(const {currency,total} of comparePlans(plans)) if(total!==null) totals.set(currency,(totals.get(currency)||0)+total);

  return (
    <section className="directory grid gap-4" aria-label="Planes reutilizables">
      <KpiStrip aria-label="Métricas de planes">
        <Kpi label="Planes" valor={plans.length} destacado hint={totals.size?`Valor de ítems: ${Array.from(totals).map(([currency,value])=>moneyKpi(value,currency)).join(' · ')}`:'Sin totales guardados'}/>
        <Kpi label="Activos" valor={active.length} hint="Disponibles para presupuestos"/>
        <Kpi label="Archivados" valor={archived.length} hint="Fuera de circulación"/>
        <Kpi label="Monedas" valor={currencies.length} hint={currencies.length?currencies.join(' · '):'Sin moneda registrada'}/>
      </KpiStrip>

      {state==='error' && plans.length ? (
        <ErrorBlock title="No se pudieron actualizar los planes." description="Se muestra la última lista cargada; reintentá para refrescar." onRetry={()=>void load()}/>
      ) : null}

      {state==='ready' && canEdit ? (
        <div className="flex flex-wrap items-center justify-end">
          <Button type="button" onClick={()=>setEdit('new')}><Plus aria-hidden="true" size={16}/> Nuevo plan</Button>
        </div>
      ) : null}

      {plans.length ? (
        <PlanComparison
          plans={plans}
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
          action={canEdit?<Button type="button" onClick={()=>setEdit('new')}><Plus aria-hidden="true" size={16}/> Nuevo plan</Button>:undefined}
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

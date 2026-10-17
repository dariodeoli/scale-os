"use client";
import {useEffect,useState,type ReactNode} from 'react';
import {AlertCircle,ArrowUpRight,CalendarClock,CheckCircle2,FileQuestion,PackageSearch} from 'lucide-react';
import {BarraProgreso,Skeleton} from 'owncoding-ui/core';
import {api,money} from './operations';
import {DueAlert,CommercialDashboard,billingExpectationState,groupDueAlerts,normalizeCommercialDashboard,shortDate} from './control-center-data';
import {Kpi,KpiStrip,MoneyText,StateChip} from './ui-v2';
import {RecordEditor} from './suite';
import {ORDER_FIELDS_SEARCH} from './shell-data';
import {todayAsuncion} from './client-format';
import {Button as ScaleButton} from "./ui/button";

type Total={currency:string;total:string};
type Dashboard={cash:Total[];receivables:Total[];collections:Total[];inventory:Total[];expenses:Total[];personnel:Total[];expected:Total[];alerts:DueAlert[]};
type Order={id:string;title:string;status:string;due_date?:string|null;client_name:string;project_name:string};
type OverdueRow={id:string;title:string;status:string;due_date?:string|null;client_name?:string|null;project_name?:string|null};
type Signals={unanswered_budgets:number|null;unverified_inventory:number|null;upcoming_deliveries:number|null};
const financeSeries=[['cash','Disponible'],['receivables','Por cobrar'],['collections','Cobrado este mes'],['expenses','Gastos planificados'],['personnel','Personal']] as const;
const KPI_NOTE='text-sm font-medium text-mute';
// Tarjeta destacada (fondo de marca): el texto gris del resto quedaba en ~2:1 sobre
// el violeta; ahí se usa la tinta de marca (`text-onbrand`, el mismo par que el CTA
// primario) y la ayuda envuelve en vez de cortarse.
const KPI_NOTE_ONBRAND='text-sm font-medium text-onbrand';
/** Clase de las tarjetas destacadas del Centro de control (contraste AA en ambos temas, control-center.css). */
export const KPI_HIGHLIGHT='kpi-highlight-aa';
export const kpiNote=(destacado:boolean)=>destacado?KPI_NOTE_ONBRAND:KPI_NOTE;
export function KpiHint({text,destacado}:{text:string;destacado:boolean}){return <span className={`min-w-0 flex-1 whitespace-normal break-words ${destacado?'text-onbrand':''}`} title={text}>{text}</span>;}
const FINANCE_TONE={cash:'fono',receivables:'mute',collections:'ok',expenses:'warn',personnel:'fono'} as const;
const DUE_TONE:Record<string,'ok'|'warn'|'bad'>={gold:'warn',warning:'warn',danger:'bad'};
const dueTone=(due:string,today:string)=>{const past=new Date(due.slice(0,10)+'T12:00:00Z').valueOf();const now=new Date(today+'T12:00:00Z').valueOf();if(Number.isNaN(past))return 'warning';const days=Math.max(0,Math.round((now-past)/86400000));return days<=7?'gold':days<=21?'warning':'danger';};

/**
 * Panel del Resumen. Orden por tarea (reorganización IA): primero lo accionable
 * (señales y vencidos), después `work` (el trabajo del día que aporta la
 * sección) y al final los resúmenes comercial y financiero, que se consultan.
 */
export function ControlCenter({role,orders,refresh,navigate,signals,work}:{role:string;orders:Order[];refresh:()=>Promise<void>;navigate:(label:string)=>void;signals:Signals;work?:ReactNode}){
 const allowed=['owner','admin','finance'].includes(role),commercialAllowed=['owner','admin','management','sales','finance'].includes(role);
 const [data,setData]=useState<Dashboard|null>(null),[error,setError]=useState('');
 const [overdue,setOverdue]=useState<DueAlert[]|null>(null),[overdueCapped,setOverdueCapped]=useState(false);
 const [commercial,setCommercial]=useState<CommercialDashboard|null>(null),[commercialError,setCommercialError]=useState('');
 // Alertas exactas para roles sin finanzas (#71/#73): el listado de vencidos de
 // la API (due=overdue, cerradas afuera) en vez de depender de la ventana del
 // buscador; el dashboard sigue mandando cuando el rol puede ver finanzas.
 useEffect(()=>{let live=true;if(allowed){setOverdue(null);setOverdueCapped(false);return()=>{live=false;};}setOverdue(null);setOverdueCapped(false);
  void api<{workOrders:OverdueRow[];page?:{hasMore?:boolean}}>(`/api/agency/work-orders?due=overdue&limit=30&fields=${ORDER_FIELDS_SEARCH}`).then(value=>{if(!live)return;setOverdue((value.workOrders||[]).map(row=>({id:String(row.id),type:'work_order' as const,name:String(row.title||''),due:String(row.due_date||'').slice(0,10),context:[row.client_name,row.project_name].filter(Boolean).join(' · ')})));setOverdueCapped(Boolean(value.page?.hasMore));}).catch(()=>{if(live){setOverdue(null);setOverdueCapped(false);}});
  return()=>{live=false;};},[allowed,orders]);
 useEffect(()=>{let live=true;if(allowed){setError('');void api<Dashboard>('/api/agency/dashboard').then(value=>{if(live)setData(value);}).catch(e=>{if(live)setError(e instanceof Error?e.message:'No se pudo cargar el resumen financiero.');});}return()=>{live=false;};},[allowed,orders]);
 useEffect(()=>{let live=true;setCommercial(null);setCommercialError('');if(commercialAllowed)void api<unknown>('/api/agency/control-center').then(value=>{const normalized=normalizeCommercialDashboard(value);if(live)setCommercial(normalized);}).catch(e=>{if(live)setCommercialError(e instanceof Error?e.message:'No se pudo cargar el resumen comercial.');});return()=>{live=false;};},[commercialAllowed,orders]);
 const today=todayAsuncion();
 const orderAlerts:DueAlert[]=orders.filter(o=>o.due_date&&o.due_date.slice(0,10)<today&&!['approved','published'].includes(o.status)).map(o=>({id:o.id,type:'work_order',name:o.title,due:o.due_date!.slice(0,10),context:`${o.client_name} · ${o.project_name}`}));
 // `alerts` puede faltar en una respuesta vieja/parcial del API: sin la guarda
 // `data.alerts.length` volteaba la pantalla antes de llegar a `groupDueAlerts`.
 const dashboardAlerts=Array.isArray(data?.alerts)?data.alerts:[];
 const exactOverdue=overdue&&overdue.length?overdue:null;
 const capped=allowed&&data?dashboardAlerts.length>=30:Boolean(exactOverdue&&overdueCapped);
 const alerts=allowed&&data?dashboardAlerts.map(a=>({...a,context:orderAlerts.find(o=>String(o.id)===String(a.id)&&a.type==='work_order')?.context})):exactOverdue||orderAlerts;
 const groups=groupDueAlerts(alerts);
 const maxGroupCount=Math.max(1,...groups.map(group=>group.items.length));
 const resultCurrencies=data?.expected.filter(row=>row.total!=='0').map(row=>row.currency)||[];
 const resultByCurrency=(currency:string)=>{const expected=Number(data?.expected.find(row=>row.currency===currency)?.total||0);const expenses=Number(data?.expenses.find(row=>row.currency===currency)?.total||0);const personnel=Number(data?.personnel.find(row=>row.currency===currency)?.total||0);return expected-expenses-personnel;};
 const financeCurrencies=(()=>{const set=new Set<string>();if(data)for(const [key] of financeSeries)for(const row of data[key])set.add(row.currency);return Array.from(set).sort();})();
 const financeChart=(currency:string)=>{const rows=financeSeries.map(([key,label])=>({key,label,value:Number(data?.[key].find(row=>row.currency===currency)?.total||0)}));const max=Math.max(1,...rows.map(row=>Math.abs(row.value)));return rows.map(row=>({...row,width:Math.max(0,Math.abs(row.value))/max*100}));};
 const financeGroups=financeCurrencies.map(currency=>({currency,rows:financeChart(currency)})).filter(group=>group.rows.some(row=>row.value!==0));
 // La expectativa contratada se lee una sola vez (misma derivación que el KPI de
 // Clientes, §15.5) y el estado sin contratos va como chip secundario (#93).
 const billingEstado=allowed?billingExpectationState(commercial,commercialError?'error':'loading'):null;
 const actionable=Number.isInteger(signals.upcoming_deliveries)||Number.isInteger(signals.unanswered_budgets)||Number.isInteger(signals.unverified_inventory);
 return <>
  {actionable&&<section className="control-signals" aria-label="Señales accionables">
   {Number.isInteger(signals.upcoming_deliveries)&&<button type="button" className="control-signal" onClick={()=>navigate('Producción')}><span className="control-signal-icon" aria-hidden="true"><CalendarClock size={16}/></span><span className="control-signal-text"><b>{signals.upcoming_deliveries} entrega{signals.upcoming_deliveries===1?'':'s'} próxima{signals.upcoming_deliveries===1?'':'s'}</b><small>Vencen en los próximos 7 días</small></span><ArrowUpRight size={14} aria-hidden="true"/></button>}
   {Number.isInteger(signals.unanswered_budgets)&&<button type="button" className="control-signal" onClick={()=>navigate('Presupuestos')}><span className="control-signal-icon" aria-hidden="true"><FileQuestion size={16}/></span><span className="control-signal-text"><b>{signals.unanswered_budgets} presupuesto{signals.unanswered_budgets===1?'':'s'} sin respuesta</b><small>Enviados y todavía sin definición</small></span><ArrowUpRight size={14} aria-hidden="true"/></button>}
   {Number.isInteger(signals.unverified_inventory)&&<button type="button" className="control-signal" onClick={()=>navigate('Inventario')}><span className="control-signal-icon" aria-hidden="true"><PackageSearch size={16}/></span><span className="control-signal-text"><b>{signals.unverified_inventory} equipo{signals.unverified_inventory===1?'':'s'} sin verificar</b><small>Sin control físico en más de 30 días</small></span><ArrowUpRight size={14} aria-hidden="true"/></button>}
  </section>}
  <section className={`due-alert ${alerts.length?'has-overdue':'all-clear'}`} aria-label="Alertas de vencimiento">
   {alerts.length?<details><summary><AlertCircle size={18}/><strong>Pendientes vencidos <span className="count-badge">{capped?'30+':alerts.length}</span></strong><span className="alert-peek">{groups[0]?.name}{groups[0]?.items.length>1?` ×${groups[0].items.length}`:''} · {shortDate(groups[0]?.due||'')}</span><span className="alert-toggle">Ver detalle</span></summary>
    <div className="due-details">{capped&&<p className="form-note">Se muestran los primeros 30 vencimientos. Revisá Producción y Cobranza para ver el resto.</p>}
     {groups.map(group=><details className="due-group" key={group.key}><summary><span className="due-group-cell">{group.name}{group.items.length>1&&<b> ×{group.items.length}</b>}<span className="due-bar-track" aria-hidden="true"><BarraProgreso valor={group.items.length/maxGroupCount*100} max={100} tono={DUE_TONE[dueTone(group.due,today)]??'warn'} etiqueta={`Pendientes de ${group.name}`}/></span></span><time dateTime={group.due}>{shortDate(group.due)}</time><small>{group.type==='invoice'?'Factura':'Producción'}</small></summary><ul>{group.items.map(item=><li key={`${item.type}-${item.id}`}><div><b>{item.context||item.name||`#${item.id}`}</b><small>#{item.id} · {shortDate(String(item.due??''))}</small></div>{item.type==='work_order'?<RecordEditor kind="work-orders" recordId={String(item.id)} name={item.name??undefined} refresh={refresh} role={role}/>:<ScaleButton className="text-button" onClick={()=>navigate('Mora')} variant="ghost">Ver cobranza<ArrowUpRight size={14}/></ScaleButton>}</li>)}</ul></details>)}
    </div>
   </details>:<div className="clear-message"><CheckCircle2 size={17}/><span>{allowed&&!data&&!error?'Consultando vencimientos…':error?'Sin tareas de producción vencidas · cobros no disponibles':'Sin pendientes vencidos'}</span></div>}
  </section>
  {work}
  {commercialAllowed&&<section className="financial-summary commercial-summary" aria-labelledby="commercial-title">
   <div className="section-caption"><div className="section-head"><p className="section-eyebrow">Comercial</p><h2 id="commercial-title">Resumen comercial</h2></div><ScaleButton className="text-button" onClick={()=>navigate('Pipeline')} variant="ghost">Ver pipeline <ArrowUpRight size={14}/></ScaleButton></div>
   {commercialError?<p className="error" role="alert">{commercialError} Los indicadores comerciales no están disponibles.</p>:<KpiStrip aria-busy={!commercial} className="xl:!grid-cols-3">
    <Kpi label="Clientes activos" valor={!commercial?<Skeleton className="h-6 w-16"/>:commercial.activeClients} hint={<KpiHint destacado={false} text="Con relación comercial activa."/>}/>
    <Kpi label="Prospectos activos" valor={!commercial?<Skeleton className="h-6 w-16"/>:commercial.activeProspects} hint={<KpiHint destacado={false} text="Leads que todavía no están ganados ni perdidos."/>}/>
    <Kpi destacado className={KPI_HIGHLIGHT} label="Facturación mensual contratada" valor={!allowed?<span className={kpiNote(true)}>No disponible para tu rol</span>:billingEstado==='cargando'?<Skeleton className="h-6 w-24"/>:billingEstado==='error'?<span className={kpiNote(true)} role="alert">No se pudo cargar</span>:billingEstado==='sin-dato'?<span className={kpiNote(true)}>Sin dato</span>:billingEstado==='sin-contratos'?<span className="flex flex-wrap items-center gap-2"><span className={kpiNote(true)}>—</span><StateChip tone="mute" title="No hay contratos comerciales activos">Sin contratos</StateChip></span>:<span className="grid gap-0.5">{commercial!.expectedMonthlyBilling!.map(item=><MoneyText key={item.currency} valor={item.total} currency={item.currency}/>)}</span>} hint={<KpiHint destacado text="Expectativa comercial vigente; no es el forecast ni el efectivo cobrado."/>}/>
   </KpiStrip>}
  </section>}
  {allowed&&<section className="financial-summary" aria-labelledby="financial-title">
   <div className="section-caption"><div className="section-head"><p className="section-eyebrow">Finanzas</p><h2 id="financial-title">Resumen financiero</h2></div><ScaleButton className="text-button" onClick={()=>navigate('Pagos')} variant="ghost">Ver movimientos <ArrowUpRight size={14}/></ScaleButton></div>
   {error?<p className="error" role="alert">{error} Los importes no están disponibles.</p>:<KpiStrip aria-busy={!data} className="xl:!grid-cols-3">
    {([['cash','Disponible','Saldo actual en cuentas'],['receivables','Por cobrar','Facturas pendientes'],['collections','Cobrado este mes','Neto de reversiones'],['expenses','Gastos planificados','Mes actual · fijos y variables'],['personnel','Personal','Salarios esperados al cierre del mes']] as const).map(([key,label,note])=><Kpi key={key} destacado={key==='cash'} className={key==='cash'?KPI_HIGHLIGHT:undefined} label={label} hint={<KpiHint destacado={key==='cash'} text={note}/>} valor={!data?<Skeleton className="h-6 w-24"/>:data[key]?.length?<span className="grid gap-0.5">{data[key].map(r=><MoneyText key={r.currency} valor={r.total} currency={r.currency}/>)}</span>:<span className={kpiNote(key==='cash')}>Sin movimientos</span>}/>)}
    <Kpi destacado className={KPI_HIGHLIGHT} label="Resultado estimado del mes" hint={<KpiHint destacado text="Ingreso esperado − gastos planificados y personal."/>} valor={!data?<Skeleton className="h-6 w-24"/>:resultCurrencies.length?<span className="grid gap-0.5">{resultCurrencies.map(currency=>{const value=resultByCurrency(currency);return <span key={currency} className="inline-flex items-center justify-end gap-0.5" data-negative={value<0||undefined}>{value<0?'−':''}<MoneyText valor={Math.abs(value)} currency={currency} tono={value<0?'bad':''}/></span>;})}</span>:<span className={kpiNote(true)}>Sin ingreso esperado</span>}/>
   </KpiStrip>}
   {data&&!error&&financeGroups.length>0&&<details className="settings-disclosure"><summary>Ver desglose</summary>
    <div className="finance-compare">
     {financeGroups.map(group=><div className="finance-compare-group" key={group.currency}><p className="finance-compare-currency">{group.currency}</p>{group.rows.map(row=><div className="finance-compare-row" key={row.key}><span className="finance-compare-label">{row.label}</span><span className="finance-compare-track" aria-hidden="true"><BarraProgreso valor={row.width} max={100} tono={FINANCE_TONE[row.key]} etiqueta={`${row.label} en ${group.currency}`}/></span><strong className="finance-compare-value">{row.value<0?'−':''}<MoneyText valor={Math.abs(row.value)} currency={group.currency}/></strong></div>)}</div>)}
    </div>
   </details>}
   {data&&!error&&data.inventory.length>0&&<p className="inventory-summary">Patrimonio en equipos <b>{data.inventory.map(r=>money(r.total,r.currency)).join(' · ')}</b><ScaleButton className="text-button" onClick={()=>navigate('Inventario')} variant="ghost">Ver inventario<ArrowUpRight size={14}/></ScaleButton></p>}
  </section>}
 </>;
}

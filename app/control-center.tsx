"use client";
import {useEffect,useState} from 'react';
import {AlertCircle,ArrowUpRight,CalendarClock,CheckCircle2,FileQuestion,PackageSearch} from 'lucide-react';
import {api,money} from './operations';
import {DueAlert,CommercialDashboard,groupDueAlerts,normalizeCommercialDashboard,shortDate} from './control-center-data';
import {RecordEditor} from './suite';
type Total={currency:string;total:string};
type Dashboard={cash:Total[];receivables:Total[];collections:Total[];inventory:Total[];expenses:Total[];personnel:Total[];expected:Total[];alerts:DueAlert[]};
type Order={id:string;title:string;status:string;due_date?:string|null;client_name:string;project_name:string};
type Signals={unanswered_budgets:number|null;unverified_inventory:number|null;upcoming_deliveries:number|null};
const financeSeries=[['cash','Disponible'],['receivables','Por cobrar'],['collections','Cobrado este mes'],['expenses','Gastos planificados'],['personnel','Personal']] as const;
const dueTone=(due:string,today:string)=>{const past=new Date(due.slice(0,10)+'T12:00:00Z').valueOf();const now=new Date(today+'T12:00:00Z').valueOf();if(Number.isNaN(past))return 'warning';const days=Math.max(0,Math.round((now-past)/86400000));return days<=7?'gold':days<=21?'warning':'danger';};

export function ControlCenter({role,orders,refresh,navigate,signals}:{role:string;orders:Order[];refresh:()=>Promise<void>;navigate:(label:string)=>void;signals:Signals}){
 const allowed=['owner','admin','finance'].includes(role),commercialAllowed=['owner','admin','management','sales','finance'].includes(role);
 const [data,setData]=useState<Dashboard|null>(null),[error,setError]=useState('');
 const [commercial,setCommercial]=useState<CommercialDashboard|null>(null),[commercialError,setCommercialError]=useState('');
 useEffect(()=>{let live=true;if(allowed){setError('');void api<Dashboard>('/api/agency/dashboard').then(value=>{if(live)setData(value);}).catch(e=>{if(live)setError(e instanceof Error?e.message:'No se pudo cargar el resumen financiero.');});}return()=>{live=false;};},[allowed,orders]);
 useEffect(()=>{let live=true;setCommercial(null);setCommercialError('');if(commercialAllowed)void api<unknown>('/api/agency/control-center').then(value=>{const normalized=normalizeCommercialDashboard(value);if(live)setCommercial(normalized);}).catch(e=>{if(live)setCommercialError(e instanceof Error?e.message:'No se pudo cargar el resumen comercial.');});return()=>{live=false;};},[commercialAllowed,orders]);
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Asuncion',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 const orderAlerts:DueAlert[]=orders.filter(o=>o.due_date&&o.due_date.slice(0,10)<today&&!['approved','published'].includes(o.status)).map(o=>({id:o.id,type:'work_order',name:o.title,due:o.due_date!.slice(0,10),context:`${o.client_name} · ${o.project_name}`}));
 // `alerts` puede faltar en una respuesta vieja/parcial del API: sin la guarda
 // `data.alerts.length` volteaba la pantalla antes de llegar a `groupDueAlerts`.
 const dashboardAlerts=Array.isArray(data?.alerts)?data.alerts:[];
 const capped=Boolean(allowed&&data&&dashboardAlerts.length>=30);
 const alerts=allowed&&data?dashboardAlerts.map(a=>({...a,context:orderAlerts.find(o=>String(o.id)===String(a.id)&&a.type==='work_order')?.context})):orderAlerts;
 const groups=groupDueAlerts(alerts);
 const maxGroupCount=Math.max(1,...groups.map(group=>group.items.length));
 const resultCurrencies=data?.expected.filter(row=>row.total!=='0').map(row=>row.currency)||[];
 const resultByCurrency=(currency:string)=>{const expected=Number(data?.expected.find(row=>row.currency===currency)?.total||0);const expenses=Number(data?.expenses.find(row=>row.currency===currency)?.total||0);const personnel=Number(data?.personnel.find(row=>row.currency===currency)?.total||0);return expected-expenses-personnel;};
 const financeCurrencies=(()=>{const set=new Set<string>();if(data)for(const [key] of financeSeries)for(const row of data[key])set.add(row.currency);return Array.from(set).sort();})();
 const financeChart=(currency:string)=>{const rows=financeSeries.map(([key,label])=>({key,label,value:Number(data?.[key].find(row=>row.currency===currency)?.total||0)}));const max=Math.max(1,...rows.map(row=>Math.abs(row.value)));return rows.map(row=>({...row,width:Math.max(0,Math.abs(row.value))/max*100}));};
 const financeGroups=financeCurrencies.map(currency=>({currency,rows:financeChart(currency)})).filter(group=>group.rows.some(row=>row.value!==0));
 const billingTotals=allowed&&commercial&&commercial.expectedMonthlyBilling&&commercial.expectedMonthlyBilling.length>0?commercial.expectedMonthlyBilling:[];
 const maxBilling=Math.max(1,...billingTotals.map(item=>Math.abs(Number(item.total)||0)));
 const commercialRows=billingTotals.map(item=>({currency:item.currency,width:Math.max(0,Math.abs(Number(item.total)||0))/maxBilling*100}));
 const actionable=Number.isInteger(signals.upcoming_deliveries)||Number.isInteger(signals.unanswered_budgets)||Number.isInteger(signals.unverified_inventory);
 return <>
  {actionable&&<section className="control-signals" aria-label="Señales accionables">
   {Number.isInteger(signals.upcoming_deliveries)&&<button type="button" className="control-signal" onClick={()=>navigate('Producción')}><span className="control-signal-icon" aria-hidden="true"><CalendarClock size={16}/></span><span className="control-signal-text"><b>{signals.upcoming_deliveries} entrega{signals.upcoming_deliveries===1?'':'s'} próxima{signals.upcoming_deliveries===1?'':'s'}</b><small>Vencen en los próximos 7 días</small></span><ArrowUpRight size={14} aria-hidden="true"/></button>}
   {Number.isInteger(signals.unanswered_budgets)&&<button type="button" className="control-signal" onClick={()=>navigate('Presupuestos')}><span className="control-signal-icon" aria-hidden="true"><FileQuestion size={16}/></span><span className="control-signal-text"><b>{signals.unanswered_budgets} presupuesto{signals.unanswered_budgets===1?'':'s'} sin respuesta</b><small>Enviados y todavía sin definición</small></span><ArrowUpRight size={14} aria-hidden="true"/></button>}
   {Number.isInteger(signals.unverified_inventory)&&<button type="button" className="control-signal" onClick={()=>navigate('Inventario')}><span className="control-signal-icon" aria-hidden="true"><PackageSearch size={16}/></span><span className="control-signal-text"><b>{signals.unverified_inventory} equipo{signals.unverified_inventory===1?'':'s'} sin verificar</b><small>Sin control físico en más de 30 días</small></span><ArrowUpRight size={14} aria-hidden="true"/></button>}
  </section>}
  {commercialAllowed&&<section className="financial-summary commercial-summary" aria-labelledby="commercial-title">
   <div className="section-caption"><div className="section-head"><p className="section-eyebrow">Comercial</p><h2 id="commercial-title">Resumen comercial</h2></div><button className="text-button" onClick={()=>navigate('Pipeline')}>Ver pipeline <ArrowUpRight size={14}/></button></div>
   {commercialError?<p className="error" role="alert">{commercialError} Los indicadores comerciales no están disponibles.</p>:<div className="financial-strip" aria-busy={!commercial}>
    <article className="financial-stat"><span>Clientes activos</span><div className="financial-amounts"><strong>{!commercial?'Cargando…':commercial.activeClients}</strong></div><small>Con relación comercial activa.</small></article>
    <article className="financial-stat"><span>Prospectos activos</span><div className="financial-amounts"><strong>{!commercial?'Cargando…':commercial.activeProspects}</strong></div><small>Leads que todavía no están ganados ni perdidos.</small></article>
    <article className="financial-stat financial-primary"><span>Facturación mensual contratada</span><div className="financial-amounts">{!allowed?<strong className="no-movements">No disponible para tu rol</strong>:!commercial?<strong className="loading-value">Cargando…</strong>:commercial.expectedMonthlyBilling===undefined?<strong className="no-movements">No disponible</strong>:commercial.expectedMonthlyBilling.length?commercial.expectedMonthlyBilling.map(item=><strong key={item.currency}>{money(item.total,item.currency)}</strong>):<strong className="no-movements">Sin contratos activos</strong>}</div>{commercialRows.length>0&&<div className="commercial-bars" aria-hidden="true">{commercialRows.map(row=><span className="commercial-bar-row" key={row.currency}><span className="commercial-bar-currency">{row.currency}</span><span className="commercial-bar-track"><span className="commercial-bar-fill" style={{width:`${row.width}%`}}/></span></span>)}</div>}<small>Expectativa comercial vigente; no es el forecast ni el efectivo cobrado.</small></article>
   </div>}
  </section>}
  {allowed&&<section className="financial-summary" aria-labelledby="financial-title">
   <div className="section-caption"><div className="section-head"><p className="section-eyebrow">Finanzas</p><h2 id="financial-title">Resumen financiero</h2></div><button className="text-button" onClick={()=>navigate('Pagos')}>Ver movimientos <ArrowUpRight size={14}/></button></div>
   {error?<p className="error" role="alert">{error} Los importes no están disponibles.</p>:<div className="financial-strip" aria-busy={!data}>
    {([['cash','Disponible','Saldo actual en cuentas'],['receivables','Por cobrar','Facturas pendientes'],['collections','Cobrado este mes','Neto de reversiones'],['expenses','Gastos planificados','Mes actual · fijos y variables'],['personnel','Personal','Salarios esperados al cierre del mes']] as const).map(([key,label,note])=><article className={`financial-stat ${key==='cash'?'financial-primary':''}`} key={key}>
     <span>{label}</span><div className="financial-amounts">{!data?<strong className="loading-value">Cargando…</strong>:data[key]?.length?data[key].map(r=><strong key={r.currency}>{money(r.total,r.currency)}</strong>):<strong className="no-movements">Sin movimientos</strong>}</div><small>{note}</small>
    </article>)}
    <article className="financial-stat financial-result"><span>Resultado estimado del mes</span><div className="financial-amounts">{!data?<strong className="loading-value">Cargando…</strong>:resultCurrencies.length?resultCurrencies.map(currency=>{const value=resultByCurrency(currency);return <strong key={currency} data-negative={value<0||undefined}>{value<0?'−':''}{money(String(Math.abs(value)),currency)}</strong>;}):<strong className="no-movements">Sin ingreso esperado</strong>}</div><small>Ingreso esperado − gastos planificados y personal.</small></article>
   </div>}
   {data&&!error&&financeGroups.length>0&&<div className="finance-compare">
    {financeGroups.map(group=><div className="finance-compare-group" key={group.currency}><p className="finance-compare-currency">{group.currency}</p>{group.rows.map(row=><div className="finance-compare-row" key={row.key}><span className="finance-compare-label">{row.label}</span><span className="finance-compare-track" aria-hidden="true"><span className={`finance-compare-fill tone-${row.key}`} style={{width:`${row.width}%`}}/></span><strong className="finance-compare-value">{row.value<0?'−':''}{money(String(Math.abs(row.value)),group.currency)}</strong></div>)}</div>)}
   </div>}
   {data&&!error&&data.inventory.length>0&&<p className="inventory-summary">Patrimonio en equipos <b>{data.inventory.map(r=>money(r.total,r.currency)).join(' · ')}</b><button className="text-button" onClick={()=>navigate('Inventario')}>Ver inventario<ArrowUpRight size={14}/></button></p>}
  </section>}
  <section className={`due-alert ${alerts.length?'has-overdue':'all-clear'}`} aria-label="Alertas de vencimiento">
   {alerts.length?<details><summary><AlertCircle size={18}/><strong>Pendientes vencidos <span className="count-badge">{capped?'30+':alerts.length}</span></strong><span className="alert-peek">{groups[0]?.name}{groups[0]?.items.length>1?` ×${groups[0].items.length}`:''} · {shortDate(groups[0]?.due||'')}</span><span className="alert-toggle">Ver detalle</span></summary>
    <div className="due-details">{capped&&<p className="form-note">Se muestran los primeros 30 vencimientos. Revisá Producción y Cobranza para ver el resto.</p>}
     {groups.map(group=><details className="due-group" key={group.key}><summary><span className="due-group-cell">{group.name}{group.items.length>1&&<b> ×{group.items.length}</b>}<span className="due-bar-track" aria-hidden="true"><span className={`due-bar-fill tone-${dueTone(group.due,today)}`} style={{width:`${group.items.length/maxGroupCount*100}%`}}/></span></span><time dateTime={group.due}>{shortDate(group.due)}</time><small>{group.type==='invoice'?'Factura':'Producción'}</small></summary><ul>{group.items.map(item=><li key={`${item.type}-${item.id}`}><div><b>{item.context||item.name||`#${item.id}`}</b><small>#{item.id} · {shortDate(String(item.due??''))}</small></div>{item.type==='work_order'?<RecordEditor kind="work-orders" recordId={String(item.id)} name={item.name??undefined} refresh={refresh} role={role}/>:<button className="text-button" onClick={()=>navigate('Mora')}>Ver cobranza<ArrowUpRight size={14}/></button>}</li>)}</ul></details>)}
    </div>
   </details>:<div className="clear-message"><CheckCircle2 size={17}/><span>{allowed&&!data&&!error?'Consultando vencimientos…':error?'Sin tareas de producción vencidas · cobros no disponibles':'Sin pendientes vencidos'}</span></div>}
  </section>
 </>;
}

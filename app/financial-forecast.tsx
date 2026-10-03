"use client";
import {FormEvent,useEffect,useMemo,useState,type ReactNode} from 'react';
import {ActorAvatar,safePhoto} from './actor-identity';
import {formatWholeMoney,formatSignedMoney} from './amount-format';
import {financeNoticeHref,financePurposeNotice} from './finance-privacy';
import {listDateFull,listDateShort} from './list-format';
import {Dialog,api} from './operations';
import {AmountInput,SelectCustom} from './profile-controls';
import {soloDigitos} from 'owncoding-ui';
import {SaveActions} from './save-actions';
import {
  FORECAST_HORIZONS,
  amountFor,
  count,
  currentForecastMonth,
  dateLabel,
  financialCurrencies,
  forecastAggregates,
  forecastBalanceRows,
  isCurrency,
  isPositiveInput,
  isRecord,
  isSignedWhole,
  personnelAmounts,
  plannedExpenseCounts,
  projectionCurrencies,
  realExpenseTotal,
  todayAsuncion,
  undatedBudgets,
  type Horizon,
  type MoneyCurrency,
  type PersonnelMember,
} from './forecast-data';
import {useForecast,usePlannedExpenses,useRealExpenses} from './use-forecast';
import {
  Aviso,
  BarraProgreso,
  Button,
  Card,
  DataTable,
  EmptyState,
  ErrorState,
  FilaDato,
  ConfirmDialog,
  FormField,
  IconAction,
  Input,
  Label,
  Nota,
  SegmentedField,
  cn,
} from 'owncoding-ui';
import {CurrencyField,LoadingBlock,PageHeader,StateChip,denseTableMinWidth,useDenseTableFit} from './ui-v2';

// Plantillas de lista compartidas por encabezado y filas (una sola constante por vista).
// Compactas a propósito (#101): entran en media pantalla a 1440 para las
// secciones pareadas; el ajuste del mes viaja inline en el cierre.
const PERSON_COLS='grid-cols-[minmax(8.5rem,1fr)_6.5rem_minmax(9rem,1.2fr)_6.5rem]';
const CONTRACT_COLS='grid-cols-[minmax(11rem,1fr)_7rem_7rem_6rem]';
const EXPENSE_COLS='grid-cols-[minmax(0,1fr)_8.5rem_5rem]';
const PLANNED_COLS='grid-cols-[minmax(0,1fr)_7rem_8.5rem_5rem]';
// El umbral suma el padding de la card (la medida es el wrapper, la tabla vive adentro).
const PERSONNEL_MIN_WIDTH=denseTableMinWidth(30.5,4)+32;
const CONTRACTS_MIN_WIDTH=denseTableMinWidth(31,4)+24;
const PLANNED_MIN_WIDTH=480;
const REAL_MIN_WIDTH=440;
const LIST_HEAD='grid gap-x-2 border-b border-ink-600 px-2 pb-1.5 text-[10px] font-bold uppercase tracking-[.06em] text-mute';
const LIST_ROW='grid min-h-11 items-center gap-x-2 border-b border-ink-600/60 px-2 py-0.5 transition-colors last:border-0 hover:bg-ink-700/40 md:py-2';

const moneyNowrap=(text:string,tono?:'bad')=><span className={cn('whitespace-nowrap tabular-nums',tono==='bad'&&'text-bad')}>{text}</span>;

// Las acciones de fila de la librería miden 28 px: en mobile se envuelven con un
// target táctil de 44 px y en escritorio vuelven a su tamaño compacto.
const ICON_TARGETS='[&>button]:h-11 [&>button]:w-11 md:[&>button]:h-7 md:[&>button]:w-7';

export function FinancialForecast({role,organizationId,navigate,onCreateInvoice}:{role:string;organizationId:string|number;navigate?:(label:string)=>void;onCreateInvoice?:()=>void}) {return ['owner','admin','finance'].includes(role)?<ForecastPanel key={String(organizationId)} navigate={navigate} onCreateInvoice={onCreateInvoice}/>:null;}
function ForecastPanel({navigate,onCreateInvoice}:{navigate?:(label:string)=>void;onCreateInvoice?:()=>void}) {
 const [month,setMonth]=useState(()=>currentForecastMonth()),[horizon,setHorizon]=useState<Horizon>('1');
 const {data,error,reload,version,setError:setForecastError}=useForecast(month,horizon);
 const {accounts,expenses:realExpenses,error:realError,setError:setRealError}=useRealExpenses(month,data);
 const {payload:plannedExpenses,error:plannedError,reload:reloadPlanned}=usePlannedExpenses(month,data);
 const [expense,setExpense]=useState({cadence:'monthly' as 'monthly'|'recurring',category:'Operación',kind:'variable' as 'fixed'|'variable',amount:'',currency:'PYG' as MoneyCurrency,note:''});
 const [expenseError,setExpenseError]=useState(''),[expenseSaving,setExpenseSaving]=useState(false);
 const [realExpense,setRealExpense]=useState({accountId:'',category:'Operación',kind:'variable' as 'fixed'|'variable',amount:'',paidOn:todayAsuncion(),reference:''});
 const [realSaving,setRealSaving]=useState(false),[realDeleting,setRealDeleting]=useState('');
 const [plannedDeleting,setPlannedDeleting]=useState('');
 const [plannedTarget,setPlannedTarget]=useState<{id:string;category:string;amount:string;currency:MoneyCurrency}|null>(null);
 const [realTarget,setRealTarget]=useState<{id:string|number;category:string;amount:string;currency:MoneyCurrency}|null>(null);
 const [salaryPerson,setSalaryPerson]=useState<PersonnelMember|null>(null),[salaryAmount,setSalaryAmount]=useState(''),[salaryError,setSalaryError]=useState(''),[salarySaving,setSalarySaving]=useState(false);
 const [adjustPerson,setAdjustPerson]=useState<PersonnelMember|null>(null),[adjustSign,setAdjustSign]=useState<'extra'|'descuento'>('extra'),[adjustAmount,setAdjustAmount]=useState(''),[adjustNote,setAdjustNote]=useState(''),[adjustLoading,setAdjustLoading]=useState(false),[adjustSaving,setAdjustSaving]=useState(false),[adjustError,setAdjustError]=useState(''),[adjustExisting,setAdjustExisting]=useState(false);
 const [confirmRemove,setConfirmRemove]=useState(false),[removingOverride,setRemovingOverride]=useState('');
 // `version` replica la limpieza del error del formulario en cada recarga de la previsión (mes, horizonte o mutación confirmada).
 useEffect(()=>{setExpenseError('');},[month,horizon,version]);
 const aggregates=useMemo(()=>data?forecastAggregates(data):null,[data]);
 const undated=data?undatedBudgets(data):0;
 const financialCurrenciesInMonth=useMemo(()=>data?financialCurrencies(data):[],[data]);
 const projectionCurrenciesInHorizon=useMemo(()=>data?projectionCurrencies(data):[],[data]);
 const balanceRows=useMemo(()=>data?forecastBalanceRows(data,realExpenses):[],[data,realExpenses]);
 async function saveExpense(event:FormEvent<HTMLFormElement>){event.preventDefault();if(expenseSaving)return;if(!isPositiveInput(expense.amount)){setExpenseError('Ingresá un importe entero positivo y seguro, sin separadores ni decimales.');return;}setExpenseSaving(true);setExpenseError('');try{await api('/api/agency/planned-expenses',{cadence:expense.cadence,effectiveMonth:month,category:expense.category,amount:expense.amount,currency:expense.currency,kind:expense.kind,note:expense.note.trim()||null});setExpense({cadence:'monthly',category:'Operación',kind:'variable',amount:'',currency:'PYG',note:''});reload();}catch(error){setExpenseError(error instanceof Error?error.message:'No se pudo guardar el gasto planificado.');}finally{setExpenseSaving(false);}}
 async function removePlannedExpense(id:string){if(plannedDeleting)return false;setPlannedDeleting(id);setExpenseError('');try{await api(`/api/agency/planned-expenses/${id}`,{},'DELETE');reload();return true;}catch(error){setExpenseError(error instanceof Error?error.message:'No se pudo quitar el gasto planificado.');return false;}finally{setPlannedDeleting('');}}
 const realFor=(currency:MoneyCurrency)=>realExpenseTotal(realExpenses,currency);
 async function saveRealExpense(event:FormEvent<HTMLFormElement>){event.preventDefault();if(realSaving)return;const account=accounts.find(item=>String(item.id)===realExpense.accountId);if(!account){setRealError('Elegí una cuenta activa de la empresa.');return;}if(!isPositiveInput(realExpense.amount)){setRealError('Ingresá un importe entero positivo y seguro, sin separadores ni decimales.');return;}setRealSaving(true);setRealError('');try{await api('/api/agency/expenses',{accountId:realExpense.accountId,category:realExpense.category,kind:realExpense.kind,amount:realExpense.amount,currency:account.currency,paidOn:realExpense.paidOn,reference:realExpense.reference.trim()});setRealExpense(current=>({...current,amount:'',reference:''}));reload();}catch(error){setRealError(error instanceof Error?error.message:'No se pudo guardar el gasto real.');}finally{setRealSaving(false);}}
 async function removeRealExpense(rowId:string|number){if(realDeleting)return false;setRealDeleting(String(rowId));setRealError('');try{await api(`/api/agency/expenses/${rowId}`,{reason:'Gasto registrado por error'},'DELETE');reload();return true;}catch(error){setRealError(error instanceof Error?error.message:'No se pudo revertir el gasto real.');return false;}finally{setRealDeleting('');}}
 function openSalary(member:PersonnelMember){setSalaryPerson(member);setSalaryAmount(String(Number(member.base_amount)));setSalaryError('');}
 async function saveSalary(event:FormEvent<HTMLFormElement>){event.preventDefault();if(salarySaving||!salaryPerson)return;if(!isPositiveInput(salaryAmount)){setSalaryError('Ingresá un importe entero positivo y seguro, sin separadores ni decimales.');return;}setSalarySaving(true);setSalaryError('');try{await api(`/api/agency/collaborators/${salaryPerson.collaborator_id}`,{compensation_type:'fixed',compensation_amount:salaryAmount},'PATCH');setSalaryPerson(null);reload();}catch(error){setSalaryError(error instanceof Error?error.message:'No se pudo guardar el salario.');}finally{setSalarySaving(false);}}
 async function openAdjustment(member:PersonnelMember){setAdjustPerson(member);setAdjustSign('extra');setAdjustAmount('');setAdjustNote('');setAdjustError('');setAdjustExisting(false);setConfirmRemove(false);setAdjustLoading(true);try{const result:unknown=await api(`/api/agency/collaborators/${member.collaborator_id}/salary-overrides?month=${encodeURIComponent(month)}`);if(isRecord(result)&&isRecord(result.override)&&isSignedWhole(result.override.amount)){const amount=Number(result.override.amount);setAdjustSign(amount<0?'descuento':'extra');setAdjustAmount(String(Math.abs(amount)));if(typeof result.override.note==='string')setAdjustNote(result.override.note);setAdjustExisting(true);}}catch(error){setAdjustError(error instanceof Error?error.message:'No se pudo cargar el ajuste del mes.');}finally{setAdjustLoading(false);}}
 async function saveAdjustment(event:FormEvent<HTMLFormElement>){event.preventDefault();if(adjustSaving||!adjustPerson)return;if(!isPositiveInput(adjustAmount)){setAdjustError('Ingresá un importe entero positivo y seguro, sin separadores ni decimales.');return;}setAdjustSaving(true);setAdjustError('');try{const amount=adjustSign==='descuento'?`-${adjustAmount}`:adjustAmount;await api(`/api/agency/collaborators/${adjustPerson.collaborator_id}/salary-overrides`,{month,amount,note:adjustNote.trim()||null},'PATCH');setAdjustPerson(null);reload();}catch(error){setAdjustError(error instanceof Error?error.message:'No se pudo guardar el ajuste del mes.');}finally{setAdjustSaving(false);}}
 async function removeOverride(member:PersonnelMember,inDialog=false){if(removingOverride)return;setRemovingOverride(String(member.collaborator_id));if(inDialog)setAdjustError('');else setForecastError('');try{await api(`/api/agency/collaborators/${member.collaborator_id}/salary-overrides?month=${encodeURIComponent(month)}`,{},'DELETE');if(inDialog){setConfirmRemove(false);setAdjustPerson(null);}reload();}catch(error){const message=error instanceof Error?error.message:'No se pudo quitar el ajuste del mes.';if(inDialog)setAdjustError(message);else setForecastError(message);}finally{setRemovingOverride('');}}
 // El umbral cambia cuando llegan los datos: el hook re-mide al montarse la lista
 // (usa el ancho real para elegir una sola rama, nunca las dos).
 const {ref:personnelRef,fits:personnelDense}=useDenseTableFit<HTMLDivElement>(data?PERSONNEL_MIN_WIDTH:0);
 const {ref:contractsRef,fits:contractsDense}=useDenseTableFit<HTMLDivElement>(data?CONTRACTS_MIN_WIDTH:0);
 const {ref:plannedRef,fits:plannedDense}=useDenseTableFit<HTMLDivElement>(plannedExpenses?.records.length?PLANNED_MIN_WIDTH:0);
 const {ref:realRef,fits:realDense}=useDenseTableFit<HTMLDivElement>(realExpenses.length?REAL_MIN_WIDTH:0);
 const contractedRows=data?.contracted_clients?.records??[];
 const openingBalance=data?.opening_balance?.records??[];
 const plannedFor=(currency:MoneyCurrency)=>plannedExpenseCounts(data!.planned_expenses).find(item=>item.currency===currency);
 // #144: el detalle de gastos planificados es una lectura aparte del forecast.
 // El vacío solo es honesto cuando la previsión del mes tampoco tiene totales.
 const plannedReady=plannedExpenses?.month===month;
 const plannedTotals=aggregates?.expenses.length??0;

 return <section className="grid gap-4" aria-label="Previsión financiera">
  <PageHeader
   eyebrow="Finanzas"
   title="Previsión financiera"
   subtitle={<span title="Planificación mensual por moneda. No mezcla monedas ni convierte planes, facturas, cobros o gastos en hechos contables.">Planificación mensual por moneda; no convierte ni mezcla monedas.</span>}
   actions={<>
    <div className="grid min-w-0 gap-1">
     <Label htmlFor="forecast-month" className="sr-only">Mes</Label>
     <Input id="forecast-month" type="month" aria-label="Mes a planificar" title="Mes a planificar" className="w-44 max-md:w-full" value={month} min="1900-01" max="9998-12" onChange={(event:FormEvent<HTMLInputElement>)=>{const value=(event.target as HTMLInputElement).value;if(/^\d{4}-(0[1-9]|1[0-2])$/.test(value))setMonth(value);}}/>
    </div>
    <SegmentedField className="[&>button]:min-h-11 [&>button]:px-3 md:[&>button]:min-h-8" ariaLabel="Horizonte de proyección" value={horizon} onChange={(value:Horizon)=>setHorizon(value)} options={FORECAST_HORIZONS.map(value=>[value,`${value} ${value==='1'?'mes':'meses'}`])}/>
   </>}
  />
  {error?<ErrorState title="No se pudo cargar la previsión" description={error} onRetry={()=>reload()}/>
  :!data?<LoadingBlock label="Cargando previsión…" lines={4}/>
  :<>
   {horizon==='1'&&!data.records.length?<EmptyState compact title="Sin facturas emitidas ni presupuestos aceptados pendientes para este mes." description="Cuando emitas una factura o se acepte un presupuesto, la previsión del mes se completa sola." action={onCreateInvoice?<button className="primary" onClick={()=>onCreateInvoice()}>Registrar factura</button>:undefined}/>:null}
  <div className={horizon==='1'?'grid gap-4 min-[1440px]:grid-cols-2 min-[1440px]:items-start':'grid gap-4'}>
   {horizon==='1'?<Card className="grid gap-3 p-3 sm:p-4">
    <div className="grid gap-1 border-b border-ink-600 pb-3">
     <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1"><h3 className="text-[17px] font-semibold tracking-tight text-fore" title={`${data.definition.issued} ${data.definition.accepted_uninvoiced}`}>Ingresos vs gastos</h3><span className="text-xs font-medium text-mute">Resumen del mes</span></div>
     <p className="max-w-3xl text-xs leading-relaxed text-mute">Ingresos = emitido más aceptado sin factura. Gastos = personal, comisiones, gastos planificados y gastos reales. Resultado = ingresos menos gastos.</p>
    </div>
    {financialCurrenciesInMonth.length?<div className="grid gap-3 lg:grid-cols-2">
     {balanceRows.map(row=><article className="forecast-balance-card grid gap-2 rounded-xl border border-ink-600 bg-ink-900 p-3 sm:p-4" key={row.currency}>
      <div className="flex items-center justify-between gap-3"><span className="font-mono text-[10px] font-bold uppercase tracking-[.14em] text-mute">{row.currency}</span><span className="text-xs text-mute">Movimiento del mes</span></div>
      <div className="grid grid-cols-[4.75rem_minmax(0,1fr)_auto] items-center gap-2">
       <span className="text-xs font-medium text-mute">Ingresos</span>
       <BarraProgreso valor={row.income} max={row.max} tono="ok" etiqueta={`Ingresos en ${row.currency}`}/>
       <strong className="whitespace-nowrap text-sm font-semibold tabular-nums text-fore">{formatWholeMoney(row.income,row.currency)}</strong>
      </div>
      <div className="grid grid-cols-[4.75rem_minmax(0,1fr)_auto] items-center gap-2">
       <span className="text-xs font-medium text-mute">Gastos</span>
       <BarraProgreso valor={row.expense} max={row.max} tono="bad" etiqueta={`Gastos en ${row.currency}`}/>
       <strong className="whitespace-nowrap text-sm font-semibold tabular-nums text-fore">{formatWholeMoney(row.expense,row.currency)}</strong>
      </div>
      <div className="grid grid-cols-[4.75rem_minmax(0,1fr)_auto] items-center gap-2 border-t border-ink-600 pt-2">
       <span className="text-xs font-semibold text-fore">Resultado</span>
       <BarraProgreso valor={Math.abs(row.result)} max={row.max} tono={row.result<0?'bad':'fono'} etiqueta={`Resultado en ${row.currency}`}/>
       <strong className={cn('whitespace-nowrap text-sm font-semibold tabular-nums',row.result<0?'text-bad':'text-fore')}>{formatSignedMoney(row.result,row.currency)}</strong>
      </div>
     </article>)}
    </div>:<EmptyState compact title="Sin datos financieros para este mes." description="Todavía no hay facturas, cobros, gastos ni salarios que alimenten el balance." action={onCreateInvoice?<button className="primary" onClick={()=>onCreateInvoice()}>Registrar factura</button>:undefined}/>}
   </Card>:null}
   {horizon==='1'?<Card className="grid gap-3 p-3 sm:p-4">
    <div className="grid gap-1 border-b border-ink-600 pb-3"><h3 className="text-[17px] font-semibold tracking-tight text-fore">Resumen por moneda</h3><p className="text-xs text-mute">Detalle para revisar de dónde viene cada total, sin convertir monedas.</p></div>
    {financialCurrenciesInMonth.length?<details className="settings-disclosure"><summary>Ver desglose</summary><div className="grid gap-3 lg:grid-cols-2">
     {financialCurrenciesInMonth.map(currency=>{const row=data.records.find(item=>item.currency===currency),personnel=data.personnel.records.find(item=>item.currency===currency),opening=amountFor(openingBalance,currency);return <article className="forecast-currency grid gap-1.5 rounded-xl border border-ink-600 bg-ink-900 p-3 sm:p-4" key={currency}>
      <div className="flex items-center justify-between gap-3 border-b border-ink-600 pb-2"><span className="font-mono text-[10px] font-bold uppercase tracking-[.14em] text-mute">{currency}</span><span className="text-xs text-mute">Planificación del mes</span></div>
      <FilaDato etiqueta="Recurrente contratado" valor={moneyNowrap(formatWholeMoney(amountFor(aggregates?.contracted,currency),currency))}/>
      <FilaDato etiqueta={`Emitido / facturado (${count(row?.invoice_count)} ${count(row?.invoice_count)===1?'factura':'facturas'})`} valor={moneyNowrap(formatWholeMoney(row?.issued_total,currency))}/>
      <FilaDato etiqueta="Cobrado" valor={moneyNowrap(formatWholeMoney(amountFor(aggregates?.collected,currency),currency))}/>
      <FilaDato etiqueta="Saldo inicial de caja" valor={moneyNowrap(formatWholeMoney(opening,currency))}/>
      <FilaDato etiqueta="Personal" valor={moneyNowrap(formatWholeMoney(personnel?.expected_end_of_month_expense,currency))}/>
      <FilaDato etiqueta="Comisiones de clientes" valor={moneyNowrap(formatWholeMoney(amountFor(aggregates?.commissions,currency),currency))}/>
      <FilaDato etiqueta={`Gastos planificados (${count(plannedFor(currency)?.expense_count)})`} valor={moneyNowrap(formatWholeMoney(amountFor(aggregates?.expenses,currency),currency))}/>
      <FilaDato etiqueta="Gastos reales" valor={moneyNowrap(formatWholeMoney(realFor(currency),currency))}/>
      <FilaDato etiqueta={`Aceptado sin factura (${count(row?.budget_count)} presupuestos${count(row?.undated_budget_count)>0?` · ${count(row?.undated_budget_count)} sin fecha`:''})`} valor={moneyNowrap(formatWholeMoney(row?.accepted_uninvoiced_total,currency))}/>
     </article>;})}
    </div></details>:<EmptyState compact title="Sin datos financieros para este mes."/>}
   </Card>:<Card className="grid gap-3 p-4">
    <h3 className="text-[17px] font-semibold tracking-tight text-fore" title={data.definition.projected_cash}>Proyección de caja y resultado · {horizon} meses</h3>
    {projectionCurrenciesInHorizon.length?<div className="grid gap-4">
     {projectionCurrenciesInHorizon.map(currency=><div className="grid gap-2" key={currency}>
      <span className="font-mono text-[10px] uppercase tracking-[.14em] text-mute">{currency} · proyección acumulada</span>
      <DataTable
       columns={[{key:'month',label:'Mes'},{key:'cash',label:'Proyectado',align:'right'},{key:'result',label:'Resultado',align:'right'}]}
       rows={(data.projection?.records||[]).filter(row=>row.currency===currency).map(row=>({
        id:row.month,
        month:dateLabel(row.month),
        cash:<span className={cn('whitespace-nowrap tabular-nums',Number(row.projected_cash)<0&&'text-bad')}>{formatSignedMoney(row.projected_cash,currency)}</span>,
        result:<span className={cn('whitespace-nowrap tabular-nums',Number(row.projected_result)<0&&'text-bad')}>{formatSignedMoney(row.projected_result,currency)}</span>,
       }))}
       mobileCard={(row:{id:string;month:ReactNode;cash:ReactNode;result:ReactNode})=><div className="grid gap-1 rounded-lg border border-ink-600 bg-ink-900 p-3">
        <FilaDato etiqueta="Mes" valor={row.month}/>
        <FilaDato etiqueta="Proyectado" valor={row.cash}/>
        <FilaDato etiqueta="Resultado" valor={row.result}/>
       </div>}
      />
     </div>)}
    </div>:<EmptyState compact title="Sin datos financieros para el horizonte." description="Emití una factura o aceptá un presupuesto para proyectar caja y resultado." action={onCreateInvoice?<button className="primary" onClick={()=>onCreateInvoice()}>Registrar factura</button>:undefined}/>}
   </Card>}
   </div>
  <div className={horizon==='1'?'grid gap-4 min-[1440px]:grid-cols-2 min-[1440px]:items-start':'grid gap-4'}>
  <div ref={contractsRef} className="min-w-0">{data.contracted_clients?<Card className="grid gap-3 p-3 sm:p-4">
    <div className="grid gap-1 border-b border-ink-600 pb-3"><h3 className="text-[17px] font-semibold tracking-tight text-fore" title={data.definition.contracted_clients}>Contratos vs facturación</h3><p className="text-xs text-mute">Controlá lo contratado, lo facturado y lo que todavía requiere emisión.</p></div>
    <div className="grid gap-2">
    {contractedRows.length?<>
    {contractsDense?null:<div className="grid gap-2" aria-label="Contratos vigentes contra facturación">
     {contractedRows.map(row=><article className="grid gap-2 rounded-lg border border-ink-600 bg-ink-900 p-3" key={`${row.client_id}-${row.currency}`}>
      <div className="flex items-start justify-between gap-3"><div className="min-w-0"><b className="block truncate text-sm font-semibold text-fore" title={row.client_name}>{row.client_name}</b><small className="text-xs text-mute">{row.currency}{row.ends_on?` · hasta ${listDateFull(row.ends_on)}`:''}</small></div>{row.missing_invoice?<StateChip tone="bad" title="Contrato con facturación requerida y sin factura emitida en el mes">Sin factura</StateChip>:<StateChip tone="ok" title={row.invoice_required?'Factura emitida en el mes':'El contrato no requiere factura'}>{row.invoice_required?'Facturado':'No requiere'}</StateChip>}</div>
      <div className="grid grid-cols-2 gap-3 border-t border-ink-600 pt-2"><div><span className="block text-[10px] font-bold uppercase tracking-[.08em] text-mute">Contratado</span><strong className="whitespace-nowrap text-sm tabular-nums text-fore">{formatWholeMoney(row.contracted_amount,row.currency)}</strong></div><div className="text-right"><span className="block text-[10px] font-bold uppercase tracking-[.08em] text-mute">Facturado</span><strong className="whitespace-nowrap text-sm tabular-nums text-fore">{formatWholeMoney(row.invoiced_amount,row.currency)}</strong></div></div>
     </article>)}
    </div>}
    {contractsDense?<div className="min-w-0" role="table" aria-label="Contratos vigentes contra facturación">
     <div role="row" className={cn(LIST_HEAD,CONTRACT_COLS)}><span role="columnheader">Cliente</span><span role="columnheader" className="text-right">Contratado</span><span role="columnheader" className="text-right">Facturado</span><span role="columnheader" className="text-right">Estado</span></div>
     <div role="rowgroup">{contractedRows.map(row=><div role="row" className={cn(LIST_ROW,CONTRACT_COLS)} key={`${row.client_id}-${row.currency}`}>
      <span className="min-w-0 truncate text-sm leading-snug" title={`${row.client_name} · ${row.currency}${row.ends_on?` · hasta ${listDateFull(row.ends_on)}`:''}${row.invoice_required?' · factura requerida':' · sin factura requerida'}`}><b className="font-semibold text-fore">{row.client_name}</b><small className="ml-2 whitespace-nowrap text-xs text-mute">{row.currency}{row.ends_on?` · hasta ${listDateFull(row.ends_on)}`:''}</small></span>
      <span className={cn('min-w-0','text-right')}><span className="whitespace-nowrap text-sm font-semibold tabular-nums text-fore">{formatWholeMoney(row.contracted_amount,row.currency)}</span></span>
      <span className={cn('min-w-0','text-right')}><span className="whitespace-nowrap text-sm font-semibold tabular-nums text-fore">{formatWholeMoney(row.invoiced_amount,row.currency)}</span></span>
      <span className={cn('min-w-0','flex justify-end')}>{row.missing_invoice?<StateChip tone="bad" title="Contrato con facturación requerida y sin factura emitida en el mes">Sin factura</StateChip>:<StateChip tone="ok" title={row.invoice_required?'Factura emitida en el mes':'El contrato no requiere factura'}>{row.invoice_required?'Facturado':'No requiere'}</StateChip>}</span>
     </div>)}</div>
    </div>:null}
    </>:
    <EmptyState compact title="Sin contratos vigentes para este mes." description="No hay contratos activos que contrastar contra la facturación. Activá un contrato desde la ficha comercial del cliente, con su plan y monto mensual." action={navigate?<button className="secondary" onClick={()=>navigate('Clientes')}>Ver clientes</button>:undefined}/>}
    </div>
   </Card>:null}</div>
   <div ref={personnelRef} className="min-w-0">{data&&horizon==='1'?<Card className="grid gap-3 p-4">
    <div className="grid gap-1">
     <h3 className="text-[17px] font-semibold tracking-tight text-fore" title={data.definition.personnel}>Salarios</h3>
     <p className="text-xs text-mute">Gasto esperado al cierre de {dateLabel(data.personnel.month)}, sin pagos ni comisiones registrados.</p>
    </div>
    {data.personnel.records.length?<>
     <p role="status" className="text-xs text-mute">{count(data.personnel.included_headcount)} colaborador(es) activo(s) incluido(s).</p>
     <div className="grid gap-4">
      {data.personnel.records.map(row=><div className="forecast-personnel-card grid gap-2" key={row.currency}>
       <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[.14em] text-mute">{row.currency} · gasto esperado al cierre</span>
        <strong className="whitespace-nowrap text-lg font-semibold tabular-nums text-fore">{formatWholeMoney(row.expected_end_of_month_expense,row.currency)}</strong>
       </div>
       <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-mute">
        <span>Salario base ({count(row.base_count)}): <b className="font-semibold tabular-nums text-fore">{formatWholeMoney(row.base_amount,row.currency)}</b></span>
        {count(row.override_count)>0?<span>Ajustes del mes ({count(row.override_count)}): <b className="font-semibold tabular-nums text-fore">{formatSignedMoney(row.override_amount,row.currency)}</b></span>:null}
       </div>
       {personnelDense?null:<div className="grid gap-2" aria-label="Salarios">
        {row.members.map(member=>{const {adjustment,total}=personnelAmounts(member);return <article className="grid gap-2 rounded-lg border border-ink-600 bg-ink-900 p-3" key={String(member.collaborator_id)}>
         <div className="flex items-center gap-2"><ActorAvatar name={member.name} photo={safePhoto(member.photo_url)}/><div className="min-w-0"><b className="block truncate text-sm font-semibold text-fore" title={member.name}>{member.name}</b>{member.base_amount===0?<small className="text-[10px] font-bold uppercase tracking-wider text-mute">Sin salario fijo</small>:null}</div></div>
         <div className="grid grid-cols-2 gap-3 border-y border-ink-600 py-2"><div><span className="block text-[10px] font-bold uppercase tracking-[.08em] text-mute">Salario base</span><strong className="whitespace-nowrap text-sm tabular-nums text-fore">{formatWholeMoney(member.base_amount,member.currency)}</strong></div><div className="text-right"><span className="block text-[10px] font-bold uppercase tracking-[.08em] text-mute">Cierre del mes</span><strong className={cn('whitespace-nowrap text-sm tabular-nums',total!==null&&total<0?'text-bad':'text-fore')}>{total===null?'Sin dato':total<0?formatSignedMoney(total,member.currency):formatWholeMoney(total,member.currency)}</strong></div></div>
         <div className="flex items-center justify-between gap-3"><span className={cn('text-xs tabular-nums',adjustment!==null&&adjustment!==0?'text-warn':'text-mute')}>{adjustment!==null&&adjustment!==0?`Ajuste: ${formatSignedMoney(member.override_amount,member.currency)}`:'Sin ajuste del mes'}</span>{member.base_amount!==null?<span className="flex gap-1.5"><span className={ICON_TARGETS}><IconAction icon="edit" label={`Editar salario: ${member.name}`} onClick={()=>openSalary(member)}/></span><span className={ICON_TARGETS}><IconAction icon="sliders" label={`Ajuste del mes: ${member.name}`} onClick={()=>void openAdjustment(member)}/></span>{adjustment!==null&&adjustment!==0?<span className={ICON_TARGETS}><IconAction icon="trash" tone="bad" label={`Quitar ajuste del mes: ${member.name}`} disabled={removingOverride===String(member.collaborator_id)} onClick={()=>void removeOverride(member)}/></span>:null}</span>:null}</div>
        </article>;})}
       </div>}
       {personnelDense?<div className="forecast-person-list min-w-0" role="table" aria-label="Salarios">
        <div role="row" className={cn(LIST_HEAD,PERSON_COLS)}><span role="columnheader">Persona</span><span role="columnheader">Salario base</span><span role="columnheader">Cierre del mes</span><span role="columnheader" className="text-right">Acciones</span></div>
        <div role="rowgroup">{row.members.map(member=>{const {adjustment,total}=personnelAmounts(member);return <div role="row" className={cn(LIST_ROW,PERSON_COLS,'forecast-person-row')} key={String(member.collaborator_id)}>
         <span className="min-w-0"><span className="forecast-person-who flex min-w-0 items-center gap-2"><ActorAvatar name={member.name} photo={safePhoto(member.photo_url)}/><span className="min-w-0 truncate text-sm font-semibold leading-snug text-fore" title={member.name}>{member.name}</span>{member.base_amount===0?<small className="ml-2 flex-none text-[10px] font-bold uppercase tracking-wider text-mute">Sin salario fijo</small>:null}</span></span>
         <span className={cn('min-w-0','forecast-person-base')}><strong className="whitespace-nowrap text-sm font-semibold tabular-nums text-fore">{formatWholeMoney(member.base_amount,member.currency)}</strong></span>
         <span className={cn('min-w-0','forecast-person-total')}><strong className={cn('whitespace-nowrap text-sm font-semibold tabular-nums',total!==null&&total<0?'text-bad':'text-fore')}>{total===null?'Sin dato':total<0?formatSignedMoney(total,member.currency):formatWholeMoney(total,member.currency)}</strong>{adjustment!==null&&adjustment!==0?<small className="ml-1.5 whitespace-nowrap text-[11px] font-semibold tabular-nums text-warn" title={`Ajuste del mes: ${formatSignedMoney(member.override_amount,member.currency)}`}>{formatSignedMoney(member.override_amount,member.currency)}</small>:null}</span>
         {member.base_amount!==null?<span className="forecast-person-actions flex justify-end gap-1.5">
          <span className={ICON_TARGETS}><IconAction icon="edit" label={`Editar salario: ${member.name}`} onClick={()=>openSalary(member)}/></span>
          <span className={ICON_TARGETS}><IconAction icon="sliders" label={`Ajuste del mes: ${member.name}`} onClick={()=>void openAdjustment(member)}/></span>
          {adjustment!==null&&adjustment!==0?<span className={ICON_TARGETS}><IconAction icon="trash" tone="bad" label={`Quitar ajuste del mes: ${member.name}`} disabled={removingOverride===String(member.collaborator_id)} onClick={()=>void removeOverride(member)}/></span>:null}
         </span>:<span aria-hidden="true"/>}
        </div>;})}</div>
       </div>:null}
      </div>)}
     </div>
    </>:<EmptyState compact title="Sin salarios fijos mensuales incluidos para este mes." description="Cargá el salario fijo de cada persona desde su ficha de equipo." action={navigate?<button className="secondary" onClick={()=>navigate('Equipo')}>Ver equipo</button>:undefined}/>}
   </Card>:null}
   </div>
  </div>
   {data&&horizon==='1'?<Card className="grid gap-4 p-3 sm:p-4">
    <div className="grid gap-3">
     <div className="grid gap-1">
      <h3 className="text-[17px] font-semibold tracking-tight text-fore" title={data.definition.planned_expenses}>Gastos planificados · {dateLabel(month)}</h3>
      <p className="text-xs text-mute">Esto es planificación interna; no registra un pago, una factura ni una cuenta por pagar.</p>
     </div>
     <form className="grid items-end gap-3 sm:grid-cols-2 xl:grid-cols-[9rem_10rem_7rem_9rem_9rem_auto]" onSubmit={saveExpense} noValidate aria-busy={expenseSaving}>
      <SelectCustom label="Frecuencia" choices={[{value:'monthly',label:'Solo este mes'},{value:'recurring',label:'Recurrente mensual'}]} value={expense.cadence} disabled={expenseSaving} onChange={value=>setExpense(current=>({...current,cadence:value==='recurring'?'recurring':'monthly'}))}/>
      <SelectCustom label="Categoría" choices={['Operación','Herramientas','Marketing','Administración','Otro'].map(category=>({value:category,label:category}))} value={expense.category} disabled={expenseSaving} onChange={value=>setExpense(current=>({...current,category:value}))}/>
      <SelectCustom label="Tipo" choices={[{value:'variable',label:'Variable'},{value:'fixed',label:'Fijo'}]} value={expense.kind} disabled={expenseSaving} onChange={value=>setExpense(current=>({...current,kind:value==='fixed'?'fixed':'variable'}))}/>
      <FormField label="Monto entero" htmlFor="forecast-expense-amount" error={expense.amount!==''&&!isPositiveInput(expense.amount)?'El monto debe ser mayor a cero.':undefined}><Input id="forecast-expense-amount" type="text" inputMode="numeric" pattern="[0-9]*" maxLength={16} value={expense.amount} disabled={expenseSaving} placeholder="Sin separadores" onChange={(event:FormEvent<HTMLInputElement>)=>setExpense(current=>({...current,amount:soloDigitos((event.target as HTMLInputElement).value)}))}/></FormField>
      <CurrencyField id="forecast-expense-currency" label="Moneda" value={expense.currency} disabled={expenseSaving} onChange={value=>setExpense(current=>({...current,currency:isCurrency(value)?value:'PYG'}))}/>
      <FormField label="Nota opcional" htmlFor="forecast-expense-note"><Input id="forecast-expense-note" type="text" maxLength={280} value={expense.note} disabled={expenseSaving} onChange={(event:FormEvent<HTMLInputElement>)=>setExpense(current=>({...current,note:(event.target as HTMLInputElement).value}))}/></FormField>
      <Button type="submit" disabled={expenseSaving||!isPositiveInput(expense.amount)} className="w-full sm:w-auto">{expenseSaving?'Guardando…':'Agregar gasto planificado'}</Button>
     </form>
     {expenseError?<Aviso tono="error">{expenseError}</Aviso>:null}
    </div>
    {aggregates?.expenses.length?<div className="grid gap-3 sm:grid-cols-2">
     {aggregates.expenses.map(row=>{const kinds=plannedExpenseCounts(data!.planned_expenses).find(item=>item.currency===row.currency);return <article className="forecast-planned-card grid gap-1 rounded-xl border border-ink-600 bg-ink-900 p-4" key={row.currency}>
      <span className="font-mono text-[10px] uppercase tracking-[.14em] text-mute">{row.currency} · total planificado</span>
      <strong className="text-xl font-semibold tabular-nums text-fore">{formatWholeMoney(row.amount,row.currency)}</strong>
      {kinds?<small className="planned-expenses-kinds text-xs text-mute">{count(kinds.fixed_count)} fijos · {count(kinds.variable_count)} variables</small>:null}
     </article>;})}
    </div>:null}
    {plannedError?<ErrorState title="No se pudieron cargar los gastos planificados" description={plannedError} onRetry={()=>reloadPlanned()}/>:null}
    {!plannedError&&!plannedReady?<LoadingBlock label="Cargando gastos planificados…" lines={2}/>:null}
    {!plannedError&&plannedReady&&plannedExpenses.records.length?<>
    <div ref={plannedRef} className="min-w-0">
    {plannedDense?null:<div className="grid gap-2" aria-label="Gastos planificados del mes">
     {plannedExpenses.records.map(record=><article className="grid gap-2 rounded-lg border border-ink-600 bg-ink-900 p-3" key={record.id}>
      <div className="flex items-start justify-between gap-3"><div className="min-w-0"><b className="block truncate text-sm font-semibold text-fore" title={`${record.category}${record.note?` · ${record.note}`:''}`}>{record.category}</b><small className="block truncate text-xs text-mute" title={record.note||'Sin nota'}>{record.note||'Sin nota'}</small></div><span className={ICON_TARGETS}><IconAction icon="trash" tone="bad" label={`Quitar gasto planificado: ${record.category}`} disabled={plannedDeleting===record.id} onClick={()=>setPlannedTarget({id:record.id,category:record.category,amount:String(record.amount),currency:record.currency})}/></span></div>
      <div className="grid grid-cols-2 gap-3 border-t border-ink-600 pt-2"><div><span className="block text-[10px] font-bold uppercase tracking-[.08em] text-mute">Tipo</span><span className="text-sm text-fore">{record.kind==='fixed'?'Fijo':'Variable'} · {record.cadence==='recurring'?'Recurrente':'Este mes'}</span></div><div className="text-right"><span className="block text-[10px] font-bold uppercase tracking-[.08em] text-mute">Monto</span><strong className="whitespace-nowrap text-sm tabular-nums text-fore">{formatWholeMoney(record.amount,record.currency)}</strong></div></div>
     </article>)}
    </div>}
    {plannedDense?<div className="min-w-0" role="table" aria-label="Gastos planificados del mes">
     <div role="row" className={cn(LIST_HEAD,PLANNED_COLS)}><span role="columnheader">Gasto</span><span role="columnheader">Cadencia</span><span role="columnheader" className="text-right">Monto</span><span role="columnheader" className="text-right">Acciones</span></div>
     <div role="rowgroup">{plannedExpenses.records.map(record=><div role="row" className={cn(LIST_ROW,PLANNED_COLS)} key={record.id}>
      <span className="min-w-0 truncate text-sm leading-snug" title={`${record.category}${record.note?` · ${record.note}`:''}`}><b className="font-semibold text-fore">{record.category}</b>{record.kind?<span className="ml-2 text-[10px] font-bold uppercase tracking-wider text-mute">{record.kind==='fixed'?'Fijo':'Variable'}</span>:null}<small className="ml-2 text-xs text-mute">{record.note||'Sin nota'}</small></span>
      <span className="min-w-0"><span className="text-sm text-fore">{record.cadence==='recurring'?'Recurrente':'Solo este mes'}</span></span>
      <span className={cn('min-w-0','text-right')}><span className="whitespace-nowrap text-sm font-semibold tabular-nums text-fore">{formatWholeMoney(record.amount,record.currency)}</span></span>
      <span className={cn('min-w-0','flex justify-end')}><span className={ICON_TARGETS}><IconAction icon="trash" tone="bad" label={`Quitar gasto planificado: ${record.category}`} disabled={plannedDeleting===record.id} onClick={()=>setPlannedTarget({id:record.id,category:record.category,amount:String(record.amount),currency:record.currency})}/></span></span>
     </div>)}</div>
    </div>:null}
    </div>
    </>:null}
    {!plannedError&&plannedReady&&!plannedExpenses.records.length&&plannedTotals===0?<EmptyState compact title={`Sin gastos planificados para ${dateLabel(month)}.`} description="Agregá un gasto para que se incorpore al resultado estimado, sin registrar un pago real."/>:null}
    {!plannedError&&plannedReady&&!plannedExpenses.records.length&&plannedTotals>0?<Aviso tono="warn" como="div">La previsión registra gastos planificados para {dateLabel(month)} y el desglose no llegó. <button type="button" className="text-button" onClick={()=>reloadPlanned()}>Reintentar</button></Aviso>:null}
   </Card>:null}
   {data&&horizon==='1'?<Card className="grid gap-4 p-3 sm:p-4">
    <div className="grid gap-3">
     <div className="grid gap-1">
      <h3 className="text-[17px] font-semibold tracking-tight text-fore">Gastos reales del mes · {dateLabel(month)}</h3>
      <p className="text-xs text-mute">Registra el pago contra una cuenta: descuenta el saldo y queda en el historial de movimientos. Revertir acredita de nuevo la cuenta.</p>
     </div>
     <form className="grid items-end gap-3 sm:grid-cols-2 xl:grid-cols-[11rem_10rem_7rem_9rem_9rem_minmax(9rem,1fr)]" onSubmit={saveRealExpense} noValidate aria-busy={realSaving}>
      <SelectCustom label="Cuenta" choices={[{value:'',label:'Elegí una cuenta'},...accounts.filter(account=>account.active).map(account=>({value:String(account.id),label:`${account.name} · ${account.currency}`}))]} value={realExpense.accountId} disabled={realSaving} onChange={value=>setRealExpense(current=>({...current,accountId:value}))}/>
      <SelectCustom label="Categoría" choices={['Operación','Herramientas','Marketing','Administración','Otro'].map(category=>({value:category,label:category}))} value={realExpense.category} disabled={realSaving} onChange={value=>setRealExpense(current=>({...current,category:value}))}/>
      <SelectCustom label="Tipo" choices={[{value:'variable',label:'Variable'},{value:'fixed',label:'Fijo'}]} value={realExpense.kind} disabled={realSaving} onChange={value=>setRealExpense(current=>({...current,kind:value==='fixed'?'fixed':'variable'}))}/>
      <FormField label="Monto entero" hint="Sin separadores" htmlFor="forecast-real-amount" error={realExpense.amount!==''&&!isPositiveInput(realExpense.amount)?'El monto debe ser mayor a cero.':undefined}><Input id="forecast-real-amount" type="text" inputMode="numeric" pattern="[0-9]*" maxLength={16} value={realExpense.amount} disabled={realSaving} placeholder="Sin separadores" onChange={(event:FormEvent<HTMLInputElement>)=>setRealExpense(current=>({...current,amount:soloDigitos((event.target as HTMLInputElement).value)}))}/></FormField>
      <FormField label="Fecha" htmlFor="forecast-real-date"><Input id="forecast-real-date" type="date" className="w-full" value={realExpense.paidOn} disabled={realSaving} onChange={(event:FormEvent<HTMLInputElement>)=>setRealExpense(current=>({...current,paidOn:(event.target as HTMLInputElement).value}))}/></FormField>
      <FormField label="Referencia" htmlFor="forecast-real-reference"><Input id="forecast-real-reference" type="text" maxLength={180} value={realExpense.reference} disabled={realSaving} onChange={(event:FormEvent<HTMLInputElement>)=>setRealExpense(current=>({...current,reference:(event.target as HTMLInputElement).value}))}/></FormField>
      <Button type="submit" disabled={realSaving||!realExpense.accountId||!isPositiveInput(realExpense.amount)} className="w-full sm:w-auto xl:col-span-6 xl:justify-self-end">{realSaving?'Guardando…':'Registrar gasto real'}</Button>
     </form>
    </div>
    {realExpenses.length?<>
    <div ref={realRef} className="min-w-0">
    {realDense?null:<div className="grid gap-2" aria-label="Gastos reales del mes">
     {realExpenses.map(row=><article className="grid gap-2 rounded-lg border border-ink-600 bg-ink-900 p-3" key={String(row.id)}>
      <div className="flex items-start justify-between gap-3"><div className="min-w-0"><b className="block truncate text-sm font-semibold text-fore" title={`${row.category}${row.kind?` · ${row.kind==='fixed'?'Fijo':'Variable'}`:''}`}>{row.category}{row.kind?` · ${row.kind==='fixed'?'Fijo':'Variable'}`:''}</b><small className="block truncate text-xs text-mute" title={`${listDateShort(row.paid_on)} · ${row.account_name}${row.reference?` · ${row.reference}`:''}${row.created_by_email?` · registró ${row.created_by_email}`:''}`}>{listDateShort(row.paid_on)} · {row.account_name}</small></div><span className={ICON_TARGETS}><IconAction icon="refresh" tone="bad" label={`Revertir gasto real: ${row.category}`} disabled={realDeleting===String(row.id)} onClick={()=>setRealTarget({id:row.id,category:row.category,amount:String(row.amount),currency:row.currency})}/></span></div>
      <div className="flex items-end justify-between gap-3 border-t border-ink-600 pt-2"><span className="text-xs text-mute">Pago registrado</span><strong className="whitespace-nowrap text-sm tabular-nums text-fore">{formatWholeMoney(row.amount,row.currency)}</strong></div>
     </article>)}
    </div>}
    {realDense?<div className="min-w-0" role="table" aria-label="Gastos reales del mes">
     <div role="row" className={cn(LIST_HEAD,EXPENSE_COLS)}><span role="columnheader">Gasto</span><span role="columnheader" className="text-right">Monto</span><span role="columnheader" className="text-right">Acciones</span></div>
     <div role="rowgroup">{realExpenses.map(row=><div role="row" className={cn(LIST_ROW,EXPENSE_COLS)} key={String(row.id)}>
      <span className="min-w-0 truncate text-sm leading-snug" title={`${row.category}${row.kind?` · ${row.kind==='fixed'?'Fijo':'Variable'}`:''} · ${listDateShort(row.paid_on)} · ${row.account_name}${row.reference?` · ${row.reference}`:''}${row.created_by_email?` · registró ${row.created_by_email}`:''}`}><b className="font-semibold text-fore">{row.category}{row.kind?` · ${row.kind==='fixed'?'Fijo':'Variable'}`:''}</b><small className="ml-2 whitespace-nowrap text-xs text-mute">{listDateShort(row.paid_on)} · {row.account_name}{row.reference?` · ${row.reference}`:''}${row.created_by_email?` · registró ${row.created_by_email}`:''}</small></span>
      <span className={cn('min-w-0','text-right')}><span className="whitespace-nowrap text-sm font-semibold tabular-nums text-fore">{formatWholeMoney(row.amount,row.currency)}</span></span>
      <span className={cn('min-w-0','flex justify-end')}><span className={ICON_TARGETS}><IconAction icon="refresh" tone="bad" label={`Revertir gasto real: ${row.category}`} disabled={realDeleting===String(row.id)} onClick={()=>setRealTarget({id:row.id,category:row.category,amount:String(row.amount),currency:row.currency})}/></span></span>
     </div>)}</div>
    </div>:null}
    </div>
    </>:<EmptyState compact title={`Sin gastos reales registrados para ${dateLabel(month)}.`} description="Cuando registres un pago contra una cuenta activa, aparecerá acá y se descontará del saldo."/>}
    {realError?<Aviso tono="error">{realError}</Aviso>:null}
   </Card>:null}
   {undated>0?<Nota tono="warn">{undated} presupuesto(s) aceptado(s) sin fecha: excluidos del total mensual.</Nota>:null}
   <details className="rounded-xl border border-ink-600 bg-ink-800/40 p-3">
    <summary className="flex min-h-11 cursor-pointer items-center text-sm font-semibold text-fore md:min-h-0">Cómo se calcula</summary>
    <div className="mt-2 grid gap-1.5 text-xs text-mute">
     {[data.definition.issued,data.definition.accepted_uninvoiced,data.definition.exclusions,data.definition.contracted_recurring,data.definition.collected_actual,data.definition.personnel,data.definition.commission_forecast,data.definition.planned_expenses,data.definition.opening_balance,data.definition.projected_cash,data.definition.projected_result,data.definition.contracted_clients].filter(Boolean).map((text,index)=><p key={index}>{text}</p>)}
     <p>Zona horaria: {data.time_zone}. No se suman monedas distintas.</p>
    </div>
   </details>
   {salaryPerson?<Dialog title={`Salario fijo mensual · ${salaryPerson.name}`} close={()=>{if(!salarySaving)setSalaryPerson(null);}} busy={salarySaving}><form onSubmit={saveSalary} noValidate aria-busy={salarySaving} className="grid gap-3"><FormField label="Importe mensual" htmlFor="forecast-salary-amount" hint={`El importe se guarda en la moneda de la ficha de ${salaryPerson.name} (${salaryPerson.currency}); no cambia la moneda de la persona.`}><AmountInput id="forecast-salary-amount" integerOnly value={salaryAmount} currency={salaryPerson.currency} onChange={setSalaryAmount} disabled={salarySaving}/></FormField>{salaryError?<Aviso tono="error">{salaryError}</Aviso>:null}<p className="field-help">{financePurposeNotice('payroll')} · <a href={financeNoticeHref('payroll')} target="_blank" rel="noreferrer">Aviso de Privacidad</a></p><SaveActions pending={salarySaving}><button type="submit" className="primary" disabled={salarySaving}>{salarySaving?'Guardando…':'Guardar salario'}</button></SaveActions></form></Dialog>:null}
   {adjustPerson?<Dialog title={`Ajuste del mes · ${adjustPerson.name}`} close={()=>{if(!adjustSaving&&!adjustLoading)setAdjustPerson(null);}} busy={adjustSaving||adjustLoading}>{adjustLoading?<LoadingBlock label="Cargando ajuste del mes…" lines={2}/>:null}<form onSubmit={saveAdjustment} noValidate aria-busy={adjustSaving} className="grid gap-3"><SelectCustom label="Tipo" choices={[{value:'extra',label:'Extra'},{value:'descuento',label:'Descuento'}]} value={adjustSign} disabled={adjustSaving} onChange={value=>setAdjustSign(value==='descuento'?'descuento':'extra')}/><FormField label="Importe" htmlFor="forecast-adjust-amount"><AmountInput id="forecast-adjust-amount" integerOnly value={adjustAmount} currency={adjustPerson.currency} onChange={setAdjustAmount} disabled={adjustSaving}/></FormField><FormField label="Nota opcional" htmlFor="forecast-adjust-note"><textarea id="forecast-adjust-note" maxLength={1000} className="w-full rounded-lg border border-ink-500 bg-ink-800 px-3.5 py-2.5 text-base text-fore outline-none transition focus:border-fono focus:ring-1 focus:ring-fono/40 md:text-sm" value={adjustNote} disabled={adjustSaving} onChange={event=>setAdjustNote(event.target.value)}/></FormField><p className="field-help">{financePurposeNotice('payroll')} · <a href={financeNoticeHref('payroll')} target="_blank" rel="noreferrer">Aviso de Privacidad</a></p><p className="text-xs text-mute">El ajuste suma o resta al salario base solo en {dateLabel(month)}; no cambia la ficha laboral.</p>{adjustExisting&&!adjustLoading&&<div className="flex flex-wrap items-center gap-2">{confirmRemove?<><span role="alert" className="text-xs font-semibold text-bad">¿Quitar el ajuste de este mes?</span><Button type="button" variant="danger" disabled={adjustSaving||removingOverride===String(adjustPerson.collaborator_id)} onClick={()=>void removeOverride(adjustPerson,true)}>{removingOverride===String(adjustPerson.collaborator_id)?'Quitando…':'Confirmar'}</Button><Button type="button" variant="outline" disabled={adjustSaving} onClick={()=>setConfirmRemove(false)}>Cancelar</Button></>:<span className={ICON_TARGETS}><IconAction icon="trash" tone="bad" label="Quitar ajuste del mes" disabled={adjustSaving||removingOverride===String(adjustPerson.collaborator_id)} onClick={()=>setConfirmRemove(true)}/></span>}</div>}{adjustError?<Aviso tono="error">{adjustError}</Aviso>:null}<SaveActions pending={adjustSaving}><button type="submit" className="primary" disabled={adjustSaving||adjustLoading}>{adjustSaving?'Guardando…':'Guardar ajuste'}</button></SaveActions></form></Dialog>:null}

   {plannedTarget?<ConfirmDialog open busy={plannedDeleting===plannedTarget.id} variant="danger" title="Quitar gasto planificado" confirmLabel="Quitar gasto planificado" description={<>{`Se quitará ${plannedTarget.category} por ${formatWholeMoney(plannedTarget.amount,plannedTarget.currency)} de la planificación de ${dateLabel(month)}. No toca pagos reales ni cuentas.`}{expenseError?<span role="alert" className="mt-2 block font-semibold text-bad">{expenseError}</span>:null}</>} onCancel={()=>{if(!plannedDeleting)setPlannedTarget(null);}} onConfirm={()=>void removePlannedExpense(plannedTarget.id).then(ok=>{if(ok)setPlannedTarget(null);})}/>:null}

   {realTarget?<ConfirmDialog open busy={realDeleting===String(realTarget.id)} variant="danger" title="Revertir gasto real" confirmLabel="Revertir gasto real" description={<>{`Se revertirá ${realTarget.category} por ${formatWholeMoney(realTarget.amount,realTarget.currency)}: el importe se acredita de nuevo en la cuenta y el pago sale del mes. El movimiento permanece en el historial.`}{realError?<span role="alert" className="mt-2 block font-semibold text-bad">{realError}</span>:null}</>} onCancel={()=>{if(!realDeleting)setRealTarget(null);}} onConfirm={()=>void removeRealExpense(realTarget.id).then(ok=>{if(ok)setRealTarget(null);})}/>:null}
  </>}
 </section>;
}

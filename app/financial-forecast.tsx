"use client";
import {Notice as Aviso,Note as Nota} from './ui/notice';
import {CardSurface as Card} from './ui/surface';
import {DataTable} from './ui/collection';
import {EmptyBlock as EmptyState,ErrorBlock as ErrorState} from './ui-v2';
import {FormField,FieldLabel as Label} from './ui/field';
import {SegmentedField} from './ui/navigation';

import {validateMonth} from './ui/temporal-value';
import {useTemporalFilter} from './use-temporal-filter';
import {InputControl as Input} from './ui/input-control';
import {FormEvent,useEffect,useMemo,useState,type ReactNode} from 'react';
import {formatWholeMoney,formatSignedMoney} from './amount-format';
import {formatRealMoney,isPositiveRealMoney} from './finance-money';
import {listDateFull,listDateShort} from './list-format';
import {api} from './operations';
import {AmountInput,SelectCustom} from './profile-controls';
import {soloDigitos} from 'owncoding-ui';
import {
  FORECAST_HORIZONS,
  amountFor,
  count,
  currentForecastMonth,
  dateLabel,
  financialCurrencies,
  forecastAggregates,
  forecastBalanceRows,
  forecastBalanceExactRows,
  isCurrency,
  isPositiveInput,
  plannedExpenseCounts,
  projectionCurrencies,
  realExpenseTotalExact,
  todayAsuncion,
  undatedBudgets,
  type Horizon,
  type MoneyCurrency,
} from './forecast-data';
import {useForecast,usePlannedExpenses,useRealExpenses} from './use-forecast';
import {BarraProgreso,Button,FilaDato,IconAction,cn} from 'owncoding-ui';
import {ConfirmDialog} from './dialog';
import {useCompanyCurrency} from './currency-provider';
import {CurrencyField,FilterToolbar,ListGrid,ListPage,ListRow,LoadingBlock,StateChip,type Column} from './ui-v2';

// Plantillas de lista compartidas por encabezado y filas (una sola constante por vista).
const EXPENSE_COLS='grid-cols-[minmax(0,1fr)_8.5rem_5rem]';
const PLANNED_COLS='grid-cols-[minmax(0,1fr)_7rem_8.5rem_5rem]';
const PLANNED_COLUMNS:Column[]=[{key:'expense',label:'Gasto'},{key:'cadence',label:'Cadencia'},{key:'amount',label:'Monto',align:'end'},{key:'actions',label:'Acciones',align:'end'}];
const EXPENSE_COLUMNS:Column[]=[{key:'expense',label:'Gasto'},{key:'amount',label:'Monto',align:'end'},{key:'actions',label:'Acciones',align:'end'}];

const moneyNowrap=(text:string,tono?:'bad')=><span className={cn('whitespace-nowrap tabular-nums',tono==='bad'&&'text-bad')}>{text}</span>;

// Las acciones de fila de la librería miden 28 px: en mobile se envuelven con un
// target táctil de 44 px y en escritorio vuelven a su tamaño compacto.
const ICON_TARGETS='[&>button]:h-11 [&>button]:w-11 md:[&>button]:h-7 md:[&>button]:w-7';

export function FinancialForecast({role,organizationId,navigate,onCreateInvoice}:{role:string;organizationId:string|number;navigate?:(label:string)=>void;onCreateInvoice?:()=>void}) {return ['owner','admin','finance'].includes(role)?<ForecastPanel key={String(organizationId)} navigate={navigate} onCreateInvoice={onCreateInvoice}/>:null;}
function ForecastPanel({navigate,onCreateInvoice}:{navigate?:(label:string)=>void;onCreateInvoice?:()=>void}) {
 const [month,,monthDraft,setMonthDraft]=useTemporalFilter(currentForecastMonth,value=>validateMonth(value)&&value>='1900-01'&&value<='9998-12'?value:null),[horizon,setHorizon]=useState<Horizon>('1');
 const {data,error,reload,version,setError:setForecastError}=useForecast(month,horizon);
 const {accounts,expenses:realExpenses,error:realError,setError:setRealError}=useRealExpenses(month,data);
 const {payload:plannedExpenses,error:plannedError,reload:reloadPlanned}=usePlannedExpenses(month,data);
 // Moneda inicial = la de la empresa (regla de valores predeterminados), no PYG fijo.
 const {currency:companyCurrency}=useCompanyCurrency();
 const [expense,setExpense]=useState(()=>({cadence:'monthly' as 'monthly'|'recurring',category:'Operación',kind:'variable' as 'fixed'|'variable',amount:'',currency:(isCurrency(companyCurrency)?companyCurrency:'PYG') as MoneyCurrency,note:''}));
 const [expenseError,setExpenseError]=useState(''),[expenseSaving,setExpenseSaving]=useState(false);
 const [realExpense,setRealExpense]=useState({accountId:'',category:'Operación',kind:'variable' as 'fixed'|'variable',amount:'',paidOn:todayAsuncion(),reference:''});
 const [realSaving,setRealSaving]=useState(false),[realDeleting,setRealDeleting]=useState('');
 const [plannedDeleting,setPlannedDeleting]=useState('');
 const [plannedTarget,setPlannedTarget]=useState<{id:string;category:string;amount:string;currency:MoneyCurrency}|null>(null);
 const [realTarget,setRealTarget]=useState<{id:string|number;category:string;amount:string;currency:MoneyCurrency}|null>(null);
 // `version` replica la limpieza del error del formulario en cada recarga de la previsión (mes, horizonte o mutación confirmada).
 useEffect(()=>{setExpenseError('');},[month,horizon,version]);
 const aggregates=useMemo(()=>data?forecastAggregates(data):null,[data]);
 const undated=data?undatedBudgets(data):0;
 const financialCurrenciesInMonth=useMemo(()=>data?financialCurrencies(data):[],[data]);
 const projectionCurrenciesInHorizon=useMemo(()=>data?projectionCurrencies(data):[],[data]);
 const balanceRows=useMemo(()=>data?forecastBalanceRows(data,realExpenses):[],[data,realExpenses]);
 const exactBalanceRows=useMemo(()=>data?forecastBalanceExactRows(data,realExpenses):[],[data,realExpenses]);
 const realCurrency=accounts.find(item=>String(item.id)===realExpense.accountId)?.currency||companyCurrency;
 const validRealAmount=isPositiveRealMoney(realExpense.amount,realCurrency);
 async function saveExpense(event:FormEvent<HTMLFormElement>){event.preventDefault();if(expenseSaving)return;if(!isPositiveInput(expense.amount)){setExpenseError('Ingresá un importe entero positivo y seguro, sin separadores ni decimales.');return;}setExpenseSaving(true);setExpenseError('');try{await api('/api/agency/planned-expenses',{cadence:expense.cadence,effectiveMonth:month,category:expense.category,amount:expense.amount,currency:expense.currency,kind:expense.kind,note:expense.note.trim()||null});setExpense({cadence:'monthly',category:'Operación',kind:'variable',amount:'',currency:'PYG',note:''});reload();}catch(error){setExpenseError(error instanceof Error?error.message:'No se pudo guardar el gasto planificado.');}finally{setExpenseSaving(false);}}
 async function removePlannedExpense(id:string){if(plannedDeleting)return false;setPlannedDeleting(id);setExpenseError('');try{await api(`/api/agency/planned-expenses/${id}`,{},'DELETE');reload();return true;}catch(error){setExpenseError(error instanceof Error?error.message:'No se pudo quitar el gasto planificado.');return false;}finally{setPlannedDeleting('');}}
 const realFor=(currency:MoneyCurrency)=>realExpenseTotalExact(realExpenses,currency);
 async function saveRealExpense(event:FormEvent<HTMLFormElement>){event.preventDefault();if(realSaving)return;const account=accounts.find(item=>String(item.id)===realExpense.accountId);if(!account){setRealError('Elegí una cuenta activa de la empresa.');return;}if(!isPositiveRealMoney(realExpense.amount,account.currency)){setRealError('Ingresá un importe positivo: PYG entero y otras monedas con hasta dos decimales.');return;}setRealSaving(true);setRealError('');try{await api('/api/agency/expenses',{accountId:realExpense.accountId,category:realExpense.category,kind:realExpense.kind,amount:realExpense.amount,currency:account.currency,paidOn:realExpense.paidOn,reference:realExpense.reference.trim()});setRealExpense(current=>({...current,amount:'',reference:''}));reload();}catch(error){setRealError(error instanceof Error?error.message:'No se pudo guardar el gasto real.');}finally{setRealSaving(false);}}
 async function removeRealExpense(rowId:string|number){if(realDeleting)return false;setRealDeleting(String(rowId));setRealError('');try{await api(`/api/agency/expenses/${rowId}`,{reason:'Gasto registrado por error'},'DELETE');reload();return true;}catch(error){setRealError(error instanceof Error?error.message:'No se pudo revertir el gasto real.');return false;}finally{setRealDeleting('');}}
 const openingBalance=data?.opening_balance?.records??[];
 const plannedFor=(currency:MoneyCurrency)=>plannedExpenseCounts(data!.planned_expenses).find(item=>item.currency===currency);
 // #144: el detalle de gastos planificados es una lectura aparte del forecast.
 // El vacío solo es honesto cuando la previsión del mes tampoco tiene totales.
 const plannedReady=plannedExpenses?.month===month;
 const plannedTotals=aggregates?.expenses.length??0;

 return <ListPage aria-label="Previsión financiera"
  eyebrow="Finanzas"
  title="Previsión financiera"
  subtitle={<span title="Planificación mensual por moneda. No mezcla monedas ni convierte planes, facturas, cobros o gastos en hechos contables.">Planificación mensual por moneda; no convierte ni mezcla monedas.</span>}
  toolbar={<FilterToolbar className="mb-0">
   <div className="grid min-w-0 gap-1">
    <Label htmlFor="forecast-month" className="sr-only">Mes</Label>
    <Input id="forecast-month" type="month" aria-label="Mes a planificar" title="Mes a planificar" className="w-44 max-md:w-full" value={monthDraft} min="1900-01" max="9998-12" onChange={(event:FormEvent<HTMLInputElement>)=>setMonthDraft((event.target as HTMLInputElement).value)}/>
   </div>
   <SegmentedField className="[&>button]:min-h-11 [&>button]:px-3 md:[&>button]:min-h-8" ariaLabel="Horizonte de proyección" value={horizon} onChange={(value:Horizon)=>setHorizon(value)} options={FORECAST_HORIZONS.map(value=>[value,`${value} ${value==='1'?'mes':'meses'}`])}/>
  </FilterToolbar>}
 >
  {error?<ErrorState title="No se pudo cargar la previsión" description={error} onRetry={()=>reload()}/>
  :!data?<LoadingBlock label="Cargando previsión…" lines={4}/>
  :<>
   {horizon==='1'&&!data.records.length?<EmptyState compact title="Sin facturas emitidas ni presupuestos aceptados pendientes para este mes." description="Cuando emitas una factura o se acepte un presupuesto, la previsión del mes se completa sola." action={onCreateInvoice?<button className="primary" onClick={()=>onCreateInvoice()}>Registrar factura</button>:undefined}/>:null}
  <div className={horizon==='1'?'grid gap-4 min-[1440px]:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] min-[1440px]:items-start':'grid gap-4'}>
   {horizon==='1'?<Card className="grid gap-3 p-3 sm:p-4">
    <div className="grid gap-1 border-b border-ink-600 pb-3">
     <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1"><h3 className="m-0 text-[17px] font-semibold tracking-tight text-fore" title={`${data.definition.issued} ${data.definition.accepted_uninvoiced}`}>Ingresos vs gastos</h3><span className="text-xs font-medium text-mute">Resumen del mes</span></div>
     <p className="m-0 max-w-3xl text-xs leading-relaxed text-mute">Ingresos = emitido más aceptado sin factura. Gastos = personal, comisiones, gastos planificados y gastos reales. Resultado = ingresos menos gastos.</p>
    </div>
    {balanceRows.length?<div className="grid gap-3 lg:grid-cols-2">
     {balanceRows.map(row=><article className="forecast-balance-card grid gap-2 rounded-xl border border-ink-600 bg-ink-900 p-3 sm:p-4" key={row.currency}>
      <div className="flex items-center justify-between gap-3"><span className="font-mono text-[10px] font-bold uppercase tracking-[.14em] text-mute">{row.currency}</span><span className="text-xs text-mute">Movimiento del mes</span></div>
      <div className="grid grid-cols-[4.75rem_minmax(0,1fr)_8.5rem] items-center gap-2">
       <span className="text-xs font-medium text-mute">Ingresos</span>
       <BarraProgreso valor={row.income} max={row.max} tono="ok" etiqueta={`Ingresos en ${row.currency}`}/>
       <strong className="whitespace-nowrap text-right text-sm font-semibold tabular-nums text-ok">{formatRealMoney(exactBalanceRows.find(item=>item.currency===row.currency)?.income,row.currency)}</strong>
      </div>
      <div className="grid grid-cols-[4.75rem_minmax(0,1fr)_8.5rem] items-center gap-2">
       <span className="text-xs font-medium text-mute">Gastos</span>
       <BarraProgreso valor={row.expense} max={row.max} tono="bad" etiqueta={`Gastos en ${row.currency}`}/>
       <strong className="whitespace-nowrap text-right text-sm font-semibold tabular-nums text-fore">{formatRealMoney(exactBalanceRows.find(item=>item.currency===row.currency)?.expense,row.currency)}</strong>
      </div>
      <div className="grid grid-cols-[4.75rem_minmax(0,1fr)_8.5rem] items-center gap-2 border-t border-ink-600 pt-2">
       <span className="text-xs font-semibold text-fore">Resultado</span>
       <BarraProgreso valor={Math.abs(row.result)} max={row.max} tono={row.result<0?'bad':'fono'} etiqueta={`Resultado en ${row.currency}`}/>
       <strong className={cn('whitespace-nowrap text-right text-base font-bold tabular-nums',row.result<0?'text-bad':row.result>0?'text-ok':'text-fore')}>{formatRealMoney(exactBalanceRows.find(item=>item.currency===row.currency)?.result,row.currency)}</strong>
      </div>
     </article>)}
    </div>:<EmptyState compact title="Sin datos financieros para este mes." description="Todavía no hay facturas, cobros, gastos ni salarios que alimenten el balance." action={onCreateInvoice?<button className="primary" onClick={()=>onCreateInvoice()}>Registrar factura</button>:undefined}/>}
   </Card>:null}
   {horizon==='1'?<Card className="grid gap-3 p-3 sm:p-4">
    <div className="grid gap-1 border-b border-ink-600 pb-3"><h3 className="m-0 text-[17px] font-semibold tracking-tight text-fore">Resumen por moneda</h3><p className="m-0 text-xs text-mute">Detalle para revisar de dónde viene cada total, sin convertir monedas.</p></div>
    {financialCurrenciesInMonth.length?<details className="settings-disclosure"><summary>Ver desglose</summary><div className="grid gap-3 lg:grid-cols-2">
     {financialCurrenciesInMonth.map(currency=>{const row=data.records.find(item=>item.currency===currency),personnel=data.personnel.records.find(item=>item.currency===currency),opening=amountFor(openingBalance,currency);return <article className="forecast-currency grid gap-1.5 rounded-xl border border-ink-600 bg-ink-900 p-3 sm:p-4" key={currency}>
      <div className="flex items-center justify-between gap-3 border-b border-ink-600 pb-2"><span className="font-mono text-[10px] font-bold uppercase tracking-[.14em] text-mute">{currency}</span><span className="text-xs text-mute">Planificación del mes</span></div>
      <FilaDato etiqueta="Recurrente contratado" valor={moneyNowrap(formatWholeMoney(amountFor(aggregates?.contracted,currency),currency))}/>
      <FilaDato etiqueta={`Emitido / facturado (${count(row?.invoice_count)} ${count(row?.invoice_count)===1?'factura':'facturas'})`} valor={moneyNowrap(formatWholeMoney(row?.issued_total,currency))}/>
      <FilaDato etiqueta="Cobrado" valor={moneyNowrap(formatSignedMoney(amountFor(aggregates?.collected,currency),currency))}/>
      <FilaDato etiqueta="Saldo inicial de caja" valor={moneyNowrap(formatWholeMoney(opening,currency))}/>
      <FilaDato etiqueta="Personal" valor={moneyNowrap(formatWholeMoney(personnel?.expected_end_of_month_expense,currency))}/>
      <FilaDato etiqueta="Comisiones de clientes" valor={moneyNowrap(formatWholeMoney(amountFor(aggregates?.commissions,currency),currency))}/>
      <FilaDato etiqueta={`Gastos planificados (${count(plannedFor(currency)?.expense_count)})`} valor={moneyNowrap(formatWholeMoney(amountFor(aggregates?.expenses,currency),currency))}/>
      <FilaDato etiqueta="Gastos reales" valor={moneyNowrap(formatRealMoney(realFor(currency),currency))}/>
      <FilaDato etiqueta={`Aceptado sin factura (${count(row?.budget_count)} presupuestos${count(row?.undated_budget_count)>0?` · ${count(row?.undated_budget_count)} sin fecha`:''})`} valor={moneyNowrap(formatWholeMoney(row?.accepted_uninvoiced_total,currency))}/>
     </article>;})}
    </div></details>:<EmptyState compact title="Sin datos financieros para este mes."/>}
   </Card>:<Card className="grid gap-3 p-4">
    <h3 className="m-0 text-[17px] font-semibold tracking-tight text-fore" title={data.definition.projected_cash}>Proyección de caja y resultado · {horizon} meses</h3>
    {projectionCurrenciesInHorizon.length?<div className="grid gap-4">
     {projectionCurrenciesInHorizon.map(currency=><div className="grid gap-2" key={currency}>
      <span className="font-mono text-[10px] uppercase tracking-[.14em] text-mute">{currency} · proyección acumulada</span>
      <DataTable
       columns={[{key:'month',label:'Mes'},{key:'cash',label:'Proyectado',align:'right'},{key:'result',label:'Resultado',align:'right'}]}
       rows={(data.projection?.records||[]).filter(row=>row.currency===currency).map(row=>({
        id:row.month,
        month:dateLabel(row.month),
        cash:<span className={cn('whitespace-nowrap tabular-nums',Number(row.projected_cash)<0&&'text-bad')}>{formatSignedMoney(row.projected_cash,currency)}</span>,
        result:<span className={cn('whitespace-nowrap tabular-nums',Number(row.projected_result)<0?'text-bad':Number(row.projected_result)>0&&'text-ok')}>{formatSignedMoney(row.projected_result,currency)}</span>,
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
   {data&&horizon==='1'?<Card className="grid gap-4 p-3 sm:p-4">
    <div className="grid gap-3">
     <div className="grid gap-1">
      <h3 className="m-0 text-[17px] font-semibold tracking-tight text-fore" title={data.definition.planned_expenses}>Gastos planificados · {dateLabel(month)}</h3>
      <p className="m-0 text-xs text-mute">Esto es planificación interna; no registra un pago, una factura ni una cuenta por pagar.</p>
     </div>
     <form className="grid items-end gap-3 sm:grid-cols-2 xl:grid-cols-[9rem_10rem_7rem_9rem_9rem_auto]" onSubmit={saveExpense} noValidate aria-busy={expenseSaving}>
      <SelectCustom label="Frecuencia" choices={[{value:'monthly',label:'Solo este mes'},{value:'recurring',label:'Recurrente mensual'}]} value={expense.cadence} disabled={expenseSaving} onChange={value=>setExpense(current=>({...current,cadence:value==='recurring'?'recurring':'monthly'}))}/>
      <SelectCustom label="Categoría" choices={['Operación','Herramientas','Marketing','Administración','Otro'].map(category=>({value:category,label:category}))} value={expense.category} disabled={expenseSaving} onChange={value=>setExpense(current=>({...current,category:value}))}/>
      <SelectCustom label="Tipo" choices={[{value:'variable',label:'Variable'},{value:'fixed',label:'Fijo'}]} value={expense.kind} disabled={expenseSaving} onChange={value=>setExpense(current=>({...current,kind:value==='fixed'?'fixed':'variable'}))}/>
      <FormField label="Monto entero" htmlFor="forecast-expense-amount" error={expense.amount!==''&&!isPositiveInput(expense.amount)?'El monto debe ser mayor a cero.':undefined}><AmountInput id="forecast-expense-amount" integerOnly value={expense.amount} currency={expense.currency} disabled={expenseSaving} invalid={expense.amount!==''&&!isPositiveInput(expense.amount)} onChange={value=>setExpense(current=>({...current,amount:soloDigitos(value)}))}/></FormField>
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
    <div className="min-w-0">
    <ListGrid label="Gastos planificados del mes" template={PLANNED_COLS} columns={PLANNED_COLUMNS} minWidthClass="min-w-[30rem]">
     {plannedExpenses.records.map(record=><ListRow template={PLANNED_COLS} key={record.id}>
      <span className="min-w-0 truncate text-sm leading-snug" title={`${record.category}${record.note?` · ${record.note}`:''}`}><b className="font-semibold text-fore">{record.category}</b>{record.kind?<span className="ml-2 text-[10px] font-bold uppercase tracking-wider text-mute">{record.kind==='fixed'?'Fijo':'Variable'}</span>:null}<small className="ml-2 text-xs text-mute">{record.note||'Sin nota'}</small></span>
      <span className="min-w-0"><span className="text-sm text-fore">{record.cadence==='recurring'?'Recurrente':'Solo este mes'}</span></span>
      <span className="min-w-0 text-right"><span className="whitespace-nowrap text-sm font-semibold tabular-nums text-fore">{formatWholeMoney(record.amount,record.currency)}</span></span>
      <span className="min-w-0 flex justify-end"><span className={ICON_TARGETS}><IconAction icon="trash" tone="bad" label={`Quitar gasto planificado: ${record.category}`} disabled={plannedDeleting===record.id} onClick={()=>setPlannedTarget({id:record.id,category:record.category,amount:String(record.amount),currency:record.currency})}/></span></span>
     </ListRow>)}
    </ListGrid>
    </div>
    </>:null}
    {!plannedError&&plannedReady&&!plannedExpenses.records.length&&plannedTotals===0?<EmptyState compact title={`Sin gastos planificados para ${dateLabel(month)}.`} description="Agregá un gasto para que se incorpore al resultado estimado, sin registrar un pago real."/>:null}
    {!plannedError&&plannedReady&&!plannedExpenses.records.length&&plannedTotals>0?<Aviso tono="warn" como="div">La previsión registra gastos planificados para {dateLabel(month)} y el desglose no llegó. <button type="button" className="text-button" onClick={()=>reloadPlanned()}>Reintentar</button></Aviso>:null}
   </Card>:null}
   {data&&horizon==='1'?<Card className="grid gap-4 p-3 sm:p-4">
    <div className="grid gap-3">
     <div className="grid gap-1">
      <h3 className="m-0 text-[17px] font-semibold tracking-tight text-fore">Gastos reales del mes · {dateLabel(month)}</h3>
      <p className="m-0 text-xs text-mute">Registra el pago contra una cuenta: descuenta el saldo y queda en el historial de movimientos. Revertir acredita de nuevo la cuenta.</p>
     </div>
     <form className="grid items-end gap-3 sm:grid-cols-2 xl:grid-cols-[11rem_10rem_7rem_9rem_9rem_minmax(9rem,1fr)]" onSubmit={saveRealExpense} noValidate aria-busy={realSaving}>
      <SelectCustom label="Cuenta" choices={[{value:'',label:'Elegí una cuenta'},...accounts.filter(account=>account.active).map(account=>({value:String(account.id),label:`${account.name} · ${account.currency}`}))]} value={realExpense.accountId} disabled={realSaving} onChange={value=>setRealExpense(current=>({...current,accountId:value}))}/>
      <SelectCustom label="Categoría" choices={['Operación','Herramientas','Marketing','Administración','Otro'].map(category=>({value:category,label:category}))} value={realExpense.category} disabled={realSaving} onChange={value=>setRealExpense(current=>({...current,category:value}))}/>
      <SelectCustom label="Tipo" choices={[{value:'variable',label:'Variable'},{value:'fixed',label:'Fijo'}]} value={realExpense.kind} disabled={realSaving} onChange={value=>setRealExpense(current=>({...current,kind:value==='fixed'?'fixed':'variable'}))}/>
      <FormField label="Monto" htmlFor="forecast-real-amount" error={realExpense.amount!==''&&!validRealAmount?'El monto debe ser mayor a cero.':undefined}><AmountInput id="forecast-real-amount" value={realExpense.amount} currency={realCurrency} disabled={realSaving} invalid={realExpense.amount!==''&&!validRealAmount} onChange={value=>setRealExpense(current=>({...current,amount:value}))}/></FormField>
      <FormField label="Fecha" htmlFor="forecast-real-date"><Input id="forecast-real-date" type="date" className="w-full" value={realExpense.paidOn} disabled={realSaving} onChange={(event:FormEvent<HTMLInputElement>)=>setRealExpense(current=>({...current,paidOn:(event.target as HTMLInputElement).value}))}/></FormField>
      <FormField label="Referencia" htmlFor="forecast-real-reference"><Input id="forecast-real-reference" type="text" maxLength={180} value={realExpense.reference} disabled={realSaving} onChange={(event:FormEvent<HTMLInputElement>)=>setRealExpense(current=>({...current,reference:(event.target as HTMLInputElement).value}))}/></FormField>
      <Button type="submit" disabled={realSaving||!realExpense.accountId||!validRealAmount} className="w-full sm:w-auto xl:col-span-6 xl:justify-self-end">{realSaving?'Guardando…':'Registrar gasto real'}</Button>
     </form>
    </div>
    {realExpenses.length?<>
    <div className="min-w-0">
    <ListGrid label="Gastos reales del mes" template={EXPENSE_COLS} columns={EXPENSE_COLUMNS} minWidthClass="min-w-[27.5rem]">
     {realExpenses.map(row=><ListRow template={EXPENSE_COLS} key={String(row.id)}>
      <span className="min-w-0 truncate text-sm leading-snug" title={`${row.category}${row.kind?` · ${row.kind==='fixed'?'Fijo':'Variable'}`:''} · ${listDateShort(row.paid_on)} · ${row.account_name}${row.reference?` · ${row.reference}`:''}${row.created_by_email?` · registró ${row.created_by_email}`:''}`}><b className="font-semibold text-fore">{row.category}{row.kind?` · ${row.kind==='fixed'?'Fijo':'Variable'}`:''}</b><small className="ml-2 whitespace-nowrap text-xs text-mute">{listDateShort(row.paid_on)} · {row.account_name}{row.reference?` · ${row.reference}`:''}{row.created_by_email?` · registró ${row.created_by_email}`:''}</small></span>
      <span className="min-w-0 text-right"><span className="whitespace-nowrap text-sm font-semibold tabular-nums text-fore">{formatRealMoney(row.amount,row.currency)}</span></span>
      <span className="min-w-0 flex justify-end"><span className={ICON_TARGETS}><IconAction icon="refresh" tone="bad" label={`Revertir gasto real: ${row.category}`} disabled={realDeleting===String(row.id)} onClick={()=>setRealTarget({id:row.id,category:row.category,amount:String(row.amount),currency:row.currency})}/></span></span>
     </ListRow>)}
    </ListGrid>
    </div>
    </>:<EmptyState compact title={`Sin gastos reales registrados para ${dateLabel(month)}.`} description="Cuando registres un pago contra una cuenta activa, aparecerá acá y se descontará del saldo."/>}
    {realError?<Aviso tono="error">{realError}</Aviso>:null}
   </Card>:null}
   {undated>0?<Nota tono="warn" className="m-0">{undated} presupuesto(s) aceptado(s) sin fecha: excluidos del total mensual.</Nota>:null}
   <details className="rounded-xl border border-ink-600 bg-ink-800/40 p-3">
    <summary className="flex min-h-11 cursor-pointer items-center text-sm font-semibold text-fore md:min-h-0">Cómo se calcula</summary>
    <div className="mt-2 grid gap-1.5 text-xs text-mute">
     {[data.definition.issued,data.definition.accepted_uninvoiced,data.definition.exclusions,data.definition.contracted_recurring,data.definition.collected_actual,data.definition.personnel,data.definition.commission_forecast,data.definition.planned_expenses,data.definition.opening_balance,data.definition.projected_cash,data.definition.projected_result,data.definition.contracted_clients].filter(Boolean).map((text,index)=><p key={index}>{text}</p>)}
     <p>Zona horaria: {data.time_zone}. No se suman monedas distintas.</p>
    </div>
   </details>

   {plannedTarget?<ConfirmDialog open busy={plannedDeleting===plannedTarget.id} variant="danger" title="Quitar gasto planificado" confirmLabel="Quitar gasto planificado" description={<>{`Se quitará ${plannedTarget.category} por ${formatWholeMoney(plannedTarget.amount,plannedTarget.currency)} de la planificación de ${dateLabel(month)}. No toca pagos reales ni cuentas.`}{expenseError?<span role="alert" className="mt-2 block font-semibold text-bad">{expenseError}</span>:null}</>} onCancel={()=>{if(!plannedDeleting)setPlannedTarget(null);}} onConfirm={()=>void removePlannedExpense(plannedTarget.id).then(ok=>{if(ok)setPlannedTarget(null);})}/>:null}

   {realTarget?<ConfirmDialog open busy={realDeleting===String(realTarget.id)} variant="danger" title="Revertir gasto real" confirmLabel="Revertir gasto real" description={<>{`Se revertirá ${realTarget.category} por ${formatRealMoney(realTarget.amount,realTarget.currency)}: el importe se acredita de nuevo en la cuenta y el pago sale del mes. El movimiento permanece en el historial.`}{realError?<span role="alert" className="mt-2 block font-semibold text-bad">{realError}</span>:null}</>} onCancel={()=>{if(!realDeleting)setRealTarget(null);}} onConfirm={()=>void removeRealExpense(realTarget.id).then(ok=>{if(ok)setRealTarget(null);})}/>:null}
  </>}
 </ListPage>;
}

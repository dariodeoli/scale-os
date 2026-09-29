"use client";
import {useMemo, useState, type ChangeEvent, type Dispatch, type SetStateAction} from 'react';
import {ArrowLeftRight, Plus} from 'lucide-react';
import {ActorAvatar, safePhoto} from '../actor-identity';
import {ReceiptReversal, ReconciliationWorkspace} from '../daily-controls';
import {RemoveRecord} from '../archive-controls';
import {moneyKpi} from '../client-format';
import {dueTone, listDateFull, listDateShort} from '../list-format';
import {count, currentForecastMonth} from '../forecast-data';
import {useForecast} from '../use-forecast';
import {Aviso, FilaDato, SearchField} from 'owncoding-ui';
import {EmptyBlock, ErrorBlock, Kpi, KpiStrip, ListGrid, ListRow, LoadingBlock, MoneyText, StateChip, type ChipTone, type Column} from '../ui-v2';
import {FilterToolbar} from '../ui-v2';
import type {Account, AccountTransfer, Invoice, ModalKind, PaymentRecord, User} from '../workspace-types';

// Finanzas (arquetipo dashboard + listas): disponibilidad, cuentas, transferencias,
// cobros pendientes, cobros registrados y conciliación por extracto.
// Los importes salen de `MoneyText` (money()) y `moneyKpi()` para agregados; las fechas, de `list-format`.
type FinanzasSectionProps = {
  user: User | null;
  financeState: 'loading'|'ready'|'error';
  /** Navegación del shell: los resúmenes de la pantalla abren su módulo completo. */
  navigate?: (label: string) => void;
  accounts: Account[];
  invoices: Invoice[];
  transfers: AccountTransfer[];
  payments: PaymentRecord[];
  invoiceHasMore: boolean;
  paymentHasMore: boolean;
  financeEmpty: boolean;
  loadFinance: () => Promise<void>;
  loadAllInvoices: () => Promise<void>;
  loadAllPayments: () => Promise<void>;
  setModal: Dispatch<SetStateAction<ModalKind>>;
  /** Abre “Registrar cobro”; con una factura, el modal la deja preseleccionada. */
  openPayment: (invoiceId?: string) => void;
  setToast: Dispatch<SetStateAction<string>>;
};

/** El tipo compartido no declara todavía los campos que el API ya devuelve. */
type TransferRow = AccountTransfer & {notes?: string | null; exchange_rate?: string | number | null};

const ACCOUNT_TYPES: Record<string, string> = {bank: 'Bancaria', cash: 'Efectivo', digital: 'Digital', investment: 'Inversión'};
const INVOICE_STATES: Record<string, string> = {issued: 'Emitida', partial: 'Parcial', paid: 'Pagada', overdue: 'Vencida', draft: 'Borrador', cancelled: 'Cancelada'};
const INVOICE_TONE: Record<string, ChipTone> = {issued: 'info', partial: 'warn', paid: 'ok', overdue: 'bad', draft: 'mute', cancelled: 'mute'};
const INVOICE_FILTERS: [string, string][] = [['all', 'Todas'], ['open', 'Con saldo'], ['overdue', 'Vencidas'], ['soon', 'Vencen en 7 días'], ['draft', 'Borradoras'], ['cancelled', 'Canceladas']];

/** Plantillas únicas: encabezado y filas comparten una grilla por lista. */
const TRANSFER_TEMPLATE = 'grid-cols-[minmax(20rem,1.6fr)_7rem_minmax(9rem,1.1fr)_minmax(9rem,1fr)_10rem]';
const TRANSFER_COLUMNS: Column[] = [{key: 'route', label: 'Transferencia'}, {key: 'date', label: 'Fecha'}, {key: 'actor', label: 'Recibió'}, {key: 'reference', label: 'Referencia'}, {key: 'amount', label: 'Monto', align: 'end'}];
const INVOICE_TEMPLATE = 'grid-cols-[minmax(18rem,1.6fr)_7rem_6.5rem_8.5rem_8.5rem_9rem]';
const INVOICE_COLUMNS: Column[] = [{key: 'invoice', label: 'Factura'}, {key: 'state', label: 'Estado'}, {key: 'due', label: 'Vence'}, {key: 'pending', label: 'Pendiente', align: 'end'}, {key: 'total', label: 'Total', align: 'end'}, {key: 'actions', label: 'Acciones'}];
const PAYMENT_TEMPLATE = 'grid-cols-[minmax(18rem,1.6fr)_6.5rem_minmax(9rem,1.1fr)_minmax(9rem,1.1fr)_minmax(8rem,1fr)_8.5rem_8rem]';
const PAYMENT_COLUMNS: Column[] = [{key: 'payment', label: 'Cobro'}, {key: 'date', label: 'Fecha'}, {key: 'account', label: 'Cuenta'}, {key: 'actor', label: 'Recibió'}, {key: 'reference', label: 'Referencia'}, {key: 'amount', label: 'Monto', align: 'end'}, {key: 'actions', label: 'Acciones'}];

const pendingOf = (invoice: Invoice) => Number(invoice.total) - Number(invoice.paid_amount);
const dueWithinWeek = (due: string | null) => Boolean(due) && dueTone(due!) === 'warn';

/**
 * Resumen de «Salarios» en Finanzas: mismo contrato y mismo hook que la Previsión
 * (`/core-api/api/agency/forecast` → `personnel`), sin recálculos propios.
 * «Ver más» abre la Previsión completa; el vacío lleva a cargar el salario en
 * Equipo. Cuatro estados §15: carga, error con reintento, vacío con acción y lleno.
 */
function SalariosPanel({navigate}: {navigate?: (label: string) => void}) {
  const {data, error, reload} = useForecast(currentForecastMonth(), '1');
  const rows = data?.personnel.records ?? [];
  return <section className="grid gap-3 rounded-xl border border-ink-600 bg-ink-800 p-4" aria-labelledby="finance-salaries-title">
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
      <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-0.5">
        <h3 id="finance-salaries-title" className="text-[17px] font-semibold tracking-tight text-fore">Salarios</h3>
        <p className="min-w-0 text-xs text-mute" title="Gasto esperado del personal al cierre del mes, por moneda; no incluye pagos ni comisiones registrados.">Gasto esperado del personal al cierre del mes, por moneda; no incluye pagos ni comisiones registrados.</p>
      </div>
      {navigate ? <button className="text-button" onClick={() => navigate('Previsión')}>Ver más</button> : null}
    </div>
    {error ? <ErrorBlock title="No se pudo cargar el gasto del personal" description={error} onRetry={() => reload()}/>
    : !data ? <LoadingBlock label="Cargando salarios…" lines={2}/>
    : rows.length ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {rows.map(row => <article className="grid gap-1 rounded-xl border border-ink-600 bg-ink-900 p-3" key={row.currency}>
        <div className="flex items-baseline justify-between gap-3">
          <span className="font-mono text-[10px] font-bold uppercase tracking-[.14em] text-mute">{row.currency}</span>
          <span className="whitespace-nowrap text-xs tabular-nums text-mute" title={`${count(row.included_headcount)} colaborador${count(row.included_headcount) === 1 ? '' : 'es'} activo${count(row.included_headcount) === 1 ? '' : 's'} incluido${count(row.included_headcount) === 1 ? '' : 's'}`}>{count(row.included_headcount)} incluido{count(row.included_headcount) === 1 ? '' : 's'}</span>
        </div>
        <FilaDato etiqueta="Esperado al cierre" valor={<MoneyText valor={row.expected_end_of_month_expense} currency={row.currency} className="text-base"/>}/>
      </article>)}
    </div>
    : <EmptyBlock compact title="Sin salarios fijos cargados para este mes." description="Cargá el salario fijo de cada persona desde su ficha de equipo para ver el gasto esperado al cierre." action={navigate ? <button className="secondary" onClick={() => navigate('Equipo')}>Ver equipo</button> : undefined}/>}
  </section>;
}

export function FinanzasSection({user, navigate, financeState, accounts, invoices, transfers, payments, invoiceHasMore, paymentHasMore, financeEmpty, loadFinance, loadAllInvoices, loadAllPayments, setModal, openPayment, setToast}: FinanzasSectionProps) {
  const [invoiceFilter, setInvoiceFilter] = useState('all');
  const [invoiceSearch, setInvoiceSearch] = useState('');

  const retry = () => void loadFinance().catch(cause => setToast(cause instanceof Error ? cause.message : 'No se pudieron cargar las finanzas.'));

  const availability = useMemo(() => {
    const totals = new Map<string, number>();
    for (const account of accounts) if (account.active !== false) totals.set(account.currency, (totals.get(account.currency) || 0) + Number(account.balance));
    return totals;
  }, [accounts]);
  const receivable = useMemo(() => {
    const totals = new Map<string, number>();
    let pendingCount = 0;
    for (const invoice of invoices) {
      if (['paid', 'cancelled', 'draft'].includes(invoice.status)) continue;
      const pending = pendingOf(invoice);
      if (pending <= 0) continue;
      totals.set(invoice.currency, (totals.get(invoice.currency) || 0) + pending);
      pendingCount += 1;
    }
    return {totals, pendingCount};
  }, [invoices]);
  const activeAccounts = accounts.filter(account => account.active !== false).length;
  const visibleInvoices = useMemo(() => invoices.filter(invoice => {
    const query = invoiceSearch.trim().toLowerCase();
    if (query && !`${invoice.number} ${invoice.client_name}`.toLowerCase().includes(query)) return false;
    if (invoiceFilter === 'open') return !['paid', 'cancelled', 'draft'].includes(invoice.status) && pendingOf(invoice) > 0;
    if (invoiceFilter === 'overdue') return invoice.status === 'overdue' || (pendingOf(invoice) > 0 && dueWithinWeek(invoice.due_on));
    if (invoiceFilter === 'soon') return pendingOf(invoice) > 0 && dueWithinWeek(invoice.due_on);
    if (invoiceFilter === 'draft') return invoice.status === 'draft';
    if (invoiceFilter === 'cancelled') return invoice.status === 'cancelled';
    return true;
  }), [invoices, invoiceFilter, invoiceSearch]);

  if (financeEmpty && financeState !== 'ready') {
    return financeState === 'error'
      ? <ErrorBlock title="No se pudieron cargar las finanzas" description="Reintentá para ver cuentas, facturas, cobros y conciliación." onRetry={retry}/>
      : <LoadingBlock label="Cargando finanzas…" lines={5}/>;
  }

  const multiCurrency = (totals: Map<string, number>) => totals.size
    ? <span className="flex flex-wrap items-baseline gap-2">{Array.from(totals).map(([currency, total]) => <span key={currency}>{moneyKpi(total, currency)}</span>)}</span>
    : null;

  return <section className="grid gap-4" aria-label="Finanzas">
    <KpiStrip>
      <Kpi label="Disponible" valor={multiCurrency(availability)} hint="Saldo actual de cuentas activas por moneda" destacado/>
      <Kpi label="Por cobrar" valor={multiCurrency(receivable.totals)} hint={invoiceHasMore ? `Sobre las ${invoices.length} facturas cargadas; “Ver todas las facturas” completa el total` : 'Facturas emitidas o parciales con saldo pendiente'}/>
      <Kpi label="Facturas con saldo" valor={receivable.pendingCount} hint={invoices.length ? `${invoices.length} facturas cargadas` : 'Todavía no hay facturas registradas'}/>
    </KpiStrip>

    {financeState === 'error' ? <Aviso tono="error" como="div">No se pudieron actualizar las finanzas. Se muestra la última información recibida. <button type="button" className="text-button" onClick={retry}>Reintentar</button></Aviso> : null}

    <SalariosPanel navigate={navigate}/>

    <div className="grid gap-4 xl:grid-cols-2">
      <section className="grid gap-3 rounded-xl border border-ink-600 bg-ink-800 p-4" aria-labelledby="finance-accounts-title">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0"><h3 id="finance-accounts-title" className="text-[17px] font-semibold tracking-tight text-fore">Cuentas</h3><p className="mt-1 text-xs text-mute">Disponibilidad por cuenta y custodia.</p></div>
          <div className="flex flex-wrap items-center gap-1">
            <button className="text-button" onClick={() => setModal('account')}><Plus size={14} aria-hidden="true"/>Cuenta</button>
            <button className="text-button" onClick={() => setModal('transfer')}><ArrowLeftRight size={14} aria-hidden="true"/>Transferir</button>
          </div>
        </div>
        {accounts.length ? <div className="grid gap-3 sm:grid-cols-2">
          {accounts.map(account => <article key={account.id} className="flex min-w-0 flex-col gap-2 rounded-xl border border-ink-600 bg-ink-900 p-4" data-archived={account.active === false || undefined}>
            <header className="flex items-start justify-between gap-2">
              <b className="min-w-0 truncate text-[13.5px] font-semibold leading-snug text-fore" title={account.name}>{account.name}</b>
              <StateChip tone="mute" title={`${ACCOUNT_TYPES[account.account_type] || account.account_type} · ${account.currency}`}>{ACCOUNT_TYPES[account.account_type] || account.account_type} · {account.currency}</StateChip>
            </header>
            <MoneyText valor={account.balance} currency={account.currency} className="text-lg"/>
            <dl className="grid gap-0.5 text-[11px]">
              {account.institution ? <div className="grid grid-cols-[auto_minmax(0,1fr)] items-baseline gap-2"><dt className="text-[9.5px] font-bold uppercase tracking-[.06em] text-mute">Institución</dt><dd className="min-w-0 flex-1 truncate text-right text-fore" title={account.institution}>{account.institution}</dd></div> : null}
              {account.account_number ? <div className="grid grid-cols-[auto_minmax(0,1fr)] items-baseline gap-2"><dt className="text-[9.5px] font-bold uppercase tracking-[.06em] text-mute">N.º</dt><dd className="min-w-0 whitespace-nowrap text-right tabular-nums text-fore" title={account.account_number}>{account.account_number}</dd></div> : null}
              {account.holder_name ? <div className="grid grid-cols-[auto_minmax(0,1fr)] items-baseline gap-2"><dt className="text-[9.5px] font-bold uppercase tracking-[.06em] text-mute">Titular</dt><dd className="min-w-0 flex-1 truncate text-right text-fore" title={account.holder_name}>{account.holder_name}</dd></div> : null}
              {account.custodian_email ? <div className="grid grid-cols-[auto_minmax(0,1fr)] items-baseline gap-2"><dt className="text-[9.5px] font-bold uppercase tracking-[.06em] text-mute">Custodia</dt><dd className="min-w-0 flex-1 truncate text-right text-fore" title={account.custodian_email}>{account.custodian_email}</dd></div> : null}
            </dl>
            <footer className="mt-auto flex items-center justify-end gap-1 border-t border-ink-600/60 pt-2">
              <RemoveRecord kind="accounts" id={account.id} name={account.name} role={user?.role || 'viewer'} done={loadFinance}/>
            </footer>
          </article>)}
        </div> : <EmptyBlock compact title="Todavía no hay cuentas registradas." description="Sin cuentas no se pueden imputar cobros, pagos ni transferencias." action={<button className="primary" onClick={() => setModal('account')}><Plus size={16} aria-hidden="true"/>Registrar primera cuenta</button>}/>}
      </section>

      <section className="grid gap-3 rounded-xl border border-ink-600 bg-ink-800 p-4" aria-labelledby="finance-transfers-title">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0"><h3 id="finance-transfers-title" className="text-[17px] font-semibold tracking-tight text-fore">Transferencias</h3><p className="mt-1 text-xs text-mute">Movimientos entre cuentas con su tipo de cambio real.</p></div>
          <span className="whitespace-nowrap text-xs tabular-nums text-mute">{transfers.length} movimiento{transfers.length === 1 ? '' : 's'}</span>
        </div>
        {transfers.length
          ? <ListGrid label="Transferencias entre cuentas" template={TRANSFER_TEMPLATE} columns={TRANSFER_COLUMNS} minWidthClass="min-w-[64rem]">
            {transfers.map(transfer => {
              const row = transfer as TransferRow;
              const fromCurrency = row.from_currency || accounts.find(account => account.id === row.from_account_id)?.currency || 'PYG';
              const received = row.to_currency && row.to_currency !== fromCurrency ? Number(row.received_amount || row.amount) : null;
              return <ListRow key={row.id} template={TRANSFER_TEMPLATE}>
                <div className="min-w-0"><b className="block truncate text-[13.5px] font-semibold leading-snug text-fore" title={`${row.from_account_name} → ${row.to_account_name}`}>{row.from_account_name} → {row.to_account_name}</b>{row.notes ? <small className="block truncate text-[11px] text-mute" title={row.notes}>{row.notes}</small> : null}</div>
                <div className="min-w-0"><span className="whitespace-nowrap tabular-nums text-fore" title={listDateFull(row.transferred_on) || undefined}>{listDateShort(row.transferred_on) || '—'}</span></div>
                <div className="flex min-w-0 items-center gap-1.5 text-xs text-mute"><ActorAvatar name={row.actor_name || row.created_by_email || 'Sin asignar'} photo={safePhoto(row.actor_photo_url)}/><span className="truncate" title={row.actor_name || row.created_by_email || 'Sin asignar'}>{row.actor_name || row.created_by_email || 'Sin asignar'}</span></div>
                <div className="min-w-0 truncate text-[11.5px] text-mute" title={row.reference || 'Sin referencia'}>{row.reference || 'Sin referencia'}</div>
                <div className="min-w-0 text-right">
                  <MoneyText valor={row.amount} currency={fromCurrency}/>
                  {received !== null && row.to_currency ? <span className="ml-2 inline-flex items-baseline gap-1 text-mute">→ <MoneyText valor={received} currency={row.to_currency}/></span> : null}
                </div>
              </ListRow>;
            })}
          </ListGrid>
          : <EmptyBlock compact title="Aún no hay transferencias entre cuentas." description="Registrá una cuando muevas saldo entre cuentas; el movimiento queda en la traza." action={activeAccounts >= 2 ? <button className="secondary" onClick={() => setModal('transfer')}><ArrowLeftRight size={14} aria-hidden="true"/>Transferir</button> : undefined}/>}
      </section>
    </div>

    <section className="grid gap-3 rounded-xl border border-ink-600 bg-ink-800 p-4" aria-labelledby="finance-invoices-title">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0"><h3 id="finance-invoices-title" className="text-[17px] font-semibold tracking-tight text-fore">Cobros pendientes</h3><p className="mt-1 text-xs text-mute">Facturas con saldo; el cobro descuenta la cuenta elegida.</p></div>
        <div className="flex flex-wrap items-center gap-1">
          {navigate ? <button className="text-button" onClick={() => navigate('Mora')}>Ver mora</button> : null}
          <button className="text-button" onClick={() => setModal('invoice')}><Plus size={14} aria-hidden="true"/>Factura</button>
          <button className="primary" onClick={() => openPayment()}><Plus size={16} aria-hidden="true"/>Registrar cobro</button>
        </div>
      </div>
      <FilterToolbar summary={`${visibleInvoices.length} de ${invoices.length}`}>
        <div className="flex flex-wrap gap-1">
          {INVOICE_FILTERS.map(([value, label]) => <button key={value} type="button" className={invoiceFilter === value ? 'choice active' : 'choice'} onClick={() => setInvoiceFilter(value)}>{label}</button>)}
        </div>
        <SearchField className="w-full sm:w-64 [&>input]:!pl-9 [&>input]:!pr-9 [&>button]:h-11 [&>button]:w-11 md:[&>button]:h-7 md:[&>button]:w-7" ariaLabel="Buscar factura o cliente" value={invoiceSearch} onChange={(event: ChangeEvent<HTMLInputElement>) => setInvoiceSearch(event.target.value)} placeholder="Número o cliente…"/>
      </FilterToolbar>
      {visibleInvoices.length
        ? <ListGrid label="Cobros pendientes" template={INVOICE_TEMPLATE} columns={INVOICE_COLUMNS} minWidthClass="min-w-[60rem]">
          {visibleInvoices.map(invoice => <ListRow key={invoice.id} template={INVOICE_TEMPLATE}>
            <div className="min-w-0"><b className="block truncate text-[13.5px] font-semibold leading-snug text-fore" title={`${invoice.number} · ${invoice.client_name}`}>{invoice.number} · {invoice.client_name}</b></div>
            <div className="min-w-0"><StateChip tone={INVOICE_TONE[invoice.status] || 'mute'} title={INVOICE_STATES[invoice.status] || invoice.status}>{INVOICE_STATES[invoice.status] || invoice.status}</StateChip></div>
            <div className="min-w-0">{invoice.due_on ? <span className={`whitespace-nowrap tabular-nums ${dueTone(invoice.due_on) ? 'font-semibold text-warn' : 'text-fore'}`} title={listDateFull(invoice.due_on) || undefined}>{listDateShort(invoice.due_on)}</span> : <span className="text-[11px] text-mute">Sin fecha</span>}</div>
            <div className="min-w-0 text-right">{pendingOf(invoice) > 0 ? <MoneyText valor={pendingOf(invoice)} currency={invoice.currency}/> : <span className="whitespace-nowrap text-[11px] text-mute">Sin saldo</span>}</div>
            <div className="min-w-0 text-right"><MoneyText valor={invoice.total} currency={invoice.currency}/></div>
            <div className="flex min-w-0 items-center justify-end gap-1">
              {pendingOf(invoice) > 0 ? <button className="text-button whitespace-nowrap" onClick={() => openPayment(invoice.id)}><Plus size={14} aria-hidden="true"/>Registrar cobro</button> : null}
            </div>
          </ListRow>)}
        </ListGrid>
        : <EmptyBlock compact title={invoices.length ? 'No hay facturas con este filtro.' : 'Todavía no hay facturas registradas.'} description={invoices.length ? 'Probá con otro estado o limpiá la búsqueda.' : 'Creá la primera factura para registrar cobros.'} action={invoices.length ? <button className="secondary" onClick={() => { setInvoiceFilter('all'); setInvoiceSearch(''); }}>Limpiar filtros</button> : <button className="primary" onClick={() => setModal('invoice')}><Plus size={16} aria-hidden="true"/>Crear factura</button>}/>}
      {invoiceHasMore ? <div className="flex justify-end"><button className="secondary" type="button" onClick={() => void loadAllInvoices().catch(cause => setToast(cause instanceof Error ? cause.message : 'No se pudieron cargar todas las facturas.'))}>Ver todas las facturas</button></div> : null}
    </section>

    <section className="grid gap-3 rounded-xl border border-ink-600 bg-ink-800 p-4" aria-labelledby="finance-payments-title">
      <div className="min-w-0"><h3 id="finance-payments-title" className="text-[17px] font-semibold tracking-tight text-fore">Quién cobró y dónde quedó</h3><p className="mt-1 text-xs text-mute">Cada cobro queda en la cuenta elegida y conserva su reversión en el historial.</p></div>
      {payments.length
        ? <ListGrid label="Cobros registrados" template={PAYMENT_TEMPLATE} columns={PAYMENT_COLUMNS} minWidthClass="min-w-[68rem]">
          {payments.map(payment => <ListRow key={payment.id} template={PAYMENT_TEMPLATE}>
            <div className="flex min-w-0 items-center gap-2"><b className="truncate text-[13.5px] font-semibold leading-snug text-fore" title={`${payment.client_name} · ${payment.invoice_number}`}>{payment.client_name} · {payment.invoice_number}</b>{payment.reversal_id ? <StateChip tone="warn" title={payment.reversal_reason || 'Cobro revertido'}>Revertido</StateChip> : null}</div>
            <div className="min-w-0"><span className="whitespace-nowrap tabular-nums text-fore" title={listDateFull(payment.received_on) || undefined}>{listDateShort(payment.received_on) || '—'}</span></div>
            <div className="min-w-0 truncate text-[11.5px] text-fore" title={`${payment.account_name} · ${ACCOUNT_TYPES[payment.account_type] || payment.account_type}`}>{payment.account_name} · {ACCOUNT_TYPES[payment.account_type] || payment.account_type}</div>
            <div className="flex min-w-0 items-center gap-1.5 text-xs text-mute"><ActorAvatar name={payment.actor_name || payment.received_by_email || 'Sin asignar'} photo={safePhoto(payment.actor_photo_url)}/><span className="truncate" title={payment.actor_name || payment.received_by_email || 'Sin asignar'}>{payment.actor_name || payment.received_by_email || 'Sin asignar'}</span></div>
            <div className="min-w-0 truncate text-[11.5px] text-mute" title={payment.reference || 'Sin referencia'}>{payment.reference || 'Sin referencia'}</div>
            <div className="min-w-0 text-right"><MoneyText valor={payment.amount} currency={payment.currency}/></div>
            <div className="flex min-w-0 items-center justify-end gap-1"><ReceiptReversal payment={payment} refresh={loadFinance}/></div>
          </ListRow>)}
        </ListGrid>
        : <EmptyBlock compact title="Aún no hay cobros registrados." description="Registrá un cobro contra una factura con saldo; podés revertirlo sin borrar el historial." action={receivable.pendingCount ? <button className="primary" onClick={() => openPayment()}><Plus size={16} aria-hidden="true"/>Registrar cobro</button> : undefined}/>}
      {paymentHasMore ? <div className="flex justify-end"><button className="secondary" type="button" onClick={() => void loadAllPayments().catch(cause => setToast(cause instanceof Error ? cause.message : 'No se pudieron cargar todos los cobros.'))}>Ver todos los cobros</button></div> : null}
    </section>

    <ReconciliationWorkspace accounts={accounts}/>
  </section>;
}

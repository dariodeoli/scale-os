"use client";
import {useMemo, useState, type Dispatch, type SetStateAction} from 'react';
import {ArrowLeftRight, Plus, Search} from 'lucide-react';
import {ActorAvatar, safePhoto} from '../actor-identity';
import {ReceiptReversal, ReconciliationWorkspace} from '../daily-controls';
import {RemoveRecord} from '../archive-controls';
import {moneyKpi} from '../client-format';
import {dueTone, listDateFull, listDateShort} from '../list-format';
import {money} from '../operations';
import {Aviso} from 'owncoding-ui';
import {EmptyBlock, ErrorBlock, Kpi, KpiStrip, ListGrid, ListRow, LoadingBlock, StateChip, type ChipTone, type Column} from '../ui-v2';
import {FilterToolbar} from '../ui-v2';
import type {Account, AccountTransfer, Invoice, ModalKind, PaymentRecord, User} from '../workspace-types';

// Finanzas (arquetipo dashboard + listas): disponibilidad, cuentas, transferencias,
// cobros pendientes, cobros registrados y conciliación por extracto.
// Los importes salen de `money()`/`moneyKpi()`; las fechas, de `list-format`.
type FinanzasSectionProps = {
  user: User | null;
  financeState: 'loading'|'ready'|'error';
  accounts: Account[];
  invoices: Invoice[];
  transfers: AccountTransfer[];
  payments: PaymentRecord[];
  invoiceHasMore: boolean;
  financeEmpty: boolean;
  loadFinance: () => Promise<void>;
  loadAllInvoices: () => Promise<void>;
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
const INVOICE_TEMPLATE = 'grid-cols-[minmax(18rem,1.6fr)_7rem_6.5rem_8.5rem_8.5rem_8rem]';
const INVOICE_COLUMNS: Column[] = [{key: 'invoice', label: 'Factura'}, {key: 'state', label: 'Estado'}, {key: 'due', label: 'Vence'}, {key: 'pending', label: 'Pendiente', align: 'end'}, {key: 'total', label: 'Total', align: 'end'}, {key: 'actions', label: 'Acciones'}];
const PAYMENT_TEMPLATE = 'grid-cols-[minmax(18rem,1.6fr)_6.5rem_minmax(9rem,1.1fr)_minmax(9rem,1.1fr)_minmax(8rem,1fr)_8.5rem_8rem]';
const PAYMENT_COLUMNS: Column[] = [{key: 'payment', label: 'Cobro'}, {key: 'date', label: 'Fecha'}, {key: 'account', label: 'Cuenta'}, {key: 'actor', label: 'Recibió'}, {key: 'reference', label: 'Referencia'}, {key: 'amount', label: 'Monto', align: 'end'}, {key: 'actions', label: 'Acciones'}];

const amount = (value: string | number, currency: string) => <span className="whitespace-nowrap font-semibold tabular-nums text-fore">{money(Number(value), currency)}</span>;
const pendingOf = (invoice: Invoice) => Number(invoice.total) - Number(invoice.paid_amount);
const dueWithinWeek = (due: string | null) => Boolean(due) && dueTone(due!) === 'warn';

export function FinanzasSection({user, financeState, accounts, invoices, transfers, payments, invoiceHasMore, financeEmpty, loadFinance, loadAllInvoices, setModal, openPayment, setToast}: FinanzasSectionProps) {
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
      <Kpi label="Por cobrar" valor={multiCurrency(receivable.totals)} hint="Facturas emitidas o parciales con saldo pendiente"/>
      <Kpi label="Facturas con saldo" valor={receivable.pendingCount} hint={invoices.length ? `${invoices.length} facturas cargadas` : 'Todavía no hay facturas registradas'}/>
    </KpiStrip>

    {financeState === 'error' ? <Aviso tono="error">No se pudieron actualizar las finanzas. Se muestra la última información recibida. <button type="button" className="text-button" onClick={retry}>Reintentar</button></Aviso> : null}

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
          {accounts.map(account => <article key={account.id} className="flex min-h-[200px] min-w-0 flex-col gap-3 rounded-xl border border-ink-600 bg-ink-900 p-4" data-archived={account.active === false || undefined}>
            <header className="flex items-start justify-between gap-2">
              <b className="min-w-0 text-[13.5px] font-semibold leading-snug text-fore" title={account.name}>{account.name}</b>
              <StateChip tone="mute" title={`${ACCOUNT_TYPES[account.account_type] || account.account_type} · ${account.currency}`}>{ACCOUNT_TYPES[account.account_type] || account.account_type} · {account.currency}</StateChip>
            </header>
            <strong className="text-xl font-semibold tabular-nums text-fore">{money(Number(account.balance), account.currency)}</strong>
            <dl className="grid gap-1 text-[11.5px]">
              {account.institution ? <div className="flex items-baseline justify-between gap-2"><dt className="text-[9.5px] font-bold uppercase tracking-[.06em] text-mute">Institución</dt><dd className="min-w-0 text-right text-fore" title={account.institution}>{account.institution}</dd></div> : null}
              {account.account_number ? <div className="flex items-baseline justify-between gap-2"><dt className="text-[9.5px] font-bold uppercase tracking-[.06em] text-mute">N.º</dt><dd className="min-w-0 whitespace-nowrap text-right tabular-nums text-fore" title={account.account_number}>{account.account_number}</dd></div> : null}
              {account.holder_name ? <div className="flex items-baseline justify-between gap-2"><dt className="text-[9.5px] font-bold uppercase tracking-[.06em] text-mute">Titular</dt><dd className="min-w-0 text-right text-fore" title={account.holder_name}>{account.holder_name}</dd></div> : null}
              {account.custodian_email ? <div className="flex items-baseline justify-between gap-2"><dt className="text-[9.5px] font-bold uppercase tracking-[.06em] text-mute">Custodia</dt><dd className="min-w-0 text-right text-fore" title={account.custodian_email}>{account.custodian_email}</dd></div> : null}
            </dl>
            <footer className="mt-auto flex items-center justify-end gap-1 border-t border-ink-600 pt-3">
              <RemoveRecord kind="accounts" id={account.id} name={account.name} role={user?.role || 'viewer'} done={loadFinance}/>
            </footer>
          </article>)}
        </div> : <EmptyBlock compact title="Creá la primera cuenta para registrar cobros." description="Sin cuentas no se pueden imputar cobros, pagos ni transferencias." action={<button className="primary" onClick={() => setModal('account')}><Plus size={16} aria-hidden="true"/>Cuenta</button>}/>}
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
                  {amount(row.amount, fromCurrency)}
                  {received !== null && row.to_currency ? <small className="ml-2 whitespace-nowrap tabular-nums text-mute">→ {money(received, row.to_currency)}</small> : null}
                </div>
              </ListRow>;
            })}
          </ListGrid>
          : <EmptyBlock compact title="Aún no hay transferencias entre cuentas." description="Registrá una cuando muevas saldo entre cuentas; el movimiento queda en la traza."/>}
      </section>
    </div>

    <section className="grid gap-3 rounded-xl border border-ink-600 bg-ink-800 p-4" aria-labelledby="finance-invoices-title">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0"><h3 id="finance-invoices-title" className="text-[17px] font-semibold tracking-tight text-fore">Cobros pendientes</h3><p className="mt-1 text-xs text-mute">Facturas con saldo; el cobro descuenta la cuenta elegida.</p></div>
        <div className="flex flex-wrap items-center gap-1">
          <button className="text-button" onClick={() => setModal('invoice')}><Plus size={14} aria-hidden="true"/>Factura</button>
          <button className="primary" onClick={() => openPayment()}><Plus size={16} aria-hidden="true"/>Registrar cobro</button>
        </div>
      </div>
      <FilterToolbar summary={`${visibleInvoices.length} de ${invoices.length}`}>
        <div className="flex flex-wrap gap-1">
          {INVOICE_FILTERS.map(([value, label]) => <button key={value} type="button" className={invoiceFilter === value ? 'choice active' : 'choice'} onClick={() => setInvoiceFilter(value)}>{label}</button>)}
        </div>
        <label className="grid w-full gap-1.5 sm:w-64">
          <span className="sr-only">Buscar factura o cliente</span>
          <span className="relative">
            <Search size={14} aria-hidden="true" className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-mute"/>
            <input type="search" value={invoiceSearch} onChange={event => setInvoiceSearch(event.target.value)} placeholder="Número o cliente…" autoComplete="off" className="w-full pl-7"/>
          </span>
        </label>
      </FilterToolbar>
      {visibleInvoices.length
        ? <ListGrid label="Cobros pendientes" template={INVOICE_TEMPLATE} columns={INVOICE_COLUMNS} minWidthClass="min-w-[60rem]">
          {visibleInvoices.map(invoice => <ListRow key={invoice.id} template={INVOICE_TEMPLATE}>
            <div className="min-w-0"><b className="block truncate text-[13.5px] font-semibold leading-snug text-fore" title={`${invoice.number} · ${invoice.client_name}`}>{invoice.number} · {invoice.client_name}</b></div>
            <div className="min-w-0"><StateChip tone={INVOICE_TONE[invoice.status] || 'mute'} title={INVOICE_STATES[invoice.status] || invoice.status}>{INVOICE_STATES[invoice.status] || invoice.status}</StateChip></div>
            <div className="min-w-0">{invoice.due_on ? <span className={`whitespace-nowrap tabular-nums ${dueTone(invoice.due_on) ? 'font-semibold text-warn' : 'text-fore'}`} title={listDateFull(invoice.due_on) || undefined}>{listDateShort(invoice.due_on)}</span> : <span className="text-[11px] text-mute">Sin fecha</span>}</div>
            <div className="min-w-0 text-right">{pendingOf(invoice) > 0 ? amount(pendingOf(invoice), invoice.currency) : <span className="whitespace-nowrap text-[11px] text-mute">Sin saldo</span>}</div>
            <div className="min-w-0 text-right">{amount(invoice.total, invoice.currency)}</div>
            <div className="flex min-w-0 items-center justify-end gap-1">
              {pendingOf(invoice) > 0 ? <button className="text-button" onClick={() => openPayment(invoice.id)}><Plus size={14} aria-hidden="true"/>Registrar cobro</button> : null}
            </div>
          </ListRow>)}
        </ListGrid>
        : <EmptyBlock compact title={invoices.length ? 'No hay facturas con este filtro.' : 'Todavía no hay facturas registradas.'} description={invoices.length ? 'Probá con otro estado o limpiá la búsqueda.' : 'Creá la primera factura para registrar cobros.'}/>}
      {invoiceHasMore ? <div className="flex justify-end"><button className="secondary" type="button" onClick={() => void loadAllInvoices()}>Ver todas las facturas</button></div> : null}
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
            <div className="min-w-0 text-right">{amount(payment.amount, payment.currency)}</div>
            <div className="flex min-w-0 items-center justify-end gap-1"><ReceiptReversal payment={payment} refresh={loadFinance}/></div>
          </ListRow>)}
        </ListGrid>
        : <EmptyBlock compact title="Aún no hay cobros registrados." description="Registrá un cobro contra una factura con saldo; podés revertirlo sin borrar el historial."/>}
    </section>

    <ReconciliationWorkspace accounts={accounts}/>
  </section>;
}

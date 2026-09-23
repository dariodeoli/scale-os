"use client";
import {useEffect, useMemo, useState} from 'react';
import {Plus, Undo2} from 'lucide-react';
import {api, Dialog, Editor, money} from '../operations';
import {currencyChoices} from '../currencies';
import {currentForecastMonth, todayAsuncion} from '../forecast-data';
import {dueTone, listDateFull, listDateShort} from '../list-format';
import {roleCan} from '../capabilities';
import {
  COMMISSION_FILTERS,
  commissionActions,
  commissionBasisText,
  commissionKindLabel,
  commissionStatusLabel,
  filterCommissions,
  monthlyCommissionTotals,
  referralDiscountStatusLabel,
  type Commission,
  type CommissionFilter,
  type MonthlyCommission,
  type Payout,
  type ReferralDiscount,
} from '../commission-data';
import {Aviso} from 'owncoding-ui';
import {EmptyBlock, ErrorBlock, Kpi, KpiStrip, ListGrid, ListRow, LoadingBlock, PageHeader, StateChip, type ChipTone, type Column} from '../ui-v2';
import type {User} from '../workspace-types';

// Comisiones y referidos (dominio FIN). La sección es dueña de sus datos: liquidación
// del mes por colaborador, comisiones por venta/referido, descuentos y pagos registrados.
// La lógica de estados/agregados vive en app/commission-data.ts.
type ComisionesSectionProps = {user: User | null};
type Choice = {value: string; label: string};
type AccountChoice = {id: string; name: string; currency: string; balance: string; active: boolean};
type CollaboratorChoice = {id: string; full_name: string; currency?: string | null};

const STATUS_TONE: Record<Commission['status'], ChipTone> = {pending: 'warn', approved: 'info', paid: 'ok', cancelled: 'mute'};
const DISCOUNT_TONE: Record<ReferralDiscount['status'], ChipTone> = {applied: 'ok', reversed: 'mute'};

/** Plantillas únicas por lista (encabezado y filas comparten la grilla). */
const SETTLEMENT_TEMPLATE = 'grid-cols-[minmax(12rem,1.6fr)_9rem_9rem_9rem_9rem_9rem]';
const SETTLEMENT_COLUMNS: Column[] = [{key: 'person', label: 'Colaborador'}, {key: 'expected', label: 'Esperado', align: 'end'}, {key: 'recorded', label: 'Registrado', align: 'end'}, {key: 'approved', label: 'Aprobado', align: 'end'}, {key: 'paid', label: 'Pagado', align: 'end'}, {key: 'pending', label: 'Pendiente', align: 'end'}];
const COMMISSION_TEMPLATE = 'grid-cols-[minmax(13rem,1.5fr)_7rem_11rem_minmax(11rem,1.2fr)_11rem]';
const COMMISSION_COLUMNS: Column[] = [{key: 'beneficiary', label: 'Beneficiario'}, {key: 'status', label: 'Estado'}, {key: 'amount', label: 'Importe', align: 'end'}, {key: 'reference', label: 'Factura y vencimiento'}, {key: 'actions', label: 'Acciones'}];
const DISCOUNT_TEMPLATE = 'grid-cols-[minmax(12rem,1.4fr)_minmax(13rem,1.5fr)_7rem_9rem_9rem]';
const DISCOUNT_COLUMNS: Column[] = [{key: 'referrer', label: 'Referido'}, {key: 'invoice', label: 'Factura y cliente'}, {key: 'amount', label: 'Monto', align: 'end'}, {key: 'status', label: 'Estado'}, {key: 'actions', label: 'Acciones'}];
const PAYOUT_TEMPLATE = 'grid-cols-[minmax(13rem,1.6fr)_6.5rem_minmax(10rem,1.2fr)_minmax(10rem,1.1fr)_8.5rem]';
const PAYOUT_COLUMNS: Column[] = [{key: 'egress', label: 'Egreso'}, {key: 'date', label: 'Fecha'}, {key: 'account', label: 'Cuenta'}, {key: 'actor', label: 'Registró'}, {key: 'amount', label: 'Monto', align: 'end'}];

const moneyCell = (value: string | number, currency: string) => <span className="whitespace-nowrap font-semibold tabular-nums text-fore">{money(Number(value), currency)}</span>;
const CHOICE_EMPTY: Choice = {value: '', label: 'Sin vincular'};

export function ComisionesSection({user}: ComisionesSectionProps) {
  const role = user?.role || 'viewer';
  const canManage = roleCan(role, 'commissions.manage');
  const canSeePayouts = roleCan(role, 'finance.view');
  const [month, setMonth] = useState(currentForecastMonth);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [monthly, setMonthly] = useState<MonthlyCommission[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [discounts, setDiscounts] = useState<ReferralDiscount[]>([]);
  const [invoices, setInvoices] = useState<{id: string; number: string; client_name: string; currency: string; total: string; paid_amount: string}[]>([]);
  const [accounts, setAccounts] = useState<AccountChoice[]>([]);
  const [collaborators, setCollaborators] = useState<CollaboratorChoice[]>([]);
  const [filter, setFilter] = useState<CommissionFilter>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [newCommission, setNewCommission] = useState(false);
  const [pay, setPay] = useState<Commission | null>(null);
  const [newDiscount, setNewDiscount] = useState(false);
  const [notice, setNotice] = useState('');

  async function load() {
    try {
      const [commissionData, monthlyData, discountData] = await Promise.all([
        api<{commissions: Commission[]}>('/api/agency/commissions'),
        api<{month: string; records: MonthlyCommission[]}>(`/api/agency/commissions/monthly?month=${encodeURIComponent(month)}`),
        api<{discounts: ReferralDiscount[]}>('/api/agency/referral-discounts'),
      ]);
      setCommissions(commissionData.commissions || []);
      setMonthly(monthlyData.records || []);
      setDiscounts(discountData.discounts || []);
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudieron cargar las comisiones.');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { void load(); }, [month]);
  // Catálogos de los diálogos: se piden aparte para que un 403 no tumbe la sección.
  useEffect(() => {
    if (!canManage) return;
    void api<{invoices: {id: string; number: string; client_name: string; currency: string; total: string; paid_amount: string}[]}>('/api/agency/invoices').then(data => setInvoices(data.invoices || [])).catch(() => setInvoices([]));
    void api<{collaborators: CollaboratorChoice[]}>('/api/agency/collaborators').then(data => setCollaborators(data.collaborators || [])).catch(() => setCollaborators([]));
    if (canSeePayouts) {
      void api<{accounts: AccountChoice[]}>('/api/agency/accounts').then(data => setAccounts(data.accounts || [])).catch(() => setAccounts([]));
      void api<{payouts: Payout[]}>('/api/agency/payouts').then(data => setPayouts(data.payouts || [])).catch(() => setPayouts([]));
    }
  }, [canManage, canSeePayouts, month]);

  const totals = useMemo(() => monthlyCommissionTotals(monthly), [monthly]);
  const visible = useMemo(() => filterCommissions(commissions, filter), [commissions, filter]);
  const totalFor = (key: 'expected' | 'paid' | 'pending') => totals.length
    ? <span className="flex flex-wrap items-baseline gap-2">{totals.map(row => <span key={row.currency}>{money(row[key], row.currency)}</span>)}</span>
    : null;
  const monthLabel = listDateShort(`${month}-01`) || month;
  const run = async (fn: () => Promise<void>, ok: string) => {
    if (busy) return;
    setBusy(true); setError(''); setNotice('');
    try { await fn(); setNotice(ok); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo completar la operación.'); }
    finally { setBusy(false); }
  };
  const invoiceChoices = (onlyOpen: boolean): Choice[] => invoices.filter(invoice => !onlyOpen || Number(invoice.total) > Number(invoice.paid_amount)).map(invoice => ({value: String(invoice.id), label: `${invoice.number} · ${invoice.client_name}${onlyOpen ? ` · pendiente ${money(Number(invoice.total) - Number(invoice.paid_amount), invoice.currency)}` : ''}`}));
  const payAccounts = pay ? accounts.filter(account => account.active && account.currency === pay.currency) : [];

  return <section className="grid gap-4" aria-label="Comisiones y referidos">
    <PageHeader eyebrow="Finanzas" title="Comisiones y referidos" subtitle="Liquidación del mes, comisiones por venta o recomendación, descuentos y egresos registrados." actions={canManage ? <button className="primary" onClick={() => setNewCommission(true)}><Plus size={16} aria-hidden="true"/>Comisión</button> : undefined}/>
    {error ? <ErrorBlock title="No pudimos completar la operación" description={error} onRetry={() => void load()}/> : null}
    {notice ? <Aviso tono="ok">{notice}</Aviso> : null}
    {loading ? <LoadingBlock label="Cargando comisiones…" lines={4}/> : <>
      <KpiStrip>
        <Kpi label={`Esperado · ${monthLabel}`} valor={totalFor('expected')} hint="Acuerdos comerciales vigentes con comisión asignada"/>
        <Kpi label={`Pagado · ${monthLabel}`} valor={totalFor('paid')} hint="Comisiones pagadas del mes"/>
        <Kpi label={`Pendiente · ${monthLabel}`} valor={totalFor('pending')} hint="Registradas o aprobadas sin pagar" destacado={totals.some(row => row.pending > 0)}/>
      </KpiStrip>

      <section className="grid gap-3 rounded-xl border border-ink-600 bg-ink-800 p-4" aria-labelledby="commissions-settlement-title">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0"><h3 id="commissions-settlement-title" className="text-[17px] font-semibold tracking-tight text-fore">Liquidación del mes</h3><p className="mt-1 text-xs text-mute">Esperado: acuerdos vigentes. Registrado, aprobado, pagado y pendiente: comisiones del mes según la factura vinculada.</p></div>
          <label className="grid gap-1.5"><span className="text-[11px] font-medium uppercase tracking-wider text-mute">Mes</span><input type="month" className="w-44" value={month} min="1900-01" max="9998-12" onChange={event => { if (/^\d{4}-(0[1-9]|1[0-2])$/.test(event.target.value)) setMonth(event.target.value); }}/></label>
        </div>
        {monthly.length
          ? <ListGrid label="Comisiones del mes por colaborador" template={SETTLEMENT_TEMPLATE} columns={SETTLEMENT_COLUMNS} minWidthClass="min-w-[62rem]">
            {monthly.map(row => <ListRow key={`${row.recipient_id ?? `unlinked-${row.name ?? ''}`}-${row.currency}`} template={SETTLEMENT_TEMPLATE}>
              <div className="min-w-0"><b className="block text-[13.5px] font-semibold text-fore" title={row.name || 'Sin colaborador vinculado'}>{row.name || 'Sin colaborador vinculado'}</b><small className="block text-[11px] text-mute">{row.currency}</small></div>
              <div className="min-w-0 text-right">{moneyCell(row.expected_amount, row.currency)}</div>
              <div className="min-w-0 text-right">{moneyCell(row.recorded_amount, row.currency)}</div>
              <div className="min-w-0 text-right">{moneyCell(row.approved_amount, row.currency)}</div>
              <div className="min-w-0 text-right">{moneyCell(row.paid_amount, row.currency)}</div>
              <div className="min-w-0 text-right">{moneyCell(row.pending_amount, row.currency)}</div>
            </ListRow>)}
          </ListGrid>
          : <EmptyBlock compact title="Sin comisiones ni acuerdos comerciales para este mes." description="Los acuerdos se activan en la ficha comercial del cliente (plan y comisión asignada)."/>}
      </section>

      <section className="grid gap-3 rounded-xl border border-ink-600 bg-ink-800 p-4" aria-labelledby="commissions-list-title">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0"><h3 id="commissions-list-title" className="text-[17px] font-semibold tracking-tight text-fore">Comisiones y referidos</h3><p className="mt-1 text-xs text-mute">Los porcentajes se calculan al registrar la comisión; los cobros posteriores no modifican acuerdos ya registrados.</p></div>
          <div className="flex flex-wrap gap-1">{COMMISSION_FILTERS.map(value => <button key={value} type="button" className={filter === value ? 'choice active' : 'choice'} onClick={() => setFilter(value)}>{value === 'all' ? 'Todas' : commissionStatusLabel(value)}</button>)}</div>
        </div>
        {visible.length
          ? <ListGrid label="Comisiones y referidos" template={COMMISSION_TEMPLATE} columns={COMMISSION_COLUMNS} minWidthClass="min-w-[60rem]">
            {visible.map(commission => {
              const actions = commissionActions(commission.status);
              return <ListRow key={commission.id} template={COMMISSION_TEMPLATE}>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2"><b className="text-[13.5px] font-semibold text-fore" title={commission.beneficiary_name}>{commission.beneficiary_name}</b><StateChip tone="mute" title={commissionKindLabel(commission.kind)}>{commissionKindLabel(commission.kind)}</StateChip></div>
                  <small className="block text-[11px] text-mute">{commission.collaborator_name ? `Vinculada a ${commission.collaborator_name}` : 'Sin colaborador vinculado'}{commission.created_at ? ` · alta ${listDateShort(commission.created_at)}` : ''}</small>
                </div>
                <div className="min-w-0"><StateChip tone={STATUS_TONE[commission.status]} title={commissionStatusLabel(commission.status)}>{commissionStatusLabel(commission.status)}</StateChip></div>
                <div className="min-w-0 text-right">
                  {moneyCell(commission.amount, commission.currency)}
                  <small className="block text-[11px] text-mute">{commissionBasisText(commission, (value, currency) => money(Number(value), currency))}</small>
                  {commission.paid_on ? <small className="block whitespace-nowrap text-[11px] text-mute">Pagada {listDateShort(commission.paid_on)}</small> : null}
                </div>
                <div className="min-w-0 text-[11.5px] text-mute">
                  <span className="block text-fore" title={commission.invoice_number || 'Sin factura vinculada'}>{commission.invoice_number || 'Sin factura vinculada'}</span>
                  {commission.due_on ? <span className={`block whitespace-nowrap tabular-nums ${dueTone(commission.due_on) ? 'font-semibold text-warn' : ''}`} title={listDateFull(commission.due_on) || undefined}>Vence {listDateShort(commission.due_on)}</span> : null}
                  {commission.notes ? <span className="block" title={commission.notes}>{commission.notes}</span> : null}
                </div>
                <div className="flex min-w-0 flex-wrap items-center justify-end gap-1">
                  {actions.approve ? <button className="text-button positive" disabled={busy} onClick={() => void run(async () => { await api(`/api/agency/commissions/${commission.id}`, {status: 'approved'}, 'PATCH'); }, 'Comisión aprobada.')}>Aprobar</button> : null}
                  {actions.pay ? <button className="text-button" disabled={busy} onClick={() => setPay(commission)}>Registrar pago</button> : null}
                  {actions.cancel ? <button className="text-button danger" disabled={busy} onClick={() => void run(async () => { await api(`/api/agency/commissions/${commission.id}`, {status: 'cancelled'}, 'PATCH'); }, 'Comisión cancelada.')}>Cancelar</button> : null}
                  {!actions.approve && !actions.pay && !actions.cancel ? <span className="text-[11px] text-mute">Sin acciones</span> : null}
                </div>
              </ListRow>;
            })}
          </ListGrid>
          : <EmptyBlock compact title={commissions.length ? 'No hay comisiones con este estado.' : 'Registrá una comisión por venta o por recomendar un cliente.'} description={commissions.length ? 'Probá con otro estado.' : undefined} action={canManage && !commissions.length ? <button className="primary" onClick={() => setNewCommission(true)}><Plus size={16} aria-hidden="true"/>Comisión</button> : undefined}/>}
      </section>

      <section className="grid gap-3 rounded-xl border border-ink-600 bg-ink-800 p-4" aria-labelledby="commissions-discounts-title">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0"><h3 id="commissions-discounts-title" className="text-[17px] font-semibold tracking-tight text-fore">Descuentos por referido</h3><p className="mt-1 text-xs text-mute">Se descuentan del saldo pendiente de la factura y conservan el motivo y su historial de reversiones.</p></div>
          {canManage ? <button className="secondary" onClick={() => setNewDiscount(true)} disabled={busy}><Plus size={16} aria-hidden="true"/>Nuevo descuento</button> : null}
        </div>
        {discounts.length
          ? <ListGrid label="Descuentos por referido" template={DISCOUNT_TEMPLATE} columns={DISCOUNT_COLUMNS} minWidthClass="min-w-[56rem]">
            {discounts.map(discount => <ListRow key={discount.id} template={DISCOUNT_TEMPLATE}>
              <div className="min-w-0"><b className="block text-[13.5px] font-semibold text-fore">{discount.referrer}</b><small className="block text-[11px] text-mute">{discount.created_at ? `Alta ${listDateShort(discount.created_at)}` : 'Sin fecha de alta'}</small></div>
              <div className="min-w-0 text-[11.5px] text-mute"><span className="block text-fore">{discount.invoice_number}</span><span className="block">{discount.client_name} · {discount.reason}</span></div>
              <div className="min-w-0 text-right">{moneyCell(discount.amount, discount.currency)}</div>
              <div className="min-w-0"><StateChip tone={DISCOUNT_TONE[discount.status]}>{referralDiscountStatusLabel(discount.status)}</StateChip></div>
              <div className="flex min-w-0 items-center justify-end gap-1">
                {discount.status === 'applied' && canManage ? <button className="text-button warn" disabled={busy} onClick={() => void run(async () => { await api(`/api/agency/referral-discounts/${discount.id}`, {}, 'PATCH'); }, 'Descuento revertido.')}><Undo2 size={14} aria-hidden="true"/>Revertir</button> : null}
              </div>
            </ListRow>)}
          </ListGrid>
          : <EmptyBlock compact title="Todavía no hay descuentos registrados." description="Aplicá un descuento cuando el saldo de una factura se ajuste por una recomendación."/>}
      </section>

      {canSeePayouts ? <section className="grid gap-3 rounded-xl border border-ink-600 bg-ink-800 p-4" aria-labelledby="commissions-payouts-title">
        <div className="min-w-0"><h3 id="commissions-payouts-title" className="text-[17px] font-semibold tracking-tight text-fore">Pagos registrados</h3><p className="mt-1 text-xs text-mute">Cada pago descuenta el saldo de la cuenta elegida y conserva quién lo registró.</p></div>
        {payouts.length
          ? <ListGrid label="Pagos registrados" template={PAYOUT_TEMPLATE} columns={PAYOUT_COLUMNS} minWidthClass="min-w-[58rem]">
            {payouts.map(payout => <ListRow key={payout.id} template={PAYOUT_TEMPLATE}>
              <div className="min-w-0"><b className="block text-[13.5px] font-semibold text-fore">{payout.collaborator_name || payout.beneficiary_name || 'Sin beneficiario'}</b>{payout.reference ? <small className="block text-[11px] text-mute" title={payout.reference}>{payout.reference}</small> : null}</div>
              <div className="min-w-0"><span className="whitespace-nowrap tabular-nums text-fore" title={listDateFull(payout.paid_on) || undefined}>{listDateShort(payout.paid_on) || '—'}</span></div>
              <div className="min-w-0 text-[11.5px] text-fore">{payout.account_name}</div>
              <div className="min-w-0 text-[11.5px] text-mute">{payout.created_by_email || 'Sin registrar'}</div>
              <div className="min-w-0 text-right">{moneyCell(payout.amount, payout.currency)}</div>
            </ListRow>)}
          </ListGrid>
          : <EmptyBlock compact title="Todavía no hay egresos registrados." description="Al pagar una comisión o un sueldo, el egreso aparece acá con su cuenta."/>}
      </section> : null}
    </>}

    {newCommission ? <Dialog title="Nueva comisión o referido" close={() => setNewCommission(false)}>
      <Editor columns fields={[
        {key: 'beneficiary_name', label: 'Beneficiario'},
        {key: 'kind', label: 'Origen', section: 'Qué se comisiona', choices: [{value: 'sales', label: 'Venta'}, {value: 'referral', label: 'Referido'}]},
        {key: 'basis', label: 'Cálculo', section: 'Qué se comisiona', choices: [{value: 'fixed', label: 'Importe fijo'}, {value: 'invoiced', label: '% facturado'}, {value: 'collected', label: '% cobrado'}]},
        {key: 'amount', label: 'Importe (para importe fijo)', type: 'money', section: 'Qué se comisiona'},
        {key: 'percentage', label: 'Porcentaje (para cálculo %)', type: 'number', optional: true, section: 'Qué se comisiona'},
        {key: 'currency', label: 'Moneda (se usa la de la factura si se vincula)', choices: currencyChoices, section: 'Qué se comisiona'},
        {key: 'collaborator_id', label: 'Vincular colaborador', optional: true, section: 'Referencia', choices: [CHOICE_EMPTY, ...collaborators.map(person => ({value: String(person.id), label: person.full_name}))]},
        {key: 'invoice_id', label: 'Factura de referencia', optional: true, section: 'Referencia', choices: [CHOICE_EMPTY, ...invoiceChoices(false)]},
        {key: 'due_on', label: 'Vencimiento', type: 'date', optional: true, section: 'Referencia'},
        {key: 'notes', label: 'Cliente referido / condiciones', type: 'textarea', optional: true, section: 'Referencia'},
      ]} defaults={{beneficiary_name: '', kind: 'sales', collaborator_id: '', invoice_id: '', basis: 'fixed', amount: '0', percentage: '', currency: 'PYG', due_on: '', notes: ''}} label="Guardar comisión" save={async values => { await api('/api/agency/commissions', values); await load(); setNewCommission(false); }}/>
    </Dialog> : null}

    {pay ? <Dialog title={`Registrar pago · ${pay.beneficiary_name}`} close={() => setPay(null)}>
      <Editor columns fields={[
        {key: 'account_id', label: 'Cuenta de salida', choices: payAccounts.map(account => ({value: String(account.id), label: `${account.name} · ${money(Number(account.balance), account.currency)}`}))},
        {key: 'amount', label: 'Importe de la comisión (se conserva el aprobado)', type: 'money', currency: pay.currency},
        {key: 'paid_on', label: 'Fecha', type: 'date'},
        {key: 'reference', label: 'Comprobante / período / referencia'},
      ]} defaults={{account_id: '', amount: pay.amount, paid_on: todayAsuncion(), reference: ''}} label="Confirmar pago" save={async values => { await api('/api/agency/payouts', {...values, commission_id: pay.id}); setPay(null); setNotice('Pago registrado.'); await load(); }}/>
    </Dialog> : null}

    {newDiscount ? <Dialog title="Descuento por referido" close={() => setNewDiscount(false)}>
      <Editor columns fields={[
        {key: 'invoice_id', label: 'Factura', choices: invoiceChoices(true)},
        {key: 'referrer', label: 'Quién refirió al cliente'},
        {key: 'amount', label: 'Descuento en la moneda de la factura', type: 'money', currencyFrom: values => invoices.find(invoice => String(invoice.id) === values.invoice_id)?.currency || 'PYG'},
        {key: 'reason', label: 'Motivo o acuerdo', type: 'textarea'},
      ]} defaults={{invoice_id: '', referrer: '', amount: '', reason: ''}} label="Aplicar descuento" save={async values => { await api('/api/agency/referral-discounts', values); setNewDiscount(false); setNotice('Descuento aplicado.'); await load(); }}/>
    </Dialog> : null}
  </section>;
}

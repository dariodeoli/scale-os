"use client";
import type {ChangeEvent, Dispatch, SetStateAction} from 'react';
import {Plus} from 'lucide-react';
import {EmptyBlock, ErrorBlock, FilterToolbar, Kpi, KpiStrip, ListGrid, ListRow, LoadingBlock, MoneyText, PageHeader, StateChip, type ChipTone, type Column} from '../ui-v2';
import {Aviso, SearchField, SegmentedField} from 'owncoding-ui';
import {listDateFull, listDateShort, dueTone} from '../list-format';
import {roleCan} from '../capabilities';
import {buildMoraBuckets, filterMoraClients, moraAgeKey, moraKpis, MORA_AGE_LABELS, type ClientPaymentStatus, type MoraFilter} from '../mora-data';
import type {User} from '../workspace-types';

// Cobranza y mora (dominio FIN): semáforo por antigüedad, DSO por moneda y lista
// de clientes con saldo. Los cálculos salen de app/mora-data.ts (una sola fuente);
// el shell solo pasa el estado que la sección usa.
type MoraSectionProps = {
  user: User | null;
  paymentStatuses: ClientPaymentStatus[];
  /** Estado de la carga de cobranza del shell: nunca se muestra un vacío falso. */
  moraState?: 'idle' | 'loading' | 'ready' | 'error';
  onRetry?: () => void;
  moraFilter: string;
  setMoraFilter: Dispatch<SetStateAction<string>>;
  moraSearch: string;
  setMoraSearch: Dispatch<SetStateAction<string>>;
  moraUpdated: Date | null;
  moraReportsError: boolean;
  moraDso: {currency: string; days: number}[] | null;
  /** Salida del vacío: navega a Finanzas y abre el alta de factura (ronda 14, #62). */
  onCreateInvoice?: () => void;
};

/** Plantilla única de la lista de cobranza (encabezado y filas la comparten). */
const MORA_TEMPLATE = 'grid-cols-[minmax(11rem,1.5fr)_minmax(9rem,1.1fr)_6.5rem_9rem_6rem_8.5rem]';
const MORA_COLUMNS: Column[] = [
  {key: 'client', label: 'Cliente'},
  {key: 'state', label: 'Estado'},
  {key: 'due', label: 'Vence'},
  {key: 'age', label: 'Antigüedad'},
  {key: 'invoices', label: 'Facturas'},
  {key: 'amount', label: 'Pendiente', align: 'end'},
];

const STATUS_TONE: Record<ClientPaymentStatus['payment_status'], ChipTone> = {up_to_date: 'ok', due_soon: 'warn', late: 'warn', severe: 'bad'};

function statusLabel(client: ClientPaymentStatus) {
  if (client.payment_status === 'up_to_date') return 'Sin mora';
  if (client.payment_status === 'due_soon') return `Vence ${listDateShort(client.next_due_on) || 'próximamente'}`;
  return `${client.days_overdue} días de mora`;
}

function ClientLine({client}: {client: ClientPaymentStatus}) {
  const ageKey = moraAgeKey(client.days_overdue);
  const due = client.next_due_on;
  return <ListRow template={MORA_TEMPLATE}>
    <div className="min-w-0">
      <strong className="block text-[13.5px] font-semibold leading-snug text-fore">{client.client_name}</strong>
      <small className="block text-[11px] text-mute">{client.currency || 'Sin moneda de cobro'}</small>
    </div>
    <div className="min-w-0"><StateChip tone={STATUS_TONE[client.payment_status]} title={statusLabel(client)}>{statusLabel(client)}</StateChip></div>
    <div className="min-w-0">
      {due ? <span className={`whitespace-nowrap tabular-nums ${dueTone(due) ? 'font-semibold text-warn' : 'text-fore'}`} title={listDateFull(due) || undefined}>{listDateShort(due)}</span> : <span className="text-[11px] text-mute">Sin fecha</span>}
    </div>
    <div className="min-w-0">
      {ageKey ? <StateChip tone={ageKey === 'critical' ? 'bad' : 'warn'} title={`${client.days_overdue} días de mora`}>{MORA_AGE_LABELS[ageKey]}</StateChip> : <span className="text-[11px] text-mute">Sin mora</span>}
    </div>
    <div className="min-w-0">
      {client.has_invoice
        ? <span className="whitespace-nowrap tabular-nums text-fore" title={`${client.invoice_count} factura${client.invoice_count === 1 ? '' : 's'}`}>{client.invoice_count}</span>
        : <span className="text-[11px] text-mute">Sin facturas</span>}
    </div>
    <div className="min-w-0 text-right">
      {client.currency && Number(client.outstanding_amount) > 0
        ? <MoneyText valor={client.outstanding_amount} currency={client.currency}/>
        : <span className="whitespace-nowrap text-[11px] text-mute">Sin saldo pendiente</span>}
    </div>
  </ListRow>;
}

export function MoraSection({user, paymentStatuses, moraState = 'ready', onRetry, moraFilter, setMoraFilter, moraSearch, setMoraSearch, moraUpdated, moraReportsError, moraDso, onCreateInvoice}: MoraSectionProps) {
  const kpis = moraKpis(paymentStatuses);
  const buckets = buildMoraBuckets(paymentStatuses);
  const visible = filterMoraClients(paymentStatuses, moraFilter as MoraFilter, moraSearch);
  const canSeeDso = roleCan(user?.role, 'reports.view');
  const updated = moraUpdated ? listDateFull(moraUpdated.toISOString()) : null;
  const loading = (moraState === 'loading' || moraState === 'idle') && !paymentStatuses.length;
  const failed = moraState === 'error';
  return <section className="grid gap-4" aria-label="Cobranza y mora">
    <PageHeader
      eyebrow="Finanzas"
      title="Estado de pagos"
      subtitle="Saldo pendiente por antigüedad y días en calle por moneda."
      actions={updated ? <span className="whitespace-nowrap text-xs tabular-nums text-mute" title={`Actualizado ${updated}`}>Actualizado {updated}</span> : undefined}
    />
    {/* La toolbar vive en su propia fila compacta (≥1280, #89): el header
        conserva el título completo y los filtros no lo recortan (#95). */}
    <FilterToolbar summary={`${visible.length} de ${paymentStatuses.length}`}>
      <SegmentedField className="[&>button]:min-h-11 md:[&>button]:min-h-8" ariaLabel="Filtrar estado de cobro" value={moraFilter} onChange={(value: string) => setMoraFilter(value)} options={[['', 'Todos'], ['up_to_date', 'Sin mora'], ['due_soon', 'Por vencer'], ['late', 'En mora'], ['severe', 'Mora grave'], ['no_invoice', 'Sin factura']]}/>
      <SearchField className="w-full sm:w-72 [&>input]:!pl-9 [&>input]:!pr-9 [&>button]:h-11 [&>button]:w-11 md:[&>button]:h-7 md:[&>button]:w-7" ariaLabel="Buscar cliente en cobranza" value={moraSearch} onChange={(event: ChangeEvent<HTMLInputElement>) => setMoraSearch(event.target.value)} placeholder="Buscar cliente…"/>
    </FilterToolbar>

    {loading ? <LoadingBlock label="Cargando cobranza…" lines={5}/>
    : failed && !paymentStatuses.length ? <ErrorBlock title="No se pudo cargar la cobranza" description="Reintentá para ver el saldo pendiente, la antigüedad de cada cliente y el DSO del mes." onRetry={onRetry}/>
    : <>
    {failed ? <Aviso tono="error" como="div">No se pudo actualizar la cobranza. Se muestra la última información recibida. {onRetry ? <button type="button" className="text-button" onClick={onRetry}>Reintentar</button> : null}</Aviso>
    : moraReportsError && canSeeDso ? <Aviso tono="warn" como="div">No se pudo calcular el DSO con el reporte del mes. {onRetry ? <button type="button" className="text-button" onClick={onRetry}>Reintentar</button> : null}</Aviso>
    : null}

    <KpiStrip>
      <Kpi label="Sin mora" valor={kpis.alDia} hint="Sin saldo vencido"/>
      <Kpi label="Por vencer" valor={kpis.porVencer} hint="Vencen en los próximos días"/>
      <Kpi label="En mora" valor={kpis.enMora} hint="Tarde o mora grave" destacado={kpis.enMora > 0}/>
      <Kpi
        label="DSO · días en calle"
        valor={!canSeeDso ? '—' : moraReportsError ? 'No se pudo calcular' : moraDso === null ? 'Calculando…' : moraDso.length ? <span className="flex flex-wrap items-baseline gap-2">{moraDso.map(row => <span key={row.currency} className="whitespace-nowrap tabular-nums">{row.currency} {row.days} días</span>)}</span> : 'Sin datos'}
        hint={!canSeeDso ? 'Requiere Informes (reports.view)' : moraReportsError ? 'No se pudo consultar el reporte del mes; usá Reintentar' : 'Saldo pendiente sobre lo facturado del mes, por moneda'}
      />
    </KpiStrip>

    {/* Antigüedad y «sin factura» como chips: la señal compacta que decide,
        con el conteo y el detalle completo en el tooltip (#101). */}
    <div className="flex flex-wrap items-center gap-2" aria-label="Antigüedad de la mora">
      <span className="text-[11px] font-medium uppercase tracking-wider text-mute">Antigüedad</span>
      {buckets.map(bucket => <StateChip
        key={bucket.key}
        tone={bucket.clients ? (bucket.key === 'critical' ? 'bad' : 'warn') : 'mute'}
        title={`${bucket.clients} cliente${bucket.clients === 1 ? '' : 's'} con saldo vencido${bucket.amounts.length ? '' : ' (sin saldos)'}`}
      >{MORA_AGE_LABELS[bucket.key]} · {bucket.amounts.length ? bucket.amounts.map(item => <MoneyText key={item.currency} valor={item.amount} currency={item.currency}/>) : '—'}</StateChip>)}
      <StateChip tone={kpis.sinFactura ? 'warn' : 'mute'} title="Clientes sin facturas registradas">{kpis.sinFactura} sin factura</StateChip>
    </div>

    {visible.length
      ? <ListGrid label="Cobranza por cliente" template={MORA_TEMPLATE} columns={MORA_COLUMNS} minWidthClass="min-w-[58rem]">
        {visible.map(client => <ClientLine key={`${client.client_id}-${client.currency || 'none'}`} client={client}/>)}
      </ListGrid>
      : <EmptyBlock title={paymentStatuses.length ? 'No hay clientes en esta categoría.' : 'Sin registros de cobranza todavía.'} description={paymentStatuses.length ? 'Probá con otro estado o limpiá la búsqueda.' : 'Emití la primera factura para seguir el saldo y la antigüedad de cada cliente.'} action={paymentStatuses.length ? <button className="secondary" onClick={() => { setMoraFilter(''); setMoraSearch(''); }}>Limpiar filtros</button> : onCreateInvoice ? <button className="primary" onClick={() => onCreateInvoice()}><Plus size={16} aria-hidden="true"/>Registrar primera factura</button> : undefined}/>}
    </>}
  </section>;
}

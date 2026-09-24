"use client";
import type {Dispatch, SetStateAction} from 'react';
import {EmptyBlock, FilterToolbar, Kpi, KpiStrip, ListGrid, ListRow, MoneyText, PageHeader, StateChip, type ChipTone, type Column} from '../ui-v2';
import {SegmentedField} from 'owncoding-ui';
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
  moraFilter: string;
  setMoraFilter: Dispatch<SetStateAction<string>>;
  moraSearch: string;
  setMoraSearch: Dispatch<SetStateAction<string>>;
  moraUpdated: Date | null;
  moraReportsError: boolean;
  moraDso: {currency: string; days: number}[] | null;
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
  if (client.payment_status === 'up_to_date') return 'Al día';
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

export function MoraSection({user, paymentStatuses, moraFilter, setMoraFilter, moraSearch, setMoraSearch, moraUpdated, moraReportsError, moraDso}: MoraSectionProps) {
  const kpis = moraKpis(paymentStatuses);
  const buckets = buildMoraBuckets(paymentStatuses);
  const visible = filterMoraClients(paymentStatuses, moraFilter as MoraFilter, moraSearch);
  const canSeeDso = roleCan(user?.role, 'reports.view');
  const updated = moraUpdated ? listDateFull(moraUpdated.toISOString()) : null;
  return <section className="grid gap-4" aria-label="Cobranza y mora">
    <PageHeader
      eyebrow="Finanzas"
      title="Estado de pagos"
      subtitle="Saldo pendiente por antigüedad y días en calle por moneda."
      actions={updated ? <span className="whitespace-nowrap text-xs tabular-nums text-mute">Actualizado {updated}</span> : undefined}
    />

    <KpiStrip>
      <Kpi label="Al día" valor={kpis.alDia} hint="Sin saldo vencido"/>
      <Kpi label="Por vencer" valor={kpis.porVencer} hint="Vencen en los próximos días"/>
      <Kpi label="En mora" valor={kpis.enMora} hint="Tarde o mora grave" destacado={kpis.enMora > 0}/>
      <Kpi label="Sin factura" valor={kpis.sinFactura} hint="Sin facturas registradas"/>
    </KpiStrip>

    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {buckets.map(bucket => <Kpi
        key={bucket.key}
        label={bucket.label}
        destacado={bucket.key === 'critical' && bucket.clients > 0}
        valor={bucket.amounts.length ? <span className="flex flex-wrap items-baseline gap-2">{bucket.amounts.map(item => <MoneyText key={item.currency} valor={item.amount} currency={item.currency}/>)}</span> : null}
        hint={bucket.clients ? `${bucket.clients} cliente${bucket.clients === 1 ? '' : 's'} con saldo vencido` : 'Sin saldos vencidos'}
      />)}
      <Kpi
        label="DSO · días en calle"
        valor={!canSeeDso ? '—' : moraReportsError ? 'Sin datos' : moraDso === null ? 'Calculando…' : moraDso.length ? <span className="flex flex-wrap items-baseline gap-2">{moraDso.map(row => <span key={row.currency} className="whitespace-nowrap tabular-nums">{row.currency} {row.days} días</span>)}</span> : 'Sin datos'}
        hint={canSeeDso ? 'Saldo pendiente sobre lo facturado del mes, por moneda' : 'Requiere Informes (reports.view)'}
      />
    </div>

    <FilterToolbar summary={`${visible.length} de ${paymentStatuses.length}`}>
      <SegmentedField ariaLabel="Filtrar estado de cobro" value={moraFilter} onChange={(value: string) => setMoraFilter(value)} options={[['', 'Todos'], ['up_to_date', 'Al día'], ['due_soon', 'Por vencer'], ['late', 'En mora'], ['severe', 'Mora grave'], ['no_invoice', 'Sin factura']]}/>
      <label className="grid w-full gap-1.5 sm:w-72">
        <span className="sr-only">Buscar cliente en cobranza</span>
        <input type="search" value={moraSearch} onChange={event => setMoraSearch(event.target.value)} placeholder="Buscar cliente…" autoComplete="off" className="w-full"/>
      </label>
    </FilterToolbar>

    {visible.length
      ? <ListGrid label="Cobranza por cliente" template={MORA_TEMPLATE} columns={MORA_COLUMNS} minWidthClass="min-w-[58rem]">
        {visible.map(client => <ClientLine key={`${client.client_id}-${client.currency || 'none'}`} client={client}/>)}
      </ListGrid>
      : <EmptyBlock title={paymentStatuses.length ? 'No hay clientes en esta categoría.' : 'Sin registros de cobranza todavía.'} description={paymentStatuses.length ? 'Probá con otro estado o limpiá la búsqueda.' : 'Cuando existan facturas con saldo, aparecen acá.'}/>}
  </section>;
}

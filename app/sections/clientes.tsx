"use client";
import type {Dispatch, SetStateAction} from 'react';
import {CircleDollarSign, Eye, X} from 'lucide-react';
import {IconAction} from 'owncoding-ui';
import {BATCH_LIMITS, roleCan} from '../capabilities';
import {clientState} from '../client-status';
import {clientWhatsappUrl} from '../client-links';
import {clientSince, moneyKpi} from '../client-format';
import {listDateShort} from '../list-format';
import {ClientIdentity} from '../client-identity';
import {WhatsAppButton} from '../whatsapp-button';
import {RecordEditor} from '../suite';
import {EmptyBlock, Kpi, KpiStrip, ListGrid, ListRow, MoneyText, StateChip, type ChipTone, type Column} from '../ui-v2';
import type {CommercialDashboard} from '../control-center-data';
import type {Client, ClientPaymentStatus, User} from '../workspace-types';

// Directorio de clientes (referencia #42, arquetipo lista + detalle).
// Datos reales del inventario: agency_clients + client_payment_status + cartera
// de projects/work-orders. Lista finita con encabezado y plantilla compartida;
// el detalle completo sigue en la ficha lateral (ClientDetail, montada en el shell).
const CLIENT_COLUMNS: Column[] = [
  {key: 'client', label: 'Cliente'},
  {key: 'facts', label: 'Datos'},
  {key: 'status', label: 'Estado'},
  {key: 'billing', label: 'Cobros'},
  {key: 'activity', label: 'Actividad'},
  {key: 'actions', label: 'Acciones'},
];
const CLIENT_TEMPLATE = 'grid-cols-[minmax(13rem,1.6fr)_minmax(11rem,1.15fr)_7rem_15rem_9rem_16rem]';

const STATE_TONE: Record<string, ChipTone> = {active: 'ok', paused: 'warn', cancelled: 'bad', expired: 'warn', inactive: 'mute'};
const moraTone = (pay: ClientPaymentStatus): ChipTone => pay.payment_status === 'up_to_date' ? 'ok' : pay.payment_status === 'due_soon' ? 'warn' : pay.days_overdue > 30 ? 'bad' : 'warn';
const moraLabel = (pay: ClientPaymentStatus) => pay.payment_status === 'up_to_date'
  ? 'Al día'
  : pay.payment_status === 'due_soon'
    ? `Vence ${listDateShort(pay.next_due_on) || 'próximamente'}`
    : `${pay.days_overdue} días de mora`;

type ClientStat = {projects: number; pieces: number; nextDue: string | null};
type ClientRowProps = {
  client: Client;
  pay: ClientPaymentStatus | undefined;
  stat: ClientStat | undefined;
  canSeeBilling: boolean;
  canManage: boolean;
  canManageTerms: boolean;
  archiveBusy: boolean;
  onOpen: () => void;
  onToggleArchive: () => void;
  refresh: () => Promise<void>;
  role: string;
  selectable: boolean;
  selected: boolean;
  onSelect: () => void;
};

function ClientLine({client, pay, stat, canSeeBilling, canManage, canManageTerms, archiveBusy, onOpen, onToggleArchive, refresh, role, selectable, selected, onSelect}: ClientRowProps) {
  const state = clientState(client);
  const since = clientSince(client.created_at);
  const tel = clientWhatsappUrl(client.phone || undefined);
  return <ListRow template={CLIENT_TEMPLATE} className="client-hub-row" data-archived={client.active===false||undefined}>
    <div className="flex min-w-0 items-center gap-2">
      {selectable ? <label className="select-check" title="Seleccionar cliente"><input type="checkbox" aria-label={`Seleccionar ${client.name}`} checked={selected} onChange={() => onSelect()}/></label> : null}
      <button type="button" className="min-w-0 text-left" onClick={onOpen} aria-label={`Abrir ficha de ${client.name}`}>
        <ClientIdentity name={client.name} logo={client.logo_url} color={client.color_key}/>
      </button>
    </div>
    <div className="min-w-0 text-[11.5px] text-mute">
      <span className="block truncate" title={client.email || 'Sin email registrado'}>{client.email || 'Sin email registrado'}</span>
      <span className="block truncate" title={`${client.phone || 'Sin teléfono'} · RUC ${client.tax_id || 'sin registrar'} · Cliente desde ${since || 'sin fecha de alta'}`}>{client.phone || 'Sin teléfono'} · RUC {client.tax_id || 'sin registrar'} · desde {since || 'sin fecha'}</span>
    </div>
    <div className="min-w-0"><StateChip tone={STATE_TONE[state.value] ?? 'mute'} title={state.label}>{state.label}</StateChip></div>
    <div className="flex min-w-0 items-center justify-between gap-2">
      {canSeeBilling ? <>
        {pay ? <StateChip tone={moraTone(pay)} title={moraLabel(pay)}>{moraLabel(pay)}</StateChip> : <span className="text-[11px] text-mute">Sin datos de cobro</span>}
        {pay && pay.currency && Number(pay.outstanding_amount) > 0
          ? <MoneyText valor={Number(pay.outstanding_amount)} currency={pay.currency} tono={pay.days_overdue > 15 ? 'bad' : pay.days_overdue > 0 ? 'warn' : ''}/>
          : <span className="whitespace-nowrap text-[11px] text-mute">Sin saldo</span>}
      </> : <span className="text-[11px] text-mute">Sin acceso a cobros</span>}
    </div>
    <div className="min-w-0 text-[11.5px] text-mute">
      <span className="block truncate" title={stat ? `${stat.projects} proyectos activos · ${stat.pieces} piezas en curso` : 'Sin proyectos activos'}>
        {stat && (stat.projects || stat.pieces) ? <><b className="tabular-nums text-fore">{stat.projects}</b> proyectos · <b className="tabular-nums text-fore">{stat.pieces}</b> piezas</> : 'Sin proyectos activos'}
      </span>
      {stat?.nextDue ? <span className="block whitespace-nowrap">Próxima entrega <b className="tabular-nums text-fore">{listDateShort(stat.nextDue)}</b></span> : null}
    </div>
    <div className="silent-scroll flex min-w-0 items-center gap-1 overflow-x-auto [justify-content:safe_flex-end]">
      <IconAction icon="eye" tone="fono" label={`Abrir ficha: ${client.name}`} onClick={onOpen}/>
      <WhatsAppButton href={tel}/>
      {client.has_recurring_price !== true ? <span className="client-price-missing" title="Sin precio definido: editá el cliente y completá Plan y pago."><CircleDollarSign size={14} aria-label="Sin precio definido"/></span> : null}
      {canManage ? <button type="button" className="text-button" disabled={archiveBusy} onClick={onToggleArchive}>{client.active===false?'Reactivar':'Archivar'}</button> : null}
      <span className="client-record-actions"><RecordEditor kind="clients" recordId={client.id} name={client.name} role={role} canManageTerms={canManageTerms} refresh={refresh}/></span>
    </div>
  </ListRow>;
}

function ClientTile({client, pay, stat, canSeeBilling, canManage, canManageTerms, archiveBusy, onOpen, onToggleArchive, refresh, role, selectable, selected, onSelect}: ClientRowProps) {
  const state = clientState(client);
  const since = clientSince(client.created_at);
  const tel = clientWhatsappUrl(client.phone || undefined);
  return <article className="client-hub-card flex min-h-[200px] min-w-0 flex-col gap-3 rounded-xl border border-ink-600 bg-ink-800 p-4" data-archived={client.active===false||undefined}>
    <header className="flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-2">
        {selectable ? <label className="select-check" title="Seleccionar cliente"><input type="checkbox" aria-label={`Seleccionar ${client.name}`} checked={selected} onChange={() => onSelect()}/></label> : null}
        <button type="button" className="min-w-0 text-left" onClick={onOpen} aria-label={`Abrir ficha de ${client.name}`}>
          <ClientIdentity name={client.name} logo={client.logo_url} color={client.color_key}/>
        </button>
      </div>
      <StateChip tone={STATE_TONE[state.value] ?? 'mute'} title={state.label}>{state.label}</StateChip>
    </header>
    <dl className="grid grid-cols-2 gap-2 text-[11.5px]">
      <div><dt className="text-[9.5px] font-bold uppercase tracking-[.06em] text-mute">Correo</dt><dd className="mt-0.5 truncate text-fore" title={client.email || 'Sin email registrado'}>{client.email || 'Sin email registrado'}</dd></div>
      <div><dt className="text-[9.5px] font-bold uppercase tracking-[.06em] text-mute">Teléfono</dt><dd className="mt-0.5 text-fore">{client.phone || 'Sin teléfono'}</dd></div>
      <div><dt className="text-[9.5px] font-bold uppercase tracking-[.06em] text-mute">RUC</dt><dd className="mt-0.5 text-fore">{client.tax_id || 'Sin RUC registrado'}</dd></div>
      <div><dt className="text-[9.5px] font-bold uppercase tracking-[.06em] text-mute">Cliente desde</dt><dd className="mt-0.5 text-fore">{since || 'Sin fecha de alta'}</dd></div>
      <div className="col-span-2"><dt className="text-[9.5px] font-bold uppercase tracking-[.06em] text-mute">Cartera</dt><dd className="mt-0.5 text-fore">{stat && (stat.projects || stat.pieces) ? `${stat.projects} proyectos · ${stat.pieces} piezas${stat.nextDue ? ` · próxima entrega ${listDateShort(stat.nextDue)}` : ''}` : 'Sin proyectos activos'}</dd></div>
    </dl>
    {canSeeBilling ? <div className="flex flex-wrap items-center gap-2">
      {pay ? <StateChip tone={moraTone(pay)} title={moraLabel(pay)}>{moraLabel(pay)}</StateChip> : null}
      {pay && pay.currency && Number(pay.outstanding_amount) > 0
        ? <MoneyText valor={Number(pay.outstanding_amount)} currency={pay.currency} tono={pay.days_overdue > 15 ? 'bad' : pay.days_overdue > 0 ? 'warn' : ''}/>
        : <span className="text-[11px] text-mute">Sin saldo pendiente</span>}
      {client.has_recurring_price !== true ? <span className="client-price-missing" title="Sin precio definido: editá el cliente y completá Plan y pago."><CircleDollarSign size={14} aria-label="Sin precio definido"/></span> : null}
    </div> : null}
    <footer className="silent-scroll mt-auto flex items-center gap-1 overflow-x-auto border-t border-ink-600 pt-3 [justify-content:safe_flex-end]">
      <IconAction icon="eye" tone="fono" label={`Abrir ficha: ${client.name}`} onClick={onOpen}/>
      <WhatsAppButton href={tel}/>
      {canManage ? <button type="button" className="text-button" disabled={archiveBusy} onClick={onToggleArchive}>{client.active===false?'Reactivar':'Archivar'}</button> : null}
      <span className="client-record-actions"><RecordEditor kind="clients" recordId={client.id} name={client.name} role={role} canManageTerms={canManageTerms} refresh={refresh}/></span>
    </footer>
  </article>;
}

type ClientesSectionProps = {
  user: User | null;
  clientView: string;
  clientStatusFilter: string;
  setClientStatusFilter: Dispatch<SetStateAction<string>>;
  clientSearch: string;
  setClientSearch: Dispatch<SetStateAction<string>>;
  archiveBusy: string;
  bulkBusy: boolean;
  selectedClients: string[];
  setSelectedClients: Dispatch<SetStateAction<string[]>>;
  canSeeBilling: boolean;
  canManageClients: boolean;
  clients: Client[];
  displayedClients: Client[];
  liveClients: Client[];
  archivedClients: Client[];
  paymentStatuses: ClientPaymentStatus[];
  clientHubStats: Map<string, ClientStat>;
  commercialSummary: CommercialDashboard | null;
  commercialState: 'idle' | 'loading' | 'ready' | 'error';
  directoryKpis: {active: number; paused: number; activeProjects: number; deliveries: number};
  cobrosKpis: {alDia: number; porVencer: number; enMora: number; sinFactura: number};
  load: () => Promise<void>;
  setClientArchive: (id: string, archived: boolean) => Promise<void>;
  toggleClientSelected: (id: string) => void;
  selectVisibleClients: () => void;
  batchClients: (archived: boolean) => Promise<void>;
  setDetail: Dispatch<SetStateAction<{kind: 'client' | 'order'; id: string; anchor?: string; edit?: boolean} | null>>;
};

export function ClientesSection({user, clientView, clientStatusFilter, setClientStatusFilter, clientSearch, setClientSearch, archiveBusy, bulkBusy, selectedClients, setSelectedClients, canSeeBilling, canManageClients, clients, displayedClients, liveClients, archivedClients, paymentStatuses, clientHubStats, commercialSummary, commercialState, directoryKpis, cobrosKpis, load, setClientArchive, toggleClientSelected, selectVisibleClients, batchClients, setDetail}: ClientesSectionProps) {
  const canManageTerms = roleCan(user?.role, 'commercial-terms.manage');
  const billingRole = ['owner', 'admin', 'finance'].includes(user?.role || '');
  const renderClients = (list: Client[], asTile: boolean) => list.map(client => {
    const props: ClientRowProps = {
      client,
      pay: paymentStatuses.find(ps => String(ps.client_id) === String(client.id)),
      stat: clientHubStats.get(String(client.id)),
      canSeeBilling,
      canManage: canManageClients,
      canManageTerms,
      archiveBusy: archiveBusy === `client:${client.id}`,
      onOpen: () => setDetail({kind: 'client', id: client.id}),
      onToggleArchive: () => void setClientArchive(client.id, client.active === false),
      refresh: load,
      role: user?.role || 'viewer',
      selectable: canManageClients,
      selected: selectedClients.includes(String(client.id)),
      onSelect: () => toggleClientSelected(String(client.id)),
    };
    return asTile ? <ClientTile key={client.id} {...props}/> : <ClientLine key={client.id} {...props}/>;
  });

  return <section className="directory grid gap-4" aria-label="Directorio de clientes">
    <KpiStrip>
      <Kpi label="Clientes activos" valor={directoryKpis.active} hint="Con servicio en curso" destacado/>
      <Kpi label="Cobros al día" valor={cobrosKpis.alDia} hint={`${cobrosKpis.enMora} en mora · ${cobrosKpis.porVencer} por vencer · ${cobrosKpis.sinFactura} sin factura`}/>
      <Kpi
        label="Facturación contratada"
        valor={billingRole
          ? commercialState === 'error'
            ? <span role="alert" className="text-bad">No se pudo cargar</span>
            : commercialSummary === null
              ? <span role="status" className="text-mute">Calculando…</span>
              : commercialSummary.expectedMonthlyBilling === undefined
                ? 'No disponible'
                : commercialSummary.expectedMonthlyBilling.length
                  ? <span className="flex flex-wrap items-baseline gap-2">{commercialSummary.expectedMonthlyBilling.map(item => <span key={item.currency}>{moneyKpi(Number(item.total), item.currency)} / mes</span>)}</span>
                  : 'Sin contratos activos'
          : '—'}
        hint="Expectativa comercial vigente por moneda"
      />
      <Kpi label="Entregas esta semana" valor={directoryKpis.deliveries} hint="Piezas con vencimiento en 7 días"/>
    </KpiStrip>

    {canManageClients && liveClients.length ? <div className="bulk-bar" role="status" aria-live="polite">
      <span className="bulk-count">{selectedClients.length ? <><b>{selectedClients.length}</b> de {BATCH_LIMITS.clients} seleccionado{selectedClients.length === 1 ? '' : 's'}</> : <span className="bulk-hint">Seleccioná varios para operar en lote · máximo {BATCH_LIMITS.clients}</span>}</span>
      <div className="inline-actions bulk-actions">
        <button type="button" className="text-button min-h-11 md:min-h-8" onClick={selectVisibleClients}>Seleccionar visibles</button>
        {selectedClients.length ? <>
          <button type="button" className="secondary min-h-11 md:min-h-10" disabled={bulkBusy} onClick={() => void batchClients(true)}>Archivar</button>
          <button type="button" className="secondary min-h-11 md:min-h-10" disabled={bulkBusy} onClick={() => void batchClients(false)}>Reactivar</button>
          <button type="button" className="text-button min-h-11 md:min-h-8" onClick={() => setSelectedClients([])}>Limpiar</button>
        </> : null}
      </div>
    </div> : null}

    {clientView === 'grid'
      ? <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{renderClients(liveClients, true)}</div>
      : <ListGrid label="Clientes" template={CLIENT_TEMPLATE} columns={CLIENT_COLUMNS} minWidthClass="min-w-[71rem]">{renderClients(liveClients, false)}</ListGrid>}

    {!liveClients.length && archivedClients.length && clientStatusFilter !== 'inactive' ? <p className="text-[13px] text-mute" role="status">Los clientes que coinciden con los filtros están archivados. Abrí «Archivados» para verlos.</p> : null}

    {!displayedClients.length ? (
      clients.length===0 ? (
        <EmptyBlock title="Todavía no hay clientes. Creá el primero para empezar." description="Cargá la ficha con RUC o de forma manual; después podés sumar proyectos y piezas."/>
      ) : (
        <EmptyBlock title={clientSearch.trim() ? 'No hay clientes que coincidan con tu búsqueda y filtros.' : 'No hay clientes con este estado.'} description="Probá con otro término o restablecé los filtros." action={<button className="text-button min-h-11 md:min-h-8" type="button" onClick={() => {setClientSearch(''); setClientStatusFilter('');}}><X size={14}/>Limpiar filtros</button>}/>
      )
    ) : null}

    {archivedClients.length ? (
      <details className="archived-capsule" open={clientStatusFilter==='inactive'}>
        <summary>Archivados ({archivedClients.length})</summary>
        {clientView === 'grid'
          ? <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{renderClients(archivedClients, true)}</div>
          : <ListGrid label="Clientes archivados" template={CLIENT_TEMPLATE} columns={CLIENT_COLUMNS} minWidthClass="min-w-[71rem]">{renderClients(archivedClients, false)}</ListGrid>}
      </details>
    ) : null}
  </section>;
}

"use client";
import {useEffect, useState, type Dispatch, type ReactNode, type SetStateAction} from 'react';
import {CircleDollarSign, Eye, Plus, X} from 'lucide-react';
import {Aviso, IconAction, fechaListaCorta} from 'owncoding-ui';
import {BATCH_LIMITS, roleCan, canSeeClientContact} from '../capabilities';
import {PiiTexto, maskEmail} from '../list-format';
import {clientState} from '../client-status';
import {clientWhatsappUrl} from '../client-links';
import {clientSince, moneyKpi} from '../client-format';
import {ClientIdentity} from '../client-identity';
import {Dialog} from '../dialog';
import {notify} from '../feedback';
import {LIST_WINDOW,windowSlice} from '../list-window';
import {WhatsAppButton} from '../whatsapp-button';
import {RecordEditor} from '../suite';
import {CLIENT_TABLE_MIN_WIDTH} from '../client-directory-data';
import {EmptyBlock, EmptyCta, ErrorBlock, Kpi, KpiStrip, KpiStripSkeleton, ListActions, ListGrid, ListRow, LoadingBlock, MoneyText, StateChip, useDenseTableFit, type ChipTone, type Column} from '../ui-v2';
import {billingExpectationState,type CommercialDashboard} from '../control-center-data';
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
// Plantilla única de la lista densa de clientes (#77): las pistas se ajustaron
// para que la tabla entre ya en 1440 (antes quedaba en tarjetas y la vista lista
// se veía como cuadrícula) y la columna de acciones fija use iconos compactos.
const CLIENT_TEMPLATE = 'grid-cols-[minmax(11rem,1.35fr)_minmax(9.5rem,1.15fr)_6rem_minmax(15rem,1.15fr)_minmax(9rem,.95fr)_14rem]';

const STATE_TONE: Record<string, ChipTone> = {active: 'ok', paused: 'warn', cancelled: 'bad', expired: 'warn', inactive: 'mute'};
const moraTone = (pay: ClientPaymentStatus): ChipTone => pay.payment_status === 'up_to_date' ? 'ok' : pay.payment_status === 'due_soon' ? 'warn' : pay.days_overdue > 30 ? 'bad' : 'warn';
const moraLabel = (pay: ClientPaymentStatus) => pay.payment_status === 'up_to_date'
  ? 'Al día'
  : pay.payment_status === 'due_soon'
    ? `Vence ${fechaListaCorta(pay.next_due_on,'próximamente')}`
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
  // Minimización por rol (Ley 7593/2025, Refs #113): sin permiso de contacto
  // el correo, el teléfono y el RUC se muestran parciales y el valor completo
  // no viaja al DOM; el API de #112 revalida el mismo criterio.
  const canSeeContact = canSeeClientContact(role);
  const tel = canSeeContact ? clientWhatsappUrl(client.phone || undefined) : '';
  return <ListRow template={CLIENT_TEMPLATE} className="client-hub-row" data-archived={client.active===false||undefined}>
    <div role="cell" className="flex min-w-0 items-center gap-2">
      {selectable ? <label className="select-check" title="Seleccionar cliente"><input type="checkbox" aria-label={`Seleccionar ${client.name}`} checked={selected} onChange={() => onSelect()}/></label> : null}
      <button type="button" className="min-h-11 min-w-0 text-left md:min-h-0" onClick={onOpen} aria-label={`Abrir ficha de ${client.name}`}>
        <ClientIdentity name={client.name} logo={client.logo_url} color={client.color_key}/>
      </button>
    </div>
    <div role="cell" className="min-w-0 text-[11px] leading-tight text-mute">
      {client.contact_restricted ? <>
        <span className="block truncate" title="El contacto y los datos fiscales están reservados para los roles que gestionan clientes.">Contacto reservado</span>
        <span className="block truncate" title={`Cliente desde ${since || 'sin fecha de alta'}`}>Datos fiscales reservados · desde {since || 'sin fecha'}</span>
      </> : <>
        <span className="block truncate"><PiiTexto kind="email" value={client.email} masked={!canSeeContact} fallback="Sin correo registrado"/></span>
        <span className="block truncate" title={canSeeContact?`${client.phone || 'Sin teléfono'} · RUC ${client.tax_id || 'sin registrar'} · Cliente desde ${since || 'sin fecha de alta'}`:`Contacto protegido para tu rol · Cliente desde ${since || 'sin fecha de alta'}`}><PiiTexto kind="telefono" value={client.phone} masked={!canSeeContact} fallback="Sin teléfono"/> · RUC <PiiTexto kind="documento" value={client.tax_id} masked={!canSeeContact} fallback="sin registrar"/> · desde {since || 'sin fecha'}</span>
      </>}
    </div>
    <div role="cell" className="min-w-0"><StateChip tone={STATE_TONE[state.value] ?? 'mute'} title={state.label}>{state.label}</StateChip></div>
    <div role="cell" className="flex min-w-0 flex-wrap items-center justify-between gap-2">
      {canSeeBilling ? <>
        {pay ? <StateChip tone={moraTone(pay)} title={moraLabel(pay)}>{moraLabel(pay)}</StateChip> : <span className="text-[11px] text-mute">Sin datos de cobro</span>}
        {pay && pay.currency && Number(pay.outstanding_amount) > 0
          ? <MoneyText className="ml-auto" valor={Number(pay.outstanding_amount)} currency={pay.currency} tono={pay.days_overdue > 15 ? 'bad' : pay.days_overdue > 0 ? 'warn' : ''}/>
          : <span className="whitespace-nowrap text-[11px] text-mute">Sin saldo</span>}
      </> : <span className="text-[11px] text-mute">Sin acceso a cobros</span>}
    </div>
    <div role="cell" className="min-w-0 text-[11px] leading-tight text-mute">
      <span className="block truncate" title={stat ? `${stat.projects} proyectos activos · ${stat.pieces} piezas en curso` : 'Sin proyectos activos'}>
        {stat && (stat.projects || stat.pieces) ? <><b className="tabular-nums text-fore">{stat.projects}</b> proyectos · <b className="tabular-nums text-fore">{stat.pieces}</b> piezas</> : 'Sin proyectos activos'}
      </span>
      {stat?.nextDue ? <span className="block whitespace-nowrap">Próxima entrega <b className="tabular-nums text-fore">{fechaListaCorta(stat.nextDue)}</b></span> : null}
    </div>
    <ListActions className="client-row-actions silent-scroll">
      <IconAction icon="eye" tone="fono" label={`Abrir ficha: ${client.name}`} onClick={onOpen}/>
      <WhatsAppButton compact href={tel} label={`WhatsApp: ${client.name}`}/>
      {client.has_recurring_price !== true && !canManageTerms ? <span className="client-price-missing" title="Sin precio definido: editá el cliente y completá Plan y pago."><CircleDollarSign size={14} aria-label="Sin precio definido"/></span> : null}
      <span className="client-record-actions"><RecordEditor kind="clients" recordId={client.id} name={client.name} role={role} canManageTerms={canManageTerms} planCta={client.has_recurring_price !== true ? 'icon' : undefined} refresh={refresh} menu extraMenuItems={canManage?[{id:'archive',label:client.active===false?'Reactivar':'Archivar',icono:'archive',disabled:archiveBusy,onClick:onToggleArchive}]:[]}/></span>
    </ListActions>
  </ListRow>;
}

function ClientTile({client, pay, stat, canSeeBilling, canManage, canManageTerms, archiveBusy, onOpen, onToggleArchive, refresh, role, selectable, selected, onSelect}: ClientRowProps) {
  const state = clientState(client);
  const since = clientSince(client.created_at);
  const canSeeContact = canSeeClientContact(role);
  const tel = canSeeContact ? clientWhatsappUrl(client.phone || undefined) : '';
  return <article className="client-hub-card flex min-h-[200px] min-w-0 flex-col gap-3 rounded-xl border border-ink-600 bg-ink-800 p-5 max-md:p-4" data-archived={client.active===false||undefined}>
    <header className="flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-2">
        {selectable ? <label className="select-check" title="Seleccionar cliente"><input type="checkbox" aria-label={`Seleccionar ${client.name}`} checked={selected} onChange={() => onSelect()}/></label> : null}
        <button type="button" className="min-h-11 min-w-0 text-left md:min-h-0" onClick={onOpen} aria-label={`Abrir ficha de ${client.name}`}>
          <ClientIdentity name={client.name} logo={client.logo_url} color={client.color_key}/>
        </button>
      </div>
      <StateChip tone={STATE_TONE[state.value] ?? 'mute'} title={state.label}>{state.label}</StateChip>
    </header>
    <dl className="grid grid-cols-2 gap-2 text-[11.5px]">
      {client.contact_restricted ? <div className="col-span-2"><dt className="text-[9.5px] font-bold uppercase tracking-[.06em] text-mute">Contacto y datos fiscales</dt><dd className="mt-0.5 text-mute" title="Reservados para los roles que gestionan clientes (Ley 7593/2025).">Reservados para los roles que gestionan clientes</dd></div> : <>
      <div><dt className="text-[9.5px] font-bold uppercase tracking-[.06em] text-mute">Correo</dt><dd className="mt-0.5 truncate text-fore"><PiiTexto kind="email" value={client.email} masked={!canSeeContact} fallback="Sin correo registrado"/></dd></div>
      <div><dt className="text-[9.5px] font-bold uppercase tracking-[.06em] text-mute">Teléfono</dt><dd className="mt-0.5 text-fore"><PiiTexto kind="telefono" value={client.phone} masked={!canSeeContact} fallback="Sin teléfono"/></dd></div>
      <div><dt className="text-[9.5px] font-bold uppercase tracking-[.06em] text-mute">RUC</dt><dd className="mt-0.5 text-fore"><PiiTexto kind="documento" value={client.tax_id} masked={!canSeeContact} fallback="Sin RUC registrado"/></dd></div>
      </>}
      <div><dt className="text-[9.5px] font-bold uppercase tracking-[.06em] text-mute">Cliente desde</dt><dd className="mt-0.5 text-fore">{since || 'Sin fecha de alta'}</dd></div>
      <div className="col-span-2"><dt className="text-[9.5px] font-bold uppercase tracking-[.06em] text-mute">Cartera</dt><dd className="mt-0.5 text-fore">{stat && (stat.projects || stat.pieces) ? `${stat.projects} proyectos · ${stat.pieces} piezas${stat.nextDue ? ` · próxima entrega ${fechaListaCorta(stat.nextDue)}` : ''}` : 'Sin proyectos activos'}</dd></div>
    </dl>
    {canSeeBilling ? <div className="flex flex-wrap items-center gap-2">
      {pay ? <StateChip tone={moraTone(pay)} title={moraLabel(pay)}>{moraLabel(pay)}</StateChip> : null}
      {pay && pay.currency && Number(pay.outstanding_amount) > 0
        ? <MoneyText valor={Number(pay.outstanding_amount)} currency={pay.currency} tono={pay.days_overdue > 15 ? 'bad' : pay.days_overdue > 0 ? 'warn' : ''}/>
        : <span className="text-[11px] text-mute">Sin saldo pendiente</span>}
      {client.has_recurring_price !== true && !canManageTerms ? <span className="client-price-missing" title="Sin precio definido: editá el cliente y completá Plan y pago."><CircleDollarSign size={14} aria-label="Sin precio definido"/></span> : null}
    </div> : null}
    <footer className="client-card-actions silent-scroll mt-auto flex items-center gap-1 overflow-x-auto border-t border-ink-600 pt-3 [justify-content:safe_flex-end]">
      <IconAction icon="eye" tone="fono" label={`Abrir ficha: ${client.name}`} onClick={onOpen}/>
      <WhatsAppButton href={tel}/>
      <span className="client-record-actions"><RecordEditor kind="clients" recordId={client.id} name={client.name} role={role} canManageTerms={canManageTerms} planCta={client.has_recurring_price !== true ? 'text' : undefined} refresh={refresh} menu extraMenuItems={canManage?[{id:'archive',label:client.active===false?'Reactivar':'Archivar',icono:'archive',disabled:archiveBusy,onClick:onToggleArchive}]:[]}/></span>
    </footer>
  </article>;
}

type ClientesSectionProps = {
  dataState?: 'loading' | 'ready' | 'error';
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
  onCreate?: () => void;
};

export function ClientesSection({dataState = 'ready', user, clientView, clientStatusFilter, setClientStatusFilter, clientSearch, setClientSearch, archiveBusy, bulkBusy, selectedClients, setSelectedClients, canSeeBilling, canManageClients, clients, displayedClients, liveClients, archivedClients, paymentStatuses, clientHubStats, commercialSummary, commercialState, directoryKpis, cobrosKpis, load, setClientArchive, toggleClientSelected, selectVisibleClients, batchClients, setDetail, onCreate}: ClientesSectionProps) {
  const canManageTerms = roleCan(user?.role, 'commercial-terms.manage');
  const billingRole = ['owner', 'admin', 'finance'].includes(user?.role || '');
  // Archivar clientes es destructivo (oculta también sus proyectos y órdenes):
  // pasa por confirmación explícita y el error queda inline en el diálogo.
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [bulkError, setBulkError] = useState('');
  async function runBatch(archived: boolean) {
    setBulkError('');
    try {
      await batchClients(archived);
      if (archived) setConfirmArchive(false);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'No se pudo actualizar el lote de clientes. Reintentá.';
      // Archivar: el error queda inline en el diálogo. Reactivar: aviso directo.
      if (archived) setBulkError(message);
      else notify({tone: 'error', message});
    }
  }
  // La tabla densa sólo entra con ancho suficiente; si no, tarjetas (#62).
  const {ref: tableRef, fits: tableFits} = useDenseTableFit(CLIENT_TABLE_MIN_WIDTH);
  // Ventana de montaje (#105): el directorio completo sigue en memoria (buscador
  // y contadores exactos); la lista monta de a páginas con «Ver más».
  const [visible, setVisible] = useState<number>(LIST_WINDOW.clients);
  useEffect(() => { setVisible(LIST_WINDOW.clients); }, [displayedClients, clientView]);
  const isGridView = clientView === 'grid';
  // La preferencia de lista usa la tabla cuando entra; en pantallas chicas se
  // conserva como una lista compacta de fichas, nunca se sustituye por la grilla.
  const dense = tableFits && !isGridView;
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

  // Facturación contratada: el dato real manda y el estado va como información
  // secundaria chica. Sin contratos → chip «Sin contratos» (no un titular de
  // tres líneas); sin dato → `—`, nunca una cifra inventada (#91).
  // La expectativa con varias monedas muestra la base en el valor y el resto en
  // la línea de explicación: el KPI no se estira a dos líneas de titular (#93).
  const billingEstado = billingExpectationState(commercialSummary, commercialState);
  const billingMontos = commercialSummary?.expectedMonthlyBilling || [];
  const [billingBase, ...billingResto] = billingMontos;
  // Sin contratos (#140): el estado sigue chico, con una salida accionable que
  // filtra el directorio a los clientes a los que les falta plan y pago.
  const sinPlan = liveClients.filter(client => client.has_recurring_price !== true).length;
  const billingKpi: {valor: ReactNode; hint: ReactNode} = !billingRole
    ? {valor: '—', hint: 'Expectativa vigente por mes'}
    : billingEstado === 'error'
      ? {valor: '—', hint: <span role="alert" className="text-bad">No se pudo cargar</span>}
      : billingEstado === 'cargando'
        ? {valor: '—', hint: <span role="status">Calculando…</span>}
        : billingEstado === 'sin-dato'
          ? {valor: '—', hint: 'Sin dato'}
          : billingEstado === 'listo'
            ? {valor: <span>{moneyKpi(Number(billingBase.total), billingBase.currency)} <span className="text-[0.55em] font-medium text-mute">/ mes</span></span>, hint: <>{billingResto.map(item => <span key={item.currency}>{moneyKpi(Number(item.total), item.currency)} / mes · </span>)}Expectativa vigente por mes</>}
            : {valor: '—', hint: <><StateChip tone="mute" title="No hay contratos comerciales activos">Sin contratos</StateChip>{canManageTerms && sinPlan > 0 ? <> · <button type="button" className="text-button min-h-11 md:min-h-0" onClick={() => setClientStatusFilter('sin_plan')}>{sinPlan === 1 ? 'Ver el cliente sin plan' : `Ver los ${sinPlan} sin plan`}</button></> : null}</>};

  const mountedLive = windowSlice(liveClients, visible);
  const hidden = liveClients.length - mountedLive.length;
  return <section ref={tableRef} className="directory grid gap-4" aria-label="Directorio de clientes">
    {dataState === 'loading' && !clients.length ? <KpiStripSkeleton label="Cargando el directorio…"/> : <KpiStrip>
      <Kpi label="Clientes activos" valor={directoryKpis.active} hint="Con servicio en curso" destacado/>
      <Kpi label="Cobros al día" valor={cobrosKpis.alDia} hint={`${cobrosKpis.enMora} en mora · ${cobrosKpis.porVencer} por vencer · ${cobrosKpis.sinFactura} sin factura`}/>
      <Kpi label="Facturación contratada" valor={billingKpi.valor} hint={billingKpi.hint}/>
      <Kpi label="Entregas próximas" valor={directoryKpis.deliveries} hint="Piezas con vencimiento en 7 días"/>
    </KpiStrip>}

    {/* Selección contextual (#100): la barra existe sólo cuando hay algo
        seleccionado; sin selección no ocupa ninguna fila. */}
    {canManageClients && selectedClients.length ? <div className="bulk-bar" role="status" aria-live="polite">
      <span className="bulk-count"><b>{selectedClients.length}</b> de {BATCH_LIMITS.clients} seleccionado{selectedClients.length === 1 ? '' : 's'}</span>
      <div className="inline-actions bulk-actions">
        <button type="button" className="text-button min-h-11 md:min-h-8" onClick={selectVisibleClients}>Seleccionar visibles</button>
        <button type="button" className="secondary min-h-11 md:min-h-10" disabled={bulkBusy} onClick={() => {setBulkError(''); setConfirmArchive(true);}}>Archivar</button>
        <button type="button" className="secondary min-h-11 md:min-h-10" disabled={bulkBusy} onClick={() => void runBatch(false)}>Reactivar</button>
        <button type="button" className="text-button min-h-11 md:min-h-8" onClick={() => setSelectedClients([])}>Limpiar</button>
      </div>
    </div> : null}

    {confirmArchive ? <Dialog title="Archivar clientes" close={() => {if (!bulkBusy) {setConfirmArchive(false); setBulkError('');}}}>
      <p><strong>{selectedClients.length === 1 ? selectedClients.map(id => clients.find(client => String(client.id) === id)?.name).filter(Boolean)[0] || '1 cliente' : `${selectedClients.length} clientes`}</strong></p>
      {selectedClients.length > 1 ? <p>{selectedClients.slice(0, 3).map(id => clients.find(client => String(client.id) === id)?.name).filter(Boolean).join(' · ')}{selectedClients.length > 3 ? ` y ${selectedClients.length - 3} más` : ''}</p> : null}
      <p>Se quitarán de las listas activas y quedarán en la Papelera. Podés reactivarlos después.</p>
      <p className="form-note">Mientras estén archivados, sus proyectos y piezas vinculados también quedan ocultos. Reactivar el cliente no los reactiva por sí solo.</p>
      {bulkError ? <Aviso tono="error" role="alert">{bulkError}</Aviso> : null}
      <div className="inline-actions">
        <button className="secondary" disabled={bulkBusy} onClick={() => setConfirmArchive(false)}>Cancelar</button>
        <button className="secondary danger" disabled={bulkBusy} onClick={() => void runBatch(true)}>{bulkBusy ? 'Procesando…' : 'Confirmar: archivar'}</button>
      </div>
    </Dialog> : null}

    {clients.length > 0 && dataState === 'error' ? (
      <Aviso tono="error" como="div" role="alert">No se pudieron actualizar los clientes. Se muestra la última lista cargada.{' '}
        <button type="button" className="underline" onClick={() => void load()}>Reintentar</button>
      </Aviso>
    ) : null}

    {dense
      // `overflow-x-visible` (Refs #140): la tabla sólo se monta cuando entra
      // completa, y el menú ⋯ necesita salir del contenedor; se retira cuando
      // #138 publique el patrón con portal/popover (hoy el ⋯ vive adentro).
      ? <ListGrid label="Clientes" template={CLIENT_TEMPLATE} columns={CLIENT_COLUMNS} className="client-directory-table overflow-x-visible" minWidthClass="min-w-[64.5rem]" pinnedActions>{renderClients(mountedLive, false)}</ListGrid>
      : <div className={`client-directory-results client-directory-results--${isGridView ? 'grid' : 'list'} grid gap-3 ${isGridView ? 'md:grid-cols-2 xl:grid-cols-3' : ''}`}>{renderClients(mountedLive, true)}</div>}

    {hidden > 0 ? <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-lg border border-ink-600 bg-ink-800 px-3 py-2" role="status" aria-live="polite">
      <span className="text-xs tabular-nums text-mute">Se muestran {mountedLive.length} de {liveClients.length} {liveClients.length === 1 ? 'cliente' : 'clientes'} que coinciden</span>
      <button type="button" className="text-button min-h-11 md:min-h-8" onClick={() => setVisible(count => count + LIST_WINDOW.clients)}>Ver más</button>
    </div> : null}

    {!liveClients.length && archivedClients.length && clientStatusFilter !== 'inactive' ? <p className="text-[13px] text-mute" role="status">Los clientes que coinciden con los filtros están archivados. Abrí «Archivados» para verlos.</p> : null}

    {!displayedClients.length ? (
      clients.length===0 ? (
        dataState === 'loading'
          ? <LoadingBlock label="Cargando clientes…" lines={5}/>
          : dataState === 'error'
            ? <ErrorBlock title="No se pudieron cargar los clientes." description="Revisá la conexión y volvé a intentar; no se inventa un directorio vacío." onRetry={() => void load()}/>
            : <EmptyBlock title="Todavía no hay clientes. Creá el primero para empezar." description="Cargá la ficha con RUC o de forma manual; después podés sumar proyectos y piezas." action={canManageClients&&onCreate ? <EmptyCta label="Nuevo cliente" onClick={()=>onCreate()} icon={<Plus aria-hidden="true" size={16}/>}/> : undefined}/>
      ) : (
        <EmptyBlock title={clientSearch.trim() ? 'No hay clientes que coincidan con tu búsqueda y filtros.' : 'No hay clientes con este estado.'} description="Probá con otro término o restablecé los filtros." action={<button className="text-button min-h-11 md:min-h-8" type="button" onClick={() => {setClientSearch(''); setClientStatusFilter('');}}><X size={14}/>Limpiar filtros</button>}/>
      )
    ) : null}

    {archivedClients.length ? (
      <details className="archived-capsule" open={clientStatusFilter==='inactive'}>
        <summary>Archivados ({archivedClients.length})</summary>
        {dense
          ? <ListGrid label="Clientes archivados" template={CLIENT_TEMPLATE} columns={CLIENT_COLUMNS} className="client-directory-table overflow-x-visible" minWidthClass="min-w-[64.5rem]" pinnedActions>{renderClients(windowSlice(archivedClients, visible), false)}</ListGrid>
          : <div className={`client-directory-results client-directory-results--${isGridView ? 'grid' : 'list'} grid gap-3 ${isGridView ? 'md:grid-cols-2 xl:grid-cols-3' : ''}`}>{renderClients(windowSlice(archivedClients, visible), true)}</div>}
      </details>
    ) : null}
  </section>;
}

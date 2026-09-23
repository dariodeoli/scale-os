/*
 * Fixtures de las referencias v2 (campaña #41): Panel, Clientes (lista+detalle)
 * y Configuración, más el set de estados.
 *
 * Espeja las referencias ya implementadas:
 *   - app/sections/resumen.tsx (Panel/dashboard)
 *   - app/sections/clientes.tsx (lista + cuadrícula)
 *   - app/sections/configuracion.tsx (ajustes)
 *   - app/client-directory-toolbar.tsx (búsqueda, estado y vista)
 *   - app/ui-v2.tsx (PageHeader, FilterToolbar, ListGrid/ListRow, Kpi, StateChip,
 *     EmptyBlock, ErrorBlock, LoadingBlock)
 * El markup de los objetos compartidos se genera con `renderToStaticMarkup`
 * sobre `owncoding-ui`; los patrones de aplicación replican `app/ui-v2.tsx` con
 * las mismas clases. Datos reales del inventario (REDISENO-INVENTARIO.md).
 */
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {
  Badge,
  BarraProgreso,
  Button,
  Card,
  EmptyState,
  ErrorState,
  IconAction,
  Input,
  Label,
  ListGridToggle,
  SearchField,
  SegmentedField,
  Select,
  Skeleton,
  Stat,
} from 'owncoding-ui';

const h = React.createElement;
const noop = () => {};

/* ── Réplica de app/ui-v2.tsx (mismas clases) ─────────────────────────────── */
const STATE_SURFACE = 'rounded-xl border border-ink-600 bg-ink-800 p-4';
const CHIP = {ok: 'green', warn: 'orange', bad: 'red', info: 'blue', mute: 'slate'};

const Kpi = ({label, valor, currency, hint, destacado}) => h(Stat, {
  label,
  destacado,
  sub: hint,
  valor: currency ? h('span', {className: 'inline-flex shrink-0 items-center justify-end gap-1 whitespace-nowrap font-semibold tabular-nums'}, new Intl.NumberFormat('es-PY', {style: 'currency', currency, maximumFractionDigits: currency === 'PYG' ? 0 : 2}).format(Number(valor))) : valor,
});
const KpiStrip = ({children}) => h('div', {className: 'grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4'}, children);
const StateChip = ({tone = 'mute', title, children}) => h(Badge, {color: CHIP[tone], title, className: 'whitespace-nowrap'}, children);
const PageHeader = ({eyebrow, title, subtitle, actions}) => h('header', {className: 'mb-4 flex flex-wrap items-start justify-between gap-3'},
  h('div', {className: 'min-w-0'},
    eyebrow && h('p', {className: 'mb-1 font-mono text-[10px] uppercase tracking-[.13em] text-mute'}, eyebrow),
    h('h1', {className: 'text-2xl font-bold tracking-tight text-fore'}, title),
    subtitle && h('p', {className: 'mt-1 text-sm text-mute'}, subtitle)),
  actions && h('div', {className: 'flex flex-wrap items-center gap-2'}, actions));
const FilterToolbar = ({summary, children}) => h('div', {className: 'mb-4 flex flex-wrap items-end gap-3'},
  children,
  summary !== undefined && summary !== null && h('p', {className: 'ml-auto whitespace-nowrap text-xs tabular-nums text-mute'}, summary));
const ListGrid = ({label, template, columns, children}) => h('div', {role: 'table', 'aria-label': label, className: 'silent-scroll min-w-0 overflow-x-auto'},
  h('div', {className: 'min-w-[48rem]'},
    h('div', {role: 'row', className: `grid gap-x-2 border-b border-ink-600 px-1 pb-2 text-[10px] font-bold uppercase tracking-[.06em] text-mute ${template}`},
      columns.map((column, index) => h('span', {key: column.key, role: 'columnheader', className: `${index === columns.length - 1 ? 'text-right' : column.align === 'end' ? 'text-right' : 'text-left'} whitespace-nowrap`}, column.label))),
    h('div', {role: 'rowgroup'}, children)));
const ListRow = ({template, children}) => h('div', {role: 'row', className: `grid min-h-12 items-center gap-x-2 border-b border-ink-600/60 px-1 py-0.5 last:border-0 md:min-h-11 md:py-2 ${template}`}, children);
const EmptyBlock = ({title, description, action}) => h('div', {role: 'status', className: STATE_SURFACE}, h(EmptyState, {title, description, action}));
const ErrorBlock = ({title, description}) => h('div', {role: 'alert', className: STATE_SURFACE}, h(ErrorState, {title, description, onRetry: noop}));
const LoadingBlock = ({label = 'Cargando…', lines = 3}) => h('div', {role: 'status', 'aria-busy': 'true', 'aria-label': label, className: 'grid gap-2'},
  h(Skeleton, {className: 'h-4 w-1/3'}),
  Array.from({length: lines}, (_, index) => h(Skeleton, {key: index, className: 'h-10 w-full'})));

const money = (value, currency = 'PYG') => h('span', {className: 'inline-flex shrink-0 items-center justify-end gap-1 whitespace-nowrap font-semibold tabular-nums'}, new Intl.NumberFormat('es-PY', {style: 'currency', currency, maximumFractionDigits: currency === 'PYG' ? 0 : 2}).format(Number(value)));

/* ── Panel / Resumen (arquetipo dashboard) ────────────────────────────────── */
const stageChips = [['Bloqueado', 'bad', 3], ['Por grabar', 'warn', 12], ['Grabado', 'info', 9], ['Editando', 'info', 21], ['Revisión', 'info', 27], ['Aprobado', 'ok', 44], ['Publicado', 'ok', 32]];

const panelPage = h('div', {className: 'grid gap-5'},
  h(PageHeader, {
    eyebrow: 'Resumen',
    title: 'Centro de control',
    subtitle: 'Señales accionables, cartera y resultado del mes en un solo lugar.',
    actions: [h(Button, {key: 'mov', variant: 'outline'}, 'Ver movimientos'), h(Button, {key: 'prod', onClick: noop}, 'Nueva orden')],
  }),
  h('div', {className: 'grid gap-3 sm:grid-cols-2'},
    h('article', {className: 'flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ink-600 bg-ink-800 p-4'},
      h('div', {className: 'min-w-0'}, h('p', {className: 'text-sm font-semibold text-fore'}, '9 entregas próximas'), h('p', {className: 'text-xs text-mute'}, 'Vencen en los próximos 7 días')),
      h(Button, {variant: 'outline', onClick: noop}, 'Ver entregas')),
    h('article', {className: 'flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ink-600 bg-ink-800 p-4'},
      h('div', {className: 'min-w-0'}, h('p', {className: 'text-sm font-semibold text-fore'}, '14 presupuestos sin respuesta'), h('p', {className: 'text-xs text-mute'}, 'Enviados y todavía sin definición')),
      h(Button, {variant: 'outline', onClick: noop}, 'Ver presupuestos'))),
  h(KpiStrip, null,
    h(Kpi, {key: 'billing', label: 'Facturación contratada', destacado: true, valor: h('span', {className: 'flex flex-wrap items-baseline gap-2'}, money(1234567890, 'PYG'), h('span', {className: 'text-base font-medium'}, money(12345.67, 'USD'))), hint: 'Expectativa comercial vigente'}),
    h(Kpi, {key: 'clients', label: 'Clientes activos', valor: 38, hint: 'Con relación comercial activa'}),
    h(Kpi, {key: 'prospects', label: 'Prospectos activos', valor: 143, hint: 'Leads que todavía no están ganados'}),
    h(Kpi, {key: 'collect', label: 'Por cobrar', valor: h('span', {className: 'flex flex-wrap items-baseline gap-2'}, money(2345678901, 'PYG'), h('span', {className: 'text-base font-medium'}, money(45678.9, 'USD'))), hint: 'Facturas pendientes'})),
  h('section', {className: 'rounded-xl border border-ink-600 bg-ink-800 p-5', 'aria-label': 'Piezas por etapa'},
    h('div', {className: 'mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-ink-600 pb-3'},
      h('div', null, h('p', {className: 'font-mono text-[10px] uppercase tracking-[.13em] text-mute'}, 'Producción'), h('h2', {className: 'text-[17px] font-semibold tracking-tight text-fore'}, 'Piezas por etapa')),
      h('button', {type: 'button', className: 'text-button'}, 'Abrir Producción')),
    h('div', {className: 'flex flex-wrap gap-2'}, stageChips.map(([label, tone, count]) => h(StateChip, {key: label, tone, title: `${label}: ${count} pieza(s)`}, `${label} · `, h('b', {className: 'tabular-nums'}, count))))),
  h('div', {className: 'mt-2 mb-1'},
    h('p', {className: 'mb-1 font-mono text-[10px] uppercase tracking-[.13em] text-mute'}, 'Operación'),
    h('h2', {className: 'text-[17px] font-semibold tracking-tight text-fore'}, 'Métricas operativas')),
  h(KpiStrip, null,
    h(Kpi, {key: 'projects', label: 'Proyectos activos', valor: 12, hint: 'Con trabajo en curso', destacado: true}),
    h(Kpi, {key: 'orders', label: 'Órdenes abiertas', valor: 148, hint: 'Seguimiento diario'}),
    h(Kpi, {key: 'review', label: 'En revisión', valor: 27, hint: 'Piezas para aprobar'})));

/* ── Clientes (arquetipo lista + detalle) ─────────────────────────────────── */
const CLIENT_TEMPLATE = 'grid-cols-[minmax(13rem,1.6fr)_minmax(11rem,1.15fr)_7rem_13rem_9rem_16rem]';
const CLIENT_COLUMNS = [
  {key: 'client', label: 'Cliente'},
  {key: 'facts', label: 'Datos'},
  {key: 'status', label: 'Estado'},
  {key: 'billing', label: 'Cobros'},
  {key: 'activity', label: 'Actividad'},
  {key: 'actions', label: 'Acciones'},
];

const clients = [
  {name: 'Estudio de Comunicación Audiovisual', initials: 'EC', status: ['ok', 'Activo'], email: 'facturacion@estudiocomunicacion.com.py', phone: '+595 21 123 456', tax: '80012345-6', since: '12 mar 24', projects: 12, pieces: 148, due: '17-sept', mora: ['warn', 'Vence 30-oct'], balance: [1234567890, 'PYG']},
  {name: 'Cooperativa Multiactiva de Servicios', initials: 'CM', status: ['ok', 'Activo'], email: 'contacto@coopmultiactiva.coop.py', phone: '+595 981 234 567', tax: '80045678-9', since: '02 ene 25', projects: 3, pieces: 9, due: '30-oct', mora: ['bad', '18 días de mora'], balance: [45678901, 'PYG']},
  {name: 'Fundación Niñez y Comunidad', initials: 'FN', status: ['warn', 'Pausado'], email: 'administracion@fundacionninez.org.py', phone: '', tax: '80098765-4', since: '20 jul 25', projects: 1, pieces: 2, due: '05-nov', mora: ['mute', 'Sin factura'], balance: null},
  {name: 'Cliente nuevo sin datos completos', initials: 'CN', status: ['mute', 'Inactivo'], email: '', phone: '+1 555 123 4567', tax: '', since: '18 sept 26', projects: 0, pieces: 0, due: '', mora: ['ok', 'Al día'], balance: [890.5, 'USD']},
];

const clientRow = (client) => h(ListRow, {key: client.name, template: CLIENT_TEMPLATE},
  h('div', {className: 'flex min-w-0 items-center gap-2'},
    h('label', {className: 'flex flex-none items-center'}, h('input', {type: 'checkbox', 'aria-label': `Seleccionar ${client.name}`})),
    h('span', {className: 'min-w-0 break-words text-[13.5px] font-semibold leading-[1.2] text-fore', title: `${client.name} · desde ${client.since}`}, client.name)),
  h('div', {className: 'min-w-0 text-[11.5px] text-mute'},
    h('span', {className: 'block truncate', title: client.email || 'Sin email registrado'}, client.email || 'Sin email registrado'),
    h('span', {className: 'block whitespace-nowrap'}, `${client.phone || 'Sin teléfono'} · RUC ${client.tax || 'sin registrar'}`)),
  h('div', {className: 'min-w-0'}, h(StateChip, {tone: client.status[0]}, client.status[1])),
  h('div', {className: 'flex min-w-0 items-center justify-between gap-2'},
    h(StateChip, {tone: client.mora[0]}, client.mora[1]),
    client.balance ? h('span', {className: 'whitespace-nowrap text-right text-[12px] font-semibold tabular-nums text-fore'}, money(client.balance[0], client.balance[1])) : h('span', {className: 'whitespace-nowrap text-[11px] text-mute'}, 'Sin saldo')),
  h('div', {className: 'min-w-0 text-[11.5px] text-mute'},
    h('span', {className: 'block truncate', title: `${client.projects} proyectos activos · ${client.pieces} piezas en curso`}, h('b', {className: 'tabular-nums text-fore'}, client.projects), ' proyectos activos'),
    client.due ? h('span', {className: 'block whitespace-nowrap'}, 'Próxima entrega ', h('b', {className: 'tabular-nums text-fore'}, client.due)) : h('span', {className: 'block'}, 'Sin proyectos activos')),
  h('div', {className: 'flex min-w-0 items-center justify-end gap-1'},
    h(IconAction, {key: 'open', icon: 'eye', label: `Abrir ficha: ${client.name}`, tone: 'fono', onClick: noop}),
    h('a', {key: 'wa', className: 'text-button whatsapp-button', href: `https://wa.me/595981123456`, target: '_blank', rel: 'noopener noreferrer'}, 'WhatsApp'),
    h('button', {key: 'archive', type: 'button', className: 'text-button'}, 'Archivar'),
    h(IconAction, {key: 'edit', icon: 'edit', label: `Editar cliente: ${client.name}`, onClick: noop}),
    h(IconAction, {key: 'remove', icon: 'trash', label: `Archivar cliente: ${client.name}`, tone: 'bad', onClick: noop})));
const clientsPage = h('div', {className: 'grid gap-4'},
  h(PageHeader, {
    eyebrow: 'Comercial',
    title: 'Clientes',
    subtitle: 'Mostrando 4 clientes de 38.',
    actions: [h(Button, {key: 'guide', variant: 'outline'}, 'Guía del panel'), h(Button, {key: 'new', onClick: noop}, 'Nuevo cliente')],
  }),
  h(KpiStrip, null,
    h(Kpi, {key: 'active', label: 'Clientes activos', valor: 38, hint: 'Con relación comercial activa', destacado: true}),
    h(Kpi, {key: 'clear', label: 'Cobros al día', valor: 31, hint: 'Sin saldo vencido'}),
    h(Kpi, {key: 'overdue', label: 'En mora', valor: 3, hint: 'Con saldo vencido'}),
    h(Kpi, {key: 'deliveries', label: 'Entregas próximas', valor: 9, hint: 'Vencen en 7 días'})),
  h(FilterToolbar, {summary: '4 de 38'},
    h(SearchField, {key: 'search', value: '', onChange: noop, onClear: noop, placeholder: 'Buscar por nombre, correo o teléfono', ariaLabel: 'Buscar clientes', className: 'w-full sm:w-72'}),
    h(SegmentedField, {key: 'status', value: 'all', onChange: noop, ariaLabel: 'Estado del cliente', options: [['all', 'Todos'], ['active', 'Activos'], ['inactive', 'Inactivos']]}),
    h(ListGridToggle, {key: 'view', value: 'list', onChange: noop, className: '[&>button]:h-11 [&>button]:w-11 md:[&>button]:h-9 md:[&>button]:w-9'})),
  h(ListGrid, {label: 'Clientes', template: CLIENT_TEMPLATE, columns: CLIENT_COLUMNS, minWidthClass: 'min-w-[69rem]'}, clients.map(clientRow)),
  h('div', {className: 'mt-2 flex flex-wrap items-center gap-2'},
    h(Button, {variant: 'outline', onClick: noop}, 'Limpiar filtros'),
    h('p', {className: 'text-xs text-mute'}, 'Los clientes archivados se muestran en su propia cápsula.')));

const clientCard = (client) => h(Card, {key: client.name, className: 'flex min-h-[200px] min-w-0 flex-col gap-3'},
  h('div', {className: 'flex items-start justify-between gap-3'},
    h('div', {className: 'min-w-0'},
      h('p', {className: 'text-[14px] font-bold leading-tight text-fore'}, client.name),
      h('p', {className: 'mt-1 text-[11px] text-mute'}, `Cliente desde ${client.since}`)),
    h(StateChip, {tone: client.status[0]}, client.status[1])),
  h('dl', {className: 'grid grid-cols-2 gap-2 text-[11.5px]'},
    h('div', null, h('dt', {className: 'text-[9.5px] font-bold uppercase tracking-[.06em] text-mute'}, 'Correo'), h('dd', {className: 'mt-0.5 text-fore'}, client.email || 'Sin email registrado')),
    h('div', null, h('dt', {className: 'text-[9.5px] font-bold uppercase tracking-[.06em] text-mute'}, 'Teléfono'), h('dd', {className: 'mt-0.5 text-fore'}, client.phone || 'Sin teléfono')),
    h('div', null, h('dt', {className: 'text-[9.5px] font-bold uppercase tracking-[.06em] text-mute'}, 'RUC'), h('dd', {className: 'mt-0.5 text-fore'}, client.tax || 'Sin RUC registrado')),
    h('div', null, h('dt', {className: 'text-[9.5px] font-bold uppercase tracking-[.06em] text-mute'}, 'Cartera'), h('dd', {className: 'mt-0.5 text-fore tabular-nums'}, `${client.projects} proyectos · ${client.pieces} piezas`))),
  h('div', {className: 'flex flex-wrap items-center gap-2'},
    h(StateChip, {tone: client.mora[0]}, client.mora[1]),
    client.balance ? money(client.balance[0], client.balance[1]) : h('span', {className: 'text-[11.5px] text-mute'}, 'Sin saldo pendiente')),
  h('div', {className: 'mt-auto flex items-center justify-end gap-1 border-t border-ink-600 pt-3'},
    h(IconAction, {key: 'open', icon: 'eye', label: `Abrir ficha: ${client.name}`, tone: 'fono', onClick: noop}),
    h(IconAction, {key: 'edit', icon: 'edit', label: `Editar cliente: ${client.name}`, onClick: noop})));

const clientsGrid = h('div', {className: 'grid gap-3 md:grid-cols-2 xl:grid-cols-3', 'data-grid': 'clientes-v2'}, clients.map(clientCard));

/* ── Configuración (arquetipo ajustes) ────────────────────────────────────── */
const settingsField = (label, value, control) => h('div', {key: label, className: 'grid gap-1.5'},
  h(Label, null, label),
  control || h(Input, {defaultValue: value, readOnly: true}));

const settingsPage = h('div', {className: 'grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]'},
  h('div', {className: 'grid min-w-0 content-start gap-4'},
    h(Card, {key: 'company', className: 'grid gap-4'},
      h('div', null, h('h2', {className: 'text-[17px] font-semibold tracking-tight text-fore'}, 'Empresa'), h('p', {className: 'mt-1 text-xs text-mute'}, 'Datos que identifican a esta empresa y valores predeterminados para nuevos formularios.')),
      h('div', {className: 'grid gap-4 sm:grid-cols-2'},
        settingsField('Nombre de la empresa', 'Estudio de Comunicación y'),
        h('div', {key: 'currency', className: 'grid gap-1.5'}, h(Label, null, 'Moneda predeterminada'), h(Select, {defaultValue: 'PYG'}, h('option', {value: 'PYG'}, 'Guaraníes (PYG)'), h('option', {value: 'USD'}, 'Dólares (USD)'))),
        settingsField('Razón social', 'Estudio de Comunicación y Producción Audiovisual del Paraguay S.A.'),
        settingsField('RUC', '80012345-6'),
        settingsField('Teléfono', '+595 981 123 456'),
        settingsField('Dirección', 'Avda. Mcal. López 1234 casi San Martín, Asunción, Paraguay')),
      h('div', {className: 'flex justify-end pt-1'}, h(Button, {onClick: noop}, 'Guardar'))),
    h(Card, {key: 'rates', className: 'grid gap-4'},
      h('div', null, h('h2', {className: 'text-[17px] font-semibold tracking-tight text-fore'}, 'Cotización USD / PYG'), h('p', {className: 'mt-1 text-xs text-mute'}, 'Referencia por fecha; no modifica saldos ni convierte movimientos anteriores.')),
      h('div', {className: 'grid gap-4 sm:grid-cols-2'},
        settingsField('Fecha', '2026-09-20', h(Input, {type: 'date', defaultValue: '2026-09-20', readOnly: true, className: 'max-w-[9rem]'})),
        settingsField('Guaraníes por dólar', '6250', h(Input, {inputMode: 'numeric', defaultValue: '6250', readOnly: true, className: 'max-w-[9rem]'}))),
      h('p', {className: 'text-xs text-mute'}, 'Solo enteros entre G. 1.000 y G. 100.000. Referencia indicada: G. 6.000/USD.'),
      h('div', {className: 'flex justify-end pt-1'}, h(Button, {onClick: noop}, 'Guardar'))),
    h(Card, {key: 'integrations', className: 'grid gap-4'},
      h('div', null, h('h2', {className: 'text-[17px] font-semibold tracking-tight text-fore'}, 'Integraciones'), h('p', {className: 'mt-1 text-xs text-mute'}, 'Estado actual de los servicios que pueden complementar tu flujo de trabajo.')),
      h('div', {className: 'grid gap-2'},
        h('div', {key: 'google', className: 'flex flex-wrap items-center justify-between gap-3 rounded-lg border border-ink-600 px-3 py-2'},
          h('div', null, h('p', {className: 'text-sm font-semibold text-fore'}, 'Google y Drive'), h('p', {className: 'text-xs text-mute'}, 'Usá tu correo invitado para entrar y agregá enlaces de Drive en cada registro.')),
          h(StateChip, {tone: 'mute'}, 'No configurado')),
        h('div', {key: 'social', className: 'flex flex-wrap items-center justify-between gap-3 rounded-lg border border-ink-600 px-3 py-2'},
          h('div', null, h('p', {className: 'text-sm font-semibold text-fore'}, 'WhatsApp, Instagram y Meta'), h('p', {className: 'text-xs text-mute'}, 'Requieren una conexión y permisos de Meta antes de poder usarse.')),
          h(StateChip, {tone: 'mute'}, 'No configurado'))))),
  h('div', {className: 'grid min-w-0 content-start gap-4'},
    h(Card, {key: 'subscription', className: 'grid gap-3'},
      h('div', {className: 'flex items-center justify-between gap-2'}, h('h2', {className: 'text-[17px] font-semibold tracking-tight text-fore'}, 'Suscripción'), h(StateChip, {tone: 'info'}, 'Prueba gratuita')),
      h('p', {className: 'text-xs text-mute'}, '30 días de prueba restantes · vence 10 oct 26.'),
      money(50000, 'PYG'),
      h('div', {className: 'flex flex-wrap gap-2'}, h(Button, {onClick: noop}, 'Activar suscripción mensual'), h(Button, {variant: 'outline', onClick: noop}, 'Gestionar'))),
    h(Card, {key: 'coupon', className: 'grid gap-3'},
      h('h2', {className: 'text-[17px] font-semibold tracking-tight text-fore'}, 'Cupones'),
      h('p', {className: 'text-xs text-mute'}, 'Canjeá un código para sumar tiempo a tu suscripción.'),
      settingsField('Código del cupón', '', h(Input, {placeholder: 'CÓDIGO', readOnly: true})),
      h('div', {className: 'flex justify-end'}, h(Button, {variant: 'outline', onClick: noop}, 'Canjear cupón'))),
    h(Card, {key: 'usage', className: 'grid gap-3'},
      h('h2', {className: 'text-[17px] font-semibold tracking-tight text-fore'}, 'Uso del espacio'),
      h(BarraProgreso, {valor: 38, max: 100, tono: 'fono', etiqueta: 'Clientes activos sobre el plan'}),
      h('p', {className: 'text-xs tabular-nums text-mute'}, '38 de 100 clientes activos incluidos.'))));

/* ── Estados v2 ───────────────────────────────────────────────────────────── */
const statesPage = h('div', {className: 'grid gap-4'},
  h('div', {className: 'flex flex-wrap gap-2'},
    h(StateChip, {key: 'ok', tone: 'ok'}, 'Al día'), h(StateChip, {key: 'warn', tone: 'warn'}, 'Vence 30-oct'),
    h(StateChip, {key: 'bad', tone: 'bad'}, '18 días de mora'), h(StateChip, {key: 'info', tone: 'info'}, 'En revisión'), h(StateChip, {key: 'mute', tone: 'mute'}, 'Sin factura')),
  h(KpiStrip, null, h(Kpi, {key: 'one', label: 'Facturación contratada', valor: h('span', {className: 'flex flex-wrap items-baseline gap-2'}, money(1234567890, 'PYG'), h('span', {className: 'text-base font-medium'}, money(12345.67, 'USD'))), hint: 'Neto mensual'}), h(Kpi, {key: 'two', label: 'Cobrado', valor: null, hint: 'Sin datos'})),
  h(EmptyBlock, {key: 'empty', title: 'Todavía no hay clientes', description: 'Cargá el primero para empezar a medir la cartera.', action: h(Button, {onClick: noop}, 'Nuevo cliente')}),
  h(ErrorBlock, {key: 'error', title: 'No se pudo cargar la cartera', description: 'Revisá tu conexión e intentá de nuevo.'}),
  h('div', {key: 'loading', className: STATE_SURFACE}, h(LoadingBlock, {label: 'Cargando clientes…'})));

export default [
  {id: 'v2-panel', section: 'Resumen', surface: 'Panel v2 (referencia)', kind: 'workspace', body: renderToStaticMarkup(panelPage)},
  {
    id: 'v2-clientes-lista',
    section: 'Clientes',
    surface: 'Lista v2 (referencia)',
    kind: 'workspace',
    lists: [{container: '[role="table"]', head: '[role="row"]', row: '[role="rowgroup"] [role="row"]', label: 'Clientes · lista v2', rowHeight: [44, 52]}],
    body: renderToStaticMarkup(clientsPage),
  },
  {id: 'v2-clientes-cuadricula', section: 'Clientes', surface: 'Cuadrícula v2 (referencia)', kind: 'workspace', grids: [{container: '[data-grid="clientes-v2"]', card: '.min-h-\\[200px\\]', label: 'Clientes · cuadrícula v2', minHeight: 200}], body: renderToStaticMarkup(clientsGrid)},
  {id: 'v2-config', section: 'Configuración', surface: 'Ajustes v2 (referencia)', kind: 'workspace', body: renderToStaticMarkup(settingsPage)},
  {id: 'v2-estados', section: 'Primitivas', surface: 'Estados v2', kind: 'plain', body: renderToStaticMarkup(statesPage)},
];

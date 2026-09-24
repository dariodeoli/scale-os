/*
 * Fixture: Clientes · directorio en lista y en cuadrícula (SOS-COM, campaña #41 / #43).
 *
 * Re-sincronizado al markup v2 tras la auditoría de SOS-DSN (23-09): el fixture
 * anterior medía `.client-hub-list` (markup legacy retirado con el rediseño) y
 * reportaba filas de 68.7–136.2 px. La lista viva es `ListGrid`/`ListRow`
 * (app/ui-v2.tsx) con la plantilla compartida en clase Tailwind:
 *   - app/sections/clientes.tsx (ClientLine/ClientTile, columnas y plantilla)
 *   - app/ui-v2.tsx (ListGrid/ListRow: misma plantilla en encabezado y filas)
 *   - app/client-directory-toolbar.tsx (barra del directorio en el shell)
 *   - app/client-identity.tsx (ClientIdentity) y app/archive-controls.tsx (acciones)
 * Los objetos compartidos (Badge/IconAction/MoneyText/SearchField/Select/
 * ListGridToggle/Button) se renderizan con `renderToStaticMarkup` sobre
 * owncoding-ui, como en referencias-v2.mjs.
 *
 * Datos de estrés deliberados: nombre y correo largos, montos grandes en PYG y
 * USD, cliente sin datos de cobro/cartera y tarjeta archivada. Cada texto
 * recortado lleva `title` (contrato de listas densas).
 */
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {Badge, Button, IconAction, Label, ListGridToggle, SearchField, Select, Stat} from 'owncoding-ui';

const h = React.createElement;
const noop = () => {};

/* app/operations.tsx money(): el mismo formateador que usa app/ui-v2.tsx. */
const money = (value, currency = 'PYG') => new Intl.NumberFormat('es-PY', {style: 'currency', currency, maximumFractionDigits: currency === 'PYG' ? 0 : 2}).format(Number(value));

/* ── Réplica de app/ui-v2.tsx MoneyText (única celda de dinero v2) ─────────── */
const MONEY_TONE = {ok: 'text-ok', warn: 'text-warn', bad: 'text-bad', mute: 'text-mute', info: 'text-info'};
const MoneyText = ({valor, currency = 'PYG', tono = '', className = ''}) => h('span', {className: `inline-flex shrink-0 items-center justify-end gap-1 whitespace-nowrap font-semibold tabular-nums ${MONEY_TONE[tono] ?? ''} ${className}`.trim()}, money(valor, currency));

/* ── Réplica de app/ui-v2.tsx (ListGrid/ListRow: mismas clases) ─────────────── */
const CLIENT_TEMPLATE = 'grid-cols-[minmax(13rem,1.6fr)_minmax(11rem,1.15fr)_7rem_15rem_9rem_16rem]';
const CLIENT_COLUMNS = [
  {key: 'client', label: 'Cliente'},
  {key: 'facts', label: 'Datos'},
  {key: 'status', label: 'Estado'},
  {key: 'billing', label: 'Cobros'},
  {key: 'activity', label: 'Actividad'},
  {key: 'actions', label: 'Acciones'},
];

const ListGrid = ({label, template, columns, minWidthClass = 'min-w-[48rem]', children}) => h('div', {role: 'table', 'aria-label': label, className: 'silent-scroll min-w-0 overflow-x-auto'},
  h('div', {className: minWidthClass},
    h('div', {role: 'row', className: `grid gap-x-2 border-b border-ink-600 px-1 pb-2 text-[10px] font-bold uppercase tracking-[.06em] text-mute ${template}`},
      columns.map((column, index) => h('span', {key: column.key, role: 'columnheader', className: `${index === columns.length - 1 ? 'text-right' : 'text-left'} whitespace-nowrap`}, column.label))),
    h('div', {role: 'rowgroup'}, children)));

/* ── Réplica de app/client-status + ui-v2.StateChip ────────────────────────── */
const CHIP = {ok: 'green', warn: 'orange', bad: 'red', info: 'blue', mute: 'slate'};
const StateChip = ({tone = 'mute', title, children}) => h(Badge, {color: CHIP[tone], title, className: 'whitespace-nowrap'}, children);

const Pencil = h('svg', {width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': 'true'},
  h('path', {d: 'M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z'}),
  h('path', {d: 'm15 5 4 4'}));
const Trash = h('svg', {width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': 'true'},
  h('path', {d: 'M3 6h18'}),
  h('path', {d: 'M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6'}),
  h('path', {d: 'M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2'}),
  h('path', {d: 'M10 11v6'}),
  h('path', {d: 'M14 11v6'}));
const WhatsAppIcon = h('svg', {width: 14, height: 14, viewBox: '0 0 24 24', fill: 'currentColor', 'aria-hidden': 'true', focusable: 'false'},
  h('path', {d: 'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z'}));
const PriceMissing = h('span', {className: 'client-price-missing', title: 'Sin precio definido: editá el cliente y completá Plan y pago.'},
  h('svg', {width: 14, height: 14, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', role: 'img', 'aria-label': 'Sin precio definido'},
    h('circle', {cx: 12, cy: 12, r: 10}),
    h('path', {d: 'M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8'}),
    h('path', {d: 'M12 18V6'})));
const Plus = h('svg', {width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': 'true'},
  h('path', {d: 'M5 12h14'}),
  h('path', {d: 'M12 5v14'}));

/* ── app/client-identity.tsx (ClientIdentity) ───────────────────────────────── */
const Identity = ({name, initials}) => h('span', {className: 'client-identity identity-violet inline-flex min-w-0 items-center gap-2.5 text-fore'},
  h('span', {className: 'identity-avatar overflow-hidden', 'aria-hidden': 'true'}, initials),
  h('span', {className: 'identity-name min-w-0 font-bold leading-snug', title: name}, name));

const recordActions = (name) => h('span', {className: 'client-record-actions'},
  h('button', {type: 'button', className: 'icon-button', title: 'Editar', 'aria-label': `Editar ${name}`}, Pencil),
  h('button', {type: 'button', className: 'icon-button record-remove', title: 'Mover a la papelera', 'aria-label': `Mover a la papelera: ${name}`}, Trash));

const clients = [
  {
    name: 'Estudio de Comunicación y Producción Audiovisual del Paraguay Sociedad Anónima',
    initials: 'EC',
    status: ['ok', 'Activo'],
    email: 'administracion.facturacion@estudiocomunicacionparaguay.com.py',
    phone: '+595 981 123 456',
    tax: '80012345-6',
    since: 'sept 2024',
    projects: 12,
    pieces: 148,
    due: '17-sept',
    mora: ['warn', '23 días de mora'],
    balance: [1234567890, 'PYG'],
    balanceTone: 'bad',
    missingPrice: true,
  },
  {
    name: 'Cooperativa Multiactiva de Servicios Múltiples Limitada',
    initials: 'CM',
    status: ['warn', 'Pausado'],
    email: 'compras@coopservicios.com.py',
    phone: '+595 21 555 000',
    tax: '80098765-4',
    since: 'ene 2023',
    projects: 3,
    pieces: 9,
    due: '30-oct',
    mora: ['warn', 'Vence 30-oct'],
    balance: [12345.67, 'USD'],
  },
  {
    name: 'Fundación Niñez y Comunidad',
    initials: 'FN',
    status: ['bad', 'Cancelado'],
    email: 'contacto@ninezcomunidad.org.py',
    phone: '+595 971 000 111',
    tax: '80055555-1',
    since: 'jul 2025',
    projects: 1,
    pieces: 2,
    due: '05-nov',
    mora: ['ok', 'Al día'],
    balance: null,
    archived: true,
  },
  {
    name: 'Cliente nuevo sin cartera ni plan cargado',
    initials: 'CN',
    status: ['mute', 'Inactivo'],
    email: '',
    phone: '',
    tax: '',
    since: null,
    projects: 0,
    pieces: 0,
    due: null,
    mora: null,
    balance: null,
    missingPrice: true,
  },
];

/* ── app/sections/clientes.tsx · ClientLine (fila finita) ───────────────────── */
const clientRow = (client) => h('div', {
  key: client.name,
  role: 'row',
  'data-archived': client.archived ? 'true' : undefined,
  className: `grid min-h-12 items-center gap-x-2 border-b border-ink-600/60 px-1 py-0.5 last:border-0 md:min-h-11 md:py-2 ${CLIENT_TEMPLATE} client-hub-row`,
},
  h('div', {className: 'flex min-w-0 items-center gap-2'},
    h('label', {className: 'select-check', title: 'Seleccionar cliente'}, h('input', {type: 'checkbox', 'aria-label': `Seleccionar ${client.name}`})),
    h('button', {type: 'button', className: 'min-h-11 min-w-0 text-left md:min-h-0', 'aria-label': `Abrir ficha de ${client.name}`},
      h(Identity, {name: client.name, initials: client.initials}))),
  h('div', {className: 'min-w-0 text-[11.5px] text-mute'},
    h('span', {className: 'block truncate', title: client.email || 'Sin email registrado'}, client.email || 'Sin email registrado'),
    h('span', {className: 'block truncate', title: `${client.phone || 'Sin teléfono'} · RUC ${client.tax || 'sin registrar'} · Cliente desde ${client.since || 'sin fecha de alta'}`}, `${client.phone || 'Sin teléfono'} · RUC ${client.tax || 'sin registrar'} · desde ${client.since || 'sin fecha'}`)),
  h('div', {className: 'min-w-0'}, h(StateChip, {tone: client.status[0], title: client.status[1]}, client.status[1])),
  h('div', {className: 'flex min-w-0 items-center justify-between gap-2'},
    client.mora ? h(StateChip, {tone: client.mora[0], title: client.mora[1]}, client.mora[1]) : h('span', {className: 'text-[11px] text-mute'}, 'Sin datos de cobro'),
    client.balance ? h(MoneyText, {valor: client.balance[0], currency: client.balance[1], tono: client.balanceTone}) : h('span', {className: 'whitespace-nowrap text-[11px] text-mute'}, 'Sin saldo')),
  h('div', {className: 'min-w-0 text-[11.5px] text-mute'},
    h('span', {className: 'block truncate', title: `${client.projects} proyectos activos · ${client.pieces} piezas en curso`},
      client.projects || client.pieces
        ? [h('b', {key: 'projects', className: 'tabular-nums text-fore'}, client.projects), ' proyectos · ', h('b', {key: 'pieces', className: 'tabular-nums text-fore'}, client.pieces), ' piezas']
        : 'Sin proyectos activos'),
    client.due ? h('span', {className: 'block whitespace-nowrap'}, 'Próxima entrega ', h('b', {className: 'tabular-nums text-fore'}, client.due)) : null),
  h('div', {className: 'client-row-actions silent-scroll flex min-w-0 items-center gap-1 overflow-x-auto [justify-content:safe_flex-end]'},
    h(IconAction, {icon: 'eye', tone: 'fono', label: `Abrir ficha: ${client.name}`, onClick: noop}),
    client.phone ? h('a', {className: 'text-button whatsapp-button', href: '#whatsapp', target: '_blank', rel: 'noopener noreferrer'}, WhatsAppIcon, 'WhatsApp') : null,
    client.missingPrice ? PriceMissing : null,
    h('button', {type: 'button', className: 'text-button'}, client.archived ? 'Reactivar' : 'Archivar'),
    recordActions(client.name)));

/* ── app/sections/clientes.tsx · ClientTile (tarjeta grande) ────────────────── */
const clientTile = (client) => h('article', {
  key: client.name,
  'data-archived': client.archived ? 'true' : undefined,
  className: 'client-hub-card flex min-h-[200px] min-w-0 flex-col gap-3 rounded-xl border border-ink-600 bg-ink-800 p-4',
},
  h('header', {className: 'flex items-start justify-between gap-3'},
    h('div', {className: 'flex min-w-0 items-start gap-2'},
      h('label', {className: 'select-check', title: 'Seleccionar cliente'}, h('input', {type: 'checkbox', 'aria-label': `Seleccionar ${client.name}`})),
      h('button', {type: 'button', className: 'min-h-11 min-w-0 text-left md:min-h-0', 'aria-label': `Abrir ficha de ${client.name}`},
        h(Identity, {name: client.name, initials: client.initials}))),
    h(StateChip, {tone: client.status[0], title: client.status[1]}, client.status[1])),
  h('dl', {className: 'grid grid-cols-2 gap-2 text-[11.5px]'},
    h('div', null, h('dt', {className: 'text-[9.5px] font-bold uppercase tracking-[.06em] text-mute'}, 'Correo'), h('dd', {className: 'mt-0.5 truncate text-fore', title: client.email || 'Sin email registrado'}, client.email || 'Sin email registrado')),
    h('div', null, h('dt', {className: 'text-[9.5px] font-bold uppercase tracking-[.06em] text-mute'}, 'Teléfono'), h('dd', {className: 'mt-0.5 text-fore'}, client.phone || 'Sin teléfono')),
    h('div', null, h('dt', {className: 'text-[9.5px] font-bold uppercase tracking-[.06em] text-mute'}, 'RUC'), h('dd', {className: 'mt-0.5 text-fore'}, client.tax || 'Sin RUC registrado')),
    h('div', null, h('dt', {className: 'text-[9.5px] font-bold uppercase tracking-[.06em] text-mute'}, 'Cliente desde'), h('dd', {className: 'mt-0.5 text-fore'}, client.since || 'Sin fecha de alta')),
    h('div', {className: 'col-span-2'}, h('dt', {className: 'text-[9.5px] font-bold uppercase tracking-[.06em] text-mute'}, 'Cartera'), h('dd', {className: 'mt-0.5 text-fore'}, client.projects || client.pieces ? `${client.projects} proyectos · ${client.pieces} piezas${client.due ? ` · próxima entrega ${client.due}` : ''}` : 'Sin proyectos activos'))),
  h('div', {className: 'flex flex-wrap items-center gap-2'},
    client.mora ? h(StateChip, {tone: client.mora[0], title: client.mora[1]}, client.mora[1]) : null,
    client.balance ? h(MoneyText, {valor: client.balance[0], currency: client.balance[1], tono: client.balanceTone}) : h('span', {className: 'text-[11px] text-mute'}, 'Sin saldo pendiente'),
    client.missingPrice ? PriceMissing : null),
  h('footer', {className: 'client-card-actions silent-scroll mt-auto flex items-center gap-1 overflow-x-auto border-t border-ink-600 pt-3 [justify-content:safe_flex-end]'},
    h(IconAction, {icon: 'eye', tone: 'fono', label: `Abrir ficha: ${client.name}`, onClick: noop}),
    client.phone ? h('a', {className: 'text-button whatsapp-button', href: '#whatsapp', target: '_blank', rel: 'noopener noreferrer'}, WhatsAppIcon, 'WhatsApp') : null,
    h('button', {type: 'button', className: 'text-button'}, client.archived ? 'Reactivar' : 'Archivar'),
    recordActions(client.name)));

/* ── app/client-directory-toolbar.tsx (barra del directorio en el shell) ────── */
const toolbar = h('div', {className: 'client-directory-toolbar flex flex-wrap items-end gap-3', 'aria-label': 'Controles del directorio de clientes'},
  h('div', {className: 'client-directory-toolbar-title min-w-0 flex-1'},
    h('h1', {className: 'text-[22px] font-bold leading-tight tracking-tight text-fore md:text-2xl'}, 'Clientes'),
    h('p', {className: 'directory-summary mt-1.5 text-[13px] leading-[1.5] tabular-nums text-mute', role: 'status', 'aria-atomic': 'true'}, 'Mostrando 4 clientes de 4 clientes')),
  h(SearchField, {className: 'client-directory-search w-full sm:w-72', type: 'search', ariaLabel: 'Buscar clientes', value: '', onChange: noop, onClear: noop, placeholder: 'Buscar por nombre, correo o teléfono'}),
  h('div', {className: 'grid gap-1.5'},
    h(Label, {htmlFor: 'clientes-estado'}, 'Estado'),
    h(Select, {id: 'clientes-estado', value: '', onChange: noop, className: 'min-w-[11rem]'},
      h('option', {value: ''}, 'Todos los estados'),
      h('option', {value: 'active'}, 'Activo'),
      h('option', {value: 'paused'}, 'Pausado'),
      h('option', {value: 'cancelled'}, 'Cancelado'),
      h('option', {value: 'expired'}, 'Servicio vencido'),
      h('option', {value: 'inactive'}, 'Inactivo'))),
  h('div', {className: '[&_button]:h-11 [&_button]:w-11 md:[&_button]:h-9 md:[&_button]:w-9'}, h(ListGridToggle, {value: 'list', onChange: noop})),
  h(Button, {type: 'button', className: 'client-directory-create ml-auto', onClick: noop}, Plus, 'Nuevo cliente'));

const directoryHeader = h('header', {className: 'workspace-page-header mb-5 flex flex-wrap items-start justify-between gap-x-4 gap-y-3 max-md:grid max-md:grid-cols-1'}, toolbar);

const listPage = h('div', {className: 'grid gap-4'},
  directoryHeader,
  h('div', {className: 'grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4'},
    h(Stat, {label: 'Clientes activos', valor: 38, sub: 'Con servicio en curso', destacado: true}),
    h(Stat, {label: 'Cobros al día', valor: 31, sub: '3 en mora · 2 por vencer · 1 sin factura'}),
    h(Stat, {label: 'Facturación contratada', valor: h('span', {className: 'flex flex-wrap items-baseline gap-2'}, h('span', null, 'Gs. 12.345.678 / mes'), h('span', null, 'USD 1.200,00 / mes')), sub: 'Expectativa comercial vigente por moneda'}),
    h(Stat, {label: 'Entregas esta semana', valor: 9, sub: 'Piezas con vencimiento en 7 días'})),
  h('div', {className: 'bulk-bar', role: 'status', 'aria-live': 'polite'},
    h('span', {className: 'bulk-count'}, h('span', {className: 'bulk-hint'}, 'Seleccioná varios para operar en lote · máximo 50')),
    h('div', {className: 'inline-actions bulk-actions'},
      h('button', {type: 'button', className: 'text-button'}, 'Seleccionar visibles'))),
  h(ListGrid, {label: 'Clientes', template: CLIENT_TEMPLATE, columns: CLIENT_COLUMNS, minWidthClass: 'min-w-[71rem]'}, clients.filter(client => !client.archived).map(clientRow)),
  h('details', {className: 'archived-capsule'},
    h('summary', null, `Archivados (${clients.filter(client => client.archived).length})`),
    h(ListGrid, {label: 'Clientes archivados', template: CLIENT_TEMPLATE, columns: CLIENT_COLUMNS, minWidthClass: 'min-w-[71rem]'}, clients.filter(client => client.archived).map(clientRow))));

const gridPage = h('div', {className: 'grid gap-3 md:grid-cols-2 xl:grid-cols-3', 'data-grid': 'clientes'}, clients.map(clientTile));

export default [
  {
    id: 'clientes-lista',
    section: 'Clientes',
    surface: 'Directorio en lista',
    kind: 'workspace',
    lists: [{
      container: '[role="table"]',
      head: '[role="row"]',
      row: '[role="rowgroup"] [role="row"]',
      label: 'Clientes · lista',
      rowHeight: [44, 52],
    }],
    body: renderToStaticMarkup(listPage),
  },
  {
    id: 'clientes-cuadricula',
    section: 'Clientes',
    surface: 'Directorio en cuadrícula',
    kind: 'workspace',
    grids: [{container: '[data-grid="clientes"]', card: 'article.client-hub-card', label: 'Clientes · cuadrícula', minHeight: 200}],
    body: renderToStaticMarkup(gridPage),
  },
];

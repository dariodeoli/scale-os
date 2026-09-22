/*
 * Reference fixture: Clientes directory (list + grid).
 * Markup mirrors app/scale-workspace.tsx:
 *   - ClientHubCard + clientHeadRow (lines ~270-333)
 *   - app/client-identity.tsx (ClientIdentity)
 *   - app/client-directory-toolbar.tsx (rediseño v2: SearchField, Select, ListGridToggle, Button)
 * and the real classes in app/client-directory.css / client-identity.css.
 *
 * Stress values are deliberate: long names, long emails, big amounts, empty
 * fields ("Sin email registrado" / "Sin proyectos activos") and an archived
 * card. In list view the cartera is one line in a silent horizontal scroll
 * with the full value in the container title (SOS-COM issue #25); facts carry
 * a title even for empty placeholders so a squeezed cell always has an exit.
 *
 * The view toggle carries the CSS-module class emitted by the build the
 * harness serves (view-toggle.module.css -> view-toggle_toggle__ybg7L in the
 * shipped .next/static/css); refresh the hash with `next build` if that
 * module changes.
 */

const svg = (name, size, paths, extra = '') =>
  `<svg class="lucide lucide-${name}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"${extra}>${paths}</svg>`;

const eye14 = svg('eye', 14, '<path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/>');
const pencil16 = svg('pencil', 16, '<path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/>');
const trash16 = svg('trash-2', 16, '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M10 11v6"/><path d="M14 11v6"/>');
const priceMissing14 = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" role="img" aria-label="Sin precio definido"><circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 18V6"/></svg>`;
const whatsapp14 = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>';

const projectPart = (n) => `${n} proyecto${n === 1 ? '' : 's'} activo${n === 1 ? '' : 's'}`;
const piecePart = (n) => `${n} pieza${n === 1 ? '' : 's'} en curso`;

const clientCard = ({name, initials, status, email, phone, tax, since, projects, pieces, due, chip, balance, missingPrice = false, archived = false, billing = true}) => {
  const portfolio = [];
  if (projects) portfolio.push({key: 'projects', text: projectPart(projects), node: `<b>${projects}</b> proyecto${projects === 1 ? '' : 's'} activo${projects === 1 ? '' : 's'}`});
  if (pieces) portfolio.push({key: 'pieces', text: piecePart(pieces), node: `<b>${pieces}</b> pieza${pieces === 1 ? '' : 's'} en curso`});
  if (due) portfolio.push({key: 'due', text: `Próxima entrega ${due}`, node: `Próxima entrega <b>${due}</b>`});
  const stats = portfolio.length
    ? `<span class="client-hub-stat" title="${portfolio.map(part => part.text).join(' · ')}">${portfolio.map((part, index) => `<span class="client-hub-stat-part">${index ? '<span class="client-hub-sep" aria-hidden="true"> · </span>' : ''}${part.node}</span>`).join('')}</span>`
    : '<span class="client-hub-stat muted">Sin proyectos activos</span>';
  return `
<article class="client-hub-card"${archived ? ' data-archived="true"' : ''}>
 <header class="client-hub-head">
  <div class="client-hub-identity">
   <label class="select-check" title="Seleccionar cliente"><input type="checkbox" aria-label="Seleccionar ${name}"></label>
   <button type="button" class="client-hub-open" aria-label="Abrir ficha de ${name}">
    <span class="client-identity identity-violet"><span class="identity-avatar" aria-hidden="true">${initials}</span><span class="identity-name" title="${name}">${name}</span></span>
   </button>
  </div>
  <span class="client-status" data-status="${status.key}">${status.label}</span>
 </header>
 <dl class="client-hub-facts">
  <div><dt>Correo</dt><dd title="${email || 'Sin email registrado'}">${email || 'Sin email registrado'}</dd></div>
  <div><dt>Teléfono</dt><dd title="${phone || 'Sin teléfono'}">${phone || 'Sin teléfono'}</dd></div>
  <div><dt>RUC</dt><dd title="${tax || 'Sin RUC registrado'}">${tax || 'Sin RUC registrado'}</dd></div>
  <div><dt>Cliente desde</dt><dd title="${since || 'Sin fecha de alta'}">${since || 'Sin fecha de alta'}</dd></div>
 </dl>
 <div class="client-hub-stats" aria-label="Cartera del cliente"${portfolio.length ? ` title="${portfolio.map(part => part.text).join(' · ')}"` : ''}>${stats}</div>
 ${billing ? `<div class="client-hub-chips">
  <span class="mora-chip ${chip.tone}">${chip.label}</span>
  ${balance ? `<span class="client-hub-balance" title="Pendiente ${balance}">Pendiente ${balance}</span>` : ''}
  ${missingPrice ? `<span class="client-price-missing" title="Sin precio definido: editá el cliente y completá Plan y pago.">${priceMissing14}</span>` : ''}
 </div>` : ''}
 <footer class="client-hub-actions">
  <button type="button" class="text-button">${eye14}Abrir ficha</button>
  ${phone ? `<a class="text-button whatsapp-button" href="#whatsapp" target="_blank" rel="noopener noreferrer">${whatsapp14}WhatsApp</a>` : ''}
  <button type="button" class="text-button">${archived ? 'Reactivar' : 'Archivar'}</button>
  <div class="client-record-actions">
   <button class="icon-button" type="button" title="Editar" aria-label="Editar ${name}">${pencil16}</button>
   <button class="icon-button record-remove" type="button" title="Mover a la papelera" aria-label="Mover a la papelera: ${name}">${trash16}</button>
  </div>
 </footer>
</article>`;
};

const headRow = '<div class="client-hub-head-row" aria-hidden="true"><span>Cliente</span><span>Datos</span><span>Estado</span><span>Cobros</span><span>Actividad</span><span>Acciones</span></div>';

const cards = [
  {
    name: 'Estudio de Comunicación y Producción Audiovisual del Paraguay Sociedad Anónima',
    initials: 'EC',
    status: {key: 'active', label: 'Activo'},
    email: 'administracion.facturacion@estudiocomunicacionparaguay.com.py',
    phone: '+595 981 123 456',
    tax: '80012345-6',
    since: '14-sept-2024',
    projects: 12,
    pieces: 148,
    due: '17-sept',
    chip: {tone: 'mora-medium', label: '23 días de mora'},
    balance: 'Gs 1.234.567.890',
    missingPrice: true,
  },
  {
    name: 'Cooperativa Multiactiva de Servicios Múltiples Limitada',
    initials: 'CM',
    status: {key: 'paused', label: 'Pausado'},
    email: 'compras@coopservicios.com.py',
    phone: '+595 21 555 000',
    tax: '80098765-4',
    since: '02-ene-2023',
    projects: 3,
    pieces: 9,
    due: '30-oct',
    chip: {tone: 'mora-early', label: 'Vence 30-oct'},
    balance: 'USD 12.345,67',
  },
  {
    name: 'Fundación Niñez y Comunidad',
    initials: 'FN',
    status: {key: 'cancelled', label: 'Cancelado'},
    email: 'contacto@ninezcomunidad.org.py',
    phone: '+595 971 000 111',
    tax: '80055555-1',
    since: '18-jul-2025',
    projects: 1,
    pieces: 2,
    due: '05-nov',
    chip: {tone: 'mora-clear', label: 'Al día'},
    balance: 'Gs 0',
    archived: true,
  },
  {
    name: 'Cliente nuevo sin cartera ni plan cargado',
    initials: 'CN',
    status: {key: 'inactive', label: 'Inactivo'},
    email: '',
    phone: null,
    tax: null,
    since: null,
    projects: 0,
    pieces: 0,
    due: null,
    chip: null,
    balance: null,
    billing: false,
    missingPrice: true,
  },
];

const search16 = svg('search', 16, '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>');
const chevron16 = svg('chevron-down', 16, '<path d="m6 9 6 6 6-6"/>');
const plus18 = svg('plus', 18, '<path d="M5 12h14"/><path d="M12 5v14"/>');
const gridToggle20 = svg('grid-2x2', 20, '<path d="M12 3v18"/><path d="M3 12h18"/><rect x="3" y="3" width="18" height="18" rx="2"/>', ' stroke-width="2.25"');
const listToggle20 = svg('list', 20, '<path d="M3 12h.01"/><path d="M3 18h.01"/><path d="M3 6h.01"/><path d="M8 12h13"/><path d="M8 18h13"/><path d="M8 6h13"/>', ' stroke-width="2.25"');

const toolbar = `
<div class="flex flex-wrap items-end gap-3" aria-label="Controles del directorio de clientes">
 <div class="min-w-0 flex-1 basis-52"><h1 class="text-xl font-bold text-fore">Clientes</h1><p class="mt-0.5 text-xs text-mute" role="status" aria-atomic="true">Mostrando 4 clientes de 4 clientes</p></div>
 <div class="min-w-0 flex-1 basis-64"><div class="relative min-w-0"><span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mute" aria-hidden="true">${search16}</span><input class="h-11 w-full rounded-lg border border-ink-500 bg-ink-800 pl-9 pr-9 text-base text-fore outline-none transition placeholder:text-mute/60 focus:border-fono focus:ring-1 focus:ring-fono/40 md:h-9 md:text-sm" type="search" placeholder="Buscar por nombre, correo o teléfono" aria-label="Buscar clientes" value=""/></div></div>
 <div class="flex flex-col gap-1"><label class="block text-[11px] font-medium uppercase tracking-wider text-mute" for="clientes-estado">Estado</label><select id="clientes-estado" class="h-11 w-44 cursor-pointer rounded-lg border border-ink-500 bg-ink-800 px-3 text-base text-fore outline-none transition focus:border-fono focus:ring-1 focus:ring-fono/40 md:h-9 md:text-sm"><option>Todos los estados</option><option>Activo</option><option>Pausado</option><option>Cancelado</option><option>Servicio vencido</option><option>Inactivo</option></select></div>
 <div class="flex overflow-hidden rounded-lg border border-ink-600 bg-ink-800" role="group" aria-label="Cambiar vista"><button type="button" title="Ver como lista" aria-label="Ver como lista" aria-pressed="true" class="grid h-9 w-9 place-items-center bg-fono/15 text-fono-light">${listToggle20}</button><button type="button" title="Ver como cuadrícula" aria-label="Ver como cuadrícula" aria-pressed="false" class="grid h-9 w-9 place-items-center text-mute">${gridToggle20}</button></div>
 <button type="button" class="secondary">Guía del panel</button>
 <button type="button" class="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-fono px-4 text-sm font-semibold text-onbrand transition hover:bg-fono-light md:h-9">${plus18} Nuevo cliente</button>
</div>`;

export default [
  {
    id: 'clientes-lista',
    section: 'Clientes',
    surface: 'Directorio en lista',
    kind: 'workspace',
    lists: [
      {
        container: '.client-hub-list',
        head: '.client-hub-head-row',
        row: '.client-hub-list .client-hub-card',
        label: 'Clientes · lista',
        template: '--client-cols',
        rowHeight: [44, 52],
      },
    ],
    body: `${toolbar}
<div class="client-hub-list">${headRow}${cards.map(clientCard).join('')}</div>`,
  },
  {
    id: 'clientes-cuadricula',
    section: 'Clientes',
    surface: 'Directorio en cuadrícula',
    kind: 'workspace',
    grids: [{container: '.client-hub-grid', card: '.client-hub-card', label: 'Clientes · cuadrícula', minHeight: 200}],
    body: `<div class="client-hub-grid">${cards.map(clientCard).join('')}</div>`,
  },
];

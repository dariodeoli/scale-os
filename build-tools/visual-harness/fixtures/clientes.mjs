/*
 * Reference fixture: Clientes directory (list + grid).
 * Markup mirrors app/scale-workspace.tsx ClientHubCard (lines ~270-331) and
 * the real classes in app/client-directory.css. Stress values are deliberate:
 * long names, long emails, big amounts, long serials.
 */

const clientCard = ({name, initials, status, email, phone, tax, since, projects, pieces, due, chip, balance, missingPrice = false, archived = false}) => `
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
  <div><dt>Correo</dt><dd title="${email}">${email}</dd></div>
  <div><dt>Teléfono</dt><dd title="${phone}">${phone}</dd></div>
  <div><dt>RUC</dt><dd title="${tax}">${tax}</dd></div>
  <div><dt>Cliente desde</dt><dd>${since}</dd></div>
 </dl>
 <div class="client-hub-stats" aria-label="Cartera del cliente">
  <span class="client-hub-stat"><b>${projects}</b> proyectos activos</span>
  <span class="client-hub-stat"><b>${pieces}</b> piezas en curso</span>
  <span class="client-hub-stat">Próxima entrega <b>${due}</b></span>
 </div>
 <div class="client-hub-chips">
  <span class="mora-chip ${chip.tone}">${chip.label}</span>
  <span class="client-hub-balance">Pendiente ${balance}</span>
  ${missingPrice ? '<span class="client-price-missing" title="Sin precio definido: editá el cliente y completá Plan y pago."><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7h.01M11 11h1v6h1"/></svg></span>' : ''}
 </div>
 <footer class="client-hub-actions">
  <button type="button" class="text-button"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z"/><circle cx="12" cy="12" r="3"/></svg>Abrir ficha</button>
  <a class="text-button whatsapp-button" href="#whatsapp" target="_blank" rel="noopener noreferrer"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2Z"/></svg>WhatsApp</a>
  <button type="button" class="text-button">Archivar</button>
  <div class="client-record-actions">
   <button class="icon-button" type="button" title="Editar" aria-label="Editar ${name}"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m15 5 4 4L8 20l-5 1 1-5Z"/></svg></button>
   <button class="icon-button" type="button" title="Eliminar" aria-label="Eliminar ${name}"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg></button>
  </div>
 </footer>
</article>`;

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
];

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
    body: `
<div class="client-directory-toolbar" aria-label="Controles del directorio de clientes">
 <div class="client-directory-toolbar-title"><h1>Clientes</h1><p class="directory-summary" role="status">Mostrando 3 clientes de 3 clientes</p></div>
 <label class="search-field client-directory-search"><span class="sr-only">Buscar clientes</span><input type="search" value="" placeholder="Buscar por nombre, correo o teléfono" aria-label="Buscar clientes"></label>
 <div class="ops-select"><span class="ops-select-label">Estado</span><button type="button" class="ops-select-trigger" aria-haspopup="listbox" aria-expanded="false"><span>Todos los estados</span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg></button></div>
 <div class="workspace-view-controls"><div role="group" aria-label="Vista de clientes"><button type="button" class="active" aria-pressed="true">Lista</button><button type="button" aria-pressed="false">Cuadrícula</button></div></div>
 <button type="button" class="primary client-directory-create"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>Nuevo cliente</button>
</div>
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

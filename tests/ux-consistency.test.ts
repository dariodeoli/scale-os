import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import {fechaLista} from 'owncoding-ui';
import {workspaceSource,sectionSource} from './workspace-source';

const read=(path:string)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('visible date-time values use the 24-hour clock',()=>{
  const listFormat=read('app/list-format.tsx');
  assert.match(listFormat,/from 'owncoding-ui'/,'app/list-format.tsx usa los objetos de fecha de la librería');
  assert.doesNotMatch(listFormat,/new Intl\.DateTimeFormat/,'app/list-format.tsx ya no arma fechas a mano');
  assert.match(listFormat,/hora: time/,'listDateFull delega la hora al helper compartido');
  // La librería rinde 24 h: 14:30 UTC son 11:30 en Asunción, nunca «11:30 a. m.».
  assert.equal(fechaLista('2026-09-17T14:30:00.000Z','',{timeZone:'America/Asuncion'}),'17 sept 26 · 11:30');
  for(const file of ['app/actor-identity.tsx','app/notification-inbox.tsx','app/presence.tsx','app/productivity-ui.tsx','app/inventory-workspace.tsx']){
    const source=read(file);
    assert.ok(/listDate(Full|Short)|fechaLista(Corta)?\(/.test(source)||/hourCycle:'h23'/.test(source),`${file} renders 24-hour time through the shared format`);
  }
});

test('icon-only actions explain themselves on hover',()=>{
  const expectations:[string,RegExp][]=[
    ['app/production-board.tsx',/title=\{`Mover \$\{order\.title\}`\}/],
    ['app/sections/pipeline.tsx',/title=\{`Mover \$\{str\(row,'name'\)\}`\}/],
    ['app/inventory-workspace.tsx',/title=\{`Mover \$\{item\.name\}`\}/],
    ['app/quote-composer.tsx',/title=\{`Reordenar \$\{itemLabel\}`\}/],
    ['app/dialog.tsx',/title="Cerrar"/],
    ['app/photo-viewer.tsx',/title="Cerrar foto ampliada"/],
    ['app/mobile-navigation.tsx',/title="Abrir menú"/],
    ['app/mobile-navigation.tsx',/title="Cerrar menú"/],
    ['app/notification-inbox.tsx',/ariaLabel="Notificaciones"/],
  ];
  for(const [file,pattern] of expectations)assert.match(read(file),pattern,`${file} keeps the hover label`);
});

test('every list view carries the same column-header and alignment contract',()=>{
  const workspace=workspaceSource();
  assert.match(workspace,/CLIENT_COLUMNS: Column\[\] = \[[\s\S]*?Cliente[\s\S]*?Datos[\s\S]*?Estado[\s\S]*?Cobros[\s\S]*?Actividad[\s\S]*?Acciones/,'the client list declares its column header');
  assert.match(workspace,/ListGrid label="Clientes" template=\{CLIENT_TEMPLATE\}/,'header and rows share one client template');
  assert.match(workspace,/PROJECT_COLUMNS: Column\[\] = \[[\s\S]*?Proyecto[\s\S]*?Estado[\s\S]*?Fechas y piezas[\s\S]*?Responsables[\s\S]*?Acciones/,'the project list declares its column header');
  assert.match(workspace,/ListGrid label=\{label\} template="grid-cols-\[var\(--project-cols\)\]" columns=\{PROJECT_COLUMNS\}/,'the project header consumes the shared template');
  const operations=read('app/operations.tsx');
  assert.match(operations,/person-hub-head-row[\s\S]*?Persona[\s\S]*?Datos[\s\S]*?Estado/,'the team list shows its column header');
  const clientes=sectionSource('clientes.tsx');
  assert.match(clientes,/ListRow template=\{CLIENT_TEMPLATE\} className="client-hub-row"/,'client rows consume the shared template');
  const team=read('app/operations.css');
  assert.match(team,/\.person-hub-head-row\{display:grid/);
  // Encabezado y filas comparten UNA plantilla por lista (variable CSS o clase Tailwind).
  assert.match(team,/--person-cols:[\s\S]*?grid-template-columns:var\(--person-cols\)[\s\S]*?\.person-hub-head-row\{display:grid;grid-template-columns:var\(--person-cols\)/,'team header and rows share --person-cols');
  const projectCard=read('app/project-card.tsx');
  assert.match(projectCard,/\[\.project-list_&\]:grid-cols-\[var\(--project-cols\)\]/,'project rows consume --project-cols');
});

test('the client directory keeps one template, ordered row actions and shared date formats',()=>{
  const clientes=sectionSource('clientes.tsx');
  assert.match(clientes,/const CLIENT_TEMPLATE = 'grid-cols-\[minmax\(11rem,1\.35fr\)_minmax\(9\.5rem,1\.15fr\)_6rem_minmax\(15rem,1\.15fr\)_minmax\(9rem,\.95fr\)_14rem\]'/,'la lista de clientes declara una sola plantilla (pistas afinadas en #77)');
  assert.match(clientes,/ListRow template=\{CLIENT_TEMPLATE\} className="client-hub-row"/,'la fila finita usa la plantilla del encabezado y no viste la clase de tarjeta');
  assert.match(clientes,/<ListActions className="client-row-actions silent-scroll">/,'la celda de acciones usa la primitiva fija de ui-v2');
  assert.match(clientes,/IconAction icon="eye"[\s\S]*?client-record-actions/,'la fila conserva el orden de acciones compartido');
  assert.match(clientes,/client-hub-card flex min-h-\[200px\]/,'la tarjeta conserva su cápsula grande');
  assert.match(clientes,/MoneyText/,'los saldos de la fila salen del formateador compartido v2');
  const workspace=workspaceSource();
  assert.match(workspace,/archived-capsule[\s\S]*?ListGrid label="Clientes archivados" template=\{CLIENT_TEMPLATE\}/,'the archived list carries the same column header');
  assert.match(workspace,/fechaListaCorta\(stat\.nextDue\)/,'las fechas de la cartera salen del formato de la librería (#75)');
  assert.doesNotMatch(workspace,/client-hub-balance/,'row balances use the shared money formatter');
});

test('every visible clock is 24-hour and the trash list carries its columns',()=>{
  for(const file of ['app/account-security.tsx','app/deletion-danger-zone.tsx','app/studio-workspace.tsx','app/studio-data.ts']){
    const source=read(file);
    assert.doesNotMatch(source,/timeStyle:\s*'short'/,`no 12-hour timeStyle survives in ${file}`);
  }
  // El reloj compartido del OPS vive ahora en la capa de datos (spec #44).
  for(const file of ['app/deletion-danger-zone.tsx','app/ops-time.ts']){
    assert.match(read(file),/hourCycle:\s*'h23'/,`${file} keeps the 24-hour clock`);
  }
  // La seguridad de cuenta usa la util de fechas de la librería (24 h por contrato).
  assert.match(read('app/account-security.tsx'),/fechaHora\(/,'account security renders dates through the shared 24-hour helper');
  const archive=read('app/archive-controls.tsx');
  assert.match(archive,/TRASH_COLUMNS=\[\{key:'select',label:''\},\{key:'kind',label:'Tipo'\},\{key:'record',label:'Registro'\},\{key:'actions',label:'Acciones'\}\]/,'the trash list shows its column header');
  assert.match(archive,/TRASH_TEMPLATE='grid-cols-\[2rem_8\.5rem_minmax\(16rem,2\.4fr\)_7rem\]'/,'the trash rows share the v2 template literal with their header');
  assert.match(archive,/ListGrid label="Papelera" template=\{TRASH_TEMPLATE\}/,'the trash list uses the shared v2 template');
  const integrations=read('app/suite.tsx');
  assert.match(integrations,/settings-integration-head[\s\S]*?Integración[\s\S]*?Estado/,'the integrations list shows its header');
  const invites=read('app/invite-links.tsx');
  assert.match(invites,/REQUESTS_COLUMNS=\[\{key:'person',label:'Persona'\}/,'invite requests show their column header');
  assert.match(invites,/LINKS_COLUMNS=\[\{key:'link',label:'Enlace'\}/,'invite links show their column header');
  assert.match(invites,/REQUESTS_TEMPLATE='grid-cols-\[minmax\(11rem,1\.5fr\)_minmax\(12rem,1\.5fr\)_6\.5rem_7\.5rem_5\.5rem_14rem\]'/,'invite requests share the v2 template literal with their header');
  assert.match(invites,/LINKS_TEMPLATE='grid-cols-\[minmax\(12rem,1\.6fr\)_8rem_minmax\(11rem,1\.2fr\)_minmax\(10rem,1\.2fr\)_12rem\]'/,'invite links share the v2 template literal with their header');
  assert.match(invites,/ListGrid label="Solicitudes de acceso"[\s\S]*?ListGrid label="Enlaces de invitación"/,'both lists use the shared v2 ListGrid');
});

test('clients, projects and trash support bulk operations',()=>{
  const workspace=workspaceSource();
  assert.match(workspace,/batchClients[\s\S]*?\/api\/agency\/clients\/batch/,'clients archive in one batch call');
  assert.match(workspace,/batchProjects[\s\S]*?\/api\/agency\/projects\/batch/,'projects archive in one batch call');
  assert.match(workspace,/selectVisibleClients/,'clients can select the visible set');
  assert.match(workspace,/selectVisibleProjects/,'projects can select the visible set');
  const archive=read('app/archive-controls.tsx');
  assert.match(archive,/restoreBatch[\s\S]*?\/restore/,'trash restores the selection');
  const projectCard=read('app/project-card.tsx');
  assert.match(projectCard,/select-check[\s\S]*?Seleccionar \$\{project\.name\}/,'project cards expose the selection checkbox');
  const system=read('app/ui-system.css');
  assert.match(system,/\.select-check\{display:flex/);
  assert.match(system,/\.bulk-bar\{display:flex/);
});

test('finance panels use column headers and the shared money formatter',()=>{
  const workspace=workspaceSource();
  assert.doesNotMatch(workspace,/Intl\.NumberFormat\("es-PY"/,'amounts go through money(), not inline formatters');
  const finanzas=sectionSource('finanzas.tsx');
  assert.match(finanzas,/ListGrid label="Transferencias entre cuentas"/,'la lista de transferencias trae su encabezado');
  assert.match(finanzas,/ListGrid label="Cobros pendientes"/,'la lista de cobros pendientes trae su encabezado');
  assert.match(finanzas,/ListGrid label="Cobros registrados"/,'la lista de cobros registrados trae su encabezado');
  for(const template of ['TRANSFER_TEMPLATE','INVOICE_TEMPLATE','PAYMENT_TEMPLATE'])assert.match(finanzas,new RegExp(`const ${template}\\s*=\\s*'grid-cols-\\[`),`${template} declara su plantilla`);
  const mora=sectionSource('mora.tsx');
  assert.match(mora,/ListGrid label="Cobranza por cliente"/,'la lista de cobranza trae su encabezado');
  assert.match(mora,/const MORA_TEMPLATE\s*=\s*'grid-cols-\[/,'la cobranza declara su plantilla');
  const styles=read('app/operations.css');
  assert.match(styles,/\.finance-row-head\{display:grid/);
  assert.match(styles,/\.finance-grid :is\(\.finance-transfer-row,.finance-invoice-row,.finance-payment-row\)\{display:grid/);
  const operations=read('app/operations.tsx');
  assert.doesNotMatch(operations,/finance-row-head|ReferralDiscounts/,'los pagos y descuentos a colaboradores viven en Finanzas, no en Equipo');
  assert.match(styles,/\.control-shell :is\(\.finance-payout-row,.finance-referral-row\)\{display:grid/);
  const forecast=read('app/financial-forecast.tsx');
  assert.match(forecast,/const EXPENSE_COLS='grid-cols-\[minmax\(0,1fr\)_8\.5rem_5rem\]'/,'real expenses declare one shared template');
  assert.match(forecast,/LIST_HEAD,EXPENSE_COLS\)[^>]*><span role="columnheader">Gasto<\/span><span role="columnheader" className="text-right">Monto<\/span>/,'real expenses show their header');
  assert.match(forecast,/cn\(LIST_ROW,EXPENSE_COLS\)/,'real expense rows share the header template');
});

test('the team list can suspend and reactivate access in bulk',()=>{
  const operations=read('app/operations.tsx');
  assert.match(operations,/batchSetAccess[\s\S]*?\/api\/agency\/members\/\$\{id\}/,'bulk access updates each selected member');
  assert.match(operations,/Suspender acceso[\s\S]*?Reactivar acceso/,'the team bulk bar exposes both access actions');
  assert.match(operations,/selectVisibleAccess/,'the team list can select the visible people');
  assert.match(operations,/select-check[\s\S]*?Seleccionar \$\{p\.full_name\}/,'member rows expose the selection checkbox');
  const agents=read('AGENTS.md');
  assert.match(agents,/Excepción \(decisión 17-09\)[\s\S]*?feeds de tarjetas apiladas/,'the card-feed exception stays documented');
  assert.match(agents,/Excepción de contrato \(decisión 17-09\)[\s\S]*?formatWholeMoney/,'the whole-money contract exception stays documented');
});

test('statement rows and projected payroll keep fixed columns',()=>{
  const controls=read('app/daily-controls.tsx');
  assert.match(controls,/const STATEMENT_COLS='grid-cols-\[minmax\(0,1fr\)_7rem_8\.5rem_5rem\]'/,'the reconciliation list declares one shared template');
  assert.match(controls,/role="row" className=\{cn\(STATEMENT_HEAD,STATEMENT_COLS\)\}[^>]*><span role="columnheader">Extracto<\/span><span role="columnheader">Estado<\/span><span role="columnheader" className="text-right">Monto<\/span><span role="columnheader" className="text-right">Acciones<\/span>/,'the reconciliation list shows its header');
  assert.match(controls,/cn\(STATEMENT_ROW,STATEMENT_COLS\)/,'statement rows share the header template');
  assert.doesNotMatch(controls,/payment-row statement-row/,'statement rows left the legacy grid');
  const forecast=read('app/financial-forecast.tsx');
  assert.match(forecast,/forecast-person-who/,'avatar and name share the first column');
  assert.match(forecast,/forecast-person-override is-empty/,'a missing adjustment reserves its column');
  assert.match(forecast,/const PERSON_COLS='grid-cols-\[minmax\(16rem,1\.2fr\)_minmax\(7rem,\.9fr\)_minmax\(8rem,\.9fr\)_minmax\(8rem,\.9fr\)_6\.5rem\]'/,'the payroll list declares one shared template');
  assert.match(forecast,/cn\(LIST_ROW,PERSON_COLS,'forecast-person-row'\)/,'payroll rows share the header template');
});

test('lists are thin rows and grids are big distributed cards',()=>{
  const uiV2=read('app/ui-v2.tsx');
  assert.match(uiV2,/export function ListRow[\s\S]*?min-h-12[\s\S]*?md:min-h-11/,'las filas v2 mantienen el contrato de altura fina');
  const clientes=sectionSource('clientes.tsx');
  assert.match(clientes,/min-h-\[200px\][\s\S]*?flex-col/,'client cards keep a big grid height');
  const team=read('app/operations.css');
  assert.match(team,/\.control-shell \.ops-grid\.ops-grid-list>\.person-hub-card\.is-list\{display:grid;grid-template-columns:var\(--person-cols\)[\s\S]*?min-height:44px/,'team rows stay thin');
  // Inventario y reservas se rediseñaron a la v2 (campaña #41): ya no tienen
  // hoja propia y su plantilla se declara una sola vez en el módulo. El detalle
  // de esa lista lo cubre `tests/ops-v2-contract.test.ts`.
  const inventory=read('app/inventory-workspace.tsx');
  assert.match(inventory,/const EQUIPMENT_COLS='\[--eq-cols:[\s\S]*?const EQUIPMENT_GRID='grid grid-cols-\[var\(--eq-cols\)\] items-center gap-x-2'/,'inventory declares one list template');
  assert.match(inventory,/const RESERVATION_COLS='\[--rsv-cols:[\s\S]*?const RESERVATION_GRID='grid grid-cols-\[var\(--rsv-cols\)\] items-center gap-x-2'/,'reservation rows share their template');
  assert.equal((inventory.match(/\$\{EQUIPMENT_GRID\}/g)||[]).length,2,'the equipment header and rows share the template');
  assert.equal((inventory.match(/\$\{RESERVATION_GRID\}/g)||[]).length,2,'the reservation header and rows share the template');
  // #99 (densidad integral): la altura de la tarjeta la define el contenido.
  assert.doesNotMatch(inventory,/min-h-\[200px\]/,'inventory cards no longer reserve a fixed grid height (#99)');
  for(const line of inventory.split('\n'))if(line.includes('truncate'))assert(line.includes('title='),'inventory offers the full value for every truncated text');
  assert.doesNotMatch(inventory,/truncate[^>]*(CeldaMoneda|SerialTexto|listDate)/,'inventory never truncates amounts, dates or serials');
  const projectCards=read('app/project-card.tsx');
  assert.doesNotMatch(projectCards,/min-h-\[200px\]/,'project cards no longer reserve a fixed grid height (#99)');
  const agents=read('AGENTS.md');
  assert.match(agents,/Lista vs\. cuadrícula \(regla 17-09\)[\s\S]*?filas finitas[\s\S]*?tarjetas grandes/,'the list/grid contract stays documented');
  const forecast=read('app/financial-forecast.tsx');
  assert.match(forecast,/const CONTRACT_COLS='grid-cols-\[minmax\(22rem,1fr\)_9rem_9rem_9rem\]'/,'contracted clients declare one shared template');
  assert.match(forecast,/role="row" className=\{cn\(LIST_HEAD,CONTRACT_COLS\)\}[^>]*><span role="columnheader">Cliente<\/span><span role="columnheader" className="text-right">Contratado<\/span><span role="columnheader" className="text-right">Facturado<\/span>/,'contracted clients show their header');
  assert.match(forecast,/const LIST_ROW='grid min-h-11 items-center gap-x-2 border-b border-ink-600\/60 px-2 py-0\.5 transition-colors last:border-0 hover:bg-ink-700\/40 md:py-2'/,'list rows keep the thin row contract with the system hover');
  // QA ola 2 (#70): targets táctiles y foco del modal de cuenta en la vertical FIN.
  const mora=sectionSource('mora.tsx'),finanzas=sectionSource('finanzas.tsx'),forms=read('app/workspace-forms.tsx');
  assert.match(mora,/\[&>button\]:min-h-11 md:\[&>button\]:min-h-8/,'el filtro de mora tiene target de 44 px en mobile');
  assert.match(forecast,/const ICON_TARGETS=/,'las acciones de fila de la previsión declaran su target táctil');
  assert.match(finanzas,/const INVOICE_TEMPLATE = 'grid-cols-\[minmax\(18rem,1\.6fr\)_7rem_6\.5rem_8\.5rem_8\.5rem_9rem\]'/,'la columna de acciones de facturas no envuelve el botón');
  assert.doesNotMatch(forms,/Nombre de la cuenta[\s\S]{0,120}?autoFocus/,'la cuenta no roba el foco al abrir el modal');
  // #97: el piso de las tarjetas de cuadrícula es del sistema (compacto); la
  // homogeneidad por fila la da el grid, no un `min-height` grande.
  assert.match(team,/\.team-directory-card\{[^}]*min-height:var\(--ui-card-min-height,120px\)/,'the directory cards use the compact floor');
  const presence=read('app/presence.css');
  assert.match(presence,/\.usage-grid \.ops-card\{[^}]*min-height:var\(--ui-card-min-height,120px\)/,'usage cards use the compact floor');
  const productivity=read('app/productivity-ui.tsx');
  assert.match(productivity,/drawer-list-head[\s\S]*?Proyecto[\s\S]*?Pieza[\s\S]*?Presupuesto[\s\S]*?Factura/,'the client drawer lists show their headers');
  const productivityCss=read('app/productivity.css');
  assert.match(productivityCss,/\.drawer-list\{--drawer-cols:[\s\S]*?\.drawer-list \.activity-line\{display:grid;grid-template-columns:var\(--drawer-cols\)[\s\S]*?min-height:44px/,'drawer rows use thin shared templates');
});

test('dense list templates keep a silent horizontal escape hatch',()=>{
  const team=read('app/operations.css');
  assert.match(team,/\.control-shell \.ops-grid\.ops-grid-list\{grid-template-columns:minmax\(0,1fr\);overflow-x:auto;overscroll-behavior-x:contain;scrollbar-width:none/,'the team list wins over the card grid and scrolls instead of spilling out of its panel');
  assert.match(team,/\.ops-grid-list::-webkit-scrollbar\{display:none\}/,'the team list keeps the scroll silent');
  const uiV2=read('app/ui-v2.tsx');
  assert.match(uiV2,/silent-scroll min-w-0 overflow-x-auto/,'la lista v2 conserva el scroll horizontal silencioso');
  const tailwind=read('app/tailwind.css');
  assert.match(tailwind,/\.silent-scroll::-webkit-scrollbar \{\n  display: none;\n\}/,'the client list keeps its scroll escape hatch silent');
});

test('the client portal styles every list it renders',()=>{
  const portal=read('app/cliente/portal.css');
  for(const cls of ['delivery-list','delivery','delivery-activity'])assert.match(portal,new RegExp(`\\.${cls}\\{`),`the portal styles .${cls}`);
  assert.match(portal,/\.delivery-activity\{list-style:none/,'the delivery activity drops the native bullets');
});

test('the rail navigation keeps one geometry for links and the logout button',()=>{
  const rail=read('app/desktop-sidebar.tsx');
  assert.match(rail,/export const RAIL_ITEM='[^']*min-h-11[^']*font-semibold[^']*'/,'the rail exposes one item geometry for links and buttons');
  assert.match(rail,/hover:bg-white\/10 hover:text-white/,'the rail keeps its hover state');
  const drawer=read('app/mobile-navigation.tsx');
  assert.match(drawer,/\[&_a\]:min-h-11 \[&_button\]:min-h-11/,'the mobile drawer styles the logout button with the link geometry');
  const workspace=workspaceSource();
  assert.match(workspace,/navItemClass\(false,tone\)/,'the logout button keeps its rail slot');
  assert.match(workspace,/nav-logout/,'the logout button keeps its rail slot');
});

console.log('PASS: 24-hour times and hover labels stay wired across the app surfaces');

// ── Rediseño del marco (ronda 8): nav con tiles, acento y pie de usuario ────
{
 const shell=read('app/scale-workspace.tsx');
 assert.match(shell,/const NAV_ICON='nav-icon grid size-7 shrink-0 place-items-center rounded-lg transition'/,'los ítems del nav usan un tile de ícono único');
 assert.match(shell,/before:bg-gold/,'el ítem activo del riel marca con la barra dorada');
 assert.match(shell,/focus-visible:ring-2 focus-visible:ring-white\/70/,'el foco del riel es visible sobre el lila');
 assert.match(shell,/const navIconClass=/,'el tile tiene tono por superficie (riel/drawer)');
 assert.match(shell,/nav-icon/,'y la clase queda en el DOM para medirla');
 const drawer=read('app/mobile-navigation.tsx');
 assert.match(drawer,/mobile-sidebar-heading sticky/,'el encabezado del drawer queda fijo al scrollear');
 assert.match(drawer,/shadow-2xl/,'el drawer se separa del contenido');
 assert.match(shell,/rounded-xl px-2 py-1\.5/,'el pie de usuario es una tarjeta con padding propio');
 const uiV2=read('app/ui-v2.tsx');
 assert.match(uiV2,/h-11 w-full rounded-xl/,'los esqueletos de carga usan el alto de fila del sistema');
 assert.match(uiV2,/hover:bg-ink-700\/40/,'las filas de lista tienen hover en ambos temas');
}
console.log('PASS rediseño del marco: tiles de nav, acento activo, drawer fijo y estados');

// ── Nav v3 (#68) y acceso a la administración (#69) ─────────────────────────
{
 const shell=read('app/scale-workspace.tsx');
 // Nav v3: 5 grupos, acordeón del grupo activo, hojas sólo cuando está abierto.
 assert.match(shell,/NAV_GROUP_ICONS/,'el nav v3 define los íconos de los 5 grupos');
 assert.match(shell,/nav-group-toggle/,'el grupo desplegable es un botón con estado');
 assert.match(shell,/aria-expanded=\{open\}/,'el grupo anuncia si está expandido');
 assert.match(shell,/className="nav-leaves grid gap-1 pl-3"/,'las hojas del grupo se renderizan sólo al abrir');
 assert.match(shell,/setOpenNavGroup\(current=>current===group\?null:group\)/,'un solo grupo abierto a la vez (acordeón)');
 assert.match(shell,/groupTitle=containsActive&&activeParent!==group\?`\$\{group\} · \$\{activeParent\}`:group/,'el tooltip del grupo activo nombra el módulo y el grupo');
 assert.match(shell,/if\(modules\.length===1\|\|collapsed\)/,'los grupos de un módulo y el riel colapsado navegan directo');
 // #72: el encabezado del grupo navega a su primer módulo (el activo conserva
 // el acordeón) y el drawer cierra al navegar desde el encabezado.
 assert.match(shell,/function openNavGroupAt\(group:string,module:string\)\{setOpenNavGroup\(group\);setActive\(allowedChildren\(module\)\[0\]\);\}/,'el encabezado navega al primer módulo del grupo y lo deja expandido');
 assert.match(shell,/const navigates=!containsActive/,'el grupo activo conserva expandir/contraer y el resto navega');
 assert.match(shell,/\{\.\.\.\(navigates\?\{'data-nav-navigate':true\}:\{\}\)\}/,'el encabezado navegable se marca para cerrar el drawer');
 assert.match(read('app/mobile-navigation.tsx'),/closest\('a\[href\],\[data-nav-navigate\]'\)/,'el drawer cierra al navegar desde el encabezado del grupo');
 // #69: Administración de Scale, encima del perfil, sólo si el servidor lo marca.
 assert.match(shell,/user\?\.platform_role==='admin'&&<a className=\{`nav-admin/,'el acceso admin depende de platform_role del servidor');
 assert.match(shell,/href="https:\/\/admin\.scaleparaguay\.com" target="_blank" rel="noopener noreferrer"/,'abre el host de administración en una pestaña segura');
 const adminIndex=shell.indexOf('nav-admin'),profileIndex=shell.indexOf('profile-footer');
 assert(adminIndex>=0&&profileIndex>=0&&adminIndex<profileIndex,'el acceso admin queda encima de la ficha de perfil');
 const rail=read('app/desktop-sidebar.tsx');
 assert.match(rail,/\[&_\.nav-admin\]:h-11 \[&_\.nav-admin\]:w-11/,'el acceso admin respeta el riel colapsado (44 px, sin cortes)');
 // Compactación desktop (#89): encabezado, tabs y KPI con un solo contrato en
 // ui-system.css (medido con el harness: work/visual-harness/compact-*.json).
 const uiSystem=read('app/ui-system.css'),controlCenter=read('app/control-center.css');
 assert.match(uiSystem,/\/\* ── Encabezado de página \(#89\)/, 'el encabezado de página declara su contrato en la hoja del sistema');
 assert.match(uiSystem,/@media\(min-width:1280px\)\{[\s\S]{0,600}?\.control-shell :is\(\.workspace-page-header,\.ui-page-header\)\{flex-wrap:nowrap;align-items:center;gap:var\(--ui-space-4\);min-height:56px/,'en ≥1280 el encabezado es una sola fila de 56 px');
 assert.match(uiSystem,/\.control-shell :is\(\.workspace-page-header,\.ui-page-header\) h1\{margin:0;white-space:nowrap\}/,'el título no envuelve ni aporta margen en la fila compacta');
 assert.match(uiSystem,/\.control-shell \.section-tabs>a\{flex:none;display:inline-flex;align-items:center;min-height:34px/,'las tabs son una barra compacta en escritorio');
 assert.match(uiSystem,/@media\(max-width:760px\)\{[\s\S]{0,240}?\.control-shell \.section-tabs>a\{min-height:44px/,'en móvil cada tab conserva el target de 44 px');
 assert.match(uiSystem,/\.control-shell \.section-tabs\{[^}]*overflow-x:auto;overflow-y:hidden/,'la barra de tabs scrollea en horizontal sin apilarse');
 assert.match(uiSystem,/@media\(min-width:768px\)\{[\s\S]{0,160}?\.control-shell \.ui-kpi>div:nth-child\(2\)\{font-size:28px;line-height:1\.15\}/,'el KPI compacta su valor en escritorio');
 assert.doesNotMatch(controlCenter,/\.control-shell \.section-tabs\{/,'las reglas legadas de tabs se retiraron: fuente única en ui-system.css');
 assert.match(read('app/ui-v2.tsx'),/data-toolbar="filtros" className=\{`mb-4 flex flex-wrap items-end gap-3 xl:flex-nowrap/,'la toolbar declara su hook y una fila desde xl');
 assert.match(read('app/ui-v2.tsx'),/ui-kpi-strip grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4/,'el strip de KPIs conserva su grilla 1/2/4');
 // FOUT (#76): las fuentes críticas del marco se precargan y no hacen swap.
 const layoutSource=read('app/layout.tsx');
 assert.match(layoutSource,/rel="preload" href="\/fonts\/s\/outfit\/v15\/QGYvz_MVcBeNP4NJtEtqUYLknw\.woff2" as="font" type="font\/woff2" crossOrigin="anonymous"/,'Outfit latin se precarga como fuente');
 assert.match(layoutSource,/rel="preload" href="\/fonts\/s\/dmmono\/v16\/aFTU7PB1QTsUX8KYthqQBK6PYK0\.woff2" as="font" type="font\/woff2" crossOrigin="anonymous"/,'DM Mono 400 latin se precarga como fuente');
 const fontsSheet=read('app/fonts.css');
 assert(fontsSheet.includes('font-display: optional')&&!fontsSheet.includes('font-display: swap'),'las fuentes usan optional: sin swap tardío en la carga');
 // QA de marco (#70): el legado `nav button*` no pisa los tonos del nav v3 y el
 // marco apaga motion; el tema móvil conserva targets de 44.
 const tailwind=read('app/tailwind.css');
 assert.match(tailwind,/:is\(\.shell,\.control-shell\)>\.desktop-sidebar nav button\.active\{background:rgb\(255 255 255 \/ \.14\);color:#fff\}/,'el grupo activo del riel no hereda fondo/color legacy');
 assert.match(tailwind,/nav button svg\{color:currentColor\}/,'el SVG del nav hereda el tono del tile (no brand-600 legacy)');
 assert.match(tailwind,/\(prefers-reduced-motion:reduce\)\{\n :is\(\.desktop-sidebar,\.workspace-topbar,\.mobile-sidebar\),\n :is\(\.desktop-sidebar,\.workspace-topbar,\.mobile-sidebar\) \*\{transition:none!important;animation:none!important\}/,'el marco apaga transiciones y animaciones con reduced motion');
 assert.match(read('app/theme-toggle.css'),/@media\(max-width:767px\)\{\.theme-toggle\{width:44px/,'el cambio de tema usa target de 44 px en móvil');
 assert.match(read('app/workspace-footer.tsx'),/import \{ProductFooter[^}]*\} from 'owncoding-ui'/,'el pie institucional es el objeto de la biblioteca: el crédito trae su target de 44 px');
}
console.log('PASS nav v3: 5 grupos con acordeón y acceso admin gateado por servidor (Issues #68 #69)');

import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import {workspaceSource,sectionSource} from './workspace-source';

const read=(path:string)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('visible date-time values use the 24-hour clock',()=>{
  assert.match(read('app/list-format.tsx'),/hourCycle:\s*'h23'/,`app/list-format.tsx renders 24-hour time`);
  for(const file of ['app/actor-identity.tsx','app/notification-inbox.tsx','app/presence.tsx','app/productivity-ui.tsx','app/inventory-workspace.tsx']){
    const source=read(file);
    assert.ok(/listDate(Full|Short)/.test(source)||/hourCycle:'h23'/.test(source),`${file} renders 24-hour time through the shared format`);
  }
});

test('icon-only actions explain themselves on hover',()=>{
  const expectations:[string,RegExp][]=[
    ['app/production-board.tsx',/title=\{`Mover \$\{order\.title\}`\}/],
    ['app/suite.tsx',/title=\{`Mover \$\{str\(row,'name'\)\}`\}/],
    ['app/inventory-workspace.tsx',/title=\{`Mover \$\{item\.name\}`\}/],
    ['app/quote-composer.tsx',/title="Reordenar ítem"/],
    ['app/dialog.tsx',/title="Cerrar"/],
    ['app/photo-viewer.tsx',/title="Cerrar foto ampliada"/],
    ['app/mobile-navigation.tsx',/title="Abrir menú"/],
    ['app/mobile-navigation.tsx',/title="Cerrar menú"/],
    ['app/notification-inbox.tsx',/title="Notificaciones"/],
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
  assert.match(clientes,/const CLIENT_TEMPLATE = 'grid-cols-\[minmax\(13rem,1\.6fr\)_minmax\(11rem,1\.15fr\)_7rem_15rem_9rem_16rem\]'/,'la lista de clientes declara una sola plantilla');
  assert.match(clientes,/ListRow template=\{CLIENT_TEMPLATE\} className="client-hub-row"/,'la fila finita usa la plantilla del encabezado y no viste la clase de tarjeta');
  assert.match(clientes,/silent-scroll flex min-w-0 items-center gap-1 overflow-x-auto/,'las acciones de la fila scrollean en silencio y cierran a la derecha');
  assert.match(clientes,/IconAction icon="eye"[\s\S]*?client-record-actions/,'la fila conserva el orden de acciones compartido');
  assert.match(clientes,/client-hub-card flex min-h-\[200px\]/,'la tarjeta conserva su cápsula grande');
  assert.match(clientes,/MoneyText/,'los saldos de la fila salen del formateador compartido v2');
  const workspace=workspaceSource();
  assert.match(workspace,/archived-capsule[\s\S]*?ListGrid label="Clientes archivados" template=\{CLIENT_TEMPLATE\}/,'the archived list carries the same column header');
  assert.match(workspace,/listDateShort\(stat\.nextDue\)/,'client due dates use the shared short format');
  assert.doesNotMatch(workspace,/client-hub-balance/,'row balances use the shared money formatter');
});

test('every visible clock is 24-hour and the trash list carries its columns',()=>{
  for(const file of ['app/account-security.tsx','app/deletion-danger-zone.tsx','app/studio-workspace.tsx','app/studio-data.ts']){
    const source=read(file);
    assert.doesNotMatch(source,/timeStyle:\s*'short'/,`no 12-hour timeStyle survives in ${file}`);
  }
  // El reloj compartido del OPS vive ahora en la capa de datos (spec #44).
  for(const file of ['app/account-security.tsx','app/deletion-danger-zone.tsx','app/ops-time.ts']){
    assert.match(read(file),/hourCycle:\s*'h23'/,`${file} keeps the 24-hour clock`);
  }
  const archive=read('app/archive-controls.tsx');
  assert.match(archive,/TRASH_COLUMNS=\[\{key:'select',label:''\},\{key:'kind',label:'Tipo'\},\{key:'record',label:'Registro'\},\{key:'actions',label:'Acciones'\}\]/,'the trash list shows its column header');
  assert.match(archive,/TRASH_TEMPLATE='grid-cols-\[2rem_7rem_minmax\(16rem,2\.4fr\)_7rem\]'/,'the trash rows share the v2 template literal with their header');
  assert.match(archive,/ListGrid label="Papelera" template=\{TRASH_TEMPLATE\}/,'the trash list uses the shared v2 template');
  const integrations=read('app/suite.tsx');
  assert.match(integrations,/settings-integration-head[\s\S]*?Integración[\s\S]*?Estado/,'the integrations list shows its header');
  const invites=read('app/invite-links.tsx');
  assert.match(invites,/REQUESTS_COLUMNS=\[\{key:'request',label:'Solicitud'\}/,'invite requests show their column header');
  assert.match(invites,/LINKS_COLUMNS=\[\{key:'link',label:'Enlace'\}/,'invite links show their column header');
  assert.match(invites,/REQUESTS_TEMPLATE='grid-cols-\[minmax\(16rem,2\.4fr\)_15rem\]'/,'invite requests share the v2 template literal with their header');
  assert.match(invites,/LINKS_TEMPLATE='grid-cols-\[minmax\(18rem,2\.4fr\)_15rem\]'/,'invite links share the v2 template literal with their header');
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
  assert.match(operations,/finance-row-head[\s\S]*?Egreso[\s\S]*?Referido/,'payouts and referral discounts show their headers');
  assert.match(styles,/\.control-shell :is\(\.finance-payout-row,.finance-referral-row\)\{display:grid/);
  const forecast=read('app/financial-forecast.tsx');
  assert.match(forecast,/const EXPENSE_COLS='grid-cols-\[minmax\(0,1fr\)_8\.5rem_5rem\]'/,'real expenses declare one shared template');
  assert.match(forecast,/LIST_HEAD,EXPENSE_COLS\)[^>]*><span>Gasto<\/span><span className="text-right">Monto<\/span>/,'real expenses show their header');
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
  assert.match(controls,/STATEMENT_HEAD,STATEMENT_COLS\)[^>]*><span>Extracto<\/span><span>Estado<\/span><span className="text-right">Monto<\/span><span className="text-right">Acciones<\/span>/,'the reconciliation list shows its header');
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
  assert.match(team,/\.person-hub-card\.is-list\{display:grid;grid-template-columns:var\(--person-cols\)[\s\S]*?min-height:48px/,'team rows stay thin');
  // Inventario y reservas se rediseñaron a la v2 (campaña #41): ya no tienen
  // hoja propia y su plantilla se declara una sola vez en el módulo. El detalle
  // de esa lista lo cubre `tests/ops-v2-contract.test.ts`.
  const inventory=read('app/inventory-workspace.tsx');
  assert.match(inventory,/const EQUIPMENT_COLS='\[--eq-cols:[\s\S]*?const EQUIPMENT_GRID='grid grid-cols-\[var\(--eq-cols\)\] items-center gap-x-2'/,'inventory declares one list template');
  assert.match(inventory,/const RESERVATION_COLS='\[--rsv-cols:[\s\S]*?const RESERVATION_GRID='grid grid-cols-\[var\(--rsv-cols\)\] items-center gap-x-2'/,'reservation rows share their template');
  assert.equal((inventory.match(/\$\{EQUIPMENT_GRID\}/g)||[]).length,2,'the equipment header and rows share the template');
  assert.equal((inventory.match(/\$\{RESERVATION_GRID\}/g)||[]).length,2,'the reservation header and rows share the template');
  assert.match(inventory,/min-h-\[200px\][\s\S]*?flex-col/,'inventory cards keep a big grid height');
  for(const line of inventory.split('\n'))if(line.includes('truncate'))assert(line.includes('title='),'inventory offers the full value for every truncated text');
  assert.doesNotMatch(inventory,/truncate[^>]*(CeldaMoneda|SerialTexto|listDate)/,'inventory never truncates amounts, dates or serials');
  const projectCards=read('app/project-card.tsx');
  assert.match(projectCards,/min-h-\[200px\][\s\S]*?flex-col/,'project cards keep a big grid height');
  const agents=read('AGENTS.md');
  assert.match(agents,/Lista vs\. cuadrícula \(regla 17-09\)[\s\S]*?filas finitas[\s\S]*?tarjetas grandes/,'the list/grid contract stays documented');
  const forecast=read('app/financial-forecast.tsx');
  assert.match(forecast,/const CONTRACT_COLS='grid-cols-\[minmax\(22rem,1fr\)_9rem_9rem_9rem\]'/,'contracted clients declare one shared template');
  assert.match(forecast,/cn\(LIST_HEAD,CONTRACT_COLS\)[^>]*><span>Cliente<\/span><span className="text-right">Contratado<\/span><span className="text-right">Facturado<\/span>/,'contracted clients show their header');
  assert.match(forecast,/const LIST_ROW='grid min-h-11 items-center gap-x-2 border-b border-ink-600\/60 px-2 py-1 last:border-0'/,'list rows keep the thin row contract');
  assert.match(team,/\.team-directory-card\{[^}]*min-height:190px/,'the directory keeps big grid cards');
  const presence=read('app/presence.css');
  assert.match(presence,/\.usage-grid \.ops-card\{[^}]*min-height:180px/,'usage cards keep grid height');
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

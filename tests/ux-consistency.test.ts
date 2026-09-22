import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import {workspaceSource} from './workspace-source';

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
  assert.match(workspace,/project-entry-head[\s\S]*?Proyecto[\s\S]*?Estado[\s\S]*?Fechas y piezas[\s\S]*?Responsables/,'the project list shows its column header');
  const operations=read('app/operations.tsx');
  assert.match(operations,/person-hub-head-row[\s\S]*?Persona[\s\S]*?Datos[\s\S]*?Estado/,'the team list shows its column header');
  const clients=read('app/client-directory.css');
  assert.match(clients,/\.client-hub-head-row\{display:grid/);
  assert.match(clients,/\.client-hub-actions\{grid-column:6/,'client actions sit in their own column');
  const team=read('app/operations.css');
  assert.match(team,/\.person-hub-head-row\{display:grid/);
  const projects=read('app/project-card.css');
  assert.match(projects,/\.project-entry-head\{display:grid/);
  // Encabezado y filas comparten UNA plantilla por lista (variable CSS).
  assert.match(clients,/--client-cols:[\s\S]*?grid-template-columns:var\(--client-cols\)[\s\S]*?\.client-hub-head-row\{display:grid;grid-template-columns:var\(--client-cols\)/,'client header and rows share --client-cols');
  assert.match(team,/--person-cols:[\s\S]*?grid-template-columns:var\(--person-cols\)[\s\S]*?\.person-hub-head-row\{display:grid;grid-template-columns:var\(--person-cols\)/,'team header and rows share --person-cols');
  assert.match(projects,/--project-cols:[\s\S]*?\.project-entry-head\{display:grid;grid-template-columns:var\(--project-cols\)/,'the project header shares --project-cols');
  assert.match(projects,/\.project-list>\.project-entry\{display:grid;grid-template-columns:var\(--project-cols\)/,'project rows consume --project-cols');
});

test('the client directory keeps one template, ordered row actions and shared date formats',()=>{
  const clients=read('app/client-directory.css');
  assert.match(clients,/\.client-hub-list \.client-hub-stats\{grid-column:5/,'the portfolio keeps its own column');
  assert.doesNotMatch(clients,/\.client-hub-list \.client-hub-stats\{grid-column:1\}/,'no later rule drags the portfolio into the identity column');
  assert.match(clients,/\.client-hub-list \.client-hub-actions\{grid-column:6[\s\S]*?flex-wrap:nowrap/,'row actions stay in one line');
  assert.match(clients,/\.client-hub-list \.client-hub-actions \.icon-button\{width:32px/,'dense row action icons keep the 32px contract');
  assert.doesNotMatch(clients,/\.client-hub-list \.client-hub-card\{grid-template-columns:1fr\}/,'the thin list never collapses into stacked cards');
  assert.match(clients,/@media\(max-width:760px\)\{\.client-hub-list\{overflow-x:auto/,'small screens scroll the thin list horizontally');
  const workspace=workspaceSource();
  assert.match(workspace,/archived-capsule[\s\S]*?ListGrid label="Clientes archivados" template=\{CLIENT_TEMPLATE\}/,'the archived list carries the same column header');
  assert.match(workspace,/listDateShort\(stat\.nextDue\)/,'client due dates use the shared short format');
  assert.doesNotMatch(workspace,/client-hub-balance[^\n]*moneyKpi/,'row balances use the shared money formatter');
});

test('every visible clock is 24-hour and the trash list carries its columns',()=>{
  for(const file of ['app/account-security.tsx','app/deletion-danger-zone.tsx','app/studio-workspace.tsx']){
    const source=read(file);
    assert.doesNotMatch(source,/timeStyle:\s*'short'/,'no 12-hour timeStyle survives');
    assert.match(source,/hourCycle:\s*'h23'/,`${file} keeps the 24-hour clock`);
  }
  const archive=read('app/archive-controls.tsx');
  assert.match(archive,/trash-head[\s\S]*?Tipo[\s\S]*?Registro[\s\S]*?Acciones/,'the trash list shows its column header');
  const styles=read('app/settings-slice.css');
  assert.match(styles,/\.trash-head\{display:grid/);
  const integrations=read('app/suite.tsx');
  assert.match(integrations,/settings-integration-head[\s\S]*?Integración[\s\S]*?Estado/,'the integrations list shows its header');
  const invites=read('app/invite-links.tsx');
  assert.match(invites,/invite-link-head[\s\S]*?Solicitud[\s\S]*?invite-link-head[\s\S]*?Enlace/,'invite requests and links show their headers');
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
  assert.match(workspace,/finance-row-head[\s\S]*?Transferencia[\s\S]*?Factura[\s\S]*?Cobro/,'each finance list shows its header');
  assert.doesNotMatch(workspace,/Intl\.NumberFormat\("es-PY"/,'amounts go through money(), not inline formatters');
  const styles=read('app/operations.css');
  assert.match(styles,/\.finance-row-head\{display:grid/);
  assert.match(styles,/\.finance-grid :is\(\.finance-transfer-row,.finance-invoice-row,.finance-payment-row\)\{display:grid/);
  const operations=read('app/operations.tsx');
  assert.match(operations,/finance-row-head[\s\S]*?Egreso[\s\S]*?Referido/,'payouts and referral discounts show their headers');
  assert.match(styles,/\.control-shell :is\(\.finance-payout-row,.finance-referral-row\)\{display:grid/);
  const forecast=read('app/financial-forecast.tsx');
  assert.match(forecast,/planned-expenses-list"><li className="finance-row-head"[\s\S]*?Gasto[\s\S]*?Monto/,'real expenses show their header');
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
  assert.match(controls,/statement-row-head[\s\S]*?Extracto[\s\S]*?Monto[\s\S]*?Acciones/,'the reconciliation list shows its header');
  assert.match(controls,/payment-row statement-row/,'statement rows join the fixed grid');
  const system=read('app/ui-system.css');
  assert.match(system,/\.statement-row-head\{display:grid/);
  assert.match(system,/\.control-shell \.statement-row\{display:grid/);
  const forecast=read('app/financial-forecast.tsx');
  assert.match(forecast,/forecast-person-who/,'avatar and name share the first column');
  assert.match(forecast,/forecast-person-override is-empty/,'a missing adjustment reserves its column');
  const forecastCss=read('app/financial-forecast.css');
  assert.match(forecastCss,/\.forecast-person-list-row\{display:grid/);
});

test('lists are thin rows and grids are big distributed cards',()=>{
  const clients=read('app/client-directory.css');
  assert.match(clients,/\.client-hub-list \.client-hub-card\{display:grid;grid-template-columns:var\(--client-cols\)[\s\S]*?min-height:48px/,'client rows stay under a thin height');
  assert.match(clients,/\.client-hub-list \.client-hub-facts\{[\s\S]*?display:flex/,'secondary client data goes inline');
  assert.match(clients,/\.client-hub-grid \.client-hub-card\{min-height:200px\}/,'client cards keep a big grid height');
  const team=read('app/operations.css');
  assert.match(team,/\.person-hub-card\.is-list\{display:grid;grid-template-columns:var\(--person-cols\)[\s\S]*?min-height:48px/,'team rows stay thin');
  const inventory=read('app/inventory-workspace.css');
  assert.match(inventory,/\.inventory-equipment-list \.inventory-item-facts\{display:contents\}\.inventory-equipment-list \.inventory-facts-inline\{grid-column:4;grid-row:1;display:flex/,'inventory facts go inline');
  assert.match(inventory,/\.inventory-equipment-list \.inventory-fact-location\{grid-column:6;grid-row:1/,'the location fact keeps its own column');
  assert.match(inventory,/--reservation-cols:[\s\S]*?\.inventory-reservation\{display:grid;grid-template-columns:var\(--reservation-cols\)/,'reservation rows share the template');
  assert.match(inventory,/\.inventory-equipment-grid:not\(\.inventory-equipment-list\) \.inventory-equipment\{min-height:210px\}/,'inventory cards keep a big grid height');
  const projects=read('app/project-card.css');
  assert.match(projects,/\.project-grid>\.project-entry\{min-height:200px\}/,'project cards keep a big grid height');
  const agents=read('AGENTS.md');
  assert.match(agents,/Lista vs\. cuadrícula \(regla 17-09\)[\s\S]*?filas finitas[\s\S]*?tarjetas grandes/,'the list/grid contract stays documented');
  const forecastCss=read('app/financial-forecast.css');
  assert.match(forecastCss,/\.contracted-clients-list\{display:grid;grid-template-columns:1fr;gap:4px;--contracted-cols:[\s\S]*?\.contracted-clients-list li\{display:grid;grid-template-columns:var\(--contracted-cols\)[\s\S]*?min-height:44px/,'contracted clients use thin rows with a shared template');
  const forecast=read('app/financial-forecast.tsx');
  assert.match(forecast,/contracted-clients-head[\s\S]*?Cliente[\s\S]*?Contratado[\s\S]*?Facturado/,'contracted clients show their header');
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
  const clients=read('app/client-directory.css');
  assert.match(clients,/\.client-hub-list\{overflow-x:auto;scrollbar-width:none\}/,'the client list keeps its scroll escape hatch');
});

test('the client portal styles every list it renders',()=>{
  const portal=read('app/cliente/portal.css');
  for(const cls of ['delivery-list','delivery','delivery-activity'])assert.match(portal,new RegExp(`\\.${cls}\\{`),`the portal styles .${cls}`);
  assert.match(portal,/\.delivery-activity\{list-style:none/,'the delivery activity drops the native bullets');
});

test('the rail navigation keeps one geometry for links and the logout button',()=>{
  const desktop=read('app/desktop-sidebar.css');
  assert.match(desktop,/\.control-shell \.desktop-sidebar nav>a,\.control-shell \.desktop-sidebar nav>button\{/,'the desktop rail styles the logout button with the link geometry');
  assert.match(desktop,/nav>button:hover\{/,'the logout button keeps the rail hover state');
  const mobile=read('app/mobile-navigation.css');
  assert.match(mobile,/\.mobile-sidebar nav>a,\.mobile-sidebar nav>button\{/,'the mobile drawer styles the logout button with the link geometry');
  const workspace=workspaceSource();
  assert.match(workspace,/nav-logout/,'the logout button keeps its rail slot');
});

console.log('PASS: 24-hour times and hover labels stay wired across the app surfaces');

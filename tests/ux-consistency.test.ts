import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';

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
  const workspace=read('app/scale-workspace.tsx');
  assert.match(workspace,/client-hub-head-row[\s\S]*?Cliente[\s\S]*?Datos[\s\S]*?Estado[\s\S]*?Acciones/,'the client list shows its column header');
  assert.match(workspace,/project-entry-head[\s\S]*?Proyecto[\s\S]*?Estado[\s\S]*?Fechas y piezas[\s\S]*?Responsables/,'the project list shows its column header');
  const operations=read('app/operations.tsx');
  assert.match(operations,/person-hub-head-row[\s\S]*?Persona[\s\S]*?Datos[\s\S]*?Estado/,'the team list shows its column header');
  const clients=read('app/client-directory.css');
  assert.match(clients,/\.client-hub-head-row\{display:grid/);
  assert.match(clients,/\.client-hub-actions\{grid-column:4/,'client actions sit in their own column');
  const team=read('app/operations.css');
  assert.match(team,/\.person-hub-head-row\{display:grid/);
  const projects=read('app/project-card.css');
  assert.match(projects,/\.project-entry-head\{display:grid/);
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
  const platform=read('app/platform-access-panel.tsx');
  assert.match(platform,/platform-access-head[\s\S]*?Usuario[\s\S]*?Acciones[\s\S]*?platform-access-head[\s\S]*?Agencia/,'both platform lists show their headers');
  const integrations=read('app/suite.tsx');
  assert.match(integrations,/settings-integration-head[\s\S]*?Integración[\s\S]*?Estado/,'the integrations list shows its header');
  const invites=read('app/invite-links.tsx');
  assert.match(invites,/invite-link-head[\s\S]*?Solicitud[\s\S]*?invite-link-head[\s\S]*?Enlace/,'invite requests and links show their headers');
});

test('clients, projects and trash support bulk operations',()=>{
  const workspace=read('app/scale-workspace.tsx');
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
  const workspace=read('app/scale-workspace.tsx');
  assert.match(workspace,/finance-row-head[\s\S]*?Transferencia[\s\S]*?Factura[\s\S]*?Cobro/,'each finance list shows its header');
  assert.doesNotMatch(workspace,/Intl\.NumberFormat\("es-PY"/,'amounts go through money(), not inline formatters');
  const styles=read('app/operations.css');
  assert.match(styles,/\.finance-row-head\{display:grid/);
  assert.match(styles,/\.finance-grid :is\(\.finance-transfer-row,.finance-invoice-row,.finance-payment-row\)\{display:grid/);
});

console.log('PASS: 24-hour times and hover labels stay wired across the app surfaces');

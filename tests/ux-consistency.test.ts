import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';

const read=(path:string)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('visible date-time values use the 24-hour clock',()=>{
  for(const file of ['app/actor-identity.tsx','app/notification-inbox.tsx','app/presence.tsx','app/productivity-ui.tsx','app/inventory-workspace.tsx']){
    assert.match(read(file),/hourCycle:'h23'/,`${file} renders 24-hour time`);
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

console.log('PASS: 24-hour times and hover labels stay wired across the app surfaces');

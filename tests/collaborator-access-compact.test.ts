import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';

const read=(path:string)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const operations=read('app/operations.tsx');
const operationsCss=read('app/operations.css');
const access=read('app/team-access.tsx');
const accessCss=read('app/team-access.css');
const photo=read('app/profile-photo.tsx');
const photoCss=read('app/photo-cropper.css');
const density=read('app/workspace-density.css');
const control=read('app/control-center.css');
const mobile=read('app/mobile-navigation.css');

test('collaborator identity is rendered by its card, while access keeps only state and actions',()=>{
 assert.match(operations,/person-hub-facts/);
  assert.match(operations,/\{entry\.member!\.email\}/);
  assert.match(operations,/\{accessRole\} · \{accessState\}/);
 assert.match(operations,/\{p\.email\|\|'Sin correo'\}/);
 assert.doesNotMatch(operations,/Cargo: \{p\.job_title/);
 assert.doesNotMatch(access,/ActorIdentity|team-access-member|team-access-help/);
 assert.match(access,/data-access-state=\{state\.className\.slice\(3\)\}/);
});

test('suspended access has a dedicated semantic badge and collaborator photo uses the compact opt-in',()=>{
 assert.match(access,/className:'is-suspended'/);
 assert.match(accessCss,/\.team-access-status\.is-suspended\{border-color:#b42318;background:#fef0ef;color:#8d1812\}/);
 assert.match(operations,/<ProfilePhoto compact key=\{person\.id\}/);
 assert.match(photo,/compact=false/);
 assert.match(photo,/profile-photo-progressive/);
 assert.match(photoCss,/\.profile-photo-section\.is-compact \.profile-photo-summary \.editable-photo\{width:44px;height:44px\}/);
});

test('team list view renders the collection as a single-column list',()=>{
 assert.match(operations,/ops-grid\$\{teamView==='list'\?' ops-grid-list':''\}/);
 assert.match(operationsCss,/\.ops-grid-list\{grid-template-columns:minmax\(0,1fr\)\}/);
 assert.match(operationsCss,/\.person-hub-card\.is-list \.team-access\{grid-column:1\/-1;display:flex/);
});

test('workspace density owns the header geometry across desktop and mobile',()=>{
 assert.match(density,/Canonical workspace header geometry/);
 assert.match(density,/\.control-shell \.workspace-topbar\{display:flex;align-items:center;justify-content:space-between/);
 assert.match(density,/@media\(max-width:760px\)\{\.control-shell \.workspace-topbar\{z-index:30;display:grid/);
 assert.match(density,/topbar-status\{display:flex;grid-column:1\/-1;grid-row:2/);
 assert.doesNotMatch(control,/\.workspace-topbar/);
 assert.doesNotMatch(mobile,/\.workspace-topbar/);
});

import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import {visibleModule} from '../app/workspace-access';

const read=(path:string)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const operations=read('app/operations.tsx');
const operationsCss=read('app/operations.css');
const archive=read('app/archive-controls.tsx');
const suite=read('app/suite.tsx');
const production=read('app/production-board.tsx');
const composer=read('app/quote-composer.tsx');
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
 assert.match(operations,/<PersonPhotoField/);
 assert.match(photo,/compact=false/);
 assert.match(photo,/profile-photo-progressive/);
 assert.match(photoCss,/\.profile-photo-section\.is-compact \.profile-photo-summary \.editable-photo\{width:44px;height:44px\}/);
});

test('team list view renders a compact single-column list and contact data is never cut',()=>{
 assert.match(operations,/ops-grid\$\{teamView==='list'\?' ops-grid-list':''\}/);
 assert.match(operationsCss,/\.ops-grid-list\{grid-template-columns:minmax\(0,1fr\)\}/);
 assert.match(operationsCss,/\.person-hub-card\.is-list \.team-access\{grid-column:1\/3;grid-row:2;display:flex/);
 assert.match(operationsCss,/\.person-hub-facts \.person-hub-fact-wide\{grid-column:1\/-1\}/);
 assert.match(operationsCss,/\.person-hub-facts dd\{overflow:visible;text-overflow:clip;white-space:normal;overflow-wrap:anywhere\}/);
 assert.match(operations,/person-hub-fact-wide"><dt>Correo<\/dt><dd title=\{p\.email/);
});

test('team directory keeps normal roles on photo, name and cargo only',()=>{
 for(const role of ['owner','admin','management','finance','sales','production','editor','viewer','collaborator'])assert(visibleModule('Equipo',role),`Equipo stays reachable for ${role}`);
 assert.match(operations,/if\(mode==='people'&&!\['owner','admin','finance'\]\.includes\(role\)\)return <TeamDirectoryView/);
 assert.match(operations,/secondary=\{teamRoleLabels\[person\.role\]\|\|person\.cargo\|\|'Sin cargo'\}/);
 assert.match(operations,/Directorio de personas: foto, nombre y cargo/);
});

test('budgets reach production while the pipeline does not',()=>{
 for(const role of ['owner','admin','management','finance','sales','production'])assert(visibleModule('Presupuestos',role),`Presupuestos stays reachable for ${role}`);
 for(const role of ['owner','admin','management','finance','sales'])assert(visibleModule('Planes',role),`Planes stays reachable for ${role}`);
 assert(!visibleModule('Pipeline','production'),'production keeps budgets without the sales pipeline');
 assert(visibleModule('Pipeline','sales'));
});

test('management reaches the team without individual salary amounts',()=>{
 assert.match(operations,/const allowed = \["owner", "admin", "finance", "management"\]\.includes\(role\);/);
 assert.match(operations,/const salaryView = \["owner", "admin", "finance"\]\.includes\(role\);/);
 assert.match(operations,/fields=\{salaryView\?personFields:personFields\.filter\(field=>!\['compensation_amount','currency','payment_day','invoices_company'\]\.includes\(field\.key\)\)\}/);
 assert.match(operations,/\{salaryView&&<button/);
 assert.match(operations,/salaryView\?<b>\{money\(p\.compensation_amount,p\.currency\)\}<\/b>:<em>Salario reservado<\/em>/);
 assert.match(operations,/salaryView&&!p\.compensation_amount/);
 assert.match(operations,/\{salaryView&&<span className="hub-chip">\{p\.payment_day/);
 assert.match(operations,/\{salaryView&&p\.invoices_company\?/);
 assert.match(archive,/members:\['owner','admin','management'\]/);
 assert.match(access,/const manage=\['owner','admin','management'\]\.includes\(role\)/);
});

test('viewer never reaches a mutating control in the visible sections',()=>{
 assert.match(suite,/const canMove=\['owner','admin','management','finance','sales'\]\.includes\(role\);const drag=useDraggable\(\{id:String\(row\.id\),disabled:!canMove\}\)/);
 assert.match(suite,/\{canMove&&<button className="icon-button" aria-label=\{`Mover \$\{str\(row,'name'\)\}`\}/);
 assert.match(production,/const canMove=\['owner','admin','management','production','editor'\]\.includes\(role\)/);
 assert.match(composer,/const drag=useDraggable\(\{id,disabled:!canReorder\}\)/);
 assert.match(composer,/\{canReorder&&<button type="button" className="icon-button" aria-label="Reordenar ítem"/);
 assert.match(suite,/<QuoteComposer mode="plan" record=\{row\} canReorder=\{canEdit\} done=/);
 assert.match(operations,/\{role !== "viewer" && \(/);
 assert.match(archive,/members:\['owner','admin','management'\]/);
});

test('workspace density owns the header geometry across desktop and mobile',()=>{
 assert.match(density,/Canonical workspace header geometry/);
 assert.match(density,/\.control-shell \.workspace-topbar\{display:flex;align-items:center;justify-content:space-between/);
 assert.match(density,/@media\(max-width:760px\)\{\.control-shell \.workspace-topbar\{z-index:30;display:grid/);
 assert.match(density,/topbar-status\{display:flex;grid-column:1\/-1;grid-row:2/);
 assert.doesNotMatch(control,/\.workspace-topbar/);
 assert.doesNotMatch(mobile,/\.workspace-topbar/);
});

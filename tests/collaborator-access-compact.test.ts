import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import {visibleModule} from '../app/workspace-access';
import {workspaceSource} from './workspace-source';

const read=(path:string)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const operations=read('app/operations.tsx');
const operationsCss=read('app/operations.css');
const archive=read('app/archive-controls.tsx');
const suite=read('app/suite.tsx');
const production=read('app/production-board.tsx');
const composer=read('app/quote-composer.tsx');
const whatsapp=read('app/whatsapp-button.tsx');
const workspace=workspaceSource();
const access=read('app/team-access.tsx');
const accessCss=read('app/team-access.css');
const photo=read('app/profile-photo.tsx');
const photoCss=read('app/photo-cropper.css');
const control=read('app/control-center.css');

test('collaborator identity is rendered by its card, while access keeps only state and actions',()=>{
 assert.match(operations,/person-hub-mail/);
 assert.match(operations,/\{entry\.member!\.email\}/);
 assert.match(operations,/\{p\.email\|\|'Sin correo'\}/);
 assert.doesNotMatch(operations,/Cargo: \{p\.job_title/);
 assert.doesNotMatch(operations,/person-hub-facts/,'la tarjeta ya no usa el bloque grande Correo/Acceso/Ingreso');
 assert.doesNotMatch(access,/ActorIdentity|team-access-member|team-access-help/);
 assert.match(access,/ChipEstado/);
});

test('suspended access uses the canonical chip with bad tone and collaborator photo uses the compact opt-in',()=>{
 assert.match(access,/estado:'suspendido',etiqueta:'Acceso suspendido',tono:'bad'/);
 assert.doesNotMatch(accessCss,/#(?:b42318|fef0ef|8d1812)/,'el chip ya no hardcodea colores');
 assert.match(accessCss,/\.team-access-status\{max-width:60%/);
 assert.match(operations,/<PersonPhotoField/);
 assert.match(photo,/compact=false/);
 assert.match(photo,/profile-photo-progressive/);
 assert.match(photoCss,/\.profile-photo-section\.is-compact \.profile-photo-summary \.editable-photo\{width:44px;height:44px\}/);
});

test('team list view renders a compact single-column list and contact data is never cut',()=>{
 assert.match(operations,/ops-grid\$\{teamView==='list'\?' ops-grid-list':''\}/);
 assert.match(operationsCss,/\.control-shell \.ops-grid\.ops-grid-list\{grid-template-columns:minmax\(0,1fr\)/);
 assert.match(operationsCss,/\.person-hub-card\.is-list \.team-access\{grid-column:6;grid-row:1;display:flex/);
 assert.match(operationsCss,/--person-cols:minmax\(9rem,1\.3fr\)/,'la plantilla de la fila finita declara sus columnas');
 assert.match(operationsCss,/\.person-hub-card\.is-list \.person-hub-mail\{grid-column:2/,'el correo tiene su columna en la fila densa');
 assert.match(operations,/person-hub-mail" title=\{p\.email/);
});

test('team directory keeps normal roles on photo, name and cargo only',()=>{
 for(const role of ['owner','admin','management','finance','sales','production','editor','viewer','collaborator'])assert(visibleModule('Equipo',role),`Equipo stays reachable for ${role}`);
 assert.match(operations,/if\(!canOpenPeopleWorkspace\(role\)\)return <TeamDirectoryView/);
 assert.match(operations,/secondary=\{teamRoleLabels\[person\.role\]\|\|person\.cargo\|\|'Sin cargo'\}/);
 assert.match(operations,/Foto, nombre y cargo\. Los datos personales de cada integrante se administran desde su propio perfil/);
});

test('budgets reach production while the pipeline does not',()=>{
 for(const role of ['owner','admin','management','finance','sales','production'])assert(visibleModule('Presupuestos',role),`Presupuestos stays reachable for ${role}`);
 for(const role of ['owner','admin','management','finance','sales'])assert(visibleModule('Planes',role),`Planes stays reachable for ${role}`);
 assert(!visibleModule('Pipeline','production'),'production keeps budgets without the sales pipeline');
 assert(visibleModule('Pipeline','sales'));
});

test('management reaches the team without individual salary amounts',()=>{
 assert.match(operations,/const allowed = canOpenPeopleWorkspace\(role\);/);
 assert.match(operations,/const salaryView = roleCan\(role, "salary\.view"\);/);
 assert.match(operations,/fields=\{salaryView\?personFields:personFields\.filter\(field=>!\['compensation_amount','currency','payment_day','invoices_company'\]\.includes\(field\.key\)\)\}/);
 assert.match(operations,/person-hub-comp">\{types\.find\(type=>type\.value===p\.compensation_type\)\?\.label\|\|'Sin modalidad'\}<\/span>/);
 assert.doesNotMatch(operations,/Salario reservado/,'the capsule never shows the individual amount');
 assert.doesNotMatch(operations,/setPay\(\{ person:/,'paying a collaborator lives in Finanzas, not in the team capsule');
 assert.match(operations,/!p\.compensation_amount&&p\.active/);
 assert.match(operations,/\{p\.payment_day\?`Día de pago \$\{p\.payment_day\}`:'Día de pago sin definir'\}/);
 assert.match(operations,/\{p\.invoices_company\?<span className="hub-chip">Emite factura<\/span>/);
 assert.match(operations,/\{p\.currency\?<span className="hub-chip" title="Moneda de la remuneración">\{p\.currency\}/,'la moneda de la remuneración es un chip');
 assert.match(archive,/const roles=ARCHIVE_KIND_CAPABILITIES as Record<string,Capability>/,'la papelera comparte el mapa de capacidades');
 assert.match(read('app/capabilities.ts'),/collaborators:'members\.manage'/);
 assert.match(access,/const manage=roleCan\(role,'members\.manage'\)/);
});

test('viewer never reaches a mutating control in the visible sections',()=>{
 // El único tablero de pipeline vive en `sections/pipeline.tsx` (#85): el asa
 // comparte la capacidad del PATCH y no hay una lista de roles paralela.
 const pipeline=read('app/sections/pipeline.tsx');
 assert.match(pipeline,/const canMove=canEdit/);
 assert.match(pipeline,/\{canMove\?<button type="button" className="[^"]*" style=\{\{touchAction:'none'\}\} title=\{`Mover \$\{str\(row,'name'\)\}`\}/);
 assert.doesNotMatch(suite,/CatalogWorkspace|function LeadCard|function LeadColumn/,'el tablero paralelo de suite.tsx se retiró');
 assert.match(production,/const canMove=roleCan\(role,'work-orders\.edit'\)/,'moving a piece follows the API capability');
 assert.match(composer,/const drag=useDraggable\(\{id,disabled:!canReorder\}\)/);
 assert.match(composer,/\{canReorder&&<button type="button" className="[^"]*" title=\{`Reordenar \$\{itemLabel\}`\} aria-label=\{`Reordenar \$\{itemLabel\}`\}/);
 assert.match(read('app/sections/planes.tsx'),/<QuoteComposer mode="plan" record=\{row\} canReorder=\{canEdit\} done=/);
 assert.match(operations,/\{role !== "viewer" && \(/);
 assert.match(archive,/const roles=ARCHIVE_KIND_CAPABILITIES as Record<string,Capability>/,'la papelera comparte el mapa de capacidades');
 assert.match(read('app/capabilities.ts'),/collaborators:'members\.manage'/);
});

test('the WhatsApp action renders only with a number and never reorders the row',()=>{
 assert.match(whatsapp,/if \(!href\) return null;/);
 assert.match(whatsapp,/viewBox="0 0 24 24"/);
 assert.match(workspace,/<WhatsAppButton href=\{tel\}\/>/);
 assert.doesNotMatch(workspace,/WhatsApp ↗/,'the text-only link is replaced by the shared button');
});

test('the team access block renders only when it has actions',()=>{
 assert.match(access,/\{canInvite&&<div className="team-access-actions">/);
});

test('workspace density owns the header geometry across desktop and mobile',()=>{
 const source=readFileSync(new URL('../app/scale-workspace.tsx',import.meta.url),'utf8');
 const drawer=readFileSync(new URL('../app/mobile-navigation.tsx',import.meta.url),'utf8');
 assert.match(source,/workspace-topbar sticky top-0 z-20[\s\S]*?max-md:z-30 max-md:grid/,'the workspace header owns its desktop and mobile geometry');
 assert.match(source,/topbar-status flex items-center gap-2 max-md:col-span-full max-md:row-start-2/,'the compact status keeps its own row on mobile');
 assert.match(source,/topbar-presence min-w-0 shrink-0 max-\[520px\]:hidden/,'presence hides on the smallest screens');
 assert.doesNotMatch(control,/\.workspace-topbar/);
 assert.doesNotMatch(drawer,/workspace-topbar/);
});

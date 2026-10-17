import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import ts from 'typescript';
import {visibleModule} from '../app/workspace-access';
import {workspaceSource} from './workspace-source';
import {teamSheetSource,teamWorkspaceSource} from './team-source';

const read=(path:string)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const operations=read('app/operations.tsx');
const team=teamWorkspaceSource();
const sheet=teamSheetSource();
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

test('collaborator identity is rendered by its row, while access keeps only state and actions',()=>{
 assert.match(team,/technicalEmail\(m\.email\)/,'el acceso sin ficha oculta correos técnicos de demo');
 assert.match(team,/email:p\.email\|\|'Sin correo'/);
 assert.doesNotMatch(team,/Cargo: \{p\.job_title/);
 assert.doesNotMatch(team,/person-hub/,'sin el markup de tarjeta legacy');
 assert.doesNotMatch(access,/ActorIdentity|team-access-member|team-access-help/);
 assert.match(access,/ChipEstado/);
});

test('suspended access uses the canonical chip with bad tone and collaborator photo uses the compact opt-in',()=>{
 assert.match(access,/estado:'suspendido',etiqueta:'Acceso suspendido',tono:'bad'/);
 assert.doesNotMatch(accessCss,/#(?:b42318|fef0ef|8d1812)/,'el chip ya no hardcodea colores');
 assert.match(accessCss,/\.team-access-status\{max-width:60%/);
 assert.match(sheet,/<PersonPhotoField/);
 assert.match(photo,/compact=false/);
 assert.match(photo,/profile-photo-progressive/);
 assert.match(readFileSync(new URL('../app/profile-photo.tsx',import.meta.url),'utf8'),/tamano=\{compact\?'xl':'3xl'\}/,'la preview compacta usa el objeto único con su tamaño');
});

test('team list view is a thin ListGrid with one shared template and contact data is never cut',()=>{
 assert.match(team,/const TEAM_TEMPLATE='grid-cols-\[minmax\(13rem,1\.6fr\)_minmax\(12rem,1\.3fr\)_7rem_8rem_7rem_4\.5rem\]'/,'Persona tiene el mayor fr de la plantilla');
 assert.match(team,/<ListGrid label="Equipo" template=\{TEAM_TEMPLATE\} columns=\{TEAM_COLUMNS\}/);
 assert.match(team,/<ListRow key=\{facts\.key\} template=\{TEAM_TEMPLATE\}/,'el encabezado y las filas comparten la plantilla');
 for(const label of ['Persona','Datos','Estado laboral','Permiso','Acceso','Acciones'])assert.match(team,new RegExp(`label:'${label}'`),`columna ${label}`);
 assert.match(team,/key:'status',label:'Estado laboral',align:'center'/,'Estado laboral alinea su encabezado con la celda');
 assert.match(team,/key:'access',label:'Acceso',align:'center'/,'Acceso alinea el encabezado con Habilitado');
 assert.match(team,/title=\{\[facts\.emailTitle\|\|facts\.email,\.\.\.facts\.meta\]\.join\(' · '\)\}/,'el correo truncado conserva su tooltip');
});

test('team directory keeps normal roles on photo, name and cargo only',()=>{
 for(const role of ['owner','admin','management','finance','sales','production','editor','viewer','collaborator'])assert(visibleModule('Equipo',role),`Equipo stays reachable for ${role}`);
 assert.match(operations,/if\(!canOpenPeopleWorkspace\(role,capabilities\)\)return <TeamDirectoryView/);
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
 assert.match(team,/const allowed=canOpenPeopleWorkspace\(role,capabilities\);/);
 assert.match(team,/const salaryView=effectiveCapability\(role,'salary\.view',capabilities\);/);
 // La pestaña Remuneración no se arma sin `salary.view` (ni su contenido ni sus datos).
 assert.match(sheet,/if\(salaryView&&person\)tabs\.push\(\{id:'remuneracion'/);
 assert.match(sheet,/tab\.id!=='remuneracion'\|\|\(mode==='team'&&salaryView\)/,'el filtro de la carcasa repite la regla');
 assert.doesNotMatch(sheet.split('function PayTab')[0].split('const payFields')[0].split('const profileFields')[1]||'',/compensation_amount|payment_day|invoices_company/,'el perfil no envía ningún campo salarial');
 assert.match(team,/if\(salaryView\)meta\.push\(/,'la modalidad solo se muestra a quien ve remuneraciones');
 assert.doesNotMatch(team,/Salario reservado/,'the capsule never shows the individual amount');
 assert.doesNotMatch(team,/compensation_amount\}|formatMoney|money\(/,'la lista y la cuadrícula nunca dibujan el monto individual');
 assert.doesNotMatch(team,/setPay\(\{ person:/,'paying a collaborator lives in Finanzas, not in the team capsule');
 assert.match(archive,/const roles=ARCHIVE_KIND_CAPABILITIES as Record<string,Capability>/,'la papelera comparte el mapa de capacidades');
 assert.match(read('app/capabilities.ts'),/collaborators:'members\.manage'/);
 assert.match(access,/const manage=effectiveCapability\(role,'members\.manage',capabilities\)/);
});

test('viewer never reaches a mutating control in the visible sections',()=>{
 // El único tablero de pipeline vive en `sections/pipeline.tsx` (#85): el asa
 // comparte la capacidad del PATCH y no hay una lista de roles paralela.
 const pipeline=read('app/sections/pipeline.tsx');
 assert.match(pipeline,/const canMove=canEdit/);
 assert.match(pipeline,/\{canMove\?<button type="button" className="[^"]*" style=\{\{touchAction:'none'\}\} title=\{`Mover \$\{str\(row,'name'\)\}`\}/);
 assert.doesNotMatch(suite,/CatalogWorkspace|function LeadCard|function LeadColumn/,'el tablero paralelo de suite.tsx se retiró');
 assert.match(production,/const canMove=roleCan\(role,'work-orders\.edit'\)/,'moving a piece follows the API capability');
 // Verify the real drag/drop policies, not an obsolete literal initializer.
 const source=ts.createSourceFile('quote-composer.tsx',composer,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 const shell=source.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='ItemShell') as ts.FunctionDeclaration;
 assert(shell?.body);
 function disabledFor(hook:string){
  let expression:ts.Expression|undefined;
  function walk(node:ts.Node){if(ts.isCallExpression(node)&&node.expression.getText(source)===hook){const options=node.arguments[0];assert(ts.isObjectLiteralExpression(options));const disabled=options.properties.find(prop=>ts.isPropertyAssignment(prop)&&prop.name.getText(source)==='disabled') as ts.PropertyAssignment;assert(disabled);expression=disabled.initializer;}ts.forEachChild(node,walk);}
  walk(shell);assert(expression);return expression;
 }
 function guard(node:ts.Expression,pending:boolean,canReorder:boolean):boolean{
  if(ts.isParenthesizedExpression(node))return guard(node.expression,pending,canReorder);
  if(ts.isIdentifier(node)){assert(['pending','canReorder'].includes(node.text));return node.text==='pending'?pending:canReorder;}
  if(ts.isPrefixUnaryExpression(node)&&node.operator===ts.SyntaxKind.ExclamationToken)return !guard(node.operand,pending,canReorder);
  if(ts.isBinaryExpression(node)&&node.operatorToken.kind===ts.SyntaxKind.BarBarToken)return guard(node.left,pending,canReorder)||guard(node.right,pending,canReorder);
  assert.fail('Drag guard must use the reviewed permission/pending boolean policy');
 }
 const drag=disabledFor('useDraggable'),drop=disabledFor('useDroppable');
 for(const pending of [false,true])for(const canReorder of [false,true]){
  assert.equal(guard(drag,pending,canReorder),pending||!canReorder,'pending and missing capability both block dragging');
  assert.equal(guard(drop,pending,canReorder),pending,'pending also blocks drop targets');
 }
 assert.match(composer,/\.\.\.drag.attributes\} \{\.\.\.drag.listeners\} disabled=\{pending\}/,'native handle remains disabled after the drag spreads');
 assert.equal((composer.match(/<ItemShell[^>]*canReorder=\{canReorder\} pending=\{locked\}/g)||[]).length,2,'items and sections preserve permission and shared pending state');
 assert.equal((composer.match(/if\(submission.pending\|\|persistedRef.current\)return;/g)||[]).length,2,'drag-end callbacks refuse mutation while pending or already persisted');
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
 assert.match(source,/workspace-topbar sticky top-0 z-20[\s\S]*?max-md:z-30 max-md:flex-wrap/,'the workspace header owns its desktop and mobile geometry');
 assert.match(source,/topbar-status flex items-center gap-2 max-md:order-2/,'the compact status flows after the utility controls on mobile (#137)');
 assert.match(source,/topbar-presence min-w-0 shrink-0 max-\[520px\]:hidden/,'presence hides on the smallest screens');
 assert.doesNotMatch(control,/\.workspace-topbar/);
 assert.doesNotMatch(drawer,/workspace-topbar/);
});

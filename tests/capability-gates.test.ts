import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CAPABILITY_ROLES,roleCan,BATCH_LIMITS,limitSelection} from '../app/capabilities';

const read=(path:string)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

// 1. El espejo sigue a `permissions.js` (API): misma capacidad, mismos roles, el
//    dueño conserva todo y un rol sin la capacidad no ve el control.
assert.deepEqual(CAPABILITY_ROLES['inventory.view'],['owner','admin','management','finance','sales','production','editor','viewer','collaborator'],'the catalog capability covers every role like the API');
for(const [capability,roles] of Object.entries(CAPABILITY_ROLES)){
 for(const role of roles)assert(roleCan(role,capability as never),`${role} keeps ${capability}`);
 assert(roleCan('owner',capability as never),'owner keeps every capability');
}
assert(!roleCan('viewer','inventory.manage'),'viewer never manages inventory');
assert(!roleCan('viewer','checklists.edit'),'viewer never edits checklists');
assert(!roleCan('collaborator','finance.view'),'collaborator never sees balances');
assert(!roleCan('collaborator','salary.view'),'collaborator never sees salaries');
assert(!roleCan('','inventory.view'),'an unknown role has no capability');
for(const capability of ['inventory.view','inventory.manage','inventory.book','work-orders.manage','work-orders.edit','projects.manage','projects.edit','work-checklists.view','checklists.edit','assignees.manage','studio.manage','portal.manage'] as const)
 assert(roleCan('collaborator',capability),`collaborator keeps ${capability} like the API`);

// 2. Los gates del dominio se derivan de la capacidad, no de listas de roles.
const gates:[string,string,RegExp][]=[
 ['app/inventory-workspace.tsx','inventory.view',/return roleCan\(role,'inventory\.view'\)\?<InventoryPanel/],
 ['app/production-board.tsx','work-orders.edit',/const canMove=roleCan\(role,'work-orders\.edit'\)/],
 ['app/record-assignees.tsx','inventory.view',/if\(!roleCan\(props\.role,'inventory\.view'\)\)return null/],
 ['app/work-checklist.tsx','work-checklists.view',/if\(!roleCan\(props\.role,'work-checklists\.view'\)\)return null/],
 ['app/work-checklist.tsx','checklists.edit',/editable=roleCan\(role,'checklists\.edit'\)/],
 ['app/work-order-links.tsx','work-orders.edit',/const canEdit=roleCan\(role,'work-orders\.edit'\)/],
 ['app/record-assignees.tsx','projects.edit',/const editable=roleCan\(role,kind==='work-orders'\?'work-orders\.edit':'projects\.edit'\)/],
 ['app/work-history.tsx','work-orders.manage',/const managers=roleCan\(role,'work-orders\.manage'\)/],
 ['app/work-history.tsx','work-orders.edit',/const canEdit=roleCan\(role,'work-orders\.edit'\)/],
 ['app/scale-workspace.tsx','projects.manage',/roleCan\(user\?\.role,'projects\.manage'\)/],
 ['app/scale-workspace.tsx','projects.edit',/const canManageProjects=roleCan\(user\?\.role,'projects\.edit'\)/],
 ['app/scale-workspace.tsx','budgets.manage',/roleCan\(user\?\.role,'budgets\.manage'\)/],
 ['app/scale-workspace.tsx','billing.view',/const canSeeBilling=roleCan\(user\?\.role,'billing\.view'\)/],
];
for(const [file,capability,pattern] of gates)assert.match(read(file),pattern,`${file} gates on ${capability}`);
const archive=read('app/archive-controls.tsx');
for(const [capability,kind] of [['work-orders.manage','work-orders'],['inventory.manage','inventory'],['projects.edit','projects'],['clients.manage','clients'],['commercial.manage','leads']] as const){
 const quoted=kind.includes('-')?`'${kind}'`:kind;
 assert(archive.includes(`${quoted}:'${capability}'`),`archive ${kind} follows ${capability}`);
}
assert.match(archive,/if\(!capability\|\|!roleCan\(role,capability\)\)return null;/, 'a missing capability never renders the remove control');

// 3. Topes de lote: la selección informa y no ofrece más de lo que el API acepta.
assert.deepEqual(limitSelection(['1','2','3'],2),{selection:['1','2'],capped:true});
assert.deepEqual(limitSelection(['1','2'],5),{selection:['1','2'],capped:false});
assert.deepEqual(limitSelection(['1','1','2'],5).selection,['1','2'],'duplicates collapse before the cap');
assert.equal(BATCH_LIMITS.inventory,50);
assert.equal(BATCH_LIMITS.projects,50);
assert.equal(BATCH_LIMITS.clients,50);
const inventory=read('app/inventory-workspace.tsx'),workspace=read('app/scale-workspace.tsx');
assert.match(inventory,/limitSelection\(\[\.\.\.selectedItems,\.\.\.ids\],BATCH_LIMITS\.inventory\)/);
assert.match(inventory,/de \{BATCH_LIMITS\.inventory\} seleccionado/,'the bulk counter shows the limit');
assert.match(inventory,/selectedItems\.length>=BATCH_LIMITS\.inventory/,'adding past the cap is refused');
assert.match(inventory,/selected\.length>=BATCH_LIMITS\.reservationItems/,'the reservation form stops at the API item cap');
assert.match(inventory,/responsibles\.length>=BATCH_LIMITS\.reservationResponsibles/,'the reservation form stops at the API responsible cap');
assert.match(workspace,/limitSelection\(\[\.\.\.selectedProjects,\.\.\.ids\],BATCH_LIMITS\.projects\)/);
assert.match(read('app/studio-workspace.tsx'),/members\.length>=BATCH_LIMITS\.reservationResponsibles/,'the studio form stops at the API responsible cap');
assert.match(workspace,/de \{BATCH_LIMITS\.projects\} seleccionado/,'the projects bulk counter shows the limit');
assert.match(workspace,/selectedProjects\.length>=BATCH_LIMITS\.projects/,'adding past the cap is refused');
assert.match(workspace,/limitSelection\(\[\.\.\.selectedClients,\.\.\.ids\],BATCH_LIMITS\.clients\)/);
assert.match(workspace,/de \{BATCH_LIMITS\.clients\} seleccionado/,'the clients bulk counter shows the limit');
assert.match(workspace,/selectedClients\.length>=BATCH_LIMITS\.clients/,'adding past the clients cap is refused');

console.log('PASS: capability gates mirror the API permissions and batch selections respect the endpoint caps');

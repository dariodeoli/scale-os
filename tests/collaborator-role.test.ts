import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import {visibleModule} from '../app/workspace-access';
import {teamRoleLabels} from '../app/team-directory';

const read=(path:string)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('collaborator reaches operations without finance, salaries, access or activity',()=>{
  assert.equal(teamRoleLabels.collaborator,'Colaborador');
  const matrix=read('app/permissions-matrix.tsx');
  assert.match(matrix,/collaborator:'Colaborador: .*sin ver finanzas, salarios, accesos ni actividad\.'/);
  const allowed=['Resumen','Producción','Clientes','Proyectos','Presupuestos','Planes','Pipeline','Inventario','Estudio','Equipo'];
  for(const label of allowed)assert(visibleModule(label,'collaborator'),`${label} stays reachable for collaborator`);
  const denied=['Finanzas','Pagos','Comisiones','Previsión','Informes','Mora','Actividad','Configuración','Métricas','Papelera','Roles y permisos'];
  for(const label of denied)assert(!visibleModule(label,'collaborator'),`${label} stays hidden for collaborator`);
  assert(!visibleModule('Pipeline','production'),'production still keeps budgets without the sales pipeline');
});

test('archived clients and projects collapse into a reactivatable capsule',()=>{
  const workspace=read('app/scale-workspace.tsx');
  assert.match(workspace,/<details className="archived-capsule" open=\{clientStatusFilter==='inactive'\}>/);
  assert.match(workspace,/<details className="archived-capsule">/);
  assert.match(workspace,/async function setClientArchive/);
  assert.match(workspace,/async function setProjectArchive/);
  assert.match(workspace,/data-archived=\{client\.active===false\|\|undefined\}/);
  assert.match(workspace,/project\.active===false\?'Reactivar':'Archivar'/);
  assert.match(workspace,/client\.active===false\?'Reactivar':'Archivar'/);
  const format=read('app/client-format.ts');
  assert.match(format,/project\.active !== false/,'archived projects never count as active');
  const css=read('app/client-directory.css');
  assert.match(css,/\.archived-capsule\{/);
  assert.match(css,/\.client-hub-card\[data-archived\]\{opacity/);
  const types=read('app/workspace-types.ts');
  assert.match(types,/export type Project = \{[\s\S]*active\?:boolean;/);
});

console.log('PASS: collaborator role and archived-entity capsule stay wired to the shared contracts');

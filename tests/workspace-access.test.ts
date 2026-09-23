import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {ARCHIVE_KIND_CAPABILITIES, roleCan, type Capability} from '../app/capabilities';
import {MODULE_CAPABILITIES, visibleModule} from '../app/workspace-access';

// Issue #21: el NAV se deriva de las capacidades del API (fuente única:
// app/capabilities.ts, espejo de permissions.js). El server sigue revalidando.
const roles = ['owner', 'admin', 'management', 'finance', 'sales', 'production', 'editor', 'viewer', 'collaborator'];
const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const archives = Object.values(ARCHIVE_KIND_CAPABILITIES) as Capability[];

test('el NAV sigue las capacidades del API para cada rol', () => {
  for (const role of roles) {
    // Historial de trabajo: el API entrega el propio a cualquier rol y el del
    // equipo con work-orders.manage (el componente ya consulta esa capacidad).
    assert(visibleModule('Historial de trabajo', role), `Historial para ${role}`);
    // Papelera: visible si el rol puede archivar al menos un tipo; el API filtra.
    assert.equal(
      visibleModule('Papelera', role),
      archives.some(capability => roleCan(role, capability)),
      `Papelera para ${role}`,
    );
    // Cada módulo del mapa sigue exactamente su capacidad del API.
    for (const [label, capability] of Object.entries(MODULE_CAPABILITIES))
      assert.equal(visibleModule(label, role), roleCan(role, capability), `${label} para ${role}`);
    assert(visibleModule('Equipo', role));
    assert(visibleModule('Resumen', role));
  }
  assert(!visibleModule('Colaboradores', 'owner'));
  assert(!visibleModule('Admin', 'owner'));
});

test('Comisiones sigue a commissions.manage y no a una lista de roles', () => {
  assert(visibleModule('Comisiones', 'finance'));
  assert(!visibleModule('Comisiones', 'management'), 'management no administra comisiones en el API');
  assert(!visibleModule('Comisiones', 'sales'));
  assert(visibleModule('Comisiones', 'owner'));
  for (const role of roles)
    assert.equal(visibleModule('Comisiones', role), roleCan(role, 'commissions.manage'), `Comisiones para ${role}`);
});

test('Roles y permisos queda en owner/admin como la matriz del API', () => {
  assert(!visibleModule('Roles y permisos', 'finance'), 'Finanzas no administra la matriz');
  assert(!visibleModule('Roles y permisos', 'management'));
  assert(visibleModule('Roles y permisos', 'owner'));
  assert(visibleModule('Roles y permisos', 'admin'));
});

test('Invitaciones sigue a members.manage como el API', () => {
  for (const role of roles)
    assert.equal(visibleModule('Invitaciones', role), roleCan(role, 'members.manage'), `Invitaciones para ${role}`);
});

test('el panel de equipo gatea el acceso por personas y no consulta comisiones', () => {
  const operations = read('app/operations.tsx');
  // Equipo sigue a quienes gestionan personas o ven salarios; Comisiones vive en
  // su propia sección de Finanzas (issue #45) y este panel ya no consulta sus endpoints.
  assert.match(operations, /const allowed = canOpenPeopleWorkspace\(role\);/);
  assert.doesNotMatch(operations, /\/api\/agency\/commissions/, 'Equipo no consulta comisiones');
  assert.doesNotMatch(operations, /\/api\/agency\/payouts/, 'los pagos a colaboradores viven en Finanzas');
  assert.match(operations, /const canManageAccess=roleCan\(role,'members\.manage'\)/);
  assert.match(read('app/team-access.tsx'), /const manage=roleCan\(role,'members\.manage'\)/);
  assert.match(read('app/archive-controls.tsx'), /const roles=ARCHIVE_KIND_CAPABILITIES as Record<string,Capability>/);
});

console.log('PASS: NAV por capacidad en cada rol (historial, papelera, comisiones, permisos e invitaciones) y panel de comisiones gateado por endpoint');

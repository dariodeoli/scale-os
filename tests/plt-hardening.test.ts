import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';

// Issue scale-os#22: contratos de equipo (retirados con reinvitación), portal
// (invitaciones pendientes + reenvío de verificación) y limpieza de rutas y
// componentes muertos. Los checks de comportamiento puro viven en
// team-directory.test.ts y superadmin.test.tsx.
const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const missing = (path: string) => !existsSync(new URL(`../${path}`, import.meta.url));

// Equipo: el lote no ofrece filas retiradas y una fila vencida no lo aborta.
const operations = read('app/operations.tsx');
assert.match(
  operations,
  /selectVisibleAccess[\s\S]*?entry\.member&&!entry\.member\.removed_at&&entry\.member\.email!==currentEmail/,
  'la selección masiva excluye los accesos retirados',
);
assert.ok(
  (operations.match(/entry\.member&&!entry\.member\.removed_at/g) ?? []).length >= 3,
  'checkbox, barra de lote y selección comparten el mismo filtro de retirados',
);
assert.match(
  operations,
  /for\(const id of selectedAccess\)\{\s*try\{[\s\S]*?catch\{failed\+=1;\}/,
  'una fila retirada o vencida no aborta el lote a mitad',
);
assert.match(operations, /removed_at\?'Acceso retirado'/, 'la fila retirada muestra su estado');
const teamAccess = read('app/team-access.tsx');
assert.match(
  teamAccess,
  /member\?\.removed_at\?'Reinvitar':'Invitar al panel'/,
  'el retirado sin ficha conserva el punto de reinvitación',
);

// Portal: las invitaciones que ya devuelve el API se muestran y se pueden revocar.
const daily = read('app/daily-controls.tsx');
assert.match(daily, /api<\{grants:Row\[\];invites:Row\[\]\}>/, 'el portal lee invites además de grants');
assert.match(daily, /pendingInvites\.length>0/, 'las invitaciones pendientes se listan');
assert.match(
  daily,
  /api\/agency\/client-portal-invites\/\$\{String\(invite\.id\)\}\/revoke/,
  'revocar la invitación usa el endpoint del API',
);
assert.match(daily, /inviteExpired/, 'las invitaciones vencidas se marcan sin ofrecer revocar');

// Verificación de correo: el registro responde 409 y el reenvío es la salida.
const verify = read('app/verificar-correo/page.tsx');
assert.match(verify, /api\/auth\/password\/verification\/request/, 'el reenvío consume el endpoint real');
assert.match(verify, /Reenviar correo de verificación/, 'el botón existe en la pantalla de verificación');
assert.doesNotMatch(verify, /Solicitá uno nuevo desde el registro/, 'ya no remite al registro sin salida');

// Rutas Next de auth paralela y componente duplicado: eliminados.
for (const dead of [
  'app/api/auth/login/route.ts',
  'app/api/auth/me/route.ts',
  'app/api/auth/logout/route.ts',
  'app/api/clients/route.ts',
  'app/api/projects/route.ts',
  'app/api/work-orders/route.ts',
  'lib/auth.ts',
  'lib/session.ts',
  'app/platform-access-panel.tsx',
  'app/platform-access.css',
  'tests/platform-access-panel.test.tsx',
])
  assert.ok(missing(dead), `${dead} fue eliminado`);
// lib/prisma.ts queda: lo usa prisma/seed.ts (npm run db:seed), no las rutas retiradas.
assert.match(read('prisma/seed.ts'), /from '\.\.\/lib\/prisma'/, 'el seed sigue usando el cliente Prisma');
assert.ok(existsSync(new URL('../lib/prisma.ts', import.meta.url)), 'lib/prisma.ts se conserva para el seed');
assert.ok(missing('lib/auth.ts') && missing('lib/session.ts'), 'la cadena de auth paralela se retiró');
const superadmin = read('app/superadmin/page.tsx');
assert.match(superadmin, /\/api\/platform\/users\?limit=50/, 'el panel global vivo es el de superadmin');
assert.doesNotMatch(superadmin, /platform-access-panel/, 'superadmin no importa el componente retirado');

// Cobro preseleccionado (pedido de FIN, #45): la fila de factura abre el modal
// de “Registrar cobro” con esa factura ya marcada.
const workspace=read('app/scale-workspace.tsx');
assert.match(workspace,/const openPayment = \(invoiceId = ''\) => \{setPaymentInvoice\(invoiceId\);setModal\('payment'\);\}/, 'el shell expone openPayment con la factura elegida');
assert.match(workspace,/preselectInvoiceId=\{paymentInvoice\}/, 'el modal de cobro recibe la factura preseleccionada');
const forms=read('app/workspace-forms.tsx');
assert.match(forms,/preselectInvoiceId\?: string/, 'PaymentForm declara la factura preseleccionada');
assert.match(forms,/defaultValues:\s*\{\s*invoiceId: preselectInvoiceId,/, 'el formulario arranca con esa factura');
assert.match(read('app/sections/finanzas.tsx'),/openPayment\(invoice\.id\)/, 'la fila abre el cobro con su factura');

// §15 regla 7 (rutas canónicas) vive en tests/control-center.test.ts, junto al
// contrato de navegación.

// §15 regla 10 (versión visible y novedades): /status queda accesible desde la
// ayuda y la versión publicada sale de /health (release.version).
assert.match(read('app/workspace-guide.tsx'), /href="\/status"/, 'la ayuda enlaza el estado del sistema');
assert.match(read('backend/server.js'), /url\.pathname === '\/health'[\s\S]{0,200}release/, 'la versión publicada sale de /health');

// §15 regla 1 (cero éxito falso): el estado del correo en /status sale del API.
assert.match(read('app/status/page.tsx'), /api\/auth\/email-status/, 'el correo se comprueba contra el API, no por suposición');

// #96 (compactación del resto de Plataforma): la identidad vive en el shell
// (título + apartados) y las pantallas no repiten el título con PageHeader; los
// encabezados pasan a una línea compacta con el dato a la vista.
for (const [file, label] of [
  ['app/sections/preferencias.tsx', 'Preferencias del espacio'],
  ['app/archive-controls.tsx', 'Papelera de esta empresa'],
  ['app/invite-links.tsx', 'Invitaciones y solicitudes'],
  ['app/permissions-matrix.tsx', 'Roles y permisos'],
] as const) {
  assert.match(read(file), new RegExp(`aria-label="${label}"`), `${file} conserva su nombre accesible`);
  assert.doesNotMatch(read(file), /PageHeader/, `${file} no repite el título del shell`);
}
assert.doesNotMatch(read('app/suite.tsx'), /Actividad del equipo<\/h2>/, 'el feed de Actividad no repite el apartado del shell');
assert.match(read('app/suite.tsx'), /cambios registrados por el servidor en esta empresa · se muestran/);
assert.match(read('app/presence.tsx'), /Últimos 30 días · tiempo activo estimado, no horas trabajadas/, 'el uso del equipo explica el alcance en una línea con el detalle en el tooltip');
assert.match(read('app/archive-controls.tsx'), /<StateChip tone="mute">\{labels\[record\.kind\]/, 'la papelera muestra el tipo como chip');
assert.match(read('app/archive-controls.tsx'), /TRASH_TEMPLATE='grid-cols-\[2rem_8\.5rem/, 'la columna del chip conserva su ancho');
assert.match(read('app/sections/configuracion.tsx'), /grid gap-4 lg:grid-cols-\[minmax\(0,1\.6fr\)_minmax\(0,1fr\)\]/, 'Configuración usa la separación compacta entre columnas');
for (const file of ['app/superadmin/catalog.tsx', 'app/superadmin/audit.tsx', 'app/superadmin/access.tsx'])
  assert.match(read(file), /<EmptyBlock\s+compact/, `los vacíos del panel global son compactos (${file})`);

console.log(
  'PASS: retirados con reinvitación y lote resiliente, portal con invitaciones y reenvío de verificación, rutas/componentes muertos eliminados, cobro preseleccionado, /status desde la ayuda y correo comprobado contra el API',
);

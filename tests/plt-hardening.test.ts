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

console.log(
  'PASS: retirados con reinvitación y lote resiliente, portal con invitaciones y reenvío de verificación, rutas/componentes muertos eliminados y cobro preseleccionado',
);

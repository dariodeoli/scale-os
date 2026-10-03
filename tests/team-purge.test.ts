import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';

// Eliminación definitiva desde Equipo: basurero + confirmación peligrosa en la
// tarjeta del integrante retirado, purgado de la membresía en el API (la fila se
// conserva porque el historial referencia (organization_id,user_id)) y filtro
// de purgados en el directorio. Una nueva invitación reactiva al integrante.
const read=(path:string)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const operations=read('app/operations.tsx');
const agencyCore=read('backend/agency-core.js');
const teamOps=read('backend/operations.js');
const migration=read('backend/migrations/20260929_member_purge.sql');

test('Equipo ofrece eliminar definitivamente a los integrantes con acceso retirado',()=>{
 assert.match(operations,/<Trash2 size=\{16\} aria-hidden="true"\/>/,'el botón usa el icono de basurero');
 assert.match(operations,/aria-label=\{`Eliminar del equipo: \$\{personLabel\(entry\.member,'Integrante'\)\}`\}/,'el acceso al botón nombra la acción exacta sin correos técnicos');
 assert.match(operations,/\(!entry\.member!\.active\|\|Boolean\(entry\.member!\.removed_at\)\)/,'solo aparece con el acceso retirado o suspendido');
 assert.match(operations,/<ConfirmDialog open busy=\{purgeBusy\} variant="danger" title="Eliminar del equipo" confirmLabel="Eliminar del equipo"/,'la confirmación usa el diálogo peligroso compartido');
 assert.match(operations,/api\(`\/api\/agency\/members\/\$\{purgeTarget\.id\}\/permanent`,\{\},'DELETE'\)/,'el purgado llama al endpoint permanente');
 assert.doesNotMatch(operations,/window\.confirm/,'sin confirmaciones nativas');
});

test('el API purga la membresía sin romper el historial y filtra los purgados',()=>{
 assert.ok(agencyCore.includes('members\\/\\d+\\/permanent'),'la ruta permanente vive con los demás endpoints de integrantes');
 assert.ok(agencyCore.includes("Solo se elimina definitivamente a integrantes con el acceso retirado o suspendido"),'un integrante activo no se purga');
 assert.ok(agencyCore.includes("No podés eliminarte a vos mismo del equipo"),'nadie se purga a sí mismo');
 assert.ok(agencyCore.includes('purged_at=now()'),'el purgado marca la membresía');
 assert.ok(agencyCore.includes('purged_at=null'),'una nueva invitación limpia el purgado');
 assert.ok(agencyCore.includes('and purged_at is null'),'el listado de integrantes excluye a los purgados');
 assert.ok(teamOps.includes('m.purged_at is null'),'el directorio de equipo excluye a los purgados');
 assert.ok(migration.includes('add column if not exists purged_at'),'la migración es aditiva e idempotente');
});

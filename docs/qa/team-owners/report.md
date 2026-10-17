# Equipo y accesos — evidencia #225, campaña #221

Fecha: 17/10/2026 (America/Asuncion).
Implementación: commit `c44c5e83191208e7dbdf1615f3942a1b240d8f08`, rama `codex/equipo-propietarios`.
Reverificación integrada: checkout `/workspace/scale-os`, HEAD `e7adf9d51a48637b569625d3ecbdea0fb95cdbc9` al comenzar la prueba, paquete API `1.0.190`. Sin diferencias en los handlers, interfaz o harness de miembros respecto del candidato integrado `768acbd7`.

## Problema y solución

- La ficha ocultaba siempre «Quitar acceso»: `canRemoveRecord('members', role)` buscaba una clase inexistente en el mapa de Papelera. Ahora resuelve explícitamente `members.manage` sin agregar miembros al catálogo de Papelera.
- Un dueño puede quitar el acceso de otro dueño activo aunque no tenga ficha laboral. La acción aparece directamente en el menú y en la pestaña Acceso; exige confirmación y conserva el mensaje real del API cuando falla.
- La identidad propia y el badge «vos» usan el ID autenticado, nunca el correo, que puede cambiar o coincidir en datos de contacto.
- Se separaron Permiso y Acceso en seis columnas compartidas por encabezado/filas. Estado laboral y Acceso usan encabezado centrado y celda centrada. La vista lista conserva scroll horizontal en pantallas pequeñas.
- Revocación, cambio de rol/estado, purga e invitación bloquean primero la empresa y revalidan la membresía/rol actual del actor dentro del bloqueo. Un actor cuya sesión se validó antes de esperar puede haber sido retirado por la transacción ganadora: ahora recibe 403 y no puede retirar al último dueño ni reinvitarse.
- Se conservan las protecciones de autorretiro y de al menos un dueño activo. Un administrador no administra a dueños.
- La retirada modifica únicamente la membresía y cierra sus sesiones en esa empresa. Conserva usuario global, contraseña, accesos/sesiones de otras empresas, ficha/salario e historial. La purga sigue requiriendo acceso previamente retirado o suspendido y conserva la fila referenciada por el historial.

## Archivos

Interfaz: `app/archive-controls.tsx`, `app/operations.tsx`, `app/sections/equipo.tsx`, `app/team-directory.ts`, `app/team-person-sheet.tsx`, `app/team-workspace.tsx`.
API: `backend/member-access.js`, `backend/agency-core.js`, `backend/agency-suite.js`, `backend/record-lifecycle.js`.
Pruebas: `tests/team-owner-access.test.tsx`, `backend/test-member-access.mjs`, `backend/test-member-access-postgres.mjs`, `backend/test-lifecycle.mjs`.

## Verificación focal de la implementación

- `tsc --noEmit`: PASS.
- Grupo frontend `equipo-186`, `team-toolbar-density`, `team-purge`, `team-owner-access`, `workspace-access`: 20 pruebas PASS. Son pruebas de React/contratos, no dispositivos físicos.
- `backend/test-suite.mjs`, `test-lifecycle.mjs`, `test-auth.mjs` con VM modules: PASS.
- `backend/test-member-access.mjs` sobre PGlite: PASS. Acredita dueño sin ficha, rol real del actor en DB frente a sesión desactualizada, autorretiro, minimización de sesiones por empresa, límites por tenant, conservación de identidad global/salario/auditoría y un dueño activo restante.

## Concurrencia PostgreSQL sobre el código integrado

Comando ejecutado una sola vez en la reverificación:

```bash
SCALE_TEST_PG_BIN=/workspace/.qa-tools/postgres/usr/lib/postgresql/17/bin \
  npm --prefix /workspace/scale-os/backend run test:member-access-postgres
```

Log: `/tmp/scale-campaign-member-pg.log`.
Resultado: PASS, exit 0. PostgreSQL 17.11 real, dos conexiones independientes; PID 62370 y PID 62371. `pg_blocking_pids` acreditó la espera por el bloqueo de la empresa en cada carrera:

| Carrera | Respuestas | Dueños activos finales |
| --- | --- | --- |
| DELETE / DELETE | 200 + 403 | 1 |
| PATCH suspensión / PATCH suspensión | 200 + 403 | 1 |
| DELETE / PATCH suspensión | 200 + 403 | 1 |

El script usa un clúster descartable y socket Unix propios en un directorio temporal con permisos 0700; `listen_addresses=''` desactiva TCP. El puerto 55444 está hardcodeado como nombre dentro de ese directorio de socket y no comparte el socket de QA. La limpieza confirmó parada y eliminación del clúster de esta prueba; no se tocaron servicios ajenos.

No se ejecutaron builds, instalación de dependencias, modificaciones del producto ni despliegues durante esta reverificación. CI, revisión visual en navegador y publicación corresponden a la validación del integrador y al informe global de QA.

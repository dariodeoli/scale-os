# Registro con identidad existente — #237

Fecha: 17 de octubre de 2026. Base: `0310a41b` / 1.0.190.
Implementación inicial: `54b775d5`; ajuste posterior de uso de conexión y su regresión incluidos con este informe.

## Comportamiento acreditado

`POST /api/auth/password/register` acepta una fase de identidad con
`{intent:'resolve',email,password}`. Una cuenta verificada con contraseña válida
abre sesión en su empresa elegible y responde `200`, `existing:true`, `redirect`.
Una identidad desconocida responde `200`, `requiresAgency:true`, sin crear
usuario, empresa, sesión, verificación ni consentimiento. El alta final nueva
conserva política de contraseña, datos de empresa, consentimiento y verificación
por correo (`202`); antes de verificar no tiene membresía.

La contraseña histórica se valida como en login, sin imponerle la política de
contraseña nueva. Credenciales incorrectas, cuentas demo y cuentas sin correo
verificado responden `401`, incluso cuando el alta previa por correo está
pendiente. El reintento de esa alta antes respondía `409`; ahora conserva el
bloqueo de acceso con error genérico `Credenciales inválidas`. Sigue disponible
el flujo existente para reenviar la verificación. No se sustituye el hash.

Una preferencia válida sigue siendo prioritaria. Sin preferencia elegible, la
sesión usa una membresía real elegible y abre `/?chooseCompany=1`. Una solicitud
pendiente con invitación vigente abre `/acceso-pendiente` sin crear membresía.
Se rechazan invitaciones vencidas, usadas o revocadas, membresías retiradas o
inactivas, identidades históricas huérfanas y cuentas en cierre recuperable.

Google con intención de crear cuenta resuelve primero la identidad existente.
No emite otro ticket de agencia ni crea otro trial. Un ticket emitido cuando el
correo era nuevo vuelve a comprobar la identidad al consumirse. Si mientras
tanto obtuvo acceso, inicia sesión con su rol actual; si perdió acceso, falla.
El handoff normal también vuelve a comprobar acceso al consumirse.

`registerTrial` serializa por correo mediante advisory lock y bloquea la fila de
identidad antes de volver a leer su historial. Una identidad existente sólo
puede completar su primera alta si sigue sin verificar, tiene evidencia de alta
trial pendiente y carece de todo historial de membresías, solicitudes, trials y
cierres. Una cuenta Google puede completar esa primera alta conservando id y
hash de contraseña. La creación explícita de otra empresa y las invitaciones
mantienen sus flujos separados.

## Pruebas ejecutadas

Todas PASS, con bases locales descartables y sin enviar correos externos:

| Comando desde la raíz | Resultado |
| --- | --- |
| `node backend/test-existing-account.mjs` | PGlite: snapshots de usuarios, empresas, roles, membresías, suscripciones, trials, configuración y consentimientos; password legacy, default y fallback, errores, pendientes y primera alta. |
| `SCALE_TEST_PG_BIN=/ruta/postgresql/17/bin node backend/test-existing-account-postgres.mjs` | PostgreSQL 17.11 real: misma matriz y conexiones concurrentes para dos primeras altas Google y alta mixta Google/correo; una sola empresa por identidad. |
| `node --experimental-vm-modules backend/test-trial-registration.mjs` | 133 requests al handler real y 111 migraciones: Google existente histórico sin os_trial, ticket viejo, revocación entre callback/consumo, carreras y replay, alta nueva USD/PYG, suspensión y creación explícita de empresa. |
| `node --experimental-vm-modules backend/test-email-password-auth.mjs` | Alta y verificación por correo, invitaciones, entrega capturada, uso único y reenvío. |
| `node --experimental-vm-modules backend/test-auth.mjs` | Estado Google, membresías, handoff único, roles, revocación y reinvitación. |
| `node --experimental-vm-modules backend/test-default-organization.mjs` | Defaults por usuario, preferencias obsoletas, invitación explícita y signup existente conservando default. |
| `node backend/test-inventory-default-categories.mjs` | Categorías canónicas durante onboarding conservadas. |
| `node backend/test-privacy.mjs` | Consentimientos de registro/invitación y flujos PDP conservados. |
| `node --experimental-vm-modules backend/test-invitation-full-flow-regression.mjs` | 18/18 pruebas. |
| `node --experimental-vm-modules backend/test-access-recovery.mjs` | 42 escenarios de recuperación / 170 requests. |

La prueba PostgreSQL crea su propio cluster bajo `/tmp`, sólo socket Unix,
puerto 55458, sin `DATABASE_URL` ni credenciales de aplicación. Usa conexiones
concurrentes reales y elimina exclusivamente su cluster al terminar. PGlite
serializa sus transacciones; no se presenta como evidencia de locks concurrentes.
La prueba de pool acotado rechaza cualquier consulta al pool mientras el alta
retiene una conexión, para impedir esperas circulares por throttling anidado.

La matriz de contraseña verifica que no haya nuevas entregas para identidades
existentes. Google sólo ejecuta bienvenida cuando `registerTrial` creó un trial.
La foto/nombre de Google puede actualizar sus metadatos normales de login; no
cambia identidad personal elegida, hash, roles ni membresías.

## Límites y seguimiento

Google está simulado en el harness: se ejecutan los handlers y módulos reales,
pero no el proveedor OAuth público. La revisión de navegador integrada, CI,
merge y deploy corresponden al integrador. No se ejecutó deploy desde estas
pruebas. El agregador backend reside en `package.json` (`test:release`); el
integrador debe registrar `node test-existing-account.mjs`. La prueba PG es
optativa con binarios locales, separada de la regresión portable.

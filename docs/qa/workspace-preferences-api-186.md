# Preferencias de usuario y empresa — #186 E5

Base: main193 (`2ecdc7f3`). Sólo E5; los demás apartados del issue quedan fuera de esta entrega.

## Contrato

`GET/PATCH /api/agency/workspace-preferences` usa exclusivamente la sesión autenticada y comprueba membresía activa y empresa activa en una transacción. No acepta identidad ni empresa en el payload. `X-Scale-Preference-Scope: <usuario>:<empresa>` sólo rechaza pestañas antiguas (409); no autoriza acceso ni sustituye a la sesión.

Respuesta: `{preferences, stored, user_id, organization_id}`. `stored=false` identifica ausencia de registro. Preferencias v1: `startup: summary|production|my-day`, `production: {clientId: string, mine: boolean, week: boolean}`. PATCH acepta cambios parciales, con whitelist estricta, límite 1024 bytes, booleanos reales y cliente bigint perteneciente a la empresa. Los roles válidos coinciden con los roles actuales del workspace. Un cliente eliminado se limpia al leer. Respuestas privadas `no-store`; los errores internos no exponen detalles.

La tabla `agency_workspace_preferences` tiene PK usuario+empresa y FK compuesta a la membresía con borrado en cascada. Migración aditiva reentrante `20261018_workspace_preferences.sql`, registrada en bootstrap y `migration-order.mjs`. Se incorpora al inventario explícito de limpieza de demos, sin excepciones nuevas al guard de cascadas.

## Restauración y concurrencia

La caché del scope actual habilita controles inmediatamente. `startupReady` espera lectura de la cuenta; cada petición tiene timeout de 5 segundos y, ante fallo, conserva la copia y muestra reintento. Un enlace, retorno OAuth, navegación, interacción de puntero o teclado evita una redirección tardía del inicio.

Sólo la caché v1 anterior a esta API se importa automáticamente, tras leer `stored=false`, si no hubo edición. El PATCH de importación usa `If-None-Match: *`: INSERT atómico `ON CONFLICT DO NOTHING`; 412 relee las preferencias del dispositivo ganador. No hay autosave normal de bootstrap ni importación sobre un registro existente. Las cachés nuevas llevan `pendingSync`, por lo que no se confunden con migraciones antiguas.

Las ediciones se aplican inmediatamente y se serializan por scope, incluso si Home se desmonta y monta mientras una petición anterior continúa. Se coalescen los cambios posteriores en el último snapshot. Las respuestas GET o PATCH anteriores nunca reemplazan una edición más reciente. Callbacks y respuestas de sesiones anteriores se descartan. Los cambios fallidos permanecen marcados en la caché tras refrescar; se sincronizan mediante reintento explícito, sin que un GET los borre.

Preferencias y Producción exponen «Reintentar sincronización». Se retiran los tres chips de filtros de sólo lectura; las tarjetas explican el alcance sin afirmar almacenamiento exclusivamente local. Se mantienen las reglas de semana según calendario local.

## Verificación

- `node --import tsx --test tests/workspace-preferences.test.tsx tests/settings-slice.test.ts tests/workspace-guide-loading.test.ts`: pruebas de hidratación, permisos de inicio, navegación/OAuth, GET tardío, PATCH serializado, fallo/remontaje/reintento, aislamiento entre scopes, importación condicional/competidor, timeout, chips y cableado.
- `node backend/test-workspace-preferences.mjs`: PGlite; migración dos veces, autenticación, roles, whitelist/tamaño/tipos, cliente de otra empresa, importación CAS, merge parcial, aislamiento usuario/empresa/demo, membresía inactiva, cliente eliminado, errores y borrado FK.
- Desde `backend/`: `node test-release-migrations.mjs`: PASS sobre esquema completo y 115 migraciones registradas; reinicio rastreado.
- Desde `backend/`: `node test-maintenance.mjs`: verifica eliminación de preferencias de demo y conservación exacta de preferencias de empresa real.
- `npx tsc --noEmit` y `node --test tests/ui-architecture.test.mjs`.

QA de navegador, CI completo y deploy: pendientes del candidato integrado194. No se acredita prueba visual ni de producción en esta rama. El guard de hashes de acciones necesita el refresh global coordinado: cambian `scale-workspace.tsx` y se suman tres acciones canónicas de reintento, sin alterar los widgets nativos revisados. No se modifica el manifiesto compartido aquí.

# Contactos adicionales de clientes — #184 C2

Implementación aditiva sobre main1.0.193 (`2ecdc7f3`). PRODUCT.md distingue
Client/Contact y no impone espejo del principal: la nueva tabla mantiene
contactos hijos con nombre, rol opcional, correo y teléfono opcionales. No hay
roles de contacto prefijados, unicidad de correo/teléfono, sincronización del
principal ni cambios en datos legales/contratos emitidos.

## Rutas y límites

- Migración `20261018_client_contacts.sql`, registrada en bootstrap y orden de
  fixtures; FK compuesto organization/client, índice por ficha, versiónCAS.
- GET/POST `/api/agency/clients/:clientId/contacts`, GET/PATCH/DELETE
  `/api/agency/clients/:clientId/contacts/:id`; PATCH/DELETE exigen expected_version.
  Listado paginado50, máximo100 por página; no hay límite comercial de personas.
- `backend/client-contacts.js`, delegado por agencyCore. Revalida membresía y
  permiso clients.manage actuales bajo locks, tenant, papelera y bloqueoPDP.
  Validadores de email/teléfono compartidos con clientes; textos120/254/50.
- Auditoría sólo IDs/revisión/actor, nunca nombre/canales. El exportPDP incluye
  contactos y supresión los elimina: primero bloquea la ficha para evitar carrera
  con inserciones. Whitelist maintenance y fixture moderna incluyen contactos,
  con orden de borrado derivado deFK; conserva tenants reales.
- `app/client-contacts.tsx`: mismo panel en ficha y editor existentes, Editor y
  Dialog canónicos. El alta nueva conserva el flujo: se guarda ficha antes de
  agregar secundarios. Formularios hermanos/dialog separados, sin anidar forms.
  CAS409 conserva borrador; recarga exige confirmación de reemplazo. Eliminación
  también se confirma. RestricciónPDP no consulta ni muestra personas.

## Evidencia ejecutada en esta rama

| Prueba | Resultado observado |
| --- | --- |
| `node backend/test-client-contacts.mjs` | PASS27 llamadas handler: CRUD/paginación/validación, roles/overrides actuales/revocación/tenant/FK, principal intacto,409, papelera, export y supresiónPDP, auditoría sinPII y dispatcher real |
| `SCALE_TEST_PG_BIN=... node backend/test-client-contacts-postgres.mjs` | PASS PostgreSQL17.11 real, cluster propio sólo socket, dos conexiones con espera de rowlock observada; PATCH/PATCH ganador+409 y versión exacta; supresión/create409 sin resucitar hijos. Cluster detenido y eliminado |
| `node tests/client-contacts-browser-184.test.mjs` | PASS22 checks Chromium1440/390: alta/edición, payloadCAS, conservar borrador409, cancelar/confirmar recarga y borrado, sincronización de dos paneles montados sin perder borradores, restricción sinrequest. Usa componentes reales y transporte sintético; no acredita DB vía navegador niCSS completo de la aplicación |
| `node build-tools/run-release-regression.mjs --only client-editor-184` | PASS22 pruebas previas: flujo único, RUC con confirmación, planes/términos/historial, lista y CSV preservados |
| `cd backend && node test-privacy.mjs` | PASS export/supresión/consentimientos/retención con migraciones actuales |
| `cd backend && node test-maintenance.mjs` | PASS18 tablas modernas, contactos poblados incluidos, demos vencidas limpiadas y tenants reales/finanzas preservados, rollback/guards y scheduling |
| `cd backend && node test-release-migrations.mjs` | PASS schema+115 migraciones registradas/reinicio con tracker |
| `SCALE_TEST_PG_BIN=... node backend/test-maintenance-postgres.mjs` | PASS PostgreSQL17.11 real con contactos poblados: limpieza temporal, rollback/guards, aislamiento y sesiones activas conservadas; cluster eliminado |
| `npx tsc --noEmit --incremental false` | PASS |

Los checks nuevos se registran en backend test:release y el runner canónico de
browser; no se atribuye una suite global/build a esta rama. Esos gates y el
smokeNext real integrado corresponden al integrador antes del release. Logs
locales `/tmp/scale184-{backend,postgres,browser,client-regression,privacy,maintenance,maintenance-postgres,migrations,tsc}.log`.

No se usó producción, correo, proveedor externo, hardware ni captura dePII. No
hay bump/tag/deploy en esta rama. El issue184 sigue abierto hasta integración,
QA de aplicación y deploy acreditados; C1/C3/C4/C5 previos no se reimplementaron.
Rollback: revertir rutas/UI manteniendo tabla y contactos; no borrar datos de
producción para volver a una versión anterior.

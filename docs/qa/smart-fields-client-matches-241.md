# #241 · Campo consultable y coincidencias de clientes

Lote posterior a Editor/lifecycle. Reutiliza campos base `9e283168`, Button `fa287de8` + `5df61784`, selector `cd3a7509` y helper temporal `fa0da218`. El integrador toma las ramas originales de esas dependencias, sin copiar sus commits locales duplicados.

## Fuente y reglas ratificadas

POST `/api/agency/clients/matches` recibe `{kind:'tax_id'|'email'|'phone',value}` en el cuerpo, nunca identificadores en URL. Se registra antes de Suite para no caer en la ruta genérica. Sesión autenticada, organización actual y `clients.manage` son obligatorios; ese es el mismo gate de contacto de `client-contact.js`, incluidos overrides. No acepta un organizationId alternativo, ni consulta usuarios ni otras empresas.

Usa la comparación RUC existente (`rucDigits`/DB sin no-dígitos), sin inferir DV ausente; email trim/lowercase por validador existente; teléfono por `suite-validation.phone`, comparando dígitos exactos de DB sin reparar legados. Excluye Papelera y `personal_data_blocked_at`. Devuelve hasta10 `{id,name,logo_url,secondary,state}`; secondary sólo «Mismo RUC/correo/teléfono», no revela contacto adicional. `mediaPhoto` conserva el endpoint canónico de logo. No genera alta, trial, correo, proveedor externo ni cambio comercial.

La búsqueda usa throttle atómico existente:120 búsquedas/15min por organización+usuario, con key hasheada sin contacto. Corre antes de leer coincidencias. No se añade auditoría con PII; la única escritura de lectura es su contador de rate limit. No requiere migración.

## Flujo de alta

ClientEditor observa su borrador sin resetearlo, espera350ms y busca identificadores válidos exactos. Cancela/genera versión al cambiar identidad, desmontar o seguir manualmente; una respuesta vieja no altera borrador ni lista actual. Resultados usan Selector con logo/nombre y descripción mínima. Correo/teléfono compartidos son sugerencia y permiten continuar, no una nueva restricción de unicidad.

«Abrir ficha existente» abre ClientEditorDialog hijo sobre el alta: conserva el borrador al volver y nunca llama onCreated(existing). «Seguir con la ficha nueva» descarta sugerencias para esa identidad sin tocar datos. Si CREATE recibe409, vuelve a ofrecer búsqueda con el borrador intacto; no reintenta alta automáticamente ni deduce el motivo por el texto del error.

La consulta RUC usa LookupField/LookupReview de `app/ui/smart-field.tsx`. No encontrado (`record:null`) y fallo proveedor muestran estados distintos; carga manual sigue disponible. Encontrar no aplica, Aplicar usa normalización existente, y editar RUC/razón social durante consulta/revisión protege los cambios manuales mediante snapshot/generation.

## Verificación reproducible

```
node backend/test-client-matches.mjs
# PGlite:140 llamadas PASS; permisos, tenant, PDP/papelera, exactitud,10máx,429 previo a lectura, sin alta
node_modules/.bin/tsx --test tests/smart-field-241.test.tsx tests/editor-contracts-241.test.tsx tests/shared-editor.test.tsx tests/client-editor-184.test.tsx tests/client-reporting.test.tsx tests/ui-fields.test.tsx tests/ui-select.test.tsx
#37 tests PASS
node_modules/.bin/tsc --noEmit --incremental false
#exit0
node tests/editor-focus-browser-241.test.mjs
#Chromium real390 PASS con controles/selector nuevos
node tests/client-matches-browser-241.test.mjs
#Chromium real1440 PASS:selector por teclado, ficha hija, retorno sin perder borrador,409 sin falsa alta, respuesta vieja y RUC manual/confirmación/conflicto/error
node --check backend/client-matches.js
node --check backend/server.js
```

Browser usa contactos sintéticos `.invalid` y transporte controlado en loopback; la lógica SQL/API real se prueba con PGlite aparte. No se probó proveedor real, OAuth, producción ni deploy. Gates globales/backend release pertenecen al integrador; incluir `backend/test-client-matches.mjs` si el runner usa una lista curada.

# OwnData RUC — Refs #353 / #350

OpenAPI público consultado: https://app.controlaria.online/api/v1/openapi.json, versión 1.4.0. Endpoint GET `/api/v1/ruc/{ruc}` server-to-server, nunca desde el navegador.

Backend focal: `cd backend && node test-ruc.mjs` PASS. Incluye respuesta con/sin status/stateRaw, identidad y DV, nombre ausente, Live/accounting/cuota/procedencia/hash, clave inválida/revocada/vencida, plan/API deshabilitados, 404/429/503, Retry-After saneado, límites fail-closed, cache por tipo y ausencia de secretos/metadata fiscal.

Formulario: agente reportó 41 tests focales y TypeScript PASS. Root repitió browser contra árbol integrado con `node build-tools/qa-owndata353.mjs`: PASS. `browser.json` documenta fixtures, ambos viewports y checks. Se renderiza el ClientEditor real con HTTP local sintético; no se simula una consulta real de OwnData ni se usa información de clientes reales. No acredita móvil físico, login, conexión Live ni deploy. `source-hashes.json` identifica el código probado.

La razón social queda oficial; la presentación full de persona se usa sólo tras confirmación explícita del tipo y del resultado. No se infiere por coma/RUC ni se consulta al guardar. Estado fiscal ignorado y ausente de UI; tax_state vacío se conserva por contrato histórico. Errores HTTP401 del proveedor se informan con código seguro y provider_status:401 dentro de un HTTP503 de Scale, para distinguir credencial del servidor de autenticación del usuario. Not-found confirmado conserva `{record:null}` HTTP200 del contrato interno.

Pendiente de acreditar en producción: versión web/API nueva y flujo autenticado desde formulario sin cookies OwnData. El entorno no tiene token Coolify, clave OwnData ni sesión autorizada de Scale. La última API pública observada responde 1.0.202; no se declara listo por /health.

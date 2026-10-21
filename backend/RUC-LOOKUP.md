# RUC lookup provider configuration

The API calls an HTTPS provider only from `POST /api/agency/ruc-lookup` or the explicit client refresh route. The provider never runs in demo organizations.

## Environment

- `RUC_LOOKUP_PROVIDER_URL` — HTTPS endpoint prefix. The API appends `/{normalized-ruc}`. Defaults to `https://ruc.sun.com.py/api/ruc` for backwards compatibility; set this explicitly in each deployment.
- `RUC_LOOKUP_TIMEOUT_MS` — provider timeout, 1,000–30,000 ms; default `12000`.
- `RUC_LOOKUP_CACHE_TTL_SECONDS` — successful lookup cache TTL, 60–604,800 seconds; default `86400`.
- `RUC_LOOKUP_NO_RESULT_TTL_SECONDS` — not-found cache TTL, 60–86,400 seconds; default `3600`.
- `RUC_LOOKUP_MONTHLY_LIMIT` — external calls per month, 1–100; default `100`.

The provider must return HTTP `404` when there is no record, or JSON with `name`, `ruc`, `dv`, optional `fullRuc`, `state`, and `publicationDateText` for a record. All other provider failures become a safe `503` response; provider response bodies and URLs are never exposed.

## API

- `POST /api/agency/ruc-lookup` body `{ "ruc": "80.168.807 - 8" }` returns a normalized record, `{record:null}` for a safe no-result, and `cached`.
- `POST /api/agency/clients/:id/ruc-refresh` reads the client’s existing complete RUC. Without `apply:true` it previews the fresh provider record. With `{ "apply": true }` it only stores provider metadata (`ruc_legal_name`, `ruc_tax_state`, source and refresh timestamp); it never changes the user-managed client name, legal name, contact data, or notes.
- `POST /api/agency/clients/from-ruc` remains the explicit create confirmation route.

## OwnData Live: claves personales y empresariales (#353)

Configuración del **servicio API**, base `backend/`, en Production:

```env
OWNDATA_API_ORIGIN=https://app.controlaria.online
OWNDATA_API_KEY=<clave secreta Live>
```

`OWNDATA_API_KEY` debe ser una clave **secreta** personal o empresarial, activa, vigente y con permiso `ruc:read`; nunca una clave publicable `pk_`. Guardarla únicamente como secreto **Runtime**, sin Buildtime ni `NEXT_PUBLIC_*`. No pegar su valor en issues, chat, capturas, logs o comandos. La vigencia, el permiso y la activación se verifican en OwnData y mediante una consulta real autorizada; no se deducen por el prefijo de una clave. No se exige que una clave personal tenga plan empresarial. `PLAN_REQUIRED` identifica que OwnData exige ese plan para la clave consultada.

Las dos variables seleccionan OwnData automáticamente. También se conserva la configuración previa `RUC_LOOKUP_PROVIDER_KIND=owndata` y `RUC_LOOKUP_PROVIDER_URL=https://app.controlaria.online/api/v1/ruc`. Si estas variables anteriores existen deben coincidir; no hay fallback a un proveedor distinto ante una clave inválida. El origen está cerrado al HTTPS documentado, sin path adicional, credenciales ni puerto distinto; el host está incluido en la lista saliente canónica. Una configuración inválida detiene el arranque sin imprimir el valor. Si Coolify revierte un despliegue por ese error, corregir la variable Runtime antes de desplegar de nuevo; no desactivar el healthcheck ni validaciones.

### Contrato público de Scale y nombres

Scale consume `GET https://app.controlaria.online/api/v1/ruc/{ruc}` desde el backend con `X-API-Key`. Su ruta protegida es **POST `/api/agency/ruc-lookup`**, accesible por el proxy web `/core-api/api/agency/ruc-lookup`; `/api/ruc` no es una ruta pública de Scale. Requiere sesión de **Scale**, permiso `clients.manage`, origen autorizado y cuerpo acotado. No necesita cookies ni sesión de OwnData, localStorage o sessionStorage. El servidor no reenvía Cookie ni Authorization del navegador, usa `credentials:omit`, rechaza redirecciones y no reintenta.

El body admite `subjectKind: "unknown" | "individual" | "legal_entity"`, con `unknown` por defecto. Únicamente una selección **explícita** de persona permite pedir `?nameMethods=full&subjectKind=individual`; no se infiere por el RUC, CI, comas o mayúsculas. Para empresas/desconocidos no se solicita ni aplica reorganización. La respuesta conserva `record.name` como `data.nameOfficial` oficial y añade `record.display_name` sólo si la presentación raíz `namePresentation.values.full` es un string no vacío para una persona confirmada. Si es null/ausente se muestra el nombre original sin inventarlo. La razón social oficial se conserva incluso cuando se presenta el nombre con nombres primero. El formulario siempre solicita confirmar antes de aplicar y permite ingreso manual.

Los cachés OwnData v2 se separan por ambiente Live y tipo explícito; no se reutilizan fichas antiguas de otro tipo/ambiente. Las respuestas cacheadas también se reconstruyen por lista permitida, descartando metadata extra o estados fiscales.

### Validaciones y seguridad

`data.status` y `data.stateRaw` se ignoran por completo, incluso ante valores o tipos futuros; nunca se publican ni se infiere actividad fiscal. `tax_state` permanece vacío exclusivamente por compatibilidad del contrato normalizado. Se validan identidad exacta y DV calculado, nombre oficial no vacío, equivalencia opcional string/null y partición opcional entero 0–9. Según OpenAPI 1.4.0 se exige ambiente **live**, procedencia `dnit_official_snapshot` con URL HTTPS sin credenciales/puerto ajeno, fecha de publicación válida, texto publicado, fecha de importación y `snapshotHash` hexadecimal minúsculo de 64 caracteres. Cuota obligatoria: enteros no negativos, fecha válida y `limit`/`resetAfter` positivos. `accounting.alreadyConsulted` y `accounting.charged` son booleanos obligatorios; `cacheEnabled`, si existe, es booleano. No se consulta la URL de procedencia. Respuesta del proveedor limitada a 64 KiB.

Se conserva el throttle SQL compartido (40 por usuario/15 minutos **antes de caché**), la cuota mensual atómica (máximo 100) y el límite entrante de 1 MiB del servidor. Si falla el throttle se devuelve error **sin llamar al proveedor**. Esta arquitectura no usa Redis para RUC ni tiene fallback ilimitado en memoria; no requiere copiar configuraciones TLS/trusted proxy de otro proyecto.

### Errores seguros

Los errores conservan sólo códigos de una lista cerrada y mensajes escritos por Scale, nunca mensajes/cuerpos/request IDs/diagnósticos de OwnData ni secretos.

| OwnData | Respuesta de Scale |
| --- | --- |
| 400 `INVALID_RUC_FORMAT` / `INVALID_RUC_DV` | HTTP 400 y código seguro |
| 401 `API_KEY_INVALID` / `API_KEY_REVOKED` / `API_KEY_EXPIRED` | HTTP 503, código seguro y `provider_status:401` |
| 403 `PLAN_REQUIRED` / `INSUFFICIENT_SCOPE` | HTTP 503, código seguro y `provider_status:403` |
| 503 `COMMERCIAL_API_DISABLED` / dataset no disponible | HTTP 503 y código seguro |
| 404 `REGISTERED_RUC_NOT_FOUND` | HTTP 200 `{record:null}` según contrato histórico de Scale; el formulario distingue no encontrado |
| 429 | HTTP 429; `Retry-After` y `retry_after` sólo si el header es válido (1–86.400 segundos o fecha HTTP equivalente) |
| HTTP 401/403/503 con cuerpo no JSON o código desconocido | Error seguro de autorización/permiso/disponibilidad, sin filtrar cuerpo |

El **401 de Scale** sigue indicando falta de sesión de Scale. El **401 de OwnData** es una credencial del servidor inválida y se informa como `provider_status:401` con HTTP 503 para evitar cerrar la sesión del usuario. Un error de plan/activación/clave no es un fallo del parser. `Retry-After` no dispara reintentos automáticos. Errores desconocidos o fichas inválidas se devuelven con `OWNDATA_INVALID_RESPONSE`.

### Pruebas y despliegue

`node test-ruc.mjs` usa exclusivamente claves y respuestas sintéticas. Incluye estados legacy presentes/ausentes, DV, campos/metadatos/procedencia/hash, Live frente a Test, accounting, presentación raíz y tipo confirmado, aislamiento de caché, errores de clave/plan/API, 404/429/503, `Retry-After`, límites, fallo cerrado del throttle y ausencia de secretos/estado fiscal. Las pruebas sintéticas no acreditan activación de una clave real.

Después del CI y merge, verificar web **y API** con la misma versión y hacer una consulta desde el formulario con una sesión de Scale autorizada y sin cookies OwnData. Confirmar resultado, revisión y aplicación explícita sin sobrescribir datos manuales, y comprobar que las peticiones del navegador van sólo a Scale sin API key. `/health` correcto por sí solo **no acredita** este flujo. Si no hay acceso autenticado/configuración de la clave, dejar el issue abierto con esa limitación explícita.

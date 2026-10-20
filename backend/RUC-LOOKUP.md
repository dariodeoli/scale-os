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

## OwnData: contrato comercial y estado fiscal opcional (#350)

Scale consume `GET https://app.controlaria.online/api/v1/ruc/{ruc}` desde el backend. Su ruta de consulta es **POST `/api/agency/ruc-lookup`**, accesible por el proxy web `/core-api/api/agency/ruc-lookup`; `/api/ruc` es un ejemplo genérico y no una ruta pública de Scale. Requiere sesión de Scale, permiso `clients.manage`, origen autorizado y cuerpo acotado. No requiere cookies ni sesión de OwnData, localStorage o sessionStorage. La clave vive sólo en `OWNDATA_API_KEY` del backend y se transmite únicamente en `X-API-Key`; no se reenvían cookies ni Authorization del navegador.

`data.status` y `data.stateRaw` se ignoran por completo, incluso ante valores o tipos futuros. No se publican ni se infiere actividad fiscal. `tax_state` permanece vacío para compatibilidad del contrato normalizado, también al leer caché de OwnData. Se validan identidad exacta y DV calculado, nombre no vacío, equivalencia opcional string/null y partición opcional entero 0–9. Son obligatorios ambiente test/live, procedencia DNIT con URL HTTPS sin credenciales, fecha de publicación válida, texto publicado (puede estar vacío), fecha de importación y hash hexadecimal de 64 caracteres, y cuota con enteros no negativos y fecha válida. No se hacen peticiones a la URL de procedencia. Respuestas del proveedor limitadas a 64 KiB, sin redirecciones ni reintentos.

Los errores sólo conservan un código de una lista cerrada y un mensaje escrito por Scale. `COMMERCIAL_API_DISABLED`, `API_KEY_INVALID`, `API_KEY_REVOKED`, `API_KEY_EXPIRED`, ambiente, scopes o plan son problemas de configuración/activación del servidor: HTTP 503 con código seguro; no se presentan como sesión vencida del usuario ni fallo del parser. RUC/DV inválido devuelve 400; cuota 429; not-found confirmado devuelve `record:null`. Errores desconocidos o fichas inválidas devuelven `OWNDATA_INVALID_RESPONSE` sin mensajes, request IDs, cuerpos o diagnósticos del proveedor.

Se mantiene el throttle SQL compartido (40 por usuario/15 minutos antes de caché), la cuota mensual atómica (máximo 100) y el límite entrante de 1 MiB del servidor. Si falla el throttle, se devuelve error y no se llama al proveedor; no hay Redis ni fallback en memoria ilimitado. Los tests usan claves y respuestas sintéticas y no acreditan activación de una clave real. La comprobación de producción requiere una sesión de Scale autorizada, pero ninguna cookie de OwnData.

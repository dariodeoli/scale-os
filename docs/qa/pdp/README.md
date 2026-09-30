# Evidencia — flujo de solicitudes PDP (scale-os#112)

Corrida real sobre la rama `SOS-PLT` (v1.0.153 + cambios locales), con
PostgreSQL 17 temporal, el API (`backend/server.js`) y el front compilado con
`next start`. Datos de ejemplo de una agencia ficticia («Estudio Horizonte»).

## Capturas

| Archivo | Qué muestra |
| --- | --- |
| `cola-escritorio-todas.png` | Cola completa (todas): 4 solicitudes con estados y SLA |
| `cola-escritorio.png` | Cola abierta: encabezado, KPIs y acciones por fila |
| `nueva-solicitud.png` | Alta de solicitud (titular, derecho, detalle) |
| `resolver-solicitud.png` | Resolución con acción aplicada (copia entregada / bloqueo / anonimización) |
| `consentimientos-escritorio.png` | Consentimientos vigentes con versión del aviso y origen |
| `retencion-escritorio.png` | Política de retención declarada y última corrida |
| `cola-mobile.png`, `consentimientos-mobile.png`, `retencion-mobile.png` | Mismas superficies a 390×844 (lista con scroll horizontal silencioso) |
| `configuracion-escritorio.png` | Página completa donde vive el panel |

Capturado con Chrome headless (Puppeteer) contra `http://localhost:3300`
(front compilado; el shell no tiene overflow horizontal a 390 px:
`document.scrollWidth = innerWidth = 390`).

## Transcript del API (extracto)

```http
GET /api/privacy/notice
{"version":"2026-09-30-v1","url":"https://scaleparaguay.com/privacidad","purposes":["account","service","billing","portal","contact"]}
```

```http
POST /api/privacy/consents
{"subject_kind":"client","subject_id":"1","purpose":"service","source":"crm_client","basis":"contract"}
→ 201 · notice_version 2026-09-30-v1 · un solo consentimiento vigente por titular+finalidad
```

```http
GET /api/privacy/requests?status=open
{"counts":{"received":2,"identity_verified":0,"in_review":1,"resolved":1,"rejected":0,"cancelled":0,"overdue":0,"total":4},
 "rows":[{"id":"1","request_type":"access","status":"in_review","days_left":30,"overdue":false}, ...]}
```

```http
PATCH /api/privacy/requests/1  {"action":"verify"} → identity_verified (identity_verified_at)
PATCH /api/privacy/requests/1  {"action":"start"}  → in_review
PATCH /api/privacy/requests/4  {"action":"resolve","resolution":"...","resolution_action":"corrected"} → resolved
```

```http
GET /api/privacy/requests/1/export?format=json
→ 200 · secciones: ficha, proyectos, presupuestos, facturas, portal, consentimientos, solicitudes

GET /api/privacy/requests/1/export?format=csv
→ 200 · ``\uFEFF`seccion,campo,valor` (BOM para Excel)

GET /api/privacy/access-log
→ export (solicitud), request.resolve, request.create — con actor, titular y contexto
```

Retención (job diario, modo reporte por defecto):

```json
{"event":"privacy_retention_complete","mode":"report","candidates":0,"affected":0,
 "results":[{"id":"leads_inactive",...},{"id":"portal_invites",...}]}
```

## Cómo reproducir

```sh
# 1) PostgreSQL temporal (Homebrew)
initdb -D /tmp/pg-pdp -U scale --auth=trust
pg_ctl -D /tmp/pg-pdp -o "-p 55432" start && createdb -h 127.0.0.1 -p 55432 -U scale scale_os

# 2) API
DATABASE_URL=postgresql://scale@127.0.0.1:55432/scale_os PORT=3199 node backend/server.js

# 3) Front (el rewrite exige https: se compila con SCALE_API_ORIGIN=https://127.0.0.1:3443
#    y un proxy TLS local hacia el API; en producción apunta a api.scaleparaguay.com)
SCALE_API_ORIGIN=https://127.0.0.1:3443 npx next build && npx next start -p 3300
```

La sesión de captura es una fila de `sessions` sembrada a mano; no se usaron
credenciales reales ni datos de producción.

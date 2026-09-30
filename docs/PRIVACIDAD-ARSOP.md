# Procedimiento de derechos del titular (ARSOP + portabilidad)

> **Borrador operativo.** Refleja el flujo implementado en `backend/personal-data.js`
> (scale-os#112). Los textos de cara al titular los integra SOS-DSN (#113).

## 1. Alcance

Acceso, rectificación, supresión, oposición, portabilidad e impugnación de
decisiones automatizadas. Gratuito, sin exigir motivación, con respuesta en
**≤ 30 días naturales** desde la recepción.

## 2. Canales de entrada

| Canal | Quién | Endpoint |
| --- | --- | --- |
| Portal del cliente → Mis datos | Titular (usuario del portal) | `POST /api/client-portal/privacy/requests` |
| Perfil interno → Mis datos | Integrante del equipo | `POST /api/privacy/me/requests` |
| Equipo de la agencia (correo, mostrador) | Owner/admin con `privacy.manage` | `POST /api/privacy/requests` |
| Copia inmediata | Titular autenticado | `GET /api/privacy/me/export` · `GET /api/client-portal/privacy/export` |

La cola vive en **Configuración → Solicitudes de titulares** (owner/admin) con
contadores, vencimientos y bitácora.

## 3. Estados y transiciones

```
received ──verify──▶ identity_verified ──start──▶ in_review ──resolve──▶ resolved
   │                        │                         │
   └────────────── reject / cancel ──────────────────▶ rejected / cancelled
```

- **received:** registrada con fecha y vencimiento (`due_at = received_at + 30 días`).
- **identity_verified:** identidad del solicitante comprobada (ver §4).
- **in_review:** en gestión por el equipo.
- **resolved / rejected / cancelled:** cierre con resolución o motivo; no se reabre
  (una nueva solicitud crea otro registro). Solo una solicitud abierta por tipo y
  titular: el segundo intento recibe `409` con el número en curso.

Cada transición exige `privacy.manage` y queda auditada (`request.resolve`,
`request.reject`, `export`, `erasure`, `consent.revoke`) en
`personal_data_access_log`.

## 4. Verificación de identidad

- Sesión autenticada del propio titular (portal o panel): identidad ya verificada.
- Solicitud por tercero/correo: el equipo comprueba el canal habitual de contacto
  (correo registrado o teléfono conocido) y recién entonces pasa a
  `identity_verified`. No se entrega información antes de esa marca.

## 5. Resolución por tipo de derecho

| Derecho | Acción en el sistema | `resolution_action` |
| --- | --- | --- |
| Acceso | Copia JSON/CSV (`GET /api/privacy/requests/:id/export`) entregada | `export_delivered` |
| Portabilidad | Igual que acceso, en formato estructurado | `export_delivered` |
| Rectificación | El equipo corrige la ficha en su módulo y registra la nota | `corrected` |
| Oposición | Revoca los consentimientos indicados (o todos) | `opposed` |
| Supresión | Bloquea o anonimiza (ver §6) | `blocked` / `anonymized` |

### Decisiones de conservación vs. borrado

- **Cliente con facturas no anuladas:** se **bloquea** — se vacían correo,
  teléfono, notas y redes; se conservan razón social y RUC porque identifican
  documentos fiscales. `fiscal_records_kept: true` queda en la resolución.
- **Cliente sin documentos fiscales:** se **anonimiza** el nombre y se eliminan
  los datos de contacto.
- **Oportunidad (lead):** se **anonimiza** (nombre, correo, teléfono y notas).
- **Integrante del equipo:** se desactiva el acceso (`purged_at`), se eliminan
  sesiones, se anonimiza su nombre en la empresa y se vacía el contacto. Los
  **importes de remuneración se conservan** por obligación contable/laboral.
- **Usuario del portal:** se deshabilita la cuenta, se revocan accesos y sesiones,
  y se anonimiza el nombre visible en el historial.
- **Titular externo sin ficha:** la supresión se resuelve con la nota de la
  gestión (no hay datos que borrar en el sistema).
- Nunca se borran facturas, pagos, asientos ni la bitácora de consentimientos.

## 6. SLA y alertas

- `due_at` se calcula al recibir; **no se extiende** automáticamente.
- La interfaz pinta vencimientos y la API expone `overdue` y `days_left`.
- Prorroga excepcional: se documenta en la resolución (una sola vez y con aviso
  al titular). Pendiente de definir el texto del aviso de prórroga con el dueño.

## 7. Evidencia y reporte

- Export JSON/CSV: sección `consentimientos` y `solicitudes` incluidas.
- `GET /api/privacy/access-log` lista quién vio/exportó y quién resolvió.
- Retención de solicitudes cerradas: se purgan a los **365 días** (política
  `access_requests`) salvo investigación abierta.

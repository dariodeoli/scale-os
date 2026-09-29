# Avisos y correos — contrato canónico (§16, owncoding-ui v0.51.0)

Formato de notificaciones: **un solo hecho, una sola bandeja, un solo estado**. El aviso
nace en `agency_notifications` (bandeja oficial) y de ahí derivan los canales; ningún canal
arma su propio texto ni su propio estado. Regla transversal: **sin relay configurado el
envío queda en cola, nunca «enviado»** (§15 regla 1, cero éxito falso).

## Bandeja oficial (`agency_notifications`)

`backend/notifications.js` es el único punto de lectura/escritura de la bandeja:
`GET/PATCH /api/agency/notifications` (lista, preferencias, leer, resolver). El hecho se
crea con `enqueue_agency_notification(...)` (trigger de asignaciones, `automation.js` para
vencimientos, `comment-mentions.js` y `client-portal.js` para comentarios y actividad del
portal). La lista agrega `href` —la **ruta interna única**— calculada en un solo lugar
(`notificationHref`): `/resumen?order=<id>[#comment-<id>]`, `/proyectos#project-<id>` o
`/resumen`. Nunca es una URL externa.

## Estados canónicos de envío

`agency_notifications.email_status` usa cuatro estados canónicos; la migración
`20260929_notification_email_status.sql` traduce el vocabulario anterior, fija el default y
acota la columna con un `check`:

| Canónico | Antes | Significado |
| --- | --- | --- |
| `enviado` | `sent` | El relay/proveedor **aceptó** el envío. Aceptación ≠ entrega: no se marca entrega en bandeja. |
| `encolado` | `pending` | En cola. También cuando **no hay relay configurado** (default de la columna). |
| `duplicado` | `skipped` | No corresponde un envío nuevo: el aviso ya se leyó o resolvió, las preferencias o el acceso están apagados, es Demo o venció la ventana de 23 h. |
| `fallido` | `failed` | El proveedor rechazó y se agotaron los reintentos (5 intentos, backoff exponencial). |

Evidencia: `backend/test-notification-status.mjs` (mapeo, default, check, relay ausente en
cola, aceptación → `enviado`, rechazo → `encolado` y luego `fallido`, leído → `duplicado`).
La UI no expone `email_status`; si una pantalla lo muestra, el contrato se acuerda en DSN
(§16, issue #83).

## Plantillas

Estructura canónica de todo correo: **motivo** (qué pasó) → **acción** (qué hacer, con
enlace visible de respaldo; lo dibuja `emailShell`) → **cierre** es-PY → **firma**
(app + «Desarrollado por Owncoding»). Sin datos de más.

- **Avisos de la bandeja** (`notificationEmail`): el texto sale del aviso (título y cuerpo)
  y el enlace de `notificationHref`; el cierre explica cómo desactivar los correos.
- **Acceso**: invitación, establecer contraseña, verificación, acceso habilitado y código de
  eliminación (`invitation-email.js`). El código de eliminación es la excepción de «enlace
  visible»: la acción es el código y no lleva URL.
- **Facturación**: prueba, suspensión y cobro rechazado (`billing-email.js`).
- **Portal del cliente**: restablecer contraseña e invitación (`client-portal.js`).

Las plantillas usan `emailShell` (versión `v1.0.3`), que escapa todo lo dinámico y dibuja el
enlace de respaldo debajo del botón.

## Derivación única por canal

- **Correo**: `deliverNotifications` (`automation.js`) lee solo la bandeja (`email_status=
  'encolado'`), deriva el mensaje con `notificationEmail` y registra el estado en la misma
  fila. Sin relay (`mail.status.available=false`) sale temprano: las filas siguen
  `encolado`.
- **WhatsApp**: **N/A** como canal de avisos. `app/whatsapp-button.tsx` es un botón de
  enlace (`wa.me`) y el único texto prellenado es el pedido de activación de la suscripción
  (`subscription-panel.tsx`), iniciado por la persona: no deriva de la bandeja ni tiene
  estado propio. Si algún día se automatiza, el texto debe derivar del mismo aviso.
- **Push**: **N/A**, no existe canal ni service worker. Contrato futuro al adoptarlo:
  `payloadPush` (título genérico, cuerpo corto y `data` con ruta interna, `id` y `tono`) y
  `enHorarioSilencioso` (22 → 8) de `owncoding-ui` ≥ v0.51.0 — llegan con el bump de #82.
  **Nada sensible en pantalla bloqueada**: sin cliente, montos, motivos ni datos del pedido;
  el detalle vive en la bandeja y el aviso queda aunque no suene.

## Frontera con los correos transaccionales

Invitación, verificación, recuperación, código de eliminación, cobro y suspensión son
mensajes **transaccionales de un solo uso** (seguridad/facturación) con su propia
idempotencia; no son derivaciones de la bandeja. Comparten la estructura de plantilla y la
firma, y su resultado se informa desde la respuesta real del proveedor (`emailSent` /
`deliveryAccepted`), nunca por suposición. Llevarlos a la bandeja exigiría un `kind` nuevo y
su propia dedupe: cambio fuera de este alcance, documentado como pendiente.

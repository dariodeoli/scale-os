# QA de flujos reales del portal del cliente (Refs #153)

Datos controlados, sin enviar nada a clientes reales. La matriz se prueba sobre la
API real con PGlite (`backend/test-client-portal.mjs`, dentro de `test:release`) y
sobre el front (`app/cliente/*`). Los hallazgos chicos se arreglaron en la misma
rama; los visuales del preview quedan en #147.

## Matriz de flujos

| Flujo | Cobertura API (test) | Cobertura UI | Estado |
|---|---|---|---|
| Preview token válido | `test-client-portal.mjs` (200 + nombre de cliente/agencia) | `app/cliente/invitacion/page.tsx` muestra enlace activo y vencimiento en 24 h | OK |
| Preview token vencido | `link_status='expired'` 410 | Estado «El enlace venció» sin contenido | OK |
| Preview token revocado | `link_status='revoked'` 410 | Estado «El enlace fue revocado» | OK |
| Preview token usado | `link_status='used'` 410 | Estado «El enlace ya fue utilizado» | OK |
| Preview token inexistente / mal formado | 410 sin `link_status` / 400 | Estados «no disponible» / «inválido» | OK (agregado) |
| Aceptar invitación con contraseña | 201 + cookie `__Host-scale_client_session` (atributos HttpOnly, Secure, SameSite=Lax, Path=/, Max-Age) | `invitacion/page.tsx` exige consentimiento y activa el acceso | OK (atributos agregados) |
| Aceptar con Google (email distinto, vencida, revocada, deshabilitada) | API rechaza 403/410; la vuelta con `?error=` fija el motivo | La pantalla ahora lee `?error=` y muestra el motivo real | Arreglado |
| Sesión vencida | `expires_at<=now()` → 401 | Redirección a `/cliente/ingresar` en carga; acciones con 401 redirigen | Arreglado |
| Usuario deshabilitado | `disabled_at` → 401 | Igual que sesión vencida | OK (test agregado) |
| Grant revocado | Sesiones del portal borradas → 401 | Igual | OK |
| Logout | 200 + cookie expirada → 401 después | Botón «Salir» vuelve al ingreso | OK (test agregado) |
| Lista de entregas: solo publicadas y visibles | 200; `visible:false` desaparece; `review` no publicable | Tarjetas con cliente, proyecto, versión y fecha | OK |
| Decisión por versión visible en el tablero | Lista devuelve la decisión del usuario para la versión vigente; una versión nueva no hereda la anterior | Chip «Aprobaste/Pediste cambios» en la tarjeta | Arreglado |
| Aprobar y pedir cambios desde el enlace | 200/400 (comentario obligatorio al pedir cambios); notificación interna con dedupe; no cambia el estado interno de la pieza | El detalle registra la decisión y ahora **vuelve al tablero** con el estado | Arreglado |
| Comentarios del cliente | 201 + notificación al asignado; OT sin responsables no falla ni notifica | `sendComment` con error accionable | OK (test agregado) |
| Descarga del entregable | 302 al enlace HTTPS + auditoría; sin sesión redirige al ingreso (sin JSON ni auditoría falsa) | Anchor directo en pestaña nueva | Arreglado |
| Links visibles al cliente | Solo `visible_to_client=true` | Sección «Archivos de esta entrega» | OK |
| Actividad | decisiones, comentarios, descargas y versiones en orden | Error con «Reintentar» en vez de «Cargando…» infinito | Arreglado |
| Re-publicar | Bump de versión + auditoría; mostrar de nuevo sin `assetUrl` no inventa versión | — | Arreglado |
| Recuperación de acceso | Request uniforme 202 (exista o no el correo), throttle; reset single-use y vencimiento; invalida sesiones | `recuperar/page.tsx` con mensaje uniforme | OK (tests agregados) |
| Permisos: el cliente ve solo lo publicado | Portal aislado (cookie `__Host-`), `scopedDelivery` por grant, sin `asset_url`/ids internos, cross-client 404 | Layout público propio, sin shell interno | OK |
| Cookie interna vs portal | `readClientPortalSession` ignora `scale_session` | — | OK (test agregado) |

## Evidencia

- `node backend/test-client-portal.mjs` → PASS con todos los casos de la matriz
  (incluye los agregados de esta ronda).
- Capturas 390/1440 en claro y oscuro: ver `docs/qa/plt-al-152-153/capturas/`
  (invitación válida/vencida/revocada, ingreso, recuperar, tablero y detalle del
  portal; Configuración y diálogo de preferencias).

## Hallazgos y arreglos de esta ronda

1. **Aprobar/pedir cambios no volvía al tablero** y el tablero no tenía el estado:
   se agregó la decisión por usuario/versión a la lista y el detalle navega al
   tablero al confirmar.
2. **Fallo de Google perdía el motivo**: la invitación ahora lee `?error=` y lo
   muestra en un `role="alert"`, en vez de decir «enlace inválido».
3. **Descarga con sesión vencida mostraba JSON crudo**: sin sesión, el endpoint
   redirige a `/cliente/ingresar`.
4. **Actividad con error quedaba en «Cargando…» para siempre**: ahora muestra el
   error con reintento.
5. **Mostrar de nuevo una entrega publicada bumpeaba la versión**: el PATCH
   `{visible:true}` sin `assetUrl` solo cambia visibilidad.

## Pendiente / riesgos

- La sesión no se renueva por actividad (Max-Age fijo de 7 días): documentado,
  sin cambio en esta ronda.
- `notifyPortalActivity` avisa solo a los responsables de la pieza; una OT sin
  responsables no genera aviso interno (comportamiento actual, cubierto por test).
- Los problemas visuales del preview siguen en #147 (DSN).

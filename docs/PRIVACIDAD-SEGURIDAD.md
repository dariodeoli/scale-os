# Seguridad, minimización y barrido de PII (evidencia)

> **Borrador.** Documenta lo que **ya existe** en el código y los huecos
> conocidos. No acredita controles faltantes. Verificado sobre la rama SOS-PLT
> (#112) y `backend/OPERATIONS.md`.

## 1. Cifrado en tránsito

- Todo el tráfico público es HTTPS; el API responde con
  `Strict-Transport-Security: max-age=31536000; includeSubDomains` y
  `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy` y CSP
  (`backend/server.js`, `security()`).
- Cookies de sesión `HttpOnly; Secure; SameSite=Lax`; el portal usa además el
  prefijo `__Host-` (`backend/client-portal.js`).
- Base de datos: `DATABASE_SSL=true` activa TLS con el proveedor gestionado
  (`backend/server.js`). **Pendiente:** confirmar que producción lo tiene activo.

## 2. Cifrado en reposo y credenciales

| Dato | Medida | Evidencia |
| --- | --- | --- |
| Contraseñas | bcrypt, costo 12 | `backend/email-password-auth.js`, `client-portal.js` |
| Tokens de sesión | Hash SHA-256 en `sessions` / `client_portal_sessions`; el raw solo viaja en la cookie | `backend/server.js`, `client-portal-session.js` |
| Enlaces de invitación | AES-256-GCM con `INVITE_LINK_SECRET` (obligatorio, ≥32 caracteres) | `backend/invite-links.js` |
| Tokens de verificación/recuperación | Hash SHA-256, un solo uso, con vencimiento | `auth_email_verifications`, `client_portal_password_resets` |
| Cifrado de disco/volumen | Depende del proveedor gestionado por Coolify | **Pendiente de confirmar con el hosting** |

## 3. Sesiones y accesos

- Sesiones internas y del portal vencen a los 7 días; el cierre de cuenta o la
  remoción de un integrante borra sus sesiones.
- Accesos por rol y capacidad en el API (`backend/permissions.js`), revalidados
  en cada request; el front solo oculta lo que el API rechaza.
- Sensibles con guardas específicas: `salary.view` (salarios), `privacy.manage`
  (protección de datos), `portal-access.manage` (invitaciones del portal).
- La bitácora `personal_data_access_log` registra exports, supresiones,
  consentimientos y lecturas de salarios; `agency_operation_audit` registra las
  escrituras con actor e IP.

## 4. Respaldos

- Coolify mantiene snapshots/backups del volumen Postgres. **El respaldo externo
  (R2) está pendiente de activación** según `backend/OPERATIONS.md`.
- Recomendación hasta activarlo: no ejecutar borrados masivos (`maintenance` con
  `demoDryRun=false`) sin respaldo verificado; el propio mantenedor lo exige
  (`verifyDeletionEvidence`).

## 5. Barrido de PII en logs, analíticas y errores (C)

Revisión de los puntos de log y telemetría del API (septiembre 2026):

| Fuente | Qué registra | PII | Medida |
| --- | --- | --- | --- |
| Logs por request (`request_error`, `*_error`) | evento, ruta, status, código | No (sin mensaje crudo) | Ya no imprimía datos; se mantiene |
| `slow_query` | SQL parametrizado (sin valores) | No | Se aplica `redactPiiText` por defensa en profundidad |
| `client_portal_error`, `productivity_error`, `LIVE/PLATFORM/BILLING` debug | mensaje de error de Postgres | Posible | Enmascarado con `redactPiiText` |
| `password_reset_delivery` | booleanos del flujo | No | Sin cambios |
| Presencia y visitantes en vivo | site + UUID aleatorio; sin IP | No | Se conserva |
| Telemetría pública (`events`) | nombre de evento y `source` | No | Se conserva |
| `email_delivery` | estado de entrega y proveedor | No | Sin cambios |

`backend/pii-safety.js` enmascara correos y corridas de dígitos en los mensajes
que sí pueden contener texto de infraestructura. Los valores completos nunca se
imprimen; la bitácora PDP guarda **referencias** (`subject_kind`, `subject_id`,
contexto), nunca el contenido exportado.

**Pendiente:** revisar logs históricos una vez (ventana de 90 días) y rotar los
que Coolify conserve; confirmarlo con el hosting.

## 6. Minimización y privilegio (C)

- Los listados proyectan solo campos necesarios (`?fields=` en listas grandes).
- Los roles sin `finance.view` reciben directorio sin contacto ni estado de
  acceso; sin `salary.view` los importes viajan en `null`.
- El portal solo ve entregas publicadas, de clientes activos y con grant vigente.
- Los exports ARSOP se limitan a la agencia del titular (`organization_id`).

**Pendiente del dueño:** revisar si algún endpoint operativo puede pedir menos
datos (p. ej. contacto de clientes para producción) y registrar el resultado.

## 7. Huecos conocidos (no acreditados como hechos)

1. Respaldo externo R2 inactivo y purga de demos deshabilitada.
2. Cifrado de volumen a confirmar con el hosting.
3. Sin MFA para cuentas internas (evaluar para owner/admin).
4. La rotación de logs y su retención dependen de Coolify.
5. DPA/cláusulas de los proveedores listados en `PRIVACIDAD-ENCARGADOS.md`.

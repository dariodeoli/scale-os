# Inventario de encargados, proveedores y transferencias

> **Borrador.** Basado en lo que el código realmente usa (ver `backend/OPERATIONS.md`,
> `DEPLOYMENT.md` y variables de entorno). Completar contratos, regiones y
> cláusulas con el dueño antes de publicar la Política de Privacidad.

## 1. Encargados y proveedores

| Proveedor / servicio | Rol | Datos que trata | Región / ubicación | Garantía declarada | Estado |
| --- | --- | --- | --- | --- | --- |
| Coolify (VPS [proveedor]) | Hosting de web y API | Todos los datos de la app | [región a confirmar] | Contrato de servicio [___] | Activo |
| PostgreSQL gestionado por Coolify | Base de datos | Todos los datos | [región a confirmar] | [backups del panel] | Activo |
| WEEM (relay propio) | Envío de correo | Correo, nombre, asunto y cuerpo | [servidor propio/UE a confirmar] | Relay propio de Scale | Activo si está configurado |
| Resend (`RESEND_API_KEY`) | Envío de correo alternativo | Correo, nombre, asunto y cuerpo | EE. UU. | DPA del proveedor | Activo si está configurado |
| Google OAuth | Inicio de sesión | Correo verificado, nombre y foto | EE. UU. | Contrato de Google | Activo |
| R2 [Cloudflare] / respaldo externo | Copia de respaldo | Copia completa de la base | [a confirmar] | **Pendiente de activación** según `backend/OPERATIONS.md` | Pendiente |
| [Proveedor de analítica, si se agrega] | Métricas | Eventos agregados | [—] | — | No se usa hoy |

## 2. Transferencias internacionales

- **Google (login):** el correo y el nombre viajan a Google para verificar la
  identidad; la base sigue en [región a confirmar].
- **Resend (si está activo):** el correo del destinatario y el cuerpo del mensaje
  salen hacia EE. UU.
- **Respaldo externo:** aún no activado; si se activa, elegir región con garantías
  equivalentes y documentar la cláusula.

**Decisión pendiente del dueño:** si se mantiene Resend como canal principal o se
prioriza WEEM (relay propio) para reducir transferencias; y la región del
proveedor de infraestructura.

## 3. Subencargados

Confirmar con cada proveedor si usa subencargados para almacenamiento, CDN o
correo, y anotarlos acá antes de firmar el aviso.

## 4. Controles mínimos verificados

- Los secretos viven en variables de entorno de Coolify; no se inyectan en build
  (`tests/docker-build-secrets.test.mjs`).
- Las credenciales de base y de proveedores no se imprimen en logs
  (`backend/pii-safety.js`, `backend/OPERATIONS.md` §logs).
- Los enlaces de invitación van cifrados con `INVITE_LINK_SECRET` (AES-256-GCM) y
  los tokens se guardan hasheados (`backend/invite-links.js`).

## 5. Checklist de altas/bajas

- **Alta:** firmar DPA/contrato, registrar región y datos tratados en este
  inventario, verificar cifrado en tránsito y política de retención.
- **Baja:** revocar credenciales, exportar y eliminar datos del proveedor,
  registrar fecha y evidencia en este documento.

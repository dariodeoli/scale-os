# Aviso de tratamiento de datos personales — v1 (`2026-09-30-v1`)

> **Borrador.** Estructura y flujo listos; el texto final lo aprueba el dueño.
> Esta versión es la que registra el sistema (`PRIVACY_NOTICE_VERSION` en
> `backend/personal-data.js`). Cualquier cambio de fondo exige **versión nueva**
> (no se edita un texto ya aceptado) y actualizar la constante + este documento.
> Campos entre `[...]` pendientes de decisión del dueño.

## 1. Responsable

- **Responsable del tratamiento:** [razón social completa] (Scale OS), RUC [___].
- **Domicilio:** [dirección fiscal, ciudad, Paraguay].
- **Contacto de privacidad:** `privacidad@scaleparaguay.com` [confirmar buzón real o reemplazar].
- **Autoridad de control:** Agencia Nacional de Protección de Datos Personales (ANPDP, MITIC).

## 2. Qué datos tratamos y para qué (finalidades declaradas)

| Finalidad (`purpose`) | Datos | Base legal | Cuándo se captura |
| --- | --- | --- | --- |
| `account` — Cuenta y acceso | Nombre, correo, foto de perfil, credenciales (hash), sesiones | Consentimiento / contrato | Registro, invitación, alta del equipo |
| `service` — Prestación del servicio | Datos de contacto de clientes y prospectos, proyectos, piezas, entregas | Contrato / consentimiento declarado por la agencia | Alta de clientes y oportunidades, operación diaria |
| `billing` — Facturación y cobros | Razón social, RUC, facturas, pagos | Obligación legal | Emisión y cobro |
| `portal` — Portal del cliente | Nombre, correo, entregas, comentarios y decisiones | Contrato | Aceptación de la invitación al portal |
| `contact` — Contacto y consultas | Nombre, empresa, correo, teléfono y mensaje | Consentimiento | Formulario del sitio e ingreso manual al CRM |

El catálogo vigente se publica por API (`GET /api/privacy/notice`) y es la fuente
única para la interfaz.

## 3. Conservación

- Los plazos por entidad están en `PRIVACIDAD-RAT.md` y en la política de
  retención declarada (`GET /api/privacy/retention`).
- Los registros con obligación legal de conservación (facturas, pagos y
  respaldos contables) **no se borran**: se bloquean o anonimizan cuando
  corresponde.
- Los consentimientos, la bitácora de accesos y las solicitudes de derechos se
  conservan como evidencia del cumplimiento.

## 4. Destinatarios y transferencias

- Proveedores de infraestructura y correo listados en `PRIVACIDAD-ENCARGADOS.md`.
- No se venden datos personales. Las transferencias internacionales se documentan
  en ese inventario (ubicación y garantías de cada encargado).

## 5. Derechos del titular

Acceso, rectificación, supresión, oposición, portabilidad e impugnación de
decisiones automatizadas. Se ejercen **gratis** por:

- el Portal del Cliente → «Mis datos» [SOS-DSN #113];
- el perfil interno → «Mis datos» [SOS-DSN #113];
- o escribiendo a `privacidad@scaleparaguay.com` / [canal alternativo].

Plazo de respuesta: **30 días naturales**, prorrogables por una sola vez y con
aviso cuando la complejidad lo justifique (`PRIVACIDAD-ARSOP.md`).

## 6. Seguridad

Medidas técnicas y organizativas vigentes en `PRIVACIDAD-SEGURIDAD.md`; brechas
gestionadas según `PRIVACIDAD-RUNBOOK-BRECHA.md` (≤ 72 h hacia la ANPDP cuando
corresponda).

## 7. Menores

No se registran menores de 16 años sin autorización de su tutor. [Definir
procedimiento de verificación si el dueño habilita casos.]

## 8. Cambios del aviso

Cada versión queda identificada con fecha y se registra, para cada aceptación, la
versión exacta en `personal_data_consents.notice_version`. La versión vigente se
muestra en cada punto de captura.

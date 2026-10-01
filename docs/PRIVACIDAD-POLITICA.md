# Política de Privacidad — Scale OS

> **Borrador.** El texto jurídico final lo aprueba el dueño. Publicar en
> `https://scaleparaguay.com/privacidad` (URL por defecto del API,
> `PRIVACY_NOTICE_URL`) y enlazar desde login, registro, shell del panel, portal
> del cliente y `/status` (trabajo de SOS-DSN #113).

## 1. Quiénes somos

[Scale Strategy Group / Scale OS], RUC [___], con domicilio en [dirección].
Tratamos datos personales conforme a la **Ley N° 7593/2025 de Protección de Datos
Personales** y a las instrucciones de las agencias que usan la plataforma.

## 2. Qué datos tratamos

- **Titulares internos (equipo y colaboradores):** nombre, correo, foto, rol,
  accesos, datos laborales y de remuneración (visibles solo para roles
  autorizados), sesiones y actividad en la plataforma.
- **Clientes y prospectos de las agencias:** nombre o razón social, RUC, correo,
  teléfono, notas y datos necesarios para proyectos, presupuestos y entregas.
- **Usuarios del portal del cliente:** nombre, correo, entregas consultadas,
  comentarios y decisiones.
- **Visitantes del sitio:** eventos agregados de uso y presencia en vivo sin
  identificación personal (identificador de sesión aleatorio, sin IP).

No tratamos datos sensibles (salud, biometría, creencias) ni datos de menores de
16 años sin autorización de su tutor.

### Carga con IA

La función «Carga con IA» permite convertir texto pegado por el equipo en una
**vista previa** de clientes y equipos, reconocer los que ya existen y proponer
acciones (por ejemplo, registrar un cobro) para confirmar. Cuando se usa, **solo
ese texto** se envía al proveedor de inteligencia artificial configurado (Groq u
otro compatible, listado en `PRIVACIDAD-ENCARGADOS.md`); el reconocimiento de lo
existente se calcula localmente en Scale OS y la base nunca viaja al proveedor.
El servidor no persiste el texto y **nada se crea ni se ejecuta** hasta que una
persona confirma con los permisos habituales. Queda registrada la transferencia
(modelo y cantidad de registros/acciones, sin el texto) en la bitácora de datos
personales.

## 3. Para qué y con qué base legal

Los tratamos para prestar el servicio contratado, gestionar cuentas y accesos,
facturar, operar el portal del cliente y responder consultas. Cada finalidad y su
base legal están declaradas en el **Aviso de tratamiento** vigente
(`PRIVACIDAD-AVISO-v1.md`) y en el RAT (`PRIVACIDAD-RAT.md`). El consentimiento
se pide antes de tratar los datos, sin casillas premarcadas, y es revocable en
cualquier momento.

## 4. Cuánto tiempo los conservamos

Según la política por entidad del RAT. Los registros fiscales y contables se
conservan por el plazo legal aplicable; al vencer el resto de los plazos, los
datos se purgan o anonimizan automáticamente. El detalle vigente se publica en
`GET /api/privacy/retention`.

## 5. Con quién los compartimos

Solo con los proveedores necesarios para operar el servicio (infraestructura,
base de datos, correo, respaldos), listados con su ubicación y garantías en
`PRIVACIDAD-ENCARGADOS.md`. No vendemos datos personales.

## 6. Tus derechos

Podés solicitar **acceso, rectificación, supresión, oposición, portabilidad e
impugnación de decisiones automatizadas** de forma gratuita:

- Portal del Cliente → **Mis datos** [SOS-DSN #113].
- Panel interno → Perfil → **Mis datos** [SOS-DSN #113].
- Correo: `privacidad@scaleparaguay.com` [confirmar buzón].

Respondemos en **30 días naturales** (`PRIVACIDAD-ARSOP.md`). Si tu pedido no se
atiende, podés reclamar ante la ANPDP (MITIC).

## 7. Seguridad

Aplicamos privacidad por diseño y por defecto: cifrado en tránsito, contraseñas
con hash, sesiones con vencimiento, accesos por rol, bitácora de accesos a datos
personales y respaldos. Detalle y límites conocidos en `PRIVACIDAD-SEGURIDAD.md`.

## 8. Brechas de seguridad

Notificamos a la ANPDP y a los titulares afectados cuando la brecha sea
significativa, dentro de las 72 horas de conocido el hecho
(`PRIVACIDAD-RUNBOOK-BRECHA.md`).

## 9. Cambios

Publicamos cada versión con su fecha y conservamos el historial de aceptaciones.
La versión vigente figura en el aviso de cada punto de captura.

## 10. Contacto

`privacidad@scaleparaguay.com` · [teléfono/dirección] · Responsable de
protección de datos: [nombre o cargo].

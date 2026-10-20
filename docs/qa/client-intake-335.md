# Ficha y registro público de clientes — Refs #335

La ficha empieza por RUC y razón social, con nombre comercial editable después.
Aplicar la consulta llena el nombre sólo si estaba vacío; conserva un nombre
comercial existente y detecta cambios realizados mientras se revisa la consulta.
Las notas usan las doce columnas. El responsable legal sigue siendo opcional y
su vínculo explícito al cliente conserva documentos y cargo independientes.
La apariencia del editor empieza como una fila con logo/nombre y un desplegable
para editar logo y color mediante el pipeline interno existente. El diálogo usa
el tamaño compartido amplio. Los contactos adicionales están después de la ficha.

## Contrato de API

Registrar `clientIntake` de `backend/client-intake.js` antes de los handlers
amplios de agencia y permitir el endpoint público sin sesión. Registrar la
migración aditiva `20261020_client_intake.sql` después del baseline existente.
Todas las rutas privadas vuelven a cargar membresía activa, rol y override de
`clients.manage` dentro de la transacción. Nunca modifican cobros, facturas,
planes, cuentas ni períodos financieros.

- `GET /api/agency/clients/:id/completeness`: `{clientId,basic:{missing:[]},contract:{missing:[]}}`.
  Sólo nombres de campos pendientes de la ficha canónica. El representante se
  requiere para completar contratos de personas jurídicas, no personas físicas.
- `GET /api/agency/client-intake-links[?client_id=...]`: últimos 100 enlaces,
  metadatos sin token ni hash.
- `POST /api/agency/client-intake-links`: `{scope:'basic'|'contract',client_id?,expires_in_days?:1..30}`.
  Devuelve `{link,path:'/adhesion/<token>'}`. El token se muestra una sola vez,
  tiene 256 bits aleatorios y se persiste sólo como SHA-256.
- `DELETE /api/agency/client-intake-links/:id`: revocación idempotente por empresa.
- `GET /api/public/client-intake/:token`: únicamente alcance y vencimiento;
  nunca devuelve nombre, correo, RUC ni valores existentes de una ficha.
- `POST /api/public/client-intake/:token`: datos permitidos por alcance,
  `consent:true` y honeypot `website:''`. Normaliza/valida correo, teléfono,
  RUC y ficha legal con validadores canónicos; sólo crea una solicitud pendiente.
  Guarda fecha y versión del aviso/consentimiento. El enlace admite un envío.
- `GET /api/agency/client-intake-submissions[?client_id=...]`: solicitudes de
  la empresa (últimas 100), con los datos recibidos para revisión autorizada.
- `POST /api/agency/client-intake-submissions/:id/review`:
  `{action:'create'|'link'|'reject',fields:[claves revisadas],client_id?,expected_updated_at?}`.
  Crear necesita nombre seleccionado y verifica RUC único en la empresa.
  Vincular exige revisión exacta `updated_at` ISO y sólo llena campos vacíos;
  jamás reemplaza datos existentes. Un enlace dirigido a una ficha sólo puede
  completar esa ficha. La segunda revisión devuelve 409. Confirmar integra
  evidencia de consentimiento en el inventario PDP canónico sin reemplazar una
  autorización ya vigente. Rechazar no crea ni modifica fichas.

El frontend privado permite emitir/revocar y revisar desde el directorio y el
editor; exporta `ClientIntakeButton` para la ficha lateral. Las solicitudes no
vinculadas permiten crear o elegir una ficha existente (selector de hasta 100;
para otras fichas se puede emitir desde su editor específico). Los enlaces no
crean sesiones de portal/equipo ni prueban titularidad, pago o firma contractual.

No se agregó subida pública de logos. Sigue disponible la carga interna
validada; el formulario explica cuándo puede agregarse el logo.

## Privacidad y límites

Límite por cliente de red antes de consultar tokens, honeypot, máximo de emisión
por usuario/empresa, caducidad, revocación, consumo único bajo bloqueo y respuesta
`no-store`. Los tokens se envían únicamente al emitir el enlace. La bitácora
propia guarda IDs/acción, sin contenido de solicitudes ni token/hash.

`client-intake-privacy.js` integra exportación y supresión de solicitudes
vinculadas/aceptadas y de las no vinculadas con correo o RUC coincidente dentro
de la empresa. La supresión borra enlaces y sus solicitudes en cascada antes de
limpiar los identificadores de la ficha. No incluye tokens/hashes en exportados.
Un enlace dirigido a ficha archivada o bloqueada no admite captura de datos.

## Estado de OwnData

El módulo existente `backend/ruc-lookup.js` ya implementa OwnData como proveedor
opt-in, autenticación en servidor, validación de dígito/procedencia, límites,
mensajes diferenciados y alternativa manual. En esta instancia no están
inyectados los nombres `RUC_LOOKUP_PROVIDER_KIND`, `RUC_LOOKUP_PROVIDER_URL` ni
`OWNDATA_API_KEY`. El allowlist observado tampoco incluye
`app.controlaria.online`; la configuración predeterminada permanece legacy.
No se realizó solicitud real a OwnData y no se acredita habilitación empresarial
ni disponibilidad en producción. Para habilitarlo, configurar por el canal
seguro del servidor `RUC_LOOKUP_PROVIDER_KIND=owndata`, URL exacta
`https://app.controlaria.online/api/v1/ruc`, la clave empresarial autorizada y el
host en el allowlist de salida. No introducir valores secretos en este documento.

La corrección de Enter en `LookupField` corresponde al cambio compartido del
agente de formularios: debe impedir que Enter envíe el formulario, ignorar
repetición/composición y activar una sola consulta disponible.

## Verificación focal

- `node backend/test-client-intake.mjs`: 70 peticiones API con PGlite;
  aislamiento/clave foránea tenant, hash/no exposición, expiración/revocación,
  replay de envío/revisión, revisión/campos seleccionados/CAS, permisos vivos,
  honeypot/rate, auditoría mínima y exportado/supresión PDP.
- `npx tsx --test tests/client-editor-184.test.tsx tests/client-intake-335.test.tsx tests/client-identity-data.test.ts`:
  consulta/aplicar/descartar/conflictos, manual fallback, vínculo del responsable,
  orden RUC, documentos reutilizados, payloads públicos por alcance, autorización
  explícita, enlaces no disponibles y administración/revocación privada.
- `npm run build` y `.next/BUILD_ID`: compilación Next y ruta dinámica pública.
- Con el build servido localmente en 3355:
  `node tests/client-intake-browser-335.test.mjs`: Chromium real, SSR/hidratación,
  envío básico, contrato completo, 390px sin overflow y enlace vencido sin form.
  El transporte de captura es sintético; no hay escrituras de producción.

Regresión completa, registro de handlers/migración y deploy se acreditan en la
entrega integrada. Revertir UI/handler impide nuevas capturas; conservar tablas y
fichas aceptadas evita pérdida de datos. Nunca revertir borrando registros reales.

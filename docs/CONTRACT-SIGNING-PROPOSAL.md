# Firma de contratos: integración propuesta — #308

La entrega permite revisar, emitir, descargar PDF e imprimir para firma de las dos partes. No incluye un proveedor de firma electrónica ni un certificado de firma digital. Una imagen de una firma o un nombre escrito no se presenta como firma digital certificada.

## Flujo propuesto para aprobación y configuración

1. Emitir una versión revisada y completa; calcular SHA-256 del PDF de esa versión. Los cambios posteriores generan otra versión y otra solicitud.
2. Elegir los firmantes desde los perfiles legales de la empresa y la contraparte. Exigir nombre, documento, representación y canal de contacto confirmados; no inferirlos de quien inicia sesión.
3. Crear una solicitud bilateral con roles y orden de firma explícitos. Sólo una acción del usuario con permiso de emisión inicia el envío al proveedor; no enviar nada al abrir un preview ni al guardar un borrador.
4. Integrar un proveedor que acredite el nivel de identificación y firma requerido para ese contrato/jurisdicción. Evaluar su API, certificados, evidencias de consentimiento, timestamps, residencia/retención de datos, costos y verificación pública antes de elegirlo. La elección y sus credenciales aún no están configuradas.
5. Guardar identificador externo, hash/versión, participantes, expiración y estados de cada firma. Procesar webhooks autenticados con protección contra replay e idempotencia; conservar eventos de auditoría append-only.
6. Al finalizar, verificar que el proveedor devuelve el mismo documento/versionado y la evidencia de ambas firmas. Guardar el PDF firmado y su paquete de validación como artefactos nuevos e inmutables; preservar también el original sin firmar.
7. Ofrecer descarga/verificación del firmado, cancelación y nueva solicitud auditadas. Revocar o vencer un enlace no altera un PDF ya emitido ni elimina pruebas de firmas realizadas.

## Modelo y límites

La implementación futura necesita tablas de solicitudes/participantes/eventos, almacenamiento privado del PDF firmado, secretos del proveedor y un adaptador de firma con pruebas de webhook/tenant/reintento. Los tokens de invitación deben guardarse hasheados y tener vencimiento y alcance de una solicitud; las URLs y documentos no deben publicarse ni registrarse en logs.

Estados sugeridos: emitido, solicitud creada, pendiente de empresa/cliente, firmado por ambas partes, rechazado, cancelado o vencido. «Firmado por ambas partes» requiere evidencia verificable del proveedor; una subida o respuesta HTTP exitosa no alcanza.

El acceso a un proveedor, certificados, envío real, verificación de identidad y validez jurídica de un mecanismo no se acreditan con estas pruebas cloud. Hasta configurar y validar esa integración, el flujo disponible es PDF emitido e impresión/firma por las partes fuera de la aplicación.

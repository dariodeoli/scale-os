<!-- scale-plan-20261017:templates -->

## Objetivo y estado

Crear plantillas legales propias de texto; las plantillas de producción y presupuestos no equivalen a contratos.

Estado de seguimiento: solicitado / pendiente de verificación de entrega. El trabajo local o la auditoría inicial no equivalen a funcionalidad integrada ni pruebas aprobadas.

## Criterios de aceptación

- [ ] Listar, crear y editar plantillas por empresa y tipo de acuerdo.
- [ ] Definir variables permitidas y campos obligatorios; mostrar valores faltantes y fuente de cada dato.
- [ ] Seleccionar empresa/contraparte por ID, precargar datos verificables y conservar edición manual.
- [ ] Escapar variables/texto y validar en servidor; rechazar variables no permitidas sin ejecutar HTML.
- [ ] Aplicar contracts.view/manage/issue (owner/admin inicial, otros por override) y acceso bancario adicional; probar errores y permisos.

## Alcance y coordinación

app/contracts-workspace*, app/contracts-data.ts, backend/contracts.js, backend/permissions.js. SOS-PLT/SOS-DSN.

## Dependencias

company

## Entrega

Registrar cambios y rutas, evidencia, pruebas realmente ejecutadas, riesgos, migraciones y reversión. No desplegar ni usar datos de producción sin autorización. No cerrar sólo por existencia de código local.

<!-- scale-plan-20261017:task-api -->

## Objetivo y estado

Extender agency_internal_tasks en vez de crear otro sistema. Tareas independientes o relacionadas con cliente/proyecto y materiales.

Estado de seguimiento: solicitado / pendiente de verificación de entrega. El trabajo local o la auditoría inicial no equivalen a funcionalidad integrada ni pruebas aprobadas.

## Criterios de aceptación

- [ ] Persistir título, descripción, responsables activos, prioridad, fecha/hora civil de Asunción, estado y cliente/proyecto opcionales.
- [ ] Soportar checklist/subtareas, enlaces a archivos/carpetas, comentarios con autor y momento; validar límites y relaciones en servidor.
- [ ] Ofrecer Hoy, Próximas, Vencidas, Completadas y Sin fecha, filtros empleado/proyecto/cliente/fecha y paginación.
- [ ] Crear, completar, cambiar estado y reprogramar con auditoría y migraciones aditivas, idempotentes, registradas y cargadas por fixtures.
- [ ] Probar tareas con/sin proyecto, vencidas/reprogramadas y límites multiempresa. Recurrencia y avisos automáticos sólo si auditoría demuestra infraestructura adecuada.

## Alcance y coordinación

backend/employee-tasks.js, backend/productivity.js, backend/suite-validation.js, backend/migrations/, fixtures y pruebas API. SOS-OPS con coordinación SOS-PLT.

## Dependencias

audit

## Entrega

Registrar cambios y rutas, evidencia, pruebas realmente ejecutadas, riesgos, migraciones y reversión. No desplegar ni usar datos de producción sin autorización. No cerrar sólo por existencia de código local.

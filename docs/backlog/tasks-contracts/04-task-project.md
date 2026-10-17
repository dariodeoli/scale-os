<!-- scale-plan-20261017:task-project -->

## Objetivo y estado

Exponer la misma tarea y el mismo ID en dashboard y proyecto; evitar copias de estado.

Estado de seguimiento: solicitado / pendiente de verificación de entrega. El trabajo local o la auditoría inicial no equivalen a funcionalidad integrada ni pruebas aprobadas.

## Criterios de aceptación

- [ ] Filtrar por project_id sobre el mismo endpoint y validar vínculo proyecto-cliente.
- [ ] Crear/editar/completar/reprogramar desde una vista y actualizar la otra mediante invalidación compartida.
- [ ] No alterar flujo de aprobación de piezas ni mezclar tareas con estados de producción.
- [ ] Probar cambio concurrente, aislamiento de proyecto/empresa y consistencia tras recarga.

## Alcance y coordinación

app/project-card.tsx, app/employee-tasks*, app/work-history.tsx; API compartida. SOS-OPS.

## Dependencias

task-api, task-ui

## Entrega

Registrar cambios y rutas, evidencia, pruebas realmente ejecutadas, riesgos, migraciones y reversión. No desplegar ni usar datos de producción sin autorización. No cerrar sólo por existencia de código local.

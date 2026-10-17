<!-- scale-plan-20261017:task-ui -->

## Objetivo y estado

Cada colaborador debe ver tareas relevantes de hoy y próximos días sin saturar su inicio; ejemplo: Editar video de Patria con proyecto y material.

Estado de seguimiento: solicitado / pendiente de verificación de entrega. El trabajo local o la auditoría inicial no equivalen a funcionalidad integrada ni pruebas aprobadas.

## Criterios de aceptación

- [ ] Mostrar Hoy, Próximas, Vencidas, Completadas y Sin fecha con filtros y detalle.
- [ ] Crear/asignar según capacidades, completar checklist, reprogramar y consultar materiales/comentarios.
- [ ] Usar owncoding-ui y componentes canónicos; mantener lista compacta y cuadrícula con igual información.
- [ ] Cubrir carga, vacío, error, validación y recuperación sin perder borrador; no inventar notificaciones automáticas.
- [ ] Registrar evidencia desktop/móvil y pruebas de persistencia válida e inválida.

## Alcance y coordinación

app/employee-tasks*, app/sections/resumen.tsx, tests/. SOS-OPS/SOS-DSN.

## Dependencias

task-api, task-security

## Entrega

Registrar cambios y rutas, evidencia, pruebas realmente ejecutadas, riesgos, migraciones y reversión. No desplegar ni usar datos de producción sin autorización. No cerrar sólo por existencia de código local.

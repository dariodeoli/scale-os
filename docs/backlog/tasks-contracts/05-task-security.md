<!-- scale-plan-20261017:task-security -->

## Objetivo y estado

Aplicar capacidades en servidor y UI, con edición optimista que preserve borradores ante conflictos.

Estado de seguimiento: solicitado / pendiente de verificación de entrega. El trabajo local o la auditoría inicial no equivalen a funcionalidad integrada ni pruebas aprobadas.

## Criterios de aceptación

- [ ] Definir tasks.view para tareas propias de miembros activos; tasks.assign para consultar/asignar equipo y tasks.edit para editar/completar según alcance.
- [ ] Revisar defaults owner/admin/management/production para asignación y overrides efectivos; viewer sólo lectura y sin acciones.
- [ ] Revalidar todas las mutaciones y relaciones en servidor, sin acceso entre empresas ni asignación a miembros inactivos.
- [ ] Exigir expected_version en escrituras y devolver 409 preservando borrador y ofreciendo recarga segura.
- [ ] Probar empleados, responsables, administradores, overrides, denegaciones y cambios simultáneos; auditoría con autor y momento.

## Alcance y coordinación

backend/permissions.js, backend/employee-tasks.js, app/capabilities.ts, app/workspace-access.ts, pruebas API/UI. SOS-PLT/SOS-OPS.

## Dependencias

task-api

## Entrega

Registrar cambios y rutas, evidencia, pruebas realmente ejecutadas, riesgos, migraciones y reversión. No desplegar ni usar datos de producción sin autorización. No cerrar sólo por existencia de código local.

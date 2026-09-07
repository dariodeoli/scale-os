# Scale OS

Sistema operativo interno para Scale Strategy Group.

## Objetivo del MVP

Reemplazar gradualmente el tablero de Trello por una plataforma que conecte clientes, presupuestos, proyectos, órdenes de trabajo, entregables, horas, pagos y margen.

## Alcance inicial

- Autenticación y sesiones seguras.
- Usuarios, roles y permisos por módulo.
- Clientes y contactos.
- Planes, presupuestos y adicionales.
- Proyectos y órdenes de trabajo tipo Kanban.
- Links de Google Drive y calendario de producción.
- Facturas, pagos y cuentas internas.
- Dashboard de operación y rentabilidad.
- Auditoría de cambios.

## Flujo operativo base

`Prospecto → Presupuesto → Cliente → Proyecto → Orden de trabajo → Revisión → Aprobado → Facturable → Cobrado`

## Estados de producción

`Bloqueado · Por grabar · Grabado · Editando · Revisión · Aprobado · Publicado`

## Reglas de negocio iniciales

1. Ningún trabajo se considera aprobado sin cliente, proyecto y alcance asociado.
2. Los entregables fuera del alcance se registran como adicionales, no se esconden dentro de la orden original.
3. Las horas y costos internos no son visibles para roles operativos ni clientes.
4. Los movimientos financieros requieren permiso explícito y quedan auditados.
5. Los precios comerciales vigentes se mantienen en una configuración versionada; no se codifican como texto fijo.

## Próximo paso técnico

Implementar la base Node.js/Express + Next.js/PostgreSQL/Prisma en este directorio y conectar el despliegue al proyecto correspondiente del hub de Owncoding después de validar el destino exacto.

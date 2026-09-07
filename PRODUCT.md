# Producto: Scale OS

## Roles

| Rol | Acceso principal |
|---|---|
| Owner | Todo, incluidos costos, bancos, permisos y auditoría |
| Admin | Operación, usuarios y configuración; bancos según permiso explícito |
| Gerencia | Clientes, ventas, producción, pagos y dashboard; costos según permiso |
| Finanzas | Presupuestos, facturación, cobros, gastos, bancos y saldos |
| Comercial | CRM, propuestas, clientes y seguimiento; sin saldos ni costos |
| Producción | Proyectos, órdenes, calendario, Drive y entregables |
| Editor | Órdenes asignadas, archivos, checklist y comentarios |
| Cliente | Únicamente sus proyectos, entregables y aprobaciones |

## Módulos y prioridad

### Fase 1 — operación diaria

- Login, usuarios y permisos.
- Clientes y contactos.
- CRM comercial.
- Presupuestos.
- Proyectos.
- Kanban de órdenes de trabajo.
- Entregables, checklist y Drive.

### Fase 2 — control económico

- Facturas y pagos.
- Cuentas bancarias y caja.
- Gastos por cliente/proyecto.
- Horas y costos reales.
- Margen vendido vs. margen real.
- Alertas de alcance excedido.

### Fase 3 — automatización

- Portal del cliente.
- WhatsApp oficial.
- Instagram y publicaciones.
- Automatizaciones tipo ManyChat.
- Notificaciones y reportes recurrentes.

## Entidades principales

`User`, `Role`, `Permission`, `Client`, `Contact`, `Lead`, `Plan`, `Proposal`, `ProposalItem`, `Project`, `WorkOrder`, `Deliverable`, `Approval`, `TimeEntry`, `Invoice`, `Payment`, `Expense`, `BankAccount`, `Transfer`, `DriveLink`, `AuditLog`.

## Métricas del dashboard

- Facturación, cobrado y por cobrar.
- Clientes activos y renovaciones próximas.
- Órdenes atrasadas y bloqueadas.
- Producción aprobada por cliente.
- Horas presupuestadas vs. utilizadas.
- Adicionales no facturados.
- Margen por cliente y proyecto.
- Disponibilidad de caja según permiso.

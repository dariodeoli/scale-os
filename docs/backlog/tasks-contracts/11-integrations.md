<!-- scale-plan-20261017:integrations -->

## Objetivo y estado

Corrección del usuario: OwnData extrae datos de RUC; owncoding-ui es la biblioteca de objetos en GitHub/web. Investigar Ocoin AI sin asumir repositorios, permisos ni credenciales compartidos.

Estado de seguimiento: solicitado / pendiente de verificación de entrega. El trabajo local o la auditoría inicial no equivalen a funcionalidad integrada ni pruebas aprobadas.

## Criterios de aceptación

- [ ] Identificar repositorio/servicio autorizado de OwnData y Ocoin, contrato/API, esquema, acceso, costo y condiciones; registrar evidencia y bloqueos.
- [ ] Conservar proveedor RUC actual hasta verificar integración; no confundir OwnData con owncoding-ui ni renombrar servicios sin evidencia.
- [ ] Evaluar consulta de razón social oficial, bancos y mapeo ciudad→departamento; documentar procedencia y confirmación manual.
- [ ] Reutilizar owncoding-ui con tag fijado y objetos canónicos, sin duplicar biblioteca ni copiar credenciales.
- [ ] Entregar matriz reutilizable/no disponible/acceso adicional y cambios necesarios; integración productiva sólo tras acceso y validación.

## Alcance y coordinación

app/client-ruc.tsx, proveedor RUC actual, dependencia owncoding-ui, cuentas de tesorería, docs/. SOS-PLT/SOS-DSN.

## Dependencias

audit

## Entrega

Registrar cambios y rutas, evidencia, pruebas realmente ejecutadas, riesgos, migraciones y reversión. No desplegar ni usar datos de producción sin autorización. No cerrar sólo por existencia de código local.

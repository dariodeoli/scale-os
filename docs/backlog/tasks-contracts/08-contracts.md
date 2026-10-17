<!-- scale-plan-20261017:contracts -->

## Objetivo y estado

Permitir editar, previsualizar y guardar contratos; cada emisión aprobada por una persona conserva versión inmutable.

Estado de seguimiento: solicitado / pendiente de verificación de entrega. El trabajo local o la auditoría inicial no equivalen a funcionalidad integrada ni pruebas aprobadas.

## Criterios de aceptación

- [ ] Persistir borrador con revisión optimista y resolver 409 sin perder cambios.
- [ ] Exigir revisión humana explícita y campos obligatorios completos antes de emitir.
- [ ] Guardar snapshot inmutable de texto, datos y fuentes por versión emitida; historial y auditoría con autor/momento.
- [ ] Aplicar permisos de contrato y contracts.bank-data.view también en historial, lectura y exportación.
- [ ] Probar multitenancy, emisión simultánea, permisos, campos faltantes e imposibilidad de alterar versiones emitidas.

## Alcance y coordinación

backend/contracts.js, backend/migrations/20261017_contract_documents.sql, app/contracts-workspace*, pruebas. SOS-PLT.

## Dependencias

templates

## Entrega

Registrar cambios y rutas, evidencia, pruebas realmente ejecutadas, riesgos, migraciones y reversión. No desplegar ni usar datos de producción sin autorización. No cerrar sólo por existencia de código local.

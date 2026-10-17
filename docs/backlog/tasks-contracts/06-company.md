<!-- scale-plan-20261017:company -->

## Objetivo y estado

Reutilizar razón social, RUC, dirección, teléfono, moneda y logo; completar ciudad/departamento y representante legal sin inventar datos.

Estado de seguimiento: solicitado / pendiente de verificación de entrega. El trabajo local o la auditoría inicial no equivalen a funcionalidad integrada ni pruebas aprobadas.

## Criterios de aceptación

- [ ] Auditar campos existentes y ampliar sólo faltantes mediante perfil complementario y migración aditiva.
- [ ] Guardar fuente/procedencia y permitir corrección manual; consulta RUC aplica datos oficiales sólo tras confirmación.
- [ ] Validar documentos y relaciones ciudad/departamento en cliente y servidor, zona America/Asuncion y límites compartidos.
- [ ] Reutilizar cuentas de tesorería sólo con permiso explícito y minimizar exposición de datos bancarios.
- [ ] Probar permisos, datos incompletos y aislamiento multiempresa.

## Alcance y coordinación

app/company-legal-profile*, backend/contracts.js, perfil de empresa, migraciones y permisos. SOS-PLT.

## Dependencias

audit

## Entrega

Registrar cambios y rutas, evidencia, pruebas realmente ejecutadas, riesgos, migraciones y reversión. No desplegar ni usar datos de producción sin autorización. No cerrar sólo por existencia de código local.

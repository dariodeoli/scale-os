# Preparación 1.0.199 — vigencias anteriores de clientes

Refs #303. El error «La nueva vigencia no puede preceder al 2026-10-13» impedía completar el período anterior al primer acuerdo registrado. La ficha ahora permite guardar ese historial, cerrado automáticamente el día anterior al primer acuerdo; conserva íntegros los acuerdos posteriores y la cronología de precios. Una fecha dentro de un período histórico existente requiere revisión y no sobrescribe su snapshot.

La lectura de condiciones y revisión usa la misma sentencia SQL: el acuerdo vigente puede tener un ID anterior al último evento histórico. Reintentar la misma operación conserva el cierre derivado y no duplica el acuerdo. Se mantienen permisos, bloqueo de finanzas, revisiones optimistas y meses cerrados. Sin migraciones ni cambios de interfaz.

## Validación

La prueba negativa reprodujo exactamente el409 del usuario antes del cambio. Las pruebas económicas agregan vigente13/10, histórico01/10 y fechas anteriores, límites12/10 y30/09, igualdad completa del snapshot posterior, reintentos, colisión de solicitud, revisión obsoleta, fechas dentro de historial existente y bloqueo por cierre financiero. Balance y consulta diaria preservan un solo importe por cliente/período. El test de reportes también acredita el caso de un snapshot previo del ciclo comercial.

Suites focales: historial económico, reportes y ciclo comercial. El gate completo de release, CI y producción se registran al completarse; este documento no los declara aprobados de antemano. No se utilizaron clientes reales en las pruebas.

## Reversión

Revertir código y versión mediante PR, conservando los acuerdos históricos ya insertados y todos los registros financieros. No borrar ni restaurar la base para revertir este cambio.

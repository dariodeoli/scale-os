# Preparación 1.0.198 — portal y validación mobile

Refs #292, #295, #297. Base: e04961c4 (1.0.197).

## Cambio de producto

El portal conserva el contenido de nombres, archivos y actividad extensos dentro
de sus tarjetas. Las acciones del encabezado no se encogen por ese contenido.
Comentarios y decisiones comparten el bloqueo canónico de envío para impedir
dos solicitudes simultáneas. El cierre de sesión muestra errores recuperables
en lugar de dejar una promesa rechazada sin mensaje.

## Alcance de QA

La campaña amplía la cobertura anterior #265 con portal autenticado y superadmin,
nueve rutas secundarias, siete flujos internos y focales de Configuración y
Preferencias. Incluye touch, teclado/foco, scroll de controles, alturas bajas y
orientación horizontal. Cada reporte identifica si usa componentes aislados,+rutas Next completas con API interceptada o API/PostgreSQL locales sintéticos.

Los resultados finales, SHA, BUILD_ID, CI y publicación se registran al completar
los gates de integración; este documento de preparación no los da por aprobados.

## Límites y reversión

Las comprobaciones cloud no acreditan Safari/iPhone/iPad ni Android físicos:
seguimiento #296. Tampoco convierten pruebas con fixtures en OAuth real, pruebas
de impresión o operaciones administrativas reales de producción.

Sin migraciones ni cambios de permisos. Revertir juntos el código y la versión;
no borrar comentarios, decisiones, documentos ni registros existentes. El PR de
impresión #288 continúa separado y conserva sus requisitos físicos pendientes.

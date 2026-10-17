# #241 — consumidores temporales controlados

El campo temporal conserva el texto raw. Sus consumidores deben conservarlo también: un `onChange` que acepta sólo fechas completas vuelve a enviar el valor anterior y pierde la edición parcial. Los filtros ahora separan el borrador visible del valor aplicado mediante `useTemporalFilter`; la política de aceptación permanece en cada consumidor.

| Consumidor | Valor aplicado y política conservada |
| --- | --- |
| Reportes | Mes completo entre 1900-01 y el mes actual, sin superar 9998-12. |
| Previsión financiera | Mes civil completo; límites existentes 1900-01/9998-12. |
| Balance | Mes civil completo; límites existentes 1900-01/9998-12. |
| Comisiones | Mes civil completo; límites existentes 1900-01/9998-12. |
| Inventario, calendario de reservas | Mes civil completo; límites existentes 1900-01/9998-12. El calendario y las consultas usan ese valor. |
| Estudio | Mes civil completo; no se agregan límites de negocio. |
| Producción, calendario de entregas | Mes civil completo antes de calcular grilla con Date.UTC; no se agregan límites de negocio. |
| Producción semanal automática | Día civil completo, convertido al lunes con el mismo `weekMonday` UTC. El input conserva el día escrito. |
| Tareas, filtros Desde/Hasta | Par de fechas civiles opcionales y ordenadas, respetando el mínimo de Hasta. Un par aún incompleto/invertido conserva ambos borradores y el último par aplicado; no resetea paginado ni consulta. Vaciar un filtro opcional sí lo elimina. |

Una edición parcial o fuera del rango no produce una consulta con ese valor. Los datos, calendarios y operaciones siguen asociados al último filtro válido. Reintentos o polling pueden consultar ese último filtro válido; el borrador no cambia sus parámetros. Una selección válida del picker actualiza el borrador y el valor aplicado. La navegación explícita de Reportes al mes más reciente sincroniza ambos valores.

## Consumidores auditados sin cambios

- Contratos: `agreement.starts_on`, `agreement.ends_on` y `agreement.signed_on` pasan por el `Editor` canónico. RHF conserva el texto; el schema valida la fecha civil al aplicar la edición. El handler prepara la previsualización después de validar y los requests de guardar/emitir conservan sus gates de revisión y concurrencia. No hay consulta por fecha en onChange.
- Formularios RHF de órdenes, facturas, cobros, transferencias y presupuestos registran el input sin rechazar raw en onChange; los cambios de este lote no modifican sus esquemas ni requests.
- Ficha comercial/reporting de cliente, fecha de gasto real, compra/adquisición/mantenimiento de inventario, IA y administración guardan el draft de fecha/hora sin normalizarlo antes de setState. Validan al enviar y no consultan por cada edición temporal.
- Reservas de estudio utilizan Editor para fechas/horas y convierten a UTC al guardar. No se modifica esa conversión, la política de solapamiento ni los rangos del negocio.

## Evidencia focal

- `tests/temporal-filter.test.tsx`: raw parcial/vacío/inválido, límites, política actualizada, navegación explícita y rango atómico.
- Reportes: valores parciales, futuros y fuera de rango permanecen visibles sin nuevas consultas; se conservan pruebas de respuestas tardías, tenant y rangos históricos.
- Producción semanal: raw incompleto/imposible sin consultas, día completo conservado y consulta al mismo lunes UTC.
- Tareas: componente real con transporte simulado; la edición de un rango no genera queries parciales ni pierde el inicio pendiente cuando se completa el final.
- Inventario y Previsión: raw conservado y contadores de requests estables ante entradas parciales/fuera de rango; se conservan matrices de permisos, borradores, importes y payloads existentes.
- `tests/temporal-filter-browser.test.mjs`: Chromium real a 390 px con InputControl/Temporal, el helper y weekMonday reales. 29 comprobaciones: escritura por teclado, constraint validation, aplicación del picker, normalización semanal y rango atómico. Fixture local sin proveedores ni backend de producción.

Las adaptaciones de los dobles de prueba registran `setCustomValidity` en el control simulado y buscan el trigger/reintento concreto cuando el campo temporal agrega su botón de calendario. La prueba Chromium verifica el comportamiento del DOM real.

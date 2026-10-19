# Preparación 1.0.197 — cabeceras y Balance

Refs #289. Rama `codex/compact-balance-289`, base `6f9be7de` (1.0.196).
Esta entrega no incorpora impresión del PR #288: conserva su ensayo físico pendiente.

## Comportamiento

- `PageHeader`/`ListPage` agrupan título, navegación y acciones cuando el contenedor
  real dispone de espacio. Se elimina el margen duplicado de las pestañas y los
  filtros directos usan anchos compactos. En móvil se conservan wrap, foco y targets.
- Balance elimina el segundo título y permite elegir mes por búsqueda, flechas o
  calendario. La búsqueda admite años 1900–9998 sin cargar todos los meses juntos.
  Cierre/reapertura conserva el mes y revisión de su confirmación.
- Contratado muestra clientes actualmente activos. Los inactivos se revisan a
  petición, con estado explícito; sus acuerdos originales, cobros y deudas permanecen.
  Los recibidos y saldos efectivos no cambian por ocultar una fila. El estado actual
  no inventa una fecha de baja histórica. Durante despliegue mixto, estado omitido
  se muestra «Por confirmar», sin ocultar ni descartar importes.

## Evidencia focal

Cabeceras: [detalle](compact-headers-289/README.md), 42 fixtures sección/ancho,
320/390/768/1024/1440/1920. A 1440/1920, el chrome compartido pasa de 102 a 42 px.
Es geometría de componentes reales y CSS generado con contenido sintético; no una
sesión autenticada de producción. Selector: búsqueda y teclado; mes: límites,
cambio de año, calendario y cierre capturado. API económica: contrato activo
coherente con Previsión, cobros/deudas intactos, permisos conservados.

## Validación integral y publicación

Pendientes al preparar este documento: regresión frontend completa, build con
artefacto, backend completo, navegador general, revisión de acciones, CI y deploy.
Los resultados finales deben registrarse con sus SHA y respuestas servidas.

## Reversión y límites

Sin migraciones nuevas ni cambio de permisos. Revertir código y manifiestos juntos;
no borrar acuerdos, pagos, deudas, documentos ni archivos. No se validan hardware,
OAuth ni proveedores externos por estas pruebas. La impresión permanece separada.

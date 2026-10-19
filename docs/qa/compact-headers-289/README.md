# Encabezados compactos — Refs #289

`ListPage` integra los apartados en el mismo `PageHeader` mediante el slot
`navigation`. A partir de 960 px del contenedor real del workspace, título,
apartados y acciones comparten fila. El riel `TabScroller` mantiene su búsqueda
de foco y desplazamiento; debajo de ese ancho las filas envuelven según contenido.
La navegación ya no aporta su `mb-3` además de los gaps de la página. El header
reserva `min-width:0` para que la grilla no herede el mínimo intrínseco del riel.

Los filtros comunes tienen anchos útiles en escritorio: búsqueda de 16 rem y
selectores categóricos directos de 12 rem. Rangos y filtros compuestos conservan
su contrato. No se cambian tarjetas, listas de datos ni formularios de diálogo.

## Verificación local

- `node tests/page-chrome-browser-289.test.mjs`: 42 combinaciones de 7 fixtures
  de chrome (Balance, Pipeline, Producción, Inventario, Equipo, Contratos y título
  largo) y 320/390/768/1024/1440/1920 px. CSS de producción compilado desde este
  checkout, componentes reales, sidebar de 240 px simulado en escritorio.
- Sin overflow de documento; títulos y navegación únicos; acciones ejecutables;
  foco de la última pestaña visible a 320 px; controles móviles de al menos 44 px.
- Cuatro filtros canónicos comparten una fila en escritorio. Separación de chrome
  a filtros y de filtros a contenido de hasta 12 px.
- `npx tsx --test tests/ui-v2.test.tsx tests/bulk-selection-185.test.tsx tests/workspace-header-contract.test.ts`: 20/20.
- `npx tsc --noEmit`: PASS.
- Callback aditivo del selector: `node tests/ui-select-browser.test.mjs`: 26/26;
  no notificación al montar, escritura real y limpieza al cerrar.

Comparación reproducible con `--baseline` (lee `origin/main`, previo al cambio):
a 1440/1920 px, chrome de 102 → 42 px y comienzo del contenido de 203,2 → 143,2 px,
con cuatro filtros; se recuperan 60 px. Para capturas opcionales, usar
`SCALE_QA_SCREENSHOT_DIR=/tmp/scale-chrome-289` en ambos modos.

Estos son fixtures locales del patrón compartido, no navegación autenticada
contra producción ni prueba de datos/API de cada módulo. La integración y el
release completo corresponden al agente integrador.

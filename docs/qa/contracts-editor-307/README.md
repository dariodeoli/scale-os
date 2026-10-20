# Contratos: contraparte, modelos y preview — #307/#308

Frontend probado desde `83face1d`; datos sintéticos y componentes reales. La revisión del backend, su render profesional y PDFs se acreditan separadamente en `docs/qa/contracts-preview-308/README.md` al integrar ambas ramas.

## Cambios

El tipo de contraparte es explícito: cliente y colaborador son alternativas. Alternar conserva ambas selecciones y el texto; sólo el ID activo se envía al API. Se reutiliza SelectCustom con identidad de cliente (logo/razón social) y colaborador (foto), no un selector paralelo.

Nuevo contrato ofrece las plantillas guardadas y todos los modelos disponibles, incluso sin una plantilla previa. El modelo se importa sólo cuando se crea el borrador; un fallo de creación conserva el snapshot importado para reintentar sin duplicarlo. Desde elegir modelo se puede revisar un ejemplo ficticio o aplicarlo a un cliente. Los enlaces llevan a la ficha legal canónica `/clientes?client=ID` y a Mi empresa.

Una sola respuesta HTML del servidor abastece la vista imprimible mediante iframe sandbox sin scripts/same-origin. Cambiar la fuente oculta inmediatamente la respuesta anterior y cancela la petición obsoleta. El ejemplo está rotulado como simulado; el borrador mantiene sus datos reales y campos faltantes. La edición local aplicada de texto/variables se previsualiza antes de guardar; un lector sólo pide el documento guardado, sin overrides. PDF final conserva el flujo de revisar y emitir versión inmutable.

Texto de plantilla/contrato usa18 filas nativas de TextareaBase, opción genérica Field.rows aportada por #305 (`dc3f6539`, cherry-pick `41c2eb57`). La medición detectó que la antigua regla `.ops-editor` no coincidía con el formulario real y que control-height anulaba min-height contextual; se usa el atributo nativo en vez de!important o duplicar el componente. Alto medido:423px en320/390 y373px en1440.

## Pruebas

- `node --import tsx --test tests/contracts-workspace.test.tsx`:17PASS.
- `npx tsc --noEmit --incremental false`:PASS.
- `node build-tools/check-ui-architecture.mjs`:322módulos PASS.
- `node build-tools/qa-contracts-307.mjs`:3viewports320/390/1440,24aserciones de comportamiento y geometría,0errores runtime. El runner reutiliza el harness de formularios #295; POST preview se clasifica como lectura sin mutación. Está registrado en `100-contracts-307.list`.
- [Resultados y hashes](results.json); capturas inspeccionadas: [320](preview-320.png) y [1440](preview-1440.png).

Se verifican persistencia de contraparte/título, envío exclusivo, modelo/importación/reintento, preview con sandbox y respuesta obsoleta, readonly sin overrides, texto local sin guardado automático, control de emisión, ancho alcanzable y textarea amplio real. Se ajustaron esperas de transición y de cambio de fuente en el harness; las ejecuciones interrumpidas/fallidas previas no se cuentan como evidencia final.

## Límites

Estos tests frontend usan transporte HTTP sintético y HTML de fixture, no afirman que ese HTML sea el PDF final ni que existan firmas digitales certificadas. El backend verifica por separado PDFs y datos reales sobre fixtures. Sin OAuth, impresora ni dispositivos físicos. El integrador ejecutará gates completos, CI y publicación conjuntos; no se declaró deploy desde esta rama.

# Resultado final local del candidato 1.0.192

17/10/2026. Next production del integrador en `127.0.0.1:3013`, **fuente compilada `50091b70`**, dependencia OwnCoding UI 0.68.17. API local estable `4115` con metadata **1.0.191**: health200, database ready. Esa diferencia de metadata se informa expresamente; esta QA no demuestra un backend desplegado 1.0.192. Ningún deploy se ejecutó desde QA.

## Comprobaciones

| Alcance | Resultado final |
| --- | --- |
| Matriz completa: 16 rutas, 1440/390, claro/oscuro/contraste | **96/96 PASS**, cero errores de página |
| Focals Balance/Mora/Clientes/Proyectos/Inventario + nombre largo de empresa; 1440/1366/390, tres temas | **150/150 PASS** |
| Header ordinary: orden/targets44 móvil, formulario de reporte, descarte, perfil hover y ficha cargada | **34/34 PASS** |
| Catálogo servido `/biblioteca-ui`,1366/390, tres temas | **39/39 PASS**, cero API, proveedores y errores consola/runtime |
| Auditoría de consola adicional, 16 rutas | 0 errores runtime; **17 errores de recurso403**, detallados abajo |

La repetición completa se justificó por cambios globales Button/InputBase. Los PASS de páginas acreditan carga y contención del documento, no todas las acciones ni los cálculos financieros de cada módulo. Los focals evalúan geometría real y la revisión visual de capturas confirmó KPI USD legible, Editar legible en Inventario y cabeceras alineadas de Balance.

## Hallazgos anteriores y estado

| Hallazgo en `0afdbd08` | Evidencia en `50091b70` |
| --- | --- |
| Mora390: documento529 px, overflow139 en tres temas | Documento390 px, overflow0 en tres temas; no se inyectó CSS |
| Balance: cabeceras tabla a distintas alturas,2monedas frente a1 | Misma coordenada y en1440 y1366, tres temas; subgrid real servido |
| Logos con padding interior≈15% | Imágenes cargadas, padding0, contenedor radio50%/overflow hidden; dimensiones contenidas |
| KPI contratado Clientes recortaba USD | USD presente, hijos sin scrollWidth excesivo; captura1440 legible |
| Acciones de Proyectos y Editar Inventario podían comprimirse | Botones conservan ancho del texto y flex-shrink0 en tres tamaños/temas |
| Selector de empresa con nombre largo | Stress de texto DOM sintético, restaurado inmediatamente: selector y documento contenidos; no se modificó la empresa en API |

## Consola y límites

Se conservaron17 errores de recurso de la auditoría de consola:16×`/api/public/analytics/collect`403 y1×`/api/public/live-visitors/count`403. El backend restringe origen/host (`backend/public-analytics.js:35`, `backend/live-visitors.js:33`); la QA usa loopback. **No se afirma consola global limpia ni analytics funcional**. No hubo otros errores de consola, runtime ni intentos de proveedores externos en esa auditoría. No se relajaron guards ni se cambió Origin para ocultar esos errores.

El reporte se abrió, editó, descartó y reabrió vacío sin enviarlo. El runner final usó `QA_LOGOUT=0`: no repitió el logout ya acreditado sobre una identidad sintética. Tema establecido por atributo/storage local de QA. Fixtures demo viven en PostgreSQL con TTL; no se ejecutó borrado físico ni se probaron proveedores reales. La matriz no repite aislamiento/checklists ni auth público. El catálogo se ejecutó con el runner original del integrador, sólo consumo de componentes sin persistencia.

## Reproducción y evidencia

Runners versionados en esta carpeta. El catálogo usa `tests/ui-catalog-browser.test.mjs` del worktree del integrador. Parámetros de este recorrido:

```bash
QA_COMPILED_SOURCE=50091b70 QA_OUT=/tmp/scale192-app-final node docs/qa/ui-app-241/browser-matrix.mjs
QA_COMPILED_SOURCE=50091b70 QA_OUT=/tmp/scale192-focals node docs/qa/ui-app-241/visual-focals.mjs
QA_COMPILED_SOURCE=50091b70 QA_OUT=/tmp/scale192-header QA_LOGOUT=0 node docs/qa/ui-app-241/header-browser.mjs
QA_COMPILED_SOURCE=50091b70 node docs/qa/ui-app-241/console-audit.mjs
SCALE_CATALOG_URL=http://127.0.0.1:3013/biblioteca-ui SCALE_CATALOG_OUTPUT=/tmp/scale192-catalog node tests/ui-catalog-browser.test.mjs
```

Capturas locales en los directorios anteriores; no se fuerza inclusión de imágenes ignoradas. `README.md` y `matrix-pre-fix.json` conservan el estado previo, expresamente anterior a estas correcciones. `SETUP.md` describe servicios y propiedad actual. No se detuvo el frontend del integrador ni servicios ajenos.

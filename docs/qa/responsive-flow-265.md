# Auditoría operacional responsive — Refs #265

Se auditaron los componentes reales de Clientes, Proyectos, Pipeline,
Producción, Tareas y Contratos con Chromium, React de producción y el CSS
compartido de la aplicación. El transporte usa registros sintéticos; no escribe
ni consulta datos de producción.

## Hallazgo corregido

Un nombre de plantilla de contrato de 120 caracteres sin espacios desbordaba el
`span` de su tarjeta. El título ya tenía elipsis, pero el nombre de la plantilla
se dibujaba fuera del contenedor y ensanchaba el documento completo:

| Viewport | Documento antes | Documento después |
| --- | --- | --- |
| 320 px | 920 px | 320 px |
| 390 px | 920 px | 390 px |
| 768 px | 924 px | 768 px |
| 1024 px | 1024 px | 1024 px |
| 1440 px | 1440 px | 1440 px |

`.contract-card > span` permite partir palabras largas con
`overflow-wrap:anywhere`. El nombre completo se conserva visible, el título
mantiene su comportamiento y no se oculta el desbordamiento de la página.

## Cobertura ejecutada

- 6 componentes × 5 viewports: **30 casos PASS**, sin desbordamiento horizontal
  del documento ni errores JavaScript del navegador.
- Viewports: 320, 390, 768, 1024 y 1440 px; altura de 900 px.
- Fixtures pobladas: contrato con plantilla, cliente, tarjeta real de proyecto,
  oportunidad, tarea con asignado y orden en tablero de producción.
- Nombres largos de 120 caracteres; se espera que las listas y tableros puedan
  desplazarse dentro de su propio contenedor.
- Pruebas focales existentes de contratos, proyecto, directorio, pipeline,
  producción y tareas: **19 tests PASS** en 6 archivos.

Reproducción desde la raíz del repositorio, con Chromium y dependencias del
frontend/backend disponibles:

```sh
node build-tools/qa-operational-responsive-265.mjs
node_modules/.bin/tsx --test tests/contracts-workspace.test.tsx tests/project-card.test.tsx tests/client-directory-data.test.ts tests/production-layout.test.ts tests/com-pipeline-ux.test.tsx tests/employee-tasks.test.tsx
```

El script guarda las mediciones en
`/tmp/scale-operational-responsive-265.json`; `OUT` permite otra ruta.

## Límites y entrega

Esta matriz aísla los componentes operativos: no acredita el shell autenticado,
las vistas de lista alternativas, los modales completos, arrastre táctil, CRUD
real, hardware ni OAuth. La tarjeta de proyecto es real; las celdas del renderer
alternativo de lista se simulan y esa vista no se incluye en los 30 casos.
La auditoría de integración del shell corresponde al agente de QA general.

No se cambiaron datos, roles, API, estilos globales ni versiones. El integrador
realiza build completo, CI y publicación; este handover no acredita deploy.

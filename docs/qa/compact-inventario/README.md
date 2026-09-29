# Inventario compacto (#90) — antes/después y medición

_Pase de compactación desktop sobre `app/inventory-workspace.tsx` (rama `SOS-OPS`).
El sistema compartido (`PageHeader`/`Kpi`/`KpiStrip`/tabs/paddings) llega en #89 (DSN):
acá no se crean variantes locales._

## Medición: top del contenido → primer equipo

Método: harness visual (`build-tools/visual-harness`) con el **CSS construido real**
sobre espejos fieles del markup antes y después (mismo documento, mismo build),
en el estado sin selección (la barra de lote se oculta en ambos). «Top del
contenido» = primer bloque del panel de Inventario; «primer equipo» = la fila
`[data-list-row="equipment"]`.

| Ancho | Antes | Después | Reducción |
| --- | --- | --- | --- |
| **1440 × 900** | **453 px** | **285 px** | **−37 %** |
| 1280 × 900 | 489 px | 321 px | −34 % |
| 390 × 844 (mobile) | 1171 px | 1013 px | −13 % |

Desglose a 1440 (px desde el top del contenido hasta el primer equipo):

| Tramo | Antes | Después |
| --- | --- | --- |
| Toolbar (card + fila(s) + atención + explicación) | 257 | 96 (fila 42 + gap 12 + chips 42) |
| Separación entre bloques | 16 | 16 |
| Card de equipos (padding superior) | 21 | 21 |
| KPIs | 114 | 114 |
| KPIs → encabezado de lista | 16 | 16 |
| Encabezado de lista | 15 | 15 |
| **Total** | **453** | **285** |

**Nota 1280:** la reducción queda en 34 % porque a ese ancho el KPI «Valor total»
parte el monto en varias líneas dentro de la card (229 px) y estira las 4 cards a
150 px (contra 114 a 1440). Es comportamiento de `Kpi`/`KpiStrip` (criterio 112–140
de **#89**: una sola línea de explicación); queda reportado ahí, no se parchea local.

## Qué cambió

1. **Se retiró la mega-card contenedora** del toolbar: el toolbar es hijo directo del
   panel (`data-inventory-toolbar`), sin `Card`.
2. **Fila principal única** en ≥1280: tabs `Equipos / Calendario y reservas`,
   búsqueda flexible, `Categoría` (rótulo en línea en desktop) y, a la derecha,
   contador + `Agregar equipo` + `Reservar equipos`.
3. **Atención → chips compactos** con la explicación **solo al expandir**
   (`¿Qué es?` con `aria-expanded`) y en el `title` del chip de control físico; se
   retiró el párrafo fijo y el `border-t`.
4. **`Seleccionar visibles`**: acción secundaria discreta (`text-button`) en la fila
   de chips, junto al selector de vista.
5. **Contador compacto** (`6 de 6 · 15:42`) con el detalle completo en el `title`
   ("Mostrando 6 de 6 equipos · Sincroniza cada 30 s…").
6. **Selector de vista (Cuadrícula/Lista/Ubicaciones)** movido a la fila secundaria:
   con los anchos actuales de los objetos compartidos la fila principal necesitaba
   ~1231 px y hay 1152 px a 1440 (y 992 px a 1280) — medido con el harness. Con la
   compactación de tabs/segmented de #89 vuelve a la fila principal sin tocar nada más.
7. **Mobile**: tabs con scroll horizontal (`silent-scroll max-lg:overflow-x-auto`),
   apilado por bloques y targets ≥ 44 px (los checkboxes de fila miden 24 px pero su
   `label` contenedor es de 44 × 44 px, verificado con el probe a 390).
8. **`capture.mjs`**: opción nueva `--viewport 1440x900,390x844` para recortar la
   captura al viewport pedido (sin ella, sigue capturando la página completa).

## Evidencia

- `inventario-equipos-lista-antes-90-{1440,390}-{light,dark}.jpg` — referencia del antes.
- `inventario-equipos-lista-{1440,390}-{light,dark}.jpg` — después (vista Lista).
- `inventario-equipos-cuadricula-1440-light.jpg`, `inventario-equipos-cuadricula-390-dark.jpg`.
- `inventario-reservas-lista-1440-light.jpg`, `inventario-reservas-lista-390-dark.jpg`.

El fixture `inventario-equipos-lista-antes-90` (`build-tools/visual-harness/fixtures/ops-inventario-estudio.mjs`)
conserva el espejo del toolbar anterior para reproducir esta medición.

## Tests

- `tests/inventory-compact.test.ts` (nuevo): el toolbar no vuelve a una card, la fila
  principal no envuelve en ≥1280, la atención es expandible, `Seleccionar visibles`
  es secundaria, el contador es compacto y los tabs scrollean con targets de 44 px.
- `tests/inventory-workspace.test.tsx`: comportamiento en renderer (fila única,
  explicación colapsada/expandida, contador compacto con tooltip, orden del toolbar).

```sh
npm run test:release-regression
npx next build
rg "<<<<<<<" app tests build-tools
node build-tools/visual-harness/run.mjs --only inventario --widths 390,768,1280,1440
```

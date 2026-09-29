# Compactación de Operaciones (#94) — antes/después y medición

_Segunda parte del pase de compactación (la primera es `docs/qa/compact-inventario/`,
#90). Rama `SOS-OPS`. El sistema compartido (PageHeader/Kpi/KpiStrip/tabs del shell)
llega en #89 (DSN): acá no se crean variantes locales._

## Medición «arriba del pliegue» (1440 × 900)

Método: harness visual con el **CSS construido real** sobre espejos fieles del markup
(`build-tools/visual-harness/measure-fold.mjs`). «Antes del contenido» = píxeles desde
el top del panel hasta el primer bloque de datos; «en pliegue» = filas/cards que
entran completas en el viewport con la página en el tope.

| Pantalla | Fixture | Antes | Después | Δ | En pliegue (después) |
| --- | --- | --- | --- | --- | --- |
| Producción · tablero | `produccion-tablero` | 182 px | **157 px** | −14 % | 4 columnas con tarjetas |
| Producción · planificador | `produccion-mi-dia` | 271 px | 271 px | — | 4 piezas |
| Proyectos | `proyectos-lista` | 326 px | **286 px** | −12 % | 4 proyectos |
| Estudio | `estudio-reservas-lista` | ~580 px (con encabezado) | **~580 px** | encabezado −17 px + calendario −48 px | 4 reservas |
| Historial de trabajo | `equipo-historial` | 309 px | **234 px** | −24 % | 2 entradas |

Notas de lectura:

- **Estudio**: el fixture sumó el encabezado real (antes no lo espejaba), por eso el
  total no baja: el encabezado pasó de 61 px (título+descripción apilados + mes con
  rótulo arriba) a 44 px en una fila, y las celdas del calendario de 64 px a 56 px en
  desktop (−48 px en 6 semanas). La lista de reservas arranca ~65 px más arriba.
- **Producción · planificador**: no tiene toolbar propia (comparte la del tablero);
  queda igual y con 4 piezas en el pliegue.
- Mobile (390 × 844): todas las pantallas conservan ≥44 px por control y apilan por
  bloques; el tablero scrollea por etapas dentro de su caja.

## Qué cambió por pantalla

| Pantalla | Cambio |
| --- | --- |
| **Proyectos** | Toolbar en una fila (rótulo `Cliente` en línea, `Limpiar filtro` y `Seleccionar visibles` discretos, contador a la derecha) y **barra de lote solo con selección**: la pista del lote vive en el `title` del acceso directo. |
| **Producción** | Toolbar en una fila en desktop (tabs con scroll-x en mobile, `Cliente` en línea, filtros/contador/restablecer a la derecha); el tablero conserva dnd, badges por etapa, ventana por columna y filtros. |
| **Estudio** | Encabezado en una fila (`Calendario del estudio` + descripción truncada con `title` + `Mes` en línea + `Seleccionar visibles`); celdas del calendario de 56 px en desktop; barra de lote solo con selección. |
| **Historial** | Encabezado en una fila (título + descripción truncada con `title` + `Ver historial importado`), filtros con rótulos en línea y sin margen extra del `FilterToolbar`. |

Reglas respetadas: no se quitó ninguna función, permiso, endpoint ni dato; las
acciones de lote siguen visibles (la barra aparece con la selección y el acceso
directo queda en el toolbar); cards 16–20 px; secciones 16–24 px; mobile ≥44 px.

## Evidencia

Capturas 1440 × 900 y 390 × 844, claro y oscuro, por pantalla:

- `produccion-tablero-{1440,390}-{light,dark}.jpg`
- `produccion-mi-dia-{1440,390}-{light,dark}.jpg`
- `proyectos-lista-{1440,390}-{light,dark}.jpg`
- `estudio-reservas-lista-{1440,390}-{light,dark}.jpg`
- `equipo-historial-{1440,390}-{light,dark}.jpg`

## Herramientas nuevas del harness

- `build-tools/visual-harness/measure-fold.mjs`: mide el espacio antes del primer
  contenido real y cuántas filas entran en el alto pedido (`--fixtures`, `--widths`,
  `--heights`).
- `build-tools/visual-harness/capture.mjs --viewport 1440x900,390x844`: recorta la
  captura al viewport (antes siempre era página completa).

## Tests

- `tests/ops-compact-94.test.ts` (nuevo): guarda de layout del pase (toolbars en una
  fila, barras de lote condicionadas, encabezados compactos, densidad del calendario).
- `tests/ops-v2-contract.test.ts` (#62/#70/#74): contratos de toolbar y lote
  actualizados a la estructura compacta.

```sh
npm run test:release-regression
npx next build
rg "<<<<<<<" app tests build-tools
node build-tools/visual-harness/run.mjs --only produccion,proyectos,estudio,equipo-historial --widths 1440,390
node build-tools/visual-harness/measure-fold.mjs --fixtures produccion-tablero,proyectos-lista,estudio-reservas-lista,equipo-historial --widths 1440,390 --heights 900,844
```

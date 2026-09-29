# Densidad integral en Operaciones (#99) — auditoría, medición y evidencia

_Rama `SOS-OPS` sobre `origin/main` v1.0.147. El sistema compartido (#89: `PageHeader`,
`FilterToolbar`, `Kpi`/`KpiStrip`, tabs, paddings) ya está integrado y **no se rehace**:
acá se documenta con evidencia lo que ya cumple y se corrige lo que faltaba. Las capturas
`antes-*` salen del build previo a este pase._

## Auditoría contra el comando del dueño (alcance OPS)

| Punto del comando | Estado | Evidencia |
| --- | --- | --- |
| **Inventario** · sin mega-card de tabs/filtros/acciones | **Ya cumplía (#90)** | `app/inventory-workspace.tsx:312` (`data-inventory-toolbar` fuera de `Card`); `ops-densidad-99.test.ts` |
| **Inventario** · toolbar única (Equipos/Calendario, búsqueda, categoría, vista, contador, Agregar/Reservar) | **Ya cumplía (#90)** | fila única en ≥1280 con `xl:flex-nowrap` + chips de vista en la segunda fila |
| **Inventario** · chips de alerta y explicación en tooltip/expandible | **Ya cumplía (#90)** | `¿Qué es?` con `aria-expanded` + `title` en el chip de control físico |
| **Inventario** · listado mucho más arriba | **Ya cumplía (#90)**: 453 → 285 px a 1440 (−37 %) | `docs/qa/compact-inventario/README.md` |
| **Inventario** · calendario y reservas densos | **Corregido acá** | encabezado en una fila (`Calendario y reservas` + descripción truncada con `title` + `Mes` en línea) y celdas 64 → 56 px en desktop |
| **Producción** · tarjetas sin redundancias (etapa repetida, «Actualizada») | **Corregido acá** | `app/production-board.tsx`: sin `STATUS_TONE[order.status]` ni `Actualizada …`; metadatos (enlaces, horas, pasos) como chips con `title` |
| **Producción** · dnd y badges por etapa intactos | Verificado | `tests/ops-drag-drop.test.ts` + badge de etapa en el encabezado de columna |
| **Producción** · acciones en una toolbar y contenido arriba del pliegue | **Ya cumplía (#94)** | 157 px antes de la primera tarjeta; 4 columnas visibles a 1440×900 |
| **Proyectos** · listas, sin espacio muerto, acciones juntas | **Corregido acá** | tarjetas sin `min-h-[200px]` (la altura la define el contenido); acciones ya agrupadas al pie |
| **Estudio** · ayuda/notas con salida | **Corregido acá** | notas del espacio con `line-clamp-2` + `title` (antes `max-h-10 overflow-hidden` sin salida) |
| **Selección masiva contextual** | **Corregido acá / ya cumplía** | planificador: «Cambiar N piezas» aparece **solo** con selección (Inventario/Proyectos/Estudio ya eran condicionales) |
| **Popups, formularios y paneles laterales** | Auditados | sin bloques vacíos ni footers reservados; los textos largos de formularios son ayuda de una línea (se mantienen) |
| **Metadatos/números que no se cortan** | Verificado | `tests/ops-v2-contract.test.ts` (montos, fechas y seriales never-truncate) |

## Correcciones de este pase

1. **Tablero (Producción)**: se quitaron el chip de etapa (repetía la columna) y la línea
   «Actualizada …» (auditoría que vive en el detalle). Enlaces/horas/pasos pasaron a la fila
   de metadatos con su `title`, y se retiraron los separadores `border-y` que inflaban la tarjeta.
2. **Responsables (todas las tarjetas y detalles)**: `AssignedPeople` dejó de ser una caja con
   rótulo apilado y altura reservada; ahora es **una línea compacta** (rótulo + chips) y los
   estados (`Cargando…`, `no disponibles`, `Sin responsables`) son texto auxiliar.
   Fuente única: `app/assigned-people.tsx` + `app/assigned-people.css`.
3. **Tarjetas sin altura artificial**: se retiró `min-h-[200px]` de las tarjetas de equipo,
   espacio y proyecto (la altura la define el contenido; la fila sigue homogénea por el grid).
4. **Calendarios densos**: celdas de 56 px en desktop en Inventario y Estudio.
5. **Encabezados en una fila**: `Calendario y reservas` (Inventario) y `Calendario del estudio`
   con descripción truncada + `title` y el mes en línea.
6. **Notas con salida**: las notas del espacio se recortan a 2 líneas con `title`.
7. **Selección contextual**: el lote del planificador aparece solo con selección (las
   plantillas mensuales siguen siempre accesibles).

## Medición «arriba del pliegue» (1440 × 900)

`build-tools/visual-harness/measure-fold.mjs` — px desde el top del panel hasta el primer
bloque de datos y filas/cards visibles sin scroll:

| Pantalla | Antes del contenido | En pliegue |
| --- | --- | --- |
| Producción · tablero | 157 px | 4 columnas con tarjetas |
| Producción · planificador | 271 px | 4 piezas |
| Proyectos | 286 px | 4 proyectos |
| Estudio | 580 px (calendario de por medio) | 4 reservas |
| Historial | 234 px | 3 entradas |
| Inventario | 329 px | 7 equipos |

Criterio del comando: **contenido real sin scroll después de header y filtros** ✓ en las cinco
pantallas. Mobile 390×844: apilado por bloques, tabs con scroll horizontal y ≥44 px por control.

## Evidencia

- `antes-*` (8 capturas) y el resto (20 capturas) en esta carpeta: 1440×900 y 390×844, claro y
  oscuro, de Producción (tablero y planificador con selección), Inventario (lista, cuadrícula y
  reservas), Proyectos (lista y cuadrícula), Estudio (reservas y espacios) e Historial.
- Harness: `run.mjs --only produccion,proyectos,estudio,inventario,equipo-historial --widths 390,1440`
  → 28 fixtures, **0 hallazgos, 0 overflow**.

## Tests

- `tests/ops-densidad-99.test.ts` (nuevo): tablero sin redundancias, tarjetas sin altura
  artificial, responsables compactos, selección contextual, notas con tooltip y calendarios densos.
- Ajustes de contrato: `tests/ops-v2-contract.test.ts` (tarjeta de proyecto sin 200 px, textos
  recortados solo con `title`, mes del inventario en línea), `tests/mobile-workspace-layout.test.ts`
  y `tests/ux-consistency.test.ts` (mismo criterio) y `tests/production-assigned-people.test.tsx`
  (el contrato del card transpilado vuelve a correr y valida la tarjeta compacta).

## Pendientes con motivo

- **Persistencia de Lista/Cuadrícula por usuario**: el comando la pide para Clientes (COM); en
  Inventario/Proyectos la vista sigue en estado local. Llevarlo a preferencias del workspace es
  un cambio transversal de `WorkspacePreferences` (PLT/DSN) y no se improvisa local.
- **Footer/botones anclados en tarjetas con poco contenido**: en OPS ya no queda ninguno; si
  aparece en otras superficies, es del slot dueño.
- **`min-height` de las tarjetas de Clientes** (`min-h-[200px]`, COM): fuera de este alcance.

```sh
npm run test:release-regression
npx next build
rg "<<<<<<<" app tests build-tools
node build-tools/visual-harness/run.mjs --only produccion,proyectos,estudio,inventario,equipo-historial --widths 390,1440
node build-tools/visual-harness/measure-fold.mjs --fixtures inventario-equipos-lista,produccion-tablero,proyectos-lista,estudio-reservas-lista,equipo-historial --widths 1440,390 --heights 900,844
```

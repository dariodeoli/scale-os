# Inventario — cards, lista y ubicaciones (#103): antes/después

_Rama `SOS-OPS` · base `origin/main` v1.0.148. Capturas 1440×900, 1024×768 y
390×844 en claro y oscuro; `antes-*` es el build previo a este pase._

## Medición (harness con el CSS real, 1440)

| Pieza | Antes | Después | Δ |
| --- | --- | --- | --- |
| Tarjeta de equipo (cuadrícula) | 434 / 324 px | **252 / 232 px** | **−42 % / −28 %** |
| Fila de lista | 48 px (acciones en 2 líneas cuando no entran) | **56 px**, acciones en **una** línea | dentro del rango pedido (≤104) |
| Columnas del pipeline | 288 px fijas (la 3.ª quedaba cortada) | **fluidas 1/2/3** por breakpoint | sin cortes a 1024 |
| Encabezados de columna | variables | **46 px** fijos, contador a la derecha | consistente |
| KPIs superiores | 114 px (150 px a 1280 por el monto en 2 líneas) | **114 px**, monto con `clamp` + nowrap, «Sin valor» cuando falta | dentro de 96–120 |

## Qué cambió

- **Componentes compartidos** (`app/inventory-workspace.tsx`): `EquipmentPhoto`
  (foto 56 px o placeholder limpio con el ícono de categoría, nunca ícono roto ni
  el texto «Foto»), `InventoryItemMeta` (código · categoría · ubicación / en la
  fila: categoría · serie) y `InventoryItemActions` (una sola lista
  `inventoryItemActionList` alimenta los íconos alineados y el menú desplegable
  del pipeline; eliminar siempre en rojo con tooltip).
- **Cuadrícula**: cabecera alineada (checkbox · foto 56 · nombre flexible · estado
  a la derecha), metadatos en dos líneas, serie/valor en una fila corta («Sin
  serie» / «Sin valor», sin filas vacías), verificación + acciones en un pie común.
- **Lista**: columnas reales con `grid-template-columns`
  (`foto | artículo | detalles | valor | estado | ubicación | verificación | acciones`),
  el artículo trunca con `title`, el código y el estado nunca se cortan, y las
  acciones quedan en una sola línea (se retiró el envoltorio de `flex-wrap`).
- **Ubicaciones/persona**: columnas de ancho fluido por breakpoint, encabezados de
  altura fija con el contador a la derecha, tarjetas internas con estructura fija
  (foto/placeholder, nombre, código · categoría, verificación, «aquí desde» como
  metadata con tooltip, estado + verificación + menú abajo a la derecha) y el
  arrastre de equipos intacto.
- **KPIs**: «Sin valor» como dato principal cuando no hay montos, contador
  secundario y «Agregar valor» como enlace chico (44 px en mobile).

## Evidencia

`docs/qa/inventario-cards/`: 30 capturas (antes/después de Cuadrícula, Lista y
Ubicaciones en 1440, 1024 y 390; claro y oscuro).

> Nota del harness: los íconos SVG de los fixtures no se pintan en las capturas
> de esta máquina (comportamiento preexistente del harness); su presencia se
> verifica con el probe del DOM y con los tests.

## Tests

- `tests/inventory-cards-103.test.ts` (guarda): componentes compartidos,
  placeholder, plantilla única de la lista, acciones sin envolver, serie/valor en
  corto, KPIs acotados y pipeline fluido.
- `tests/ops-v2-contract.test.ts` y `tests/inventory-workspace.test.tsx`
  actualizados a la nueva estructura.

```sh
npm run test:release-regression
npx next build
rg "<<<<<<<" app tests build-tools
```

# Ubicaciones de guardado — orden manual (#104): antes/después

_Rama `SOS-OPS` · base `origin/main` v1.0.148. Antes: la vista listaba por
`active desc, name` y el pipeline ordenaba las columnas alfabéticamente._

## API (`backend/`)

- **Migración** `migrations/20260929_inventory_location_position.sql` (aditiva,
  idempotente y re-ejecutable): agrega `position` con el orden vigente
  (`active desc, name`) como valor inicial, lo deja `not null default 0`, crea el
  índice `(organization_id, position, name)` y no hace nada si la tabla no existe
  (suites que no cargan esa migración). Registrada en `server.js`,
  `scripts/migration-order.mjs` y las fixtures de `test-suite.mjs`/`test-auth.mjs`.
- **Listado**: `listStorageLocations` ordena por `position, name`.
- **Endpoint**: `PATCH /api/agency/inventory-locations/order` con `{ids:[...]}`:
  exige `inventory.manage`, rechaza ids no numéricos, repetidos o de otra empresa
  (404) y reescribe `position` + `updated_at` en el orden pedido. Las ubicaciones
  nuevas se insertan al final (`max(position)+1`).
- **Tests** (`test-inventory-reservations.mjs`): orden persistido, listado que lo
  respeta, rechazo de repetidos/ajenos, 403 sin permiso y restauración del orden.

## Front (`app/`)

- `useInventoryCatalog` expone `reorderLocations(ids)`: actualiza la lista de forma
  **optimista**, persiste contra el endpoint y **revierte** si el API falla.
- La vista **Ubicaciones** muestra botones «mover antes / mover después» en el
  encabezado de las columnas que son lugares guardados (sólo con permiso de
  gestión); el orden viaja completo y el fallo se avisa en pantalla.
- `buildInventoryPipelineColumns` respeta el orden de las ubicaciones (las
  columnas de sólo lectura quedan primero y «Sin ubicación» al final).
- «Ubicaciones de guardado» (lista de ajustes) usa el mismo orden del catálogo.
- El arrastre de equipos entre columnas sigue funcionando (los botones no
  interfieren con dnd-kit).

## Evidencia

`docs/qa/inventario-ubicaciones/`: 6 capturas del pipeline en 1440, 1024 y 390
(claro/oscuro) donde se ven las columnas fluidas, los encabezados de altura fija
y los botones de orden.

## Tests

- `tests/inventory-ubicaciones-104.test.ts` (guarda full-stack): migración
  registrada, endpoint validado, hook optimista con reversión, botones por permiso
  y orden respetado en el pipeline.
- `tests/inventory-workspace.test.tsx`: el reordenamiento llama al endpoint con la
  lista completa, se ve al instante y vuelve al orden anterior si falla.
- `tests/inventory-data.test.ts`: el orden de columnas sale de las ubicaciones, no
  del nombre.

```sh
npm run test:release-regression
npx next build
npm --prefix backend run test:release
rg "<<<<<<<" app tests backend
```

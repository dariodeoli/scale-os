# Arranque percibido — medición antes/después (#109, SOS-DSN)

Método: `build-tools/perf/measure-load.mjs` (#106/#108) — `next start` local,
Chrome headless, **API interceptada con fixtures escaladas** (clientes 400,
proyectos 250, órdenes 3.000 ≈ 1,4 KB/fila) y **latencias fijas por endpoint**
(`/auth/me` 120 ms, `/projects` 450 ms, `/summary` 250 ms, `/work-orders`
30 + n·0,6 ms); `Fetch` interceptado, mismas condiciones en las dos corridas.

Marcas nuevas del medidor: **shell** (aparece `main.shell`), **load page
visible** (desaparece `.loading-page`), **primer contenido** (primera
fila/tarjeta/KPI real), **datos listos** (`[data-shell-data="ready"]`).

## Escritorio (1440×900)

| Ruta | Antes: load page | Después: load page | Antes: datos listos | Después: datos listos |
|---|---|---|---|---|
| `/resumen` | 618–1439 ms | **311 ms** | 618–1439 ms | 763 ms |
| `/produccion` | 1054 ms | **155 ms** | 1054 ms | 622 ms |
| `/clientes` | 2185–2282 ms | **164 ms** | 2185–2282 ms | 2025 ms |

Dos muestras por corrida (la primera incluye el arranque en frío del servidor).
En las tres rutas la pantalla de carga pasa de ~0,6–2,3 s a **155–311 ms**: el
tiempo de la identidad (auth), que es la única espera que queda.

## Móvil (390×844)

| Ruta | Antes: load page | Después: load page |
|---|---|---|
| `/resumen` | 2649 ms | 208 ms |
| `/produccion` | 1223 ms | 168 ms |

## Qué se ve en la ventana temprana

- `antes-109-clientes-1440-380ms.png`: a los **380 ms** todavía está la pantalla
  de carga (marca, identidad y barra).
- `despues-109-clientes-1440-380ms.png`: a los 380 ms ya está el **shell**
  (riel, topbar, encabezado «Clientes · Cargando el directorio…», buscador,
  filtros y vista) con la **tira de KPIs en esqueleto** y las filas en
  esqueleto: ningún cero inventado.
- `despues-109-resumen-1440-380ms.png`: mismo corte en Resumen.

JSON crudos: `antes-109.json`, `despues-109.json`, `antes-109-390.json`.

## Método reproducible

```sh
npx next build && npx next start -p 3105
node build-tools/perf/measure-load.mjs --label antes --port 3105 --only resumen,clientes,produccion --hard
node build-tools/perf/measure-load.mjs --label antes --port 3105 --width 390 --only resumen,produccion --hard
# captura de la ventana temprana:
node build-tools/perf/measure-load.mjs --label despues --port 3105 --only clientes --hard --shot 380
```

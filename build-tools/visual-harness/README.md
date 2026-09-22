# Harness de verificación visual (SOS-DSN)

Mide geometría real de la interfaz con **el CSS construido de la app** y **Chrome
headless** (CDP), sin levantar Next ni el API. Es la herramienta del slot de
Diseño para el baseline responsive y para verificar fixes visuales con números.

## Requisitos

- Node ≥ 21 (usa `WebSocket` global; el repo corre Node 24).
- Google Chrome en `/Applications/Google Chrome.app` (o `CHROME_PATH`).
- `.next/static/css` construido: `npx next build` una vez (el harness usa los
  chunks reales, incluidos los diferidos por sección).

No agrega dependencias: el cliente CDP está en `chrome.mjs`.

## Uso

```bash
# Todas las secciones, anchos estándar (360/390/430/768/1024/1440)
node build-tools/visual-harness/run.mjs

# Solo algunos fixtures (coincidencia por substring del id) y algunos anchos
node build-tools/visual-harness/run.mjs --only clientes,equipo --widths 390,768,1440

# Salida a un directorio propio (por defecto work/visual-harness/latest)
node build-tools/visual-harness/run.mjs --out work/visual-harness/mi-run

# Depurar un ancho y evaluar una expresión en la página
node build-tools/visual-harness/probe.mjs 390 "document.documentElement.scrollWidth"
node build-tools/visual-harness/probe.mjs 360 "..." landing   # página external (landing)

# Capturas PNG del artifact (anchos y temas), reutilizando el mismo Chrome CDP
node build-tools/visual-harness/capture.mjs \
  --input work/visual-harness/latest/audit.html \
  --out work/visual-harness/latest/captures \
  --widths 360,768,1440 --themes light,dark \
  --only clientes-lista,resumen-indicadores,configuracion-empresa
```

Salidas por corrida:

- `results.json`: todas las mediciones crudas (fixture × ancho × nodo).
- `baseline.md`: hallazgos agrupados por severidad con evidencia y fix propuesto.
- `audit.html`: documento exacto que midió el harness (reproducible).
- `page-*.html`: documento instrumentado para fixtures `external` (landing).
- `captures/*.png` (opcional, `capture.mjs`): captura completa de cada fixture
  elegido en el ancho y tema (`light`/`dark` vía `data-theme`) pedidos. Sirve de
  evidencia visual; el tema oscuro se aplica con el mismo atributo que la app.

## Qué mide

Por cada fixture y cada ancho:

| Chequeo | Regla | Dato |
|---|---|---|
| Overflow horizontal | `scrollWidth > clientWidth` del fixture | `overflow-documento` |
| Bleed | nodo fuera de la caja de la tarjeta/panel (sin scroll intencional) | `bleed` / `bleed-clip` |
| Pseudo-elementos decorativos | `::before/::after` que agrandan el área scrolleable | `pseudo-overflow` (+ `contributes`, `clipped`) |
| Texto recortado sin salida | `ellipsis`/`clip`/`line-clamp` sin `title` (propio o en ancestro) | `texto-cortado` |
| Superposiciones | intersección real entre rects de nodos visibles (excluye contención, controles internos, avatares apilados) | `superposicion` |
| Altura de fila | contrato 44–52 px (`exemptBelow` para listas que se apilan) | `altura-fila` |
| Cuadrícula | tarjetas ≥200 px | `tarjeta-baja` |
| Encabezado vs filas | misma variable `--<vista>-cols` y celdas alineadas (±2.5 px) | `plantilla-encabezado-fila`, `desalineacion-celdas` |
| Columnas colapsadas | celda de fila <14 px con encabezado visible | `columna-colapsada` |

Los selectores de evidencia son rutas CSS acotadas al fixture. Los hallazgos de
la landing incluyen su documento real (`public/scale-os.html`) instrumentado.

## Cómo funciona

1. `run.mjs` concatena los chunks de `.next/static/css` en el orden que sirve la
   ruta del workspace (leído de `.next/server/app/index.html`) y luego el resto,
   para conservar la cascada real.
2. Arma un documento con un fixture por sección (`kind: workspace` usa el shell
   real: sidebar + `.content` + topbar) y lo sirve por HTTP local junto con
   `public/` (fuentes e imágenes reales).
3. Chrome headless expone CDP; el harness emula cada ancho con
   `Emulation.setDeviceMetricsOverride` (mobile real por debajo de 768 px) y
   evalúa `measure.js`, que devuelve geometría pura (sin screenshots ni visión).
4. `report.mjs` convierte las mediciones en hallazgos agrupados por sección,
   tipo y ancho, con severidad alta/media/info.

## Fidelidad y límites

- Los fixtures espejan el JSX real con datos de estrés (ver `FIXTURES.md`); no
  es la app corriendo con datos de producción, así que un hallazgo se confirma
  contra el componente fuente antes de despacharlo.
- Se desactivan animaciones/transiciones y el sidebar queda estático; los
  tamaños de contenido no cambian.
- `clientWidth` excluye la barra de scroll clásica en desktop; en mobile
  (emulación real) no hay barra. Diferencias de 15 px en desktop son esperables.
- Los colores/tema oscuro no se miden acá: es un harness de layout.

## Mantenimiento

- Si cambia el markup de una sección, actualizar su fixture (los tests estáticos
  de plantillas siguen cubriendo la fuente).
- Los hallazgos no se arreglan desde el harness: se despachan al slot dueño
  (COM/OPS/FIN/PLT) o se corrigen en primitivas de SOS-DSN.

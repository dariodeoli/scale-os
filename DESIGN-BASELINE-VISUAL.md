# Baseline visual de diseño — SOS-DSN (issue #16)

Primera pasada del slot de diseño: **harness de verificación visual** con el CSS
real y Chrome headless, **baseline medido en todas las secciones** y **informe
priorizado** con evidencia. Sin fixes de dominio en esta pasada (los slots
COM/OPS/FIN/PLT tienen sus rondas; los fixes transversales se despachan después).

## Harness reusable

- `build-tools/visual-harness/README.md` — qué mide, cómo se corre, límites.
- `build-tools/visual-harness/FIXTURES.md` — cómo se agrega un fixture.
- `build-tools/visual-harness/{run.mjs,measure.js,report.mjs,chrome.mjs,probe.mjs}`.
- Fixtures: `build-tools/visual-harness/fixtures/*.mjs`.

Reproducir el baseline completo:

```bash
npx next build                       # el harness usa los chunks CSS construidos
node build-tools/visual-harness/run.mjs
```

Salidas en `work/visual-harness/latest/`: `results.json` (mediciones crudas),
`baseline.md` (hallazgos agrupados con evidencia), `audit.html` (documento
exacto medido). Anchos medidos: 360, 390, 430, 768, 1024 y 1440 px.

## Metodología

Las mediciones son geométricas (sin capturas ni visión): el harness carga el CSS
construido de la app en Chrome headless vía CDP, emula cada ancho con
`Emulation.setDeviceMetricsOverride` y evalúa `measure.js` sobre fixtures que
espejan el JSX real con datos de estrés.

| Contrato (AGENTS.md) | Medición |
|---|---|
| Sin overflow horizontal | `scrollWidth > clientWidth` del fixture y del documento |
| Nada se sale de su tarjeta/panel | rects fuera del borde de `.panel`/`.ops-card`/tarjetas |
| Nada decorativo agranda el scroll | `::before/::after` que aumentan `scrollWidth` |
| Textos cortados con salida | ellipsis/clip/line-clamp sin `title` propio o en ancestro |
| Sin superposiciones | intersección real entre rects visibles |
| Fila de lista 44–52 px | alto de filas declaradas |
| Cuadrícula ≥200 px | alto de tarjetas declaradas |
| Encabezado = filas | misma variable `--<vista>-cols` y celdas alineadas (±2.5 px) |
| Columnas que no colapsan | celda < 14 px con encabezado visible |
| Plantillas sin `auto` | una columna `auto` se dimensiona por contenido y desalinea |

Cada hallazgo del informe lleva selector, ancho(s), medición y el comando para
reproducirlo (`--only <fixture>`).

## Cobertura

Fixtures por sección: resumen, producción, clientes, proyectos, presupuestos,
finanzas, mora, previsión, informes, pipeline/métricas, planes, inventario,
estudio, equipo, invitaciones, comisiones, permisos, historial, actividad,
configuración, preferencias, papelera, superadmin, portal del cliente, accesos
(login/registro/recuperación/verificación/invitación/pendiente/demo/estado) y
landing (documento real instrumentado).

<!-- RESULTADOS: se completan tras la corrida final -->

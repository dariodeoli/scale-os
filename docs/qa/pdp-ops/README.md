# PDP en Operaciones (#115) — evidencia visual

_Evidencia del pase de minimización/anonymización de SOS-OPS: superficies del
dominio donde aparecen datos personales (responsables, custodios, verificadores,
clientes de producción), capturadas con el **harness visual** sobre fixtures
anonimizados. Claro/oscuro a 1440×900 y 390×844._

## Qué se ve acá

| Captura | Superficie | Dato personal visible |
| --- | --- | --- |
| `produccion-tablero-{1440,390}-{light,dark}` | Producción · tablero | Cliente y responsables por nombre/foto |
| `proyectos-lista-{1440,390}-{light,dark}` | Proyectos · lista | Cliente y responsables |
| `inventario-equipos-lista-{1440,390}-{light,dark}` | Inventario · lista | Custodio en ubicación y sello de verificación |
| `inventario-equipos-cuadricula-{1440,390}-{light,dark}` | Inventario · cuadrícula | Custodio y sello de verificación |
| `inventario-reservas-lista-{1440,390}-{light,dark}` | Inventario · reservas | Responsables, quién devuelve y auditoría |
| `estudio-reservas-lista-{1440,390}-{light,dark}` | Estudio · reservas | Responsables y autoría |
| `ops-detalle-pieza-{1440,390}-{light,dark}` | Producción · detalle de pieza | Responsables, comentarios e historial |
| `ops-detalle-inventario-{1440,390}-{light,dark}` | Inventario · detalle y trazabilidad | Verificación, mantenimiento y rastro |

## Fixtures y método

- Fixtures OPS de `build-tools/visual-harness/fixtures/ops-*.mjs`, con el elenco
  **anonimizado** (nombres marcados «de Prueba» y clientes de ejemplo); la
  persona del shell del harness pasó de un nombre real a la demo «Lucía Acosta».
- Comandos usados:

```sh
node build-tools/visual-harness/run.mjs \
  --only produccion-tablero,proyectos-lista,inventario-equipos-lista,inventario-equipos-cuadricula,inventario-reservas-lista,estudio-reservas-lista,ops-detalle-pieza,ops-detalle-inventario \
  --widths 1440,390 --out work/visual-harness/pdp-ops

node build-tools/visual-harness/capture.mjs \
  --input work/visual-harness/pdp-ops/audit.html \
  --out work/visual-harness/pdp-ops/captures \
  --widths 1440,390 --themes light,dark \
  --only produccion-tablero,proyectos-lista,inventario-equipos-lista,inventario-equipos-cuadricula,inventario-reservas-lista,estudio-reservas-lista,ops-detalle-pieza,ops-detalle-inventario \
  --viewport 1440x900,390x844
```

- Los `.jpg` de esta carpeta salen de esos PNG (calidad 80).

## Hallazgos

- El pase no introduce hallazgos nuevos: el único hallazgo del baseline es la
  fila de inventario a 56 px, heredada y aceptada en #103 (fuera del contrato
  genérico 44–52 px por las acciones en una sola línea).
- El fixture nuevo de nombres largos destapó un desborde real del sello de
  verificación (el nombre no truncaba y pisaba la columna de acciones a 1440).
  Se corrigió en `app/inventory-workspace.tsx` (`VerificationStamp` pasa a
  `flex` con `min-w-0`), y el fixture espeja el fix.

## Pendiente transversal

Las capturas históricas `docs/qa/*-ops/` (y las de otras verticales) se
generaron con la persona y el elenco anteriores; re-renderizarlas es un pase
único compartido (mismos fixtures para todos los slots) que no se ejecuta acá
para no invalidar la evidencia «antes/después» de issues cerrados.

# Evidencia #144 — Previsión: «total planificado» vs «Sin gastos planificados»

**Antes** (producción v1.0.164, build sin el fix): el total PYG planificado
convive con «Sin gastos planificados para 01-oct» (contradicción del issue).
La corrida falla a propósito las comprobaciones de vacío.

**Después** (build local de la rama `SOS-FIN` con el fix, `/pagos/prevision`):
el detalle pausado muestra «Cargando gastos planificados…» en vez del vacío,
el estado asentado lista los registros del mes y el resumen bimoneda queda
bajo «Ver desglose».

Método: `build-tools/visual-harness/qa-fin-144.mjs` con Chrome CDP; pausa
`/core-api/api/agency/planned-expenses` con `Fetch.enable` para congelar la
contradicción (total visible, detalle en curso) y luego continúa los pedidos.
Capturas 390/1440 en claro y oscuro (`jpeg` calidad 78, viewport 900 de alto).
`verificacion-*.txt` es la salida de comprobaciones del harness.

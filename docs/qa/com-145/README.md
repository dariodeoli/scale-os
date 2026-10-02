# Ficha de cliente — fechas, montos y KPIs de Pipeline (#145)

Evidencia de la auditoría del dueño (02-10) sobre la ficha comercial de un
cliente real de la demo (**Aurora Café**).

## Causas encontradas

1. **«Cliente desde» inconsistente**: la ficha usaba
   `relationship_started_on` (la fecha real declarada en *Datos comerciales y
   reportes*) con fallback a `created_at` recortado en UTC, mientras el listado
   usaba siempre `created_at` con huso de Asunción. Para el cliente auditado,
   listado = **abr. 2026** y ficha = **10 feb 26** (la fecha declarada).
   Además, el ciclo comercial rotulaba «Cliente desde» a su fecha de
   **activación** (otra fecha legítima y distinta) y los términos comerciales ya
   usaban «Inicio comercial».
2. **Importe crudo**: la nota que genera el fixture de demo
   (`backend/demo-reports.js`) escribía `importe mensual acordado PYG 3000000.00`
   y la ficha muestra las notas del cliente tal cual. Se formateó la generación
   con el formato del sistema (PYG sin decimales) y se barrió la ficha/popups:
   no quedaban otros crudos (todos usan `money()`/`MoneyText`/`MoneyInput`).
3. **KPIs de Pipeline apilados**: en 390 el `KpiStrip` apilaba 4 tarjetas a
   ancho completo (476 px de alto).

## Fix

- `clientDateSummary` (en `app/client-format.ts`) es la fuente única de las
  etiquetas: «Cliente desde» = alta real (con `fechaLista` de la librería en
  huso Asunción) y «Inicio de relación» sólo aparte cuando difiere. La ficha usa
  ese resumen (`app/client-commercial-summary.tsx`, extraído y testeable).
- Etiquetas únicas: «Cliente desde» (alta) · «Inicio de relación» (fecha
  declarada) · «Inicio comercial» (términos) · «Activación comercial» (enmienda
  del ciclo comercial, antes rotulada «Cliente desde»).
- La nota del fixture se genera con `Intl.NumberFormat` (PYG sin decimales).
- KPIs de Pipeline en móvil: los tres conteos en una fila y «Valor abierto» a
  ancho completo (el monto nunca se corta); 476 → 248 px de alto en 390. Queda
  listo para reemplazar por el patrón de #138 cuando DSN lo publique.

## Antes / después (medidas)

| Dato (Aurora Café) | Antes | Después |
|---|---|---|
| Listado «desde» | abr. 2026 | abr. 2026 |
| Ficha «Cliente desde» | Hace 8 meses · **10 feb 26** | **01 abr 26** |
| Ficha «Inicio de relación» | — | 10 feb 26 (etiquetada aparte) |
| Importes crudos en la ficha | `PYG 3000000.00`, `3000000.00` | ninguno |
| KPIs Pipeline 390 (alto) | 476 px (1 columna) | **248 px** (3 + 1 a ancho completo) |

## Archivos

- `{antes,despues}-clientes-directorio-{1440,390}-{light,dark}.jpg`
- `{antes,despues}-clientes-ficha-{1440,390}-{light,dark}.jpg` (resumen comercial)
- `{antes,despues}-clientes-notas-{1440,390}-{light,dark}.jpg` (nota con el importe)
- `{antes,despues}-pipeline-kpis-{1440,390}-{light,dark}.jpg`
- `medidas-{antes,despues}.json`

Guion reproducible: `node build-tools/visual-harness/capture-com-145.mjs antes|despues`
(stack local de COM levantado y `.next` construido). El guion prepara la fecha
de relación distinta del alta en la demo para que la diferencia sea visible.

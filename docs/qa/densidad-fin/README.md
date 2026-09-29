# Densidad integral FIN (#101)

Pase de densidad de **Finanzas, Mora, Previsión, Informes y Comisiones** sobre
el sistema compartido de #97 (v0.53.0): menos espacio muerto, una sola toolbar
por pantalla, señales en chips, ayudas en tooltip/acordeón y render único en las
listas. Capturas 1440×900 y 390×844 (claro/oscuro) antes/después + medición de
bloques.

- **antes**: `origin/main` v1.0.148 (sistema de densidad #97 incluido).
- **después**: rama `SOS-FIN` con este pase.

## Antes / después (1440×900, claro; medido en `blocks-*.json`)

| Pantalla | Antes | Después | Qué cambió |
| --- | --- | --- | --- |
| **Finanzas** | Cuentas @554 (604 px) · Cobros @1174 | Cuentas @554 (576) · Cobros @1146 | Transferencias en 3 columnas (actor y referencia inline con tooltip) sin scroll horizontal permanente; ayudas de panel a tooltip. |
| **Mora** | buckets @487 (150 px) · lista @653 | chips @527 (22 px) · **lista @565** | La segunda franja de KPIs pasa a chips de antigüedad + «sin factura» (montos visibles, conteo en tooltip): la lista gana 88 px. |
| **Previsión** | Ingresos @287 (325) + Resumen @628 (455) · Contratos @1099 · Salarios @1911 | **par Ingresos·Resumen @287 (597)** · **par Contratos·Salarios @900 (797)** · Planificados @1712 | 2 columnas ≥1440 con tablas compactas (ajuste del mes inline en el cierre); listas con una sola rama según ancho medido; definiciones en tooltip. |
| **Informes** | Comparativa @515 · Resumen @823 | **Comparativa @435 · Resumen @743** | CSV/PDF en el header y toolbar única con el corte («Datos al …» en tooltip); evolución con 11 columnas (antigüedad·cobertura y facturas·clientes); ayudas en el acordeón «Cómo leer el informe». |
| **Comisiones** | 4 paneles apilados (235+316+279+382) | **subtabs (56) + un panel (235)** | Liquidación · Comisiones · Descuentos · Pagos con contador; sin repetir el título; base de cálculo en el tooltip del importe. |

- Previsión: `prevision-pares-1-1440-light.jpg` (Ingresos · Resumen) y
  `prevision-pares-2-1440-light.jpg` (Contratos · Salarios).
- Mobile: las listas de Previsión eligen la rama de tarjetas sin duplicar
  markup (verificado por DOM: 0 tablas a 390), los targets conservan 44 px y
  las tabs del shell mantienen scroll horizontal.

## Qué no se tocó

- Primitivas compartidas (`PageHeader`, `Kpi`, `FilterToolbar`, `Subtabs`,
  `useDenseTableFit`, `StateChip`, tokens de #97): son de DSN; acá solo se
  componen.
- Permisos, endpoints, datos y acciones: intactos. Los subtabs conservan el DOM
  con `hidden`; la selección masiva contextual no aplica en FIN porque el API
  del dominio no tiene operaciones en lote.

## Cómo reproducir

```sh
git checkout origin/main && npm ci && npx next build   # antes
node build-tools/visual-harness/e2e-fin-stack.mjs &
QA_LABEL=antes OUT_DIR=docs/qa/densidad-fin node build-tools/visual-harness/capture-compact-fin.mjs

git checkout SOS-FIN && npm ci && npx next build       # después
node build-tools/visual-harness/e2e-fin-stack.mjs &
QA_LABEL=despues OUT_DIR=docs/qa/densidad-fin node build-tools/visual-harness/capture-compact-fin.mjs
```

# Compactación desktop FIN (#95)

Pase de compactación de **Finanzas, Mora, Previsión, Informes y Comisiones**
(extensión de #89–#92). Capturas 1440×900 y 390×844, claro/oscuro, antes y
después, más la medición de los bloques que quedan arriba del pliegue.

## Cómo leer la evidencia

- `*-antes-*`: `origin/main` v1.0.146 (sin el pase).
- `*-despues-*`: rama `SOS-FIN` (#95) **con el sistema compacto de #89 aplicado**
  (`origin/SOS-DSN`, `2f9e64f`). #95 se apoya en ese sistema —PageHeader de 56 px,
  KPIs de 112–140 px y toolbar de una fila—; sin #89 la rama compacta las
  pantallas pero las alturas del sistema quedan como en main. El integrador debe
  integrar #89 antes o junto con #95.
- `blocks-antes.json` / `blocks-despues.json`: altura y posición de cada bloque
  directo de la sección a 1440×900 y 390×844, en claro y oscuro.

## Antes/después resumido (1440×900, claro)

| Pantalla | Antes | Después | Qué se movió |
| --- | --- | --- | --- |
| **Finanzas** | Salarios @1172 (bajo el pliegue) | **Salarios @365**, junto a los KPIs | La franja `Salarios` sube antes de Cuentas/Transferencias; cuentas sin `min-h-200` (tarjetas ~150 px), valores secundarios en una línea con tooltip. |
| **Mora** | lista @747; header 121 | **lista @653**; header 56 + toolbar 42 | Header en una fila (título + actualizado); la toolbar de filtros queda en su fila compacta (#89) para no recortar el título; KPIs de cobranza 110/150. |
| **Previsión** | primer dato @511 | **primer dato @287** | Mes y horizonte pasan al header (una fila); la nota de alcance va al subtítulo con tooltip; se retira la caja de toolbar. |
| **Informes** | informe @1001 | **comparativa @515**, resumen @823 | Mes, histórico y moneda viven en el header; «Período y moneda» se retira; exportar es una franja de 58 px; «Visitantes en vivo» cierra la pantalla. |
| **Comisiones** | Liquidación @543; lista @814 | **Liquidación @453; lista @704** | Headers de panel en una línea (descripción con tooltip) y KPIs compactos. |

En mobile (390×844) no se quita nada: los controles del header se apilan cuando
no entran, conservan targets ≥44 px y las tabs del shell mantienen su scroll.

## Capturas

- Finanzas: `finanzas-{antes,despues}-{1440x900,390x844}-{light,dark}.jpg`
- Mora: `mora-…` · Previsión: `prevision-…` · Informes: `informes-…` · Comisiones: `comisiones-…`

## Cómo reproducir

```sh
# antes: main
git checkout origin/main && npx next build
node build-tools/visual-harness/e2e-fin-stack.mjs &
QA_LABEL=antes node build-tools/visual-harness/capture-compact-fin.mjs

# después: rama + #89
git checkout SOS-FIN && npx next build        # (con #89 integrado en el árbol)
node build-tools/visual-harness/e2e-fin-stack.mjs &
QA_LABEL=despues node build-tools/visual-harness/capture-compact-fin.mjs

npm run test:release-regression
```

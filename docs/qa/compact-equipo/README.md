# Equipo compacto (#92) — evidencia

_2026-09-29 · rama `SOS-PLT` sobre `origin/main` v1.0.146 · capturas 1440×900 y
390×844 en claro/oscuro (`node build-tools/visual-harness/capture-compact-equipo.mjs`
contra el stack local de QA)._

## Antes → después (medido)

| Métrica (1440×900) | Antes | Después |
| --- | --- | --- |
| Franja de facturación (`barTop`) | 440 px | **266 px** |
| Primera persona del directorio (`cardTop`) | 537 px | **370 px** |
| Tarjetas completas visibles sin scroll | 0 | **4** |
| Toolbar | dos filas + etiqueta visible + 20 px de margen legado | **una fila** (≥1280), `gap` 12, etiqueta accesible oculta |
| «Facturación contratada» sin contratos | card azul de ancho completo (3 líneas) | **chip** con la explicación en el tooltip |
| «Facturación contratada» con contratos | — | **Kpi** compartido (~110 px) en la misma franja |
| Grilla del directorio | barra de lote como celda de tarjeta (438 px) | barra fuera de la cuadrícula (50 px) |

En mobile (390×844): la primera persona pasa de 1304 px a **702 px**; el buscador
ocupa su fila, los filtros/contador/vista comparten la siguiente y los targets
mantienen 44 px (`ui-system.css`).

## Archivos de la evidencia

- `equipo-{antes,despues}-{1440,390}-{light,dark}.jpg`: pantalla completa.
- `facturacion-{antes,despues}-*`: recorte de la franja de facturación.
- `facturacion-despues-con-contratos-*`: estado con contratos (Kpi con montos).
- `barra-{antes,despues}-*`: recorte de la barra de controles.
- `metricas-*.json`: mediciones crudas de cada corrida.

## Cambios

- `app/operations.tsx`: la sección no repite el título del shell (nombre
  accesible en `aria-label`); franja de facturación con `Kpi`/`StateChip`;
  toolbar con etiqueta oculta, una fila desde 1280 px; barra de lote fuera de la
  cuadrícula; estado del centro de control honesto (calculando → sin contratos →
  no disponible).
- `app/operations.css`: barra compacta (gap 12, una fila, mobile con búsqueda en
  su fila), franja de facturación y montos con `tabular-nums`.
- `app/qa-fixes.css`: se retiró `.team-search{max-width:440px;margin:0 0 20px}`
  (regla legada que agregaba 20 px a la barra).
- `tests/team-toolbar-density.test.ts`: contratos de la barra compacta, la
  franja de facturación y la barra de lote.

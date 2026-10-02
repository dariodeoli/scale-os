# Auditoría COM — Clientes y Pipeline (#140)

Evidencia del pase de la auditoría del dueño (02-10): estado vacío «Sin
contratos» accionable, acciones de Clientes consolidadas en el menú ⋯ y tablero
de Pipeline con indicador de columnas ocultas y tarjetas cortas.

## Método

- Stack local real de COM (`build-tools/visual-harness/e2e-com-stack.mjs`):
  Postgres temporal, API (`backend/server.js`), demo privada
  (`/api/demo/start`) y front `next start` detrás de un proxy de un solo origen.
- Capturas con Chrome headless (CDP) en **1440×900** y **390×844**, tema claro y
  oscuro, con el mismo script para las dos fases:
  `node build-tools/visual-harness/capture-com-140.mjs antes|despues`.
- `antes` = `origin/main` v1.0.162 sin los cambios; `despues` = rama `SOS-COM`
  con el pase. Las medidas crudas quedan en `medidas-antes.json` /
  `medidas-despues.json`.

## Resultado por punto del issue

**A) Clientes**

| Punto | Antes | Después |
|---|---|---|
| Acciones por fila (1440) | Abrir · **Archivar** (texto) · Editar · Papelera sueltos | Abrir · **⋯** (Editar / Archivar / Mover a la papelera) |
| Acciones por tarjeta (390) | Abrir · Archivar · Editar · Papelera sueltos | Abrir · **⋯** |
| Estado «Sin contratos» | chip solo | chip + **«Ver los 9 sin plan»** (filtra contrato vigente) |

El CTA de «Cargar plan» se mantiene visible cuando falta precio: es el trabajo
pendiente de la fila, no una acción secundaria.

**B) Pipeline**

| Punto | Antes | Después |
|---|---|---|
| Indicador de columnas ocultas | — | «1 etapa fuera de vista · Mostrando etapas 1–5 de 6» (1440); «4 etapas fuera de vista · 1–2 de 6» (390) con flechas anterior/siguiente |
| Alto de tarjeta (1440 / 390) | 215 px / 259 px | **169 px / 213 px** |
| Descripción en la tarjeta | «Dato de QA (ronda 6).» visible | sale de la tarjeta (queda en el detalle) |
| Acción rápida | botón de texto «Ver oportunidad» | icono ojo con nombre accesible |

## Archivos

- `antes-pipeline-tablero-{1440,390}-{light,dark}.jpg`
- `antes-clientes-directorio-{1440,390}-{light,dark}.jpg`
- `despues-pipeline-tablero-{1440,390}-{light,dark}.jpg`
- `despues-clientes-directorio-{1440,390}-{light,dark}.jpg`
- `despues-clientes-menu-{1440,390}-{light,dark}.jpg` (el ⋯ abierto sobre fila y tarjeta)
- `medidas-{antes,despues}.json`

## Notas

- **#138 (patrón común de tarjetas + ⋯) sigue abierto**: se adoptó el
  `MenuDesplegable` de `owncoding-ui` v0.59.0 y el pase queda listo para
  rebasar cuando DSN publique el patrón (portal/popover). El ajuste local de
  recorte (`.client-record-actions` sin overflow propio y `overflow-x-visible`
  en el `ListGrid` de Clientes, que sólo se monta cuando entra completo) se
  retira con ese patrón.
- El disparador del ⋯ lleva texto oculto con el nombre del registro: la
  librería no rotula el botón y quedaría sin nombre para lectores de pantalla.

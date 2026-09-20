# Baseline visual de diseño — SOS-DSN (issue #16)

Primera pasada del slot de diseño: **harness de verificación visual** con el CSS
real y Chrome headless, **baseline medido en todas las secciones** y **informe
priorizado** con evidencia. En esta pasada no se arreglan archivos de dominio:
cada hallazgo queda con dueño sugerido (COM/OPS/FIN/PLT/integrador) y su fix.

Corrida final: 75 fixtures × 7 anchos (360/390/430/768/1024/1440/1920), Chrome
153 headless, CSS construido (24 chunks). Resultado: **381 hallazgos únicos
agrupados (192 altas, 187 medias, 2 informativas)**; el listado exhaustivo con
selector exacto está en `work/visual-harness/final/baseline.md` y las mediciones
crudas en `work/visual-harness/final/results.json`.

## Harness reusable

- `build-tools/visual-harness/README.md` — qué mide, cómo corre, límites.
- `build-tools/visual-harness/FIXTURES.md` — cómo agregar o refrescar un fixture.
- `build-tools/visual-harness/{run.mjs,measure.js,report.mjs,chrome.mjs,probe.mjs}`.
- Fixtures: `build-tools/visual-harness/fixtures/*.mjs` (uno por archivo/sección).

Reproducir:

```bash
npx next build                         # el harness usa los chunks CSS construidos
node build-tools/visual-harness/run.mjs
node build-tools/visual-harness/run.mjs --only clientes-lista --widths 390,1440
node build-tools/visual-harness/probe.mjs 390 "document.documentElement.scrollWidth"
```

## Metodología

Medición geométrica (sin capturas ni visión): Chrome headless vía CDP emula cada
ancho con `Emulation.setDeviceMetricsOverride` (mobile real < 768) y evalúa
`measure.js` sobre fixtures que espejan el JSX vigente con datos de estrés.

| Contrato (AGENTS.md) | Medición | Tipo de hallazgo |
|---|---|---|
| Sin overflow horizontal | `scrollWidth > clientWidth` | `overflow-documento` |
| Nada se sale de su tarjeta/panel | rects fuera del borde de tarjeta | `bleed`, `bleed-clip`, `bleed-tarjeta` |
| Nada decorativo agranda el scroll | `::before/::after` que suman `scrollWidth` | `pseudo-overflow` |
| Textos cortados con salida | ellipsis/clip/line-clamp sin `title` | `texto-cortado` |
| Sin superposiciones | intersección real de rects visibles | `superposicion` |
| Fila de lista 44–52 px | alto de filas declaradas | `altura-fila` |
| Cuadrícula ≥ 200 px | alto de tarjetas | `tarjeta-baja` |
| Encabezado ≡ filas | misma variable `--<vista>-cols` y celdas ±2.5 px | `plantilla-encabezado-fila`, `desalineacion-celdas` |
| Columnas que no colapsan | celda < 14 px con encabezado visible | `columna-colapsada` |
| Plantillas sin `auto` | columna `auto` se dimensiona por contenido | `plantilla-auto` |

Los fixtures `kind:external` miden el documento real (landing `public/scale-os.html`).
Los `kind:workspace` usan el shell real (sidebar + `.content` + topbar).

## Resumen por sección

| Sección | Altas | Medias | Info | Total |
|---------|-------|--------|------|-------|
| Equipo | 62 | 20 | 0 | 82 |
| Inventario | 30 | 17 | 0 | 47 |
| Previsión | 11 | 35 | 0 | 46 |
| Finanzas | 13 | 32 | 0 | 45 |
| Clientes | 19 | 7 | 0 | 26 |
| Estudio | 16 | 9 | 0 | 25 |
| Invitaciones | 4 | 15 | 0 | 19 |
| Mora | 2 | 14 | 0 | 16 |
| Superadmin | 2 | 8 | 0 | 10 |
| Sistema de diseño | 5 | 4 | 0 | 9 |
| Historial de trabajo | 0 | 9 | 0 | 9 |
| Producción | 5 | 3 | 0 | 8 |
| Configuración | 1 | 5 | 0 | 6 |
| Papelera | 1 | 5 | 0 | 6 |
| Proyectos | 5 | 1 | 0 | 6 |
| Landing | 3 | 0 | 2 | 5 |
| Resumen | 5 | 0 | 0 | 5 |
| Informes | 4 | 0 | 0 | 4 |
| Acceso | 2 | 0 | 0 | 2 |
| Shell | 2 | 0 | 0 | 2 |
| Actividad | 0 | 2 | 0 | 2 |
| Estado | 0 | 1 | 0 | 1 |

## Hallazgos priorizados (causa raíz consolidada)

Cada fila agrupa decenas de ocurrencias por fila/ancho que comparten la misma
causa medidas en el mismo fixture; la medición citada es la peor observada.
Repro: `node build-tools/visual-harness/run.mjs --only <fixture> --widths <anchos>`.

| # | Sev. | Sección (fixture) | Anchos | Medición (evidencia) | Causa medida | Fix propuesto | Slot |
|---|------|--------------------|--------|----------------------|--------------|----------------|------|
| 1 | alta | Equipo (`equipo-lista`) | 1024–1920 | 105 bleed-tarjeta hasta **481,5 px** y 51 solapes (100 %); filas de **280,5 px** con plantilla usada `180px 0px 88px 120px 140px 176px` mientras el encabezado usa las 6 pistas de `--person-cols` (≈1094 px); Δceldas "Acceso" 184,4 px | `.control-shell .ops-grid` (0,2,0) aplica `repeat(auto-fill,minmax(min(100%,250px),1fr))` y pisa `.ops-grid-list` (0,1,0), que es la lista | Subir especificidad de `.ops-grid-list` (p. ej. `.control-shell .ops-grid.ops-grid-list`) y reafirmar `grid-template-columns:minmax(0,1fr)` + `--person-cols` en la fila | PLT |
| 2 | alta | Clientes (`clientes-cuadricula`) | 360–430 | `dl.client-hub-facts > div` **89,2 px** fuera de la tarjeta (390 px de contenido en 358 px) y documento **+72 px** | La grilla de facts resuelve una pista de 387 px dentro de la tarjeta: `dd` con email largo + `grid-template-columns:1fr` (mín. automático) sin `min-width:0` | `grid-template-columns:minmax(0,1fr)` en el breakpoint ≤480, `min-width:0`/`overflow-wrap:anywhere` en `dd` | COM |
| 3 | alta | Inventario (`inventario-equipos-lista`) | 360–430 | Toolbar del panel: title-block, acciones, meta y controles **84,5 px** fuera del panel; documento **+68 px** | `.inventory-toolbar` no colapsa a una columna bajo 430 px; hijos con min-content > panel | Apilar el toolbar (grid 1 col) y `min-width:0` en cada bloque | OPS |
| 4 | alta | Inventario (`inventario-equipos-cuadricula`) | 360–430 | `dl.inventory-facts-inline` **563,6 px** dentro de tarjeta de 358 px (**+215 px** de documento) y `span.serial-text` 23–37 px fuera de su `dd` | Hechos en grilla anidada con pista por contenido (`1fr` con mínimo automático) | `minmax(0,1fr)` + `min-width:0` y recorte del serial con `title`/cola visible | OPS |
| 5 | alta | Inventario (`inventario-reservas-lista`) | 360–768 | Fila de **3084 px** con columnas `0px 290px`; título a 0 px (una letra por línea); solape 67 % entre estado y proyecto; documento +185 px | Plantilla `minmax(0,1fr) auto` con la columna `auto` (acciones) comiéndose la identidad en mobile | En ≤960 usar stack de tarjeta acotada (no plantilla de fila) o `minmax(0,1fr)` para identidad y acciones en segunda línea | OPS |
| 6 | alta | Proyectos (`proyectos-lista`) | 360–430 | `span.client-identity` **129,4 px** fuera de la fila; documento **+112 px**; `assigned-people` recorta 13,3 px | `.project-entry-title`/identidad sin `min-width:0` ni ellipsis; nombre largo empuja la fila | `min-width:0` + ellipsis con `title` en la identidad; contener la grilla de la fila | OPS |
| 7 | alta | Producción (`produccion-tablero`) | 360–1920 | Identidad de cliente **87–220,9 px** fuera de `.work-card` (`.identity-name` 403 px) | `.work-card p`/identidad sin recorte ni `min-width:0`; el kanban no contiene el bleed | `min-width:0` + ellipsis con `title` en la identidad de la tarjeta | OPS |
| 8 | alta | Previsión (`prevision-contratos`) | 768 | Encabezado `.contracted-clients-head` visible bajo el breakpoint: 6 solapes (hasta 23 %) y filas de **104,7 px**; bleed 15 px del `panel-heading` | La tabla muestra su encabezado de columnas por debajo de ~861 px cuando la fila ya es tarjeta; `--contracted-cols` con `auto` (Δ21,5/31,5 px) | Ocultar el head en el mismo breakpoint en que la fila se apila y fijar la columna de acciones | FIN |
| 9 | alta | Finanzas (`finanzas-movimientos`) | 360–1440 | `small` recorta el `actor-identity` **128,9–256,6 px**; textos de movimiento cortados (638 px en 184 px); filas de **94–237 px** | `.payment-row small` con ellipsis + `nowrap` sobre contenido que el contrato pide completo; `--finance-cols` con `auto` | Identidad de actor sin clip (o con `title` + segunda línea), montos/fechas con ancho reservado y plantilla fija | FIN |
| 10 | alta | Estudio (`estudio-reservas-lista`) | 1024–1920 | Filas de **161–222,3 px**; `.studio-members` 101,6 px; bleed 130 px de acciones/notas @1024; Δceldas 5–6 px | La fila de estudio no entra con 3 responsables largos y notas; el layout apila dentro de la fila | Ajustar `--studio-cols` a los responsables reales o permitir fila de 2 líneas controlada (sin bleed) | OPS |
| 11 | alta | Resumen (`resumen-indicadores`) | 360 | 6 montos salen **7,4–13,4 px** de su `.financial-stat` | `.financial-amounts strong` con `nowrap` sin overflow/mínimo en tarjetas de 1 columna a 360 | `min-width:0` + tamaño tipográfico fluido o wrap controlado del monto en mobile | COM |
| 12 | alta | Acceso (`auth-invitacion`) | 360–1920 | Píldora de estado pisa el vencimiento **4 px** (196–437 px²) | `.invite-expiration{margin-top:-4px}` contra `.invite-link-status` de 31 px | Quitar el margen negativo (o `margin-bottom` en el estado) | PLT |
| 13 | alta | Shell (`shell-topbar`) | 360–430 | `.company-name` (188 px en 418 px) se solapa 70 % con el ThemeToggle; 1.360 px² | Trigger de empresa sin `min-width:0`/ellipsis que reserve el ancho de utilidades | `min-width:0` + ellipsis con `title` en el botón de empresa y gap en utilidades | PLT |
| 14 | alta | Superadmin (`superadmin-accesos`) | 768–1920 | Encabezado grid vs filas `rowTemplate: none`; filas **64–104,3 px** | `.platform-admin-list` usa grid para el head y flex para las filas (dos plantillas) | Una sola plantilla `--platform-admin-cols` compartida + fila fina | PLT |
| 15 | alta | Informes (`informes-indicadores`) | 1440 | Tile "Facturado" (`h3/strong/p`) **4,5 px** fuera; documento **+4 px** | `.reports-tiles` con ancho por contenido en la 5.ª tarjeta de una fila de 4 | `minmax(0,1fr)`/`min-width:0` en tiles y montos con tabular-nums | FIN |
| 16 | alta | Landing (`landing`, documento real) | 360–430 | Documento **+188 px** de scroll horizontal; `hero::before` de 736×736 en x 180–916 (`right:-10rem`) | Glow decorativo del hero sin recorte en un ancestro | `overflow:clip` en `.hero` (o contenedor del glow) | Integrador |
| 17 | alta | Landing (`landing`) | 360–1920 | `.span` del título pisa la descripción **4 px** (944 px², 7 %) | `h1{line-height:1.05}` con span interno de 50 px de caja | Ajustar line-height del span o del bloque del título | Integrador |
| 18 | alta | Clientes (`clientes-lista`) | 768, 1024 | Input del buscador de **26×40 px** contra select de 210×40 (65 %); ViewToggle vs "Guía del panel" 40 %; h1 vs search 30–46 % @1024 | Toolbar de 6 columnas con `minmax(220px,1fr)` + summary `nowrap` que no entran entre 761 y ~1100 | Colapsar la toolbar a 2–3 columnas en ese rango (ya existe el corte ≤960 en otros bloques) y permitir shrink del summary | COM |
| 19 | alta | Producción (`produccion-tablero`) | 360–430 | Filtros/restablecer vs "Ver proyectos": 3 solapes (27–53 %, hasta 1.982 px²) | `.production-filters` en `display:contents` deja hijos de 44–85 px dentro de un contenedor de 44 px | Reflow del toolbar de producción en mobile (fila propia para "Ver proyectos") | OPS |
| 20 | alta | Sistema de diseño (`primitivas-dialogo-drawer`) | 360–390 | Filas de **61,6 px**; `b` de 486 px en 318 px sin `title` | `.drawer-list` (`--drawer-cols: minmax(0,1fr) auto`) y textos de fila sin salida | Plantilla con ancho fijo para el dato y `title`/wrap en el texto | OPS (drawer) / DSN (diálogo) |
| 21 | media | Configuración (`configuracion-empresa`) | 360–1920 | `plantilla-auto` `minmax(0,1fr) auto`; "Estado" head 666,5 px vs fila 613,8 px (Δ52,8); filas 64,7–83,1 px | Columna `auto` por contenido + fila con metadatos apilados | Ancho fijo para estado y fila finita de una línea | PLT |
| 22 | media | Papelera (`papelera`) | 768–1920 | Filas **93–133,2 px**; Δ"Registro" 9,1 px; plantilla `auto auto minmax(0,1fr) auto` | Sellos de actor y metadatos en bloque dentro de la fila | Fila finita: actor/fecha en línea muted, columnas fijas | PLT |
| 23 | media | Invitaciones (`equipo-invitaciones-*`) | 768–1920 | Filas **67–238 px**; head `minmax(0,1fr) auto` vs fila `minmax(0,1fr)` a ≤430; `auto` en ambas listas | Filas con varias líneas de metadatos y encabezado sin la misma plantilla en mobile | Fila finita + misma plantilla en head y fila (o head oculto si se apila) | PLT |
| 24 | media | Historial / Actividad (`equipo-historial`, `equipo-actividad-feed`) | 768–1920 | Filas **64,4–400,9 px** (historial @768) y 64,4–96,4 px (feed) | Listas de actividad con actor + nota en bloque | Contrato de fila finita con detalle en línea muted o `title` | PLT |
| 25 | media | Finanzas / Previsión / Mora / Invitaciones / Papelera / Configuración / Sistema de diseño | 360–1920 | 12 listas con `auto` en su plantilla (`--finance-cols` ×3, `--planned-cols`, `--contracted-cols`, `--forecast-person-cols`, `--mora-cols`, `--invite-cols` ×2, `--trash-cols`, `--settings-cols`, `--drawer-cols`) | La columna `auto` se dimensiona por el contenido de cada fila y desalinea el encabezado (Δ4–52,8 px medidos) | Reemplazar `auto` por ancho fijo (`rem`) o `minmax(0,Nfr)` en la variable compartida | FIN / PLT |
| 26 | media | Clientes (`clientes-lista`) | 360–1920 | Filas **94 px** (desktop) y **110 px** (mobile); `"Cliente desde"` cortado 74 px en 3 px; cartera `client-hub-stats` 347 px en 104 px sin title propio | La celda de acciones en grilla 2×2 y la cartera con `nowrap` definen el alto; el `title` de la cartera quedó en el nodo interno | Fila finita (una línea), cartera truncada con `title` en el nodo que recorta y fecha con `title` | COM |
| 27 | media | Equipo (`equipo-lista`) | 360–430 | `dt` "Correo" recortado (40 px en 26 px) y `person-hub-facts` apilado | En mobile la fila se apila y el `dt` queda en columna estrecha | Ocultar `dt` como en la fila de escritorio o reservar su ancho | PLT |
| 28 | media | Sistema de diseño (`primitivas-capsulas`) | 768 | Monto de `.kpi-amounts` **21 px** fuera de `.kpi-card.tone-blue` ("Gs 123.456.789 / mes") | `.kpi-card .kpi-amounts span{white-space:nowrap}` sin overflow en strip de 4 columnas a 768 | Permitir wrap del monto o reducir tipografía en ese ancho | COM/FIN (control-center.css) |
| 29 | media | Estado (`status-page`) | 360–430 | Contenido de `.status-shell` recortado en vertical (360 px de caja) | La página no crece con el contenido en mobile (altura/clip) | Revisar alto mínimo/scroll del shell | PLT |
| 30 | info | Landing (`landing`) | 360–1440 | Glows `feature::after` y `price-card::after` (416/384 px) fuera de su caja pero **recortados** por su contenedor (`contributes=false`) | Decoración recortada; no agranda el scroll | Sin acción (queda documentado como decorativo) | — |

## Dispatch por slot

| Slot | Hallazgos únicos | Foco |
|------|------------------|------|
| SOS-PLT | Equipo 82, Invitaciones 19, Superadmin 10, Historial 9, Configuración 6, Papelera 6, Shell 2, Actividad 2, Acceso 2, Estado 1 | Plantilla partida de Equipo, filas de listas secundarias, topbar, invitación, superadmin |
| SOS-OPS | Inventario 47, Estudio 25, Producción 8, Proyectos 6 | Bleed de toolbar/cuadrícula de inventario, reservas en mobile, reservas de estudio, work-cards de producción, fila de proyectos |
| SOS-FIN | Previsión 46 (con COM en `control-center.css`), Finanzas 45, Mora 16, Informes 4 | Contratos @768, movimientos/pagos, plantillas `auto`, tile de informes |
| SOS-COM | Clientes 26, Resumen 5 | Cuadrícula ≤430, toolbar saturada 761–1100, fila de lista, KPI @360 |
| SOS-DSN | Sistema de diseño 9 | Diálogo/drawer y plantillas de primitivas; el resto se coordina con el slot del componente |
| Integrador | Landing 5 | Glow del hero (scroll horizontal) y line-height del título |

## Cobertura y límites

- 75 fixtures × 7 anchos. **43 de 75 quedaron sin ningún hallazgo**, entre ellos:
  portal del cliente completo (ingreso, entregas, detalle, invitación,
  recuperación), pipeline y visitantes, métricas, planes, preferencias y mi
  perfil, permisos, uso del panel, campos del Editor (texto y moneda), diálogo,
  botones, formatos de lista, identidad y asignaciones, cuadrícula de proyectos,
  presupuestos, calendario de inventario, espacios de estudio, cuentas de
  finanzas, proyección de previsión, tablas de informes, notificaciones/toasts,
  sidebar colapsada/menú mobile/footer, registro y accesos, agencias y auditoría
  de superadmin, y vencimientos del resumen.
- Los fixtures espejan el JSX vigente en `main` (refrescados tras la integración
  de las rondas COM/OPS/FIN/PLT); un hallazgo siempre se confirma contra el
  componente fuente antes de arreglarlo.
- Sin capturas ni comparación pixel-perfect: es geometría (overflow, rects,
  alturas, plantillas). No cubre color, contraste ni tema oscuro.
- `clientWidth` excluye la barra de scroll clásica en desktop; en mobile la
  emulación es real (sin barra). Diferencias de ~15 px en desktop son esperables.
- El fixture `platformAccessFixture` no se registra: `panels/platform-access.css`
  no entra al bundle construido (0 de 24 chunks) porque `PlatformAccessPanel`
  no tiene caller; se reporta en el informe pero no se mide.

## Cambios entregados en esta pasada

1. Harness CDP completo y documentado (sin dependencias nuevas).
2. 75 fixtures de todas las superficies con datos de estrés.
3. `PersonContainer` expone `title` en nombre/secundario truncados (coincide con
   el fix que ya venía en `main` por la ronda PLT).
4. `DESIGN-BASELINE-VISUAL.md` (este informe) + artefactos en `work/visual-harness/final/`.

Sin cambios de API. Los fixes de dominio se despachan a cada slot según la tabla.

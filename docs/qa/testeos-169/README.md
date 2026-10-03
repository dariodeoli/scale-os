# Testeos COM — campaña #154 (v1.0.169)

Alcance de la vertical Comercial: clientes (alta/ficha/empty states), pipeline
(dnd/columnas), presupuestos (compositor/consulta/enlace público), planes,
métricas y búsqueda global.

## Método

1. **e2e de contratos** contra un stack local con `main` v1.0.169 (Postgres
   temporal + API real + demo sembrada + front): `e2e-com-qa.mjs` (31 checks) y
   `qa-com-ola2.mjs` (móvil/a11y/modales).
2. **Recorrido en producción** (`app.scaleparaguay.com`, v1.0.169) con sesión
   demo real: 1440×900 y 390×844, claro y oscuro, con casos borde (búsqueda sin
   resultados, alta vacía, enlace público con vigencia, columnas ocultas).

## Comandos

```sh
# Stack local (puertos libres; la sesión queda en work/visual-harness/com-qa-session-169.txt)
PG_DIR=/tmp/mobos-e2e-pg-MOS-COM-169 PG_PORT=<libre> API_PORT=<libre> \
  FRONT_PORT=<libre> PROXY_PORT=<libre> QA_SESSION=com-qa-session-169.txt \
  node build-tools/visual-harness/e2e-com-stack.mjs

# Contratos COM (QA OK con la ventana, el buscador y el dnd)
QA_SESSION=com-qa-session-169.txt PG_PORT=<libre> node build-tools/visual-harness/e2e-com-qa.mjs

# Móvil/a11y (informe en local/ola2-informe.json)
node build-tools/visual-harness/qa-com-ola2.mjs

# Producción (sesión demo en work/visual-harness/prod-169-session.txt)
node build-tools/visual-harness/capture-com-169.mjs
```

## Resultados

- **e2e COM: 31/31 ✅** — KPIs contra API, dnd mouse/touch con verdad en
  Postgres, compositor + persistencia del orden de ítems, ventana de montaje
  (tramo visible + resto en espaciadores; el scroll monta el resto), búsqueda
  global (clientes del catálogo y órdenes dentro de la ventana), móvil 360/390/
  430 sin overflow y consola sin errores. Log: `local/e2e-com-169.log`.
- **Ola2 móvil/a11y: sin overflow** en 24 mediciones de sección; modales con
  scroll/foco correctos; formulario inválido bloqueado («Completá empresa o
  prospecto»); búsqueda sin resultados con reset; consola sin errores.
  Informe: `local/ola2-informe.json`.
- **Producción: 64 capturas** (`prod/*.jpg`) + `medidas-prod.json`: clientes
  directorio/vacío/alta/ficha, pipeline tablero + dnd real (Lead→Contactado),
  presupuestos lista/consulta/condiciones del enlace/compositor/opciones,
  planes, métricas y búsqueda global ⌘K con resultados. Sin overflow en 390.

## Hallazgos y fixes

1. **[Alto · corregido] La ventana de montaje desbordaba la lista (#135 P4;
   afecta Clientes y Presupuestos).** Cuando el `rowgroup` quedaba fuera del
   viewport (`altoVista = 0`), la ventana desmontaba todas las filas; el
   espaciador pasaba a ser la primera `[role="row"]` y su altura (miles de px)
   se medía como alto de fila. Resultado: 21.513 px de scroll para 21
   presupuestos (≈1.000 reales) hasta que el usuario scrolleaba. Fix pure en
   `ventanaFilas` (`app/list-window.ts`): nunca desmonta con `altoVista <= 0`,
   mide solo filas reales (`:not([aria-hidden="true"])`), garantiza al menos una
   fila y no cambia el tramo sin diferencia. Test: `tests/list-window.test.ts`.
   Evidencia: `probe-com-169-list.mjs` / `probe-com-169-rowheight.mjs`
   (espaciador 20.900 → 98 px; scroll 21.513 → 1.543). **Producción v1.0.169
   todavía lo tiene** hasta integrar la rama.
2. **[Medio · corregido en harness] e2e COM desactualizado contra el shell
   v1.0.168/169.** La carga se verificaba por texto «Pipeline» (el nav ahora
   agrupa Flujo/Recursos/Finanzas), el buscador leía el `[role=status]` del
   buscador viejo (hoy es la paleta ⌘K) y la lista esperaba una fila por
   presupuesto (hoy monta por ventana). Ajustado en `e2e-com-qa.mjs`; también
   `qa-com-ola2.mjs` (en móvil el riel no está en el DOM).
3. **[Nota] La demo bloquea compartir el enlace público** (403 por diseño,
   «El Demo no comparte datos públicamente…»). Se capturan las condiciones
   (alcance/vencimiento/revocación) y el aviso real; la habilitación queda para
   un entorno no-demo.
4. **[Nota de entorno] `owncoding-ui` local estaba en 0.59.0** y v1.0.169 fija
   `v0.61.0`: con la instalación vieja fallaban `footer:check` y el test del
   pie. `npm ci` corrige; con 0.61.0 la regresión completa queda verde.

## Archivos

- `local/e2e-com-169.log` — e2e de contratos COM (QA OK).
- `local/ola2-informe.json` — barrido móvil/tablet/a11y.
- `prod/*.jpg` — capturas 1440/390 claro-oscuro de la recorrida en producción.
- `medidas-prod.json` — medidas crudas (columnas, dnd, ventana, búsqueda, overflow).

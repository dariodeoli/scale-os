# Tanda owncoding-ui v0.51.0 (§15) — auditoría FIN (#87)

Auditoría de las **11 reglas transversales** (`docs/REGLAS.md` §15 de
owncoding-ui v0.51.0) sobre las pantallas del dominio **SOS-FIN**: Finanzas
(`/pagos`), Cobranza y mora (`/pagos/mora`), Previsión financiera
(`/pagos/prevision`), Informes (`/informes`) y Comisiones
(`/equipo/comisiones`).

- Rama `SOS-FIN` sobre `origin/main` (`bd5517e`, v1.0.144).
- La app fija `owncoding-ui` en **v0.39.0**; la fundación de la dependencia a
  v0.51.0 es **#82 (DSN)** y no se duplica acá. Lo que ya existe en v0.39.0 se
  adoptó en esta rama.
- Evidencia: capturas de datos (`<pantalla>-<ancho>-<tema>.jpg`), capturas de
  los estados de error (`<pantalla>-error-<ancho>-light.jpg` con la API
  simulada caída), los chequeos del harness (`qa.txt`/`qa.json`) y los
  contratos de `tests/tanda51-fin.test.ts`.

## Tabla regla → estado → evidencia → corrección/pendiente

| # | Regla | Estado | Evidencia | Corrección / pendiente |
| --- | --- | --- | --- | --- |
| 1 | Cero éxito falso | Corregido lo localizado | `tests/tanda51-fin.test.ts`; `*-error-*` | **Corregido**: los egresos de Comisiones no se vacían en silencio (error + reintento); los catálogos de diálogos avisan y reintentan; un fallo de carga no se disfraza de sección vacía; el período anterior de Informes dice que falló (no «no hay datos») y ofrece reintento; el DSO de Mora dice «No se pudo calcular» (no «Sin datos»); el histórico de facturas/cobros avisa si falla; el transporte traduce «Failed to fetch»/timeout a es-PY. |
| 2 | Paridad demo | Cumple | Capturas (sesión demo, toolbar `Demo`); el stack usa `/api/demo/start` con seeds reales | Las cinco pantallas corren en la demo con los mismos componentes, permisos y flujos: no hay ramas `demo` en el JSX de FIN. Sin cambios. |
| 3 | Cuatro estados por pantalla | Corregido lo localizado | `tests/tanda51-fin.test.ts`; fixtures de vacío del harness (`finanzas-vacio`, `informes-vacio`, `prevision-vacio`, `comisiones-vacio` en `build-tools/visual-harness/fixtures/finanzas-mora-prevision-informes.mjs`) | **Corregido**: Mora suma carga (`LoadingBlock`), error con reintento (`ErrorBlock onRetry`) y aviso de datos viejos; Comisiones suma carga/error/retry propios para egresos y catálogos. Finanzas, Previsión e Informes ya tenían las cuatro ramas. |
| 4 | Tres temas + toque 44 | Parcial (fuera de dominio) | `qa.txt` (targets ≥44 px en todas las pantallas y anchos); capturas claro/oscuro/móvil | Los controles de FIN llegan a 44 px en móvil (`ui-system.css` + overrides por pantalla). **Pendiente (DSN #82)**: el `ThemeToggle` alterna claro/oscuro pero falta el tema de **alto contraste**; los chips `slate` en oscuro miden 4.21:1 (<4.5) — deuda de tokens de chip ya presente antes de esta rama (misma medición en `work/visual-harness/qa-fin-adopcion/qa.txt`); el fix es de `StateChip`/`Badge` (DSN). |
| 5 | Una entidad, una fuente | Corregido | `tests/list-format.test.tsx`, `client-format.test.ts`, `mora-data.test.ts`, `tanda51-fin.test.ts` | **Corregido**: se retiraron `app/date-format.ts` y `app/due-status.ts` (copias de `fechaLista`/`fechaListaCorta`/`diasHasta`) y sus 8 consumidores usan los objetos de la librería o `app/list-format.tsx` (puente con el contrato de vacío de las celdas). `moneyKpi` ya no redondea por su cuenta: comparte `app/money-format.ts` con `money()` (KPI y tarjeta muestran el mismo importe). El DSO y los KPIs de cobranza se derivan solo de `app/mora-data.ts` (se borró la copia del shell); el día/mes de Asunción sale de `app/client-format.ts`. |
| 6 | Microcopy es-PY | Corregido lo localizado | `tests/tanda51-fin.test.ts`; capturas de error | **Corregido**: se quitó el bloque «Sin acciones» de Comisiones; los errores dicen qué pasó y qué hacer («Reintentá para ver…»); los avisos con botón usan `Aviso como="div"`; el transporte no muestra el error crudo del navegador («Failed to fetch» → «Sin conexión con el servidor. Revisá tu conexión y probá de nuevo.»). |
| 7 | Rutas canónicas | Cumple | `app/navigation.ts`; capturas por ruta | Las rutas de FIN viven en el registro único (`/pagos`, `/pagos/mora`, `/pagos/prevision`, `/informes`, `/equipo/comisiones`), con `legacyRoutes` que redirigen; sin slugs dinámicos duplicados. Sin cambios. |
| 8 | Búsqueda y atajos | Parcial (fuera de dominio) | `app/workspace-search.tsx` | **Pendiente (fundación/DSN)**: no hay ⌘/Ctrl+K global ni `AyudaModulo`; `PaletaComandos` llega con el bump de la dependencia. Las pantallas FIN usan la búsqueda compartida (`SearchField`) y sus filtros. |
| 9 | Dinero y sensibilidad | Corregido lo localizado | `tests/tanda51-fin.test.ts`; capturas; `qa.txt` | **Corregido**: cancelar comisión y revertir descuento (Comisiones) y quitar un plan o revertir un gasto real (Previsión) piden confirmación reforzada con `ConfirmDialog` (peligro) y explican el efecto; revertir un cobro conserva la palabra `REVERTIR`; las secciones están gateadas por `finance.view`/`commissions.manage` y el API revalida. **Pendiente (PLT #84)**: reautenticación de acciones sensibles y auditoría backend por acción; hoy la reversión de un cobro queda trazada en el propio registro (`reversal_id`/`reversal_reason`, visible en la lista). |
| 10 | Versión visible y novedades | Fuera de alcance (#82/#83) | — | El pie institucional y la campana son de DSN (#82/#83). El aviso de «versión nueva» (`hayVersionNueva`/`compararVersiones`) llega con la fundación; se reporta en el handover. |
| 11 | Rendimiento por defecto | Cumple con pendiente | `qa.txt` (llamadas por pantalla); `use-reports.ts`; ventanas de facturas/cobros | Secciones lazy (Previsión/Informes con `next/dynamic`), cobros/facturas con ventana + «Ver todas», series de Informes acotadas (6/12/24 meses) y DSO con una sola llamada a `/reports`. **Pendiente (fundación)**: virtualización de listas largas con `ventanaDeLista` (v0.48+) al actualizar la dependencia; hoy el API acota las listas. |

## Hallazgos de otros dominios (para reportar)

- **Chips en oscuro (DSN)**: `StateChip`/`Badge` `slate` miden 4.21:1 en oscuro
  (Finanzas: 3 chips; Comisiones: 4). Misma medición que antes de esta rama; el
  fix corresponde a los tokens de chip de la librería/DSN.
- **Alto contraste (DSN)**: el `ThemeToggle` no expone el tercer tema.
- **⌘/Ctrl+K y `AyudaModulo` (DSN/fundación)**: no existen en el shell.
- **Virtualización (fundación)**: `ventanaDeLista` requiere ≥v0.48.
- **`productivity-ui.tsx` (OPS)**: usaba un `localDay` propio; se reemplazó por
  `todayAsuncion` de `client-format` en esta rama (misma fuente). Sin más
  cambios de OPS.

## Cómo reproducir la evidencia

```sh
npx next build
node build-tools/visual-harness/e2e-fin-stack.mjs &          # demo con datos de estrés
node build-tools/visual-harness/capture-tanda51-fin.mjs      # datos (claro/oscuro/móvil)
node build-tools/visual-harness/capture-tanda51-fin-error.mjs # errores con API simulada caída
QA_LABEL=tanda51 node build-tools/visual-harness/qa-vertical-fin.mjs
npm run test:release-regression
```

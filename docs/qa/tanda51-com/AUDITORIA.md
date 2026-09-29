# Tanda owncoding-ui v0.51.0 — §15 transversales en Comercial

_Slot **SOS-COM** · issue **dariodeoli/scale-os#85** · 29-09-2026 · rama `SOS-COM`_

Alcance auditado: **Clientes · Pipeline (con Etapas) · Métricas · Presupuestos ·
Planes**, sobre la fuente única de la tanda (`owncoding-ui/docs/REGLAS.md` §15)
y el proceso de adopción con puentes (`docs/ADOPCION-V2.md`).

La dependencia del monorepo sigue en `owncoding-ui#v0.39.0`: el salto a v0.51.0
es la fundación de **#82 (SOS-DSN)**. Por eso cada regla indica qué objetos de
la v0.51 quedan pendientes de esa base y cuáles ya se resolvieron con lo
publicado (v0.39 ya trae `Aviso`, `EmptyState`, `ErrorState`, `Skeleton`,
`tonoVencimiento`, `diasHasta`, `formatoNumero`).

## Evidencia

- **Capturas** (claro/oscuro 1440 y mobile 390, más estados): `docs/qa/tanda51-com/`
  - `clientes-1440-light.jpg`, `clientes-390-dark.jpg`, … (5 pantallas × 2 anchos × 2 temas)
  - `clientes-error-light.jpg` — fallo de lectura: error **con reintento**, sin directorio inventado
  - `metricas-error-light.jpg` — fallo de métricas: error **con reintento**, sin totales inventados
  - `pipeline-etapas-warning-light.jpg` — etapas caídas: el tablero sigue y **avisa con reintento**
- **Script reproducible**: `build-tools/visual-harness/capture-com-tanda51.mjs`
  (stack local `e2e-com-stack.mjs`, sesión demo).
- **Tests que fijan lo corregido**: `tests/com-transversales.test.tsx`
  (nuevo, enganchado en `test:release-regression`), más
  `tests/pipeline-stages.test.tsx` y `tests/plan-comparison.test.tsx` portados
  al objeto real, y `tests/pipeline-summary.test.ts` / `tests/client-format.test.ts`.

## Tabla regla → estado → evidencia → corrección/pendiente

| # | Regla (§15) | Estado en COM | Evidencia | Corrección / pendiente |
| --- | --- | --- | --- | --- |
| 1 | **Cero éxito falso** | **Corregido** | Clientes nunca mostraba el fallo de la lista (`dataState==='error'` caía en «Todavía no hay clientes»); el lote de clientes no confirmaba ni reportaba parciales; la factura de un presupuesto se anunciaba con tono de error; las etapas del Pipeline se caían en silencio; las métricas fallaban solo con un toast efímero | `app/sections/clientes.tsx` (error con reintento + aviso de «última lista cargada»), `app/scale-workspace.tsx` `batchClients` (informa N de M, refresco caído y propaga el fallo), `app/suite.tsx` `BudgetActions` (resultado en `Aviso tono="ok"`), `app/sections/pipeline.tsx` (error real de la lista + aviso de etapas), `app/sections/metricas.tsx` (estado real de la lectura). Tests: `com-transversales.test.tsx` |
| 2 | **Paridad demo** | Cumple | Capturas hechas sobre la demo privada del stack local (`/api/demo/start`), mismos flujos y objetos; `app/live-visitors.tsx` mantiene su modo demo con datos ficticios rotulados | Sin cambios. La tanda no agregó features que puedan divergir en demo |
| 3 | **Cuatro estados por pantalla** | **Corregido** | Clientes: faltaba el error con reintento. Métricas: no distinguía cargando/vacío/error (mostraba el vacío durante la lectura y ante el fallo). Pipeline/Clientes/Presupuestos/Planes ya tenían los cuatro | `clientes.tsx` (```ErrorBlock``` + `LoadingBlock` + vacío con CTA), `metricas.tsx` (`state`/`error`/`onRetry` con `SectionLoading`/`ErrorBlock`/`EmptyCta` «Volver a consultar»), `scale-workspace.tsx` `loadMetrics`. Capturas: `clientes-error-light`, `metricas-error-light`. Pendiente menor: el vacío de Planes y Presupuestos ya tiene CTA; el detalle del error es genérico, no accionable en el 100 % de los casos |
| 4 | **Tres temas + toque 44** | **Parcial** | Claro y oscuro capturados en las 5 pantallas; targets de 44 px verificados en las listas (`select-check`, asa de arrastre `h-11 md:h-7`, `ListGridToggle` con `h-11 w-11 md:h-9 md:w-9`) | **Pendiente (DSN/#82)**: ScaleOS tiene **dos** temas (`data-theme` light/dark), no alto contraste; el control de tema y el contrato del shell son transversales (`app/theme-toggle.tsx`, `styles.css`). Reportado a DSN |
| 5 | **Una entidad, una fuente** | **Corregido** | Había **dos tableros de pipeline** (el real en `sections/pipeline.tsx` y `CatalogWorkspace` en `suite.tsx`, sin consumidores) con dos cálculos del ponderado; dos implementaciones del día de Asunción (`client-format.daysUntil` vs `utils/fecha.diasHasta`); dos del vencimiento (`due-status.hasDueWarning` vs `utils/fecha.tonoVencimiento`); el cliente pintaba «email» en inglés | Se retiró `CatalogWorkspace` (y su `StageManager`, `LeadCard`, `LeadColumn`) con su CSS muerto (`app/suite.css`, `app/pipeline-summary.css`); el ponderado vive en `weightedAmounts` (`app/pipeline-summary.ts`) y lo consumen columna y totales; `daysUntil`→`diasHasta`, `hasDueWarning`→`tonoVencimiento`; microcopy «Sin correo registrado». Tests: `com-transversales.test.tsx`, `pipeline-summary.test.ts`, `collaborator-access-compact.test.ts` |
| 6 | **Microcopy es-PY (voseo)** | **Corregido** | «Sin email registrado» (Clientes); el contador de visitantes caía sin decir qué hacer; el error del Pipeline no decía la causa | `clientes.tsx` («Sin correo registrado»), `live-visitors.tsx` («…Se reintenta solo cada 30 segundos; si no vuelve, recargá la página»), `pipeline.tsx` («<causa>: no se pudieron leer las etapas de esta empresa…») |
| 7 | **Rutas canónicas** | **Parcial** | `app/navigation.ts` es la fuente de secciones y `next.config.mjs` resuelve los slugs legacy (`/planes`→`/presupuestos/planes`); no hay slugs dinámicos duplicados en COM (la ficha del cliente es panel, no ruta) | **Pendiente (PLT/DSN)**: no existe un `rutas.js` con metadata (título, ícono, permisos) que unifique `navigation.ts` + `workspace-access.ts` + redirects; la compatibilidad ya redirige y la pantalla no se monta dos veces |
| 8 | **Búsqueda y atajos** | **Pendiente** | Existe un buscador del workspace (`app/workspace-search.tsx`, búsqueda por cliente/proyecto/orden, resultados acotados a 30) | **Pendiente (DSN/#82)**: falta **Ctrl/Cmd+K** global y `AyudaModulo` por pantalla (objetos `PaletaComandos`/`AyudaModulo` de la librería); F1–F4/Cmd+S no están definidos. No se tocó el shell para no pisar la campaña de DSN |
| 9 | **Dinero y sensibilidad** | **Corregido** | Costos por rol (`billing.view` para cobros, `commercial-terms.manage` para plan y pago); el lote de **Presupuestos** confirmaba, el de **Clientes** archivaba sin confirmar; la factura de un aceptado se anunciaba como error | `clientes.tsx`: «Archivar clientes» pide confirmación con el destino y el alcance (proyectos/piezas ocultos), error inline y cierre solo al terminar. **Pendiente (bloqueado por #82)**: `ConfirmarConPalabra` (v0.51) para operaciones irreversibles; hoy la confirmación es el diálogo simple. La auditoría de acciones la hace el API (`agency_operation_audit`, visible en Actividad) |
| 10 | **Versión visible y novedades** | **Pendiente** | `/status` existe y comprueba la API en vivo; la versión vive en `release/version.json`/`app/app-version.ts` | **Pendiente (DSN/#82)**: pie institucional con versión en las 4 superficies y aviso de versión nueva (`hayVersionNueva`/`compararVersiones`) + acceso a `/status` desde la Ayuda. Límite explícito del brief: no tocar el pie ni la campana |
| 11 | **Rendimiento por defecto** | **Parcial** | El shell acota órdenes (`ORDER_WINDOW = 300`), proyecta campos por sección y precarga solo recortes con `limit`; Pipeline/Métricas cargan `GrowthDashboard` y `LiveVisitors` con `next/dynamic` | **Corregido**: se retiró un tablero muerto del bundle. **Pendiente (con plan)**: (a) las secciones del workspace se importan estáticas en `scale-workspace.tsx` → pasar a `dynamic()` una por una con capturas (transversal; coordinar con DSN/PLT); (b) `leads`, `budgets`, `clients` y `plans` se leen **sin `?limit=`** → usar la ventana del API (1–500) + «cargar más» y `ventanaDeLista` cuando #82 publique v0.51. El tablero necesita todas las tarjetas de las columnas visibles: la ventana por columna es parte del plan |

## Pendientes por regla (resumen para el orquestador)

| Regla | Pendiente | Dueño sugerido |
| --- | --- | --- |
| 4 | Tercer tema (alto contraste) y auditoría de targets mobile | DSN (#82) |
| 7 | `rutas.js` único con metadata de ruta | PLT/DSN |
| 8 | Ctrl/Cmd+K global + `AyudaModulo` por pantalla | DSN (#82) |
| 9 | `ConfirmarConPalabra` en lo irreversible | #82 + COM |
| 10 | Pie con versión + aviso de versión nueva + `/status` desde la Ayuda | DSN (#82) |
| 11 | Secciones lazy + listas acotadas (`?limit=` y `ventanaDeLista`) | #82 + cada slot |

## Hallazgos fuera del dominio (no corregidos)

- **`app/ui-system.css` (DSN) pisa el padding de los campos de la librería** (afecta la regla 8 en COM y el dinero de toda la app). La regla
  `:is(.control-shell,.unified-dialog,.photo-dialog) :is(input:not(...),textarea,select,.ops-select-trigger){…padding:9px 12px…}`
  tiene especificidad `(0,2,1)` y gana sobre las utilidades de padding del campo (`pl-9`, `pl-12`, `pl-14`, `pr-11`, `pr-32`, `pl-8`).
  Consecuencia medida con CDP sobre el build real:
  - `SearchField` (Clientes/Presupuestos/Planes): `pl-9` → **12 px**; la lupa se dibuja encima del placeholder («uscar por nombre…»). Captura `clientes-1440-light.jpg`.
  - `MoneyInput` (compositor de presupuesto): `pl-12` → **12 px**; el símbolo `Gs` choca con el importe. Captura `evidencia-campo-monto-padding.jpg` y medición `paddingLeft: 12px`.
  - También afecta `PasswordField` (`pr-11`), `RucField`/`TaxIdField` (`pr-32`) y `InstagramField` (`pl-8`).
  Fix sugerido (DSN): que la regla del shell no declare `padding` lateral (o use `:where()`/`padding-block`) y deje que el campo decida su padding interno.
- **`app/ui-system.css` (DSN)** conserva selectores muertos de `.suite-board`/`.suite-column`/`.lead-card` en listas `:is(...)`; se retiró el objeto que los usaba (COM), pero la limpieza del CSS compartido es de DSN.
- **`app/operations.tsx` (OPS)**: el alta de cliente (`workspace-forms.tsx`) y el detalle de pieza usan `<p className="error">`/`<p role="status">` copiados; en `suite.tsx` quedan dos copias fuera de COM (`ActivityWorkspace` de PLT y `CouponRedeem` de Configuración). §3 pide `Aviso`.
- **`tests/settings-slice.test.ts` está rojo en `main`** (pre-existente, no está en `test:release-regression`): espera `updatePreferences({startup:startup as StartupPreference})` y `app/sections/preferencias.tsx` usa `{startup:event.target.value as StartupPreference}`. Es de Preferencias (PLT).
- **Búsqueda del workspace** solo cubre clientes, proyectos y órdenes: presupuestos, planes y oportunidades no aparecen (regla 8; se resuelve con `PaletaComandos` en #82).

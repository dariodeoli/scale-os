# §15 transversales en Operaciones — auditoría con evidencia y correcciones (Refs #86)

_2026-09-29 · rama `SOS-OPS` sobre `origin/main` v1.0.144 · fuente única:
**owncoding-ui v0.51.0** (`docs/REGLAS.md` §15, aprobado por Dario el 29-09) ·
proceso `docs/ADOPCION-V2.md` · kit `KIT-ADOPCION-REGLAS.md`._

**Alcance (dominio OPS):** tablero de Producción (kanban + planificador Mi día /
Calendario / Lista y lotes), Proyectos y detalle, Inventario (equipos, pipeline de
ubicaciones, calendario y reservas), Estudio (espacios y reservas) e Historial de
trabajo (incluidos los pendientes internos del Resumen).

**Límites respetados:** no se tocó el pie institucional ni la campana (son #82/#83
de DSN). `owncoding-ui` sigue pinneada en `v0.39.0`: la fundación de la dependencia
es #82, así que lo que exige un objeto publicado después de v0.39 queda como
pendiente con plan (sección final).

## Tabla regla → estado → evidencia → corrección/pendiente

| # | Regla | Estado | Evidencia (post-fix) | Corrección / pendiente |
| --- | --- | --- | --- | --- |
| 1 | **Cero éxito falso** | Corregido + pendientes | `app/studio-workspace.tsx:64-77` (lote por fila), `app/work-history.tsx:26,41`, `app/productivity-ui.tsx:80-88,102`, `app/project-card.tsx:58-64,91`, `app/sections/produccion.tsx:141-150` | Corregido: el lote del estudio ya no asume el total si el API no detalla las canceladas; la lista del equipo, los responsables del proyecto y el planificador ya no fallan en silencio; un fallo de acción no reemplaza el contenido cargado. **Pendiente:** mensajes crudos del API (`cause.message`, puede llegar en inglés) → humanizador compartido con DSN/PLT; `app/use-board-data.ts:86` refresca conteos en silencio (mostrar `lastUpdated` + reintentar); revert optimista contra snapshot (`use-board-data.ts:105-118`) → releer la columna al fallar. |
| 2 | **Paridad demo** | Verificado | `app/demo/page.tsx` entra por `/produccion`; `app/sections/*` no tiene ramas `demo`; `app/demo-toolbar.tsx` repinta las mismas vistas al cambiar de rol | Sin trabajo de dominio: la demo usa los mismos objetos y datos ficticios. **Pendiente:** capturas en la demo real (`/api/demo/start` exige `Origin https://sistema.scaleparaguay.com`, no se puede iniciar desde local). |
| 3 | **Cuatro estados (cargando / vacío con acción / error con reintento / lleno)** | Corregido | `app/sections/produccion.tsx:141-150` (planificador), `app/inventory-workspace.tsx:347-351,389` (reservas), `app/studio-workspace.tsx:96,130,146` (reservas), `app/work-history.tsx:50,65`, `app/productivity-ui.tsx:102,228`, `app/sections/proyectos.tsx:76` | Corregido: el planificador tenía vacío falso mientras cargaba y no mostraba error; las reservas de inventario/estudio no tenían cargando, error ni CTA; el pipeline, el vacío filtrado de Proyectos y el Historial no ofrecían salida; los pendientes internos no tenían carga/vacío/error; el detalle de pieza no daba reintento. |
| 4 | **Tres temas + toque 44** | Parcial (corregido lo propio) | `app/inventory-workspace.tsx:209`, `app/project-card.tsx:133`; CSS de base `app/ui-system.css:132-136` | Corregido: la tarjeta del pipeline y la identidad del proyecto (botones propios, fuera del `min-height:44px` global) ahora miden 44 px en móvil. **Pendiente (transversal DSN/PLT):** no existe el tercer tema de alto contraste — `app/theme-toggle.tsx:14` alterna solo claro/oscuro y el CSS solo conoce `dark`. |
| 5 | **Una entidad, una fuente** | Verificado + pendiente | `app/production-board.tsx:24-33` (estados), `app/inventory-data.ts:97-105`, `app/project-card.tsx` (`projectLinks`/`statusLabel`), `app/studio-data.ts:33-40` | Verificado: un solo diccionario de estados, montos, seriales, fechas y tipos por entidad. **Pendiente:** `app/date-format.ts` duplica `fechaLista`/`fechaListaCorta` de la biblioteca con contrato propio (vacío `''` y zona `America/Asuncion`); la usan COM/FIN/OPS → decisión de re-export de DSN (#82, ya reportada por FIN). |
| 6 | **Microcopy es-PY (voseo, sin jerga)** | Corregido + pendientes | `app/productivity-ui.tsx:75` (`Pasos`), `app/inventory-data.ts:105`, `app/studio-data.ts:36`, `app/work-history.tsx:17` | Corregido: se retiró el anglicismo "Checklist" del planificador y de la plantilla mensual; un evento de trazabilidad desconocido ya no muestra el código crudo (`Movimiento registrado`); `ads` → "Publicidad"; un estado interno nuevo dice "Sin estado" en vez de `undefined`. **Pendiente:** mensajes de error crudos del API (regla 1) y el feed de Actividad (`app/suite.tsx`, dominio PLT) que imprime `table_name`/`operation` de la base. |
| 7 | **Rutas canónicas** | Verificado | `app/navigation.ts` (`sections`, `legacyRoutes`), `next.config.mjs` (`redirects`), `app/sections/historial.tsx` + `app/scale-workspace.tsx:1086` | Sin slugs duplicados: toda sección de OPS vive en `sections` y el historial navega por el registro único (`sectionPath`) en vez de por URL propia. |
| 8 | **Búsqueda y atajos consistentes** | Parcial (transversal shell) | `app/workspace-search.tsx` (buscador único, 30 resultados) | **Pendiente (PLT/DSN):** no hay Ctrl/Cmd+K global en el panel ni `AyudaModulo` por pantalla; el buscador y la guía existen, pero sin atajo. Plan: atajo en el shell + ayuda de la biblioteca con la fundación. |
| 9 | **Dinero y sensibilidad** | Verificado + revisión pendiente | `app/ui-v2.tsx` (`MoneyText`/`Kpi`), `app/capabilities.ts:44-46`, `app/inventory-workspace.tsx:442,527`, `backend/permissions.js`, `backend/migrations/20260908_operations_complete.sql:16-21` | Verificado: montos y fechas por objeto único, acciones por capacidad (`roleCan`), confirmaciones propias para archivar/cancelar/anular y auditoría real por trigger (`tg_op` + actor + IP). **A revisar con Dario:** el valor de inventario lo ve cualquier rol con `inventory.view` (incluido `viewer`); no es campo sensible declarado. Si debe ocultarse, va API + UI aparte. |
| 10 | **Versión visible y novedades** | Parcial (transversal DSN) | `app/workspace-footer.tsx` + `app/app-version.ts` (versión real), `release/version.json` | El panel ya muestra la versión publicada, que es la fuente del aviso. **Pendiente (DSN #82/#83):** `ProductFooter` de la biblioteca, `hayVersionNueva`/`compararVersiones` y `/status` desde la Ayuda; OPS no tiene copia propia que adoptar. |
| 11 | **Rendimiento por defecto** | Corregido + pendientes | `app/sections/*` (`next/dynamic` + `SectionLoading`), `app/board-data.ts:22-24` (ventana 50 + "Ver más"), `app/productivity-ui.tsx:220` (100 filas), `app/work-history.tsx:19,64` (ventana 50), `app/work-history.tsx:23` (historial paginado) | Corregido: los pendientes internos no tenían tope (ahora 50 con aviso). **Pendiente:** el catálogo de inventario y las reservas del mes se piden completos (fotos incluidas) y el estudio trae todas las reservas del mes → paginar/ventanear con `ventanaDeLista` (v0.51) + `?limit/offset` en el API; el fallback de `app/project-pieces.ts:35-39` trae la lista completa cuando el API no soporta `?project_id=` → retirarlo cuando el contrato esté en todos los entornos. |

## Copias locales → objetos (ADOPCION-V2 §7)

| Copia local | Objeto de la biblioteca | Estado |
| --- | --- | --- |
| `app/ui-v2.tsx` (`StateChip`, `Kpi`, `EmptyBlock`, `ErrorBlock`, `LoadingBlock`, `ViewSwitch`, `ListGrid`/`ListRow`) | `Badge`, `Stat`, `EmptyState`, `ErrorState`, `Skeleton`, `ListGridToggle`, `CELDA_*` | Ya son envoltorios finos; no hay lógica duplicada. |
| `app/list-format.tsx`, `app/field-rules.ts`, `app/amount-format.ts`, `app/save-completion.ts` | `partirSerial`/`serialEnmascarado`, `parseTelefono`/`telefonoValido`, `MoneyInput`, `completeSave`/`AVISO_REFRESCO` | Ya adoptan lo publicado (guardas en `tests/list-format.test.tsx`, `tests/field-adoption.test.ts`). |
| Feed del Historial (`app/work-history.tsx:38-42`) | `Cronologia` | **Pendiente por pin (#82):** el objeto con estados honestos de carga/error/actualizar llega en v0.46; instalado `v0.39.0`. Al subir el pin se adopta conservando los cuatro estados del panel. |
| Fechas propias (`app/date-format.ts`) | `utils/fecha` (`fechaLista`, `fechaListaCorta`) | **Pendiente por decisión de DSN:** contrato de vacío/zona distinto (ver regla 5). |
| `boardVisibleWindow` (`app/board-data.ts:41-46`) | — | No es copia: mide **columnas visibles del riel**, no virtualiza filas. La virtualización (`ventanaDeLista`, v0.51) queda pendiente por pin. |

## Correcciones de esta rama

| Commit | Qué hace |
| --- | --- |
| `fix(ops): estados honestos y vacíos con acción en Operaciones` | Planificador con carga/error; lote del estudio sin éxito falso; inventario y estudio con error de acción que no tapa el contenido; vacíos con CTA (pipeline, reservas de inventario y estudio, Proyectos filtrado, Historial, planificador); detalle de pieza y pendientes internos con reintento; personas y responsables del proyecto sin fallo mudo. |
| `fix(ops): microcopy es-PY y targets de 44 px` | "Checklist" → "Pasos"; trazabilidad desconocida sin código crudo; `ads` → "Publicidad"; estados internos honestos; 44 px en los dos botones propios que no llegaban. |
| `test(ops): contrato §15 + evidencia visual` | `tests/ops-transversales.test.ts` (nuevo) y ampliación de `tests/inventory-workspace.test.tsx`; fixtures del harness al día y capturas en esta carpeta. |

## Evidencia

- **Capturas** (build local con el CSS real, harness `build-tools/visual-harness`): 24
  archivos en esta carpeta — tablero (1440/390, claro/oscuro), planificador "Mi día"
  (columna Pasos), planificador vacío, errores de tablero/planificador, Proyectos en
  lista y filtro vacío, reservas de inventario vacías, pipeline vacío, error de
  catálogo de inventario, reservas de estudio vacías, estudio sin espacios, historial
  vacío y auditoría con datos.
- **Medición:** `node build-tools/visual-harness/run.mjs --only produccion,inventario,estudio,proyectos,historial --widths 390,1440` → **28 fixtures, 0 hallazgos, 0 overflow** en 390 y 1440.
- **Tests:** `tsx tests/ops-transversales.test.ts` (reglas 1, 3, 4, 6 y 11 en OPS) y el bloque nuevo de `tests/inventory-workspace.test.tsx` (un fallo de acción conserva el catálogo y se avisa). Ambos entran en `test:release-regression`.

## Pendientes por regla (con plan)

| Regla | Pendiente | Plan |
| --- | --- | --- |
| 1, 6 | Mensajes crudos del API/`cause.message` (puede venir en inglés del parser) | Humanizador compartido (como `inventoryErrorText`) en la biblioteca o en `backend/suite-validation.js`; se coordina con DSN/PLT. |
| 1 | Conteos exactos que refrescan en silencio (`use-board-data.ts:86`) y revert optimista contra snapshot (`:105-118`) | Mostrar la antigüedad (`lastUpdated`) y releer la columna al fallar en vez de revertir al snapshot. |
| 4 | Tercer tema (alto contraste) | Tokens + tercera opción del `ThemeToggle` con DSN (#82/#83). |
| 5 | `app/date-format.ts` (copia de `utils/fecha`) y `Cronologia` en el Historial | Al subir el pin (#82): adopción de `Cronologia` con los cuatro estados y decisión de re-export de fechas. |
| 8 | Ctrl/Cmd+K global y `AyudaModulo` por pantalla | Shell/DSN: `PaletaComandos` y `AyudaModulo` de la biblioteca. |
| 9 | Visibilidad del valor de inventario por rol | Definir con Dario si `viewer`/`editor` no deben ver valor; si aplica, API + UI en un issue propio. |
| 10 | `ProductFooter`, aviso de versión nueva y `/status` desde la Ayuda | Con #82/#83 (DSN); OPS no tiene copia propia. |
| 11 | Catálogo de inventario y reservas del mes completos; fallback de `project-pieces` | `ventanaDeLista` + `?limit/offset` en el API de inventario; retirar el fallback cuando el contrato de `?project_id=` esté en todos los entornos. |
| 2 | Capturas de la demo | Sacarlas en la demo real al integrar (la demo local exige el origen de `sistema.scaleparaguay.com`). |

## Cómo se reprodujo

```sh
npm run test:release-regression
npx next build
rg "<<<<<<<" app tests build-tools
node build-tools/visual-harness/run.mjs --only produccion,inventario,estudio,proyectos,historial --widths 390,1440
node build-tools/visual-harness/capture.mjs --input work/visual-harness/tanda51/audit.html \
  --out work/visual-harness/tanda51/captures --widths 1440,390 --themes light,dark \
  --only produccion-tablero,produccion-mi-dia,produccion-planificador-vacio,produccion-error,\
produccion-vacio,proyectos-lista,proyectos-filtro-vacio,inventario-reservas-vacio,\
inventario-pipeline-vacio,inventario-error,estudio-reservas-vacio,estudio-vacio,\
ops-historial-vacio,equipo-historial
```

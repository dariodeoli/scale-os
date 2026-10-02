# Auditoría PLT #143 — Equipo y Configuración móvil

_2026-10-02 · rama `SOS-PLT` sobre `origin/main` v1.0.164 · stack local de QA
(`e2e-plt-stack.mjs`: API 3933 + front 3050 + proxy 3051) con sesión demo y del
dueño real · capturas 390×844, 768×1024 y 1440×900 en claro/oscuro._

## Qué cambió

**Navegación secundaria (Equipo y Configuración)**

- Ya resuelta por **DSN #137** (integrado en v1.0.164): los apartados del shell
  usan `TabScroller` con chevrones al desbordar y targets de 44 px en móvil.
  Las capturas lo verifican (`tabsScrollable:2` a 390/768, sin cortes). No se
  duplicó el patrón.

**Permisos por módulo (reemplaza la tabla de 34)**

- `app/permissions-matrix.tsx`: la tabla ancha (`min-w-[84rem]`) se reemplaza
  por un acordeón **por módulo** (Panel, Comercial, Producción, Finanzas,
  Equipo, Configuración). Cada capacidad muestra su descripción y el estado por
  cargo como **pastillas editables** (`aria-pressed`, 44 px en móvil) que
  alternan el permiso del rol con el mismo PATCH de siempre; el Dueño es el
  único que edita y el API revalida. Sin perder capacidades, ajustes manuales,
  reset, avisos ni la aclaración del Dueño.
- El resumen por cargo (`RoleExplorer`) queda plegado («Permisos por cargo») y
  los KPIs pasan a una franja compacta.

**KPIs compactos (Equipo y Preferencias)**

- `app/ui-v2.tsx`: `Kpi`/`KpiStrip` suman la variante opt-in `compact` (una
  línea de dato por KPI, sin tarjeta). Es el enganche para el patrón de DSN
  #138; el default queda intacto. Se usa en Permisos y Preferencias del espacio.

**Equipo > Actividad**

- Nuevo `app/activity-format.ts`: traduce tabla + operación a eventos de
  negocio («Factura emitida», «Pago recibido», «Proyecto archivado») con
  contexto de cliente, referencia e importe; el detalle técnico
  (`invoices · INSERT · Registro 312`) queda para escritorio y en el tooltip.
- `backend/agency-suite.js`: la actividad resuelve el contexto sin exponer el
  estado crudo (cliente por `client_id`, proyecto por `project_id`, factura y
  moneda por `invoice_id`). El API revalida permisos igual que antes.
- En móvil el evento envuelve en vez de recortarse; «Uso del equipo» cambia la
  tabla densa por **filas priorizadas** (identidad, estado, «Ver accesos» y el
  detalle en una línea) con `useDenseTableFit`, y en escritorio no se pierde
  nada de la tabla.

**Papelera, Invitaciones y acciones fijas**

- `app/archive-controls.tsx`: la lista usa `pinnedActions` + `ListActions`, así
  «Restaurar» queda visible en móvil (antes fuera de pantalla).
- `app/presence.tsx`: «Ver accesos» de Uso del equipo también queda fijo.
- `app/sections/invitaciones.tsx`: el bloqueo por demo es un
  `EmptyBlock compact` (sin `PageHeader` duplicado ni tarjeta completa).

## Evidencia (390/768 claro/oscuro)

Archivos `<pantalla>-{antes,despues}-{390,768,1440}-{light,dark}.jpg` y
`metricas-{antes,despues}.json`. Mediciones del contrato (controles con caja
real fuera del viewport):

| Pantalla | 390 | 768 | Antes → Después |
| --- | --- | --- | --- |
| Actividad | 9 → **0** | 9 → **0** | «Restaurar/Ver accesos» y eventos ya no se cortan |
| Papelera | 2 → **0** | 2 → **0** | «Restaurar» visible con la acción fija |
| Permisos | 0 → 0 | 0 → 0 | la tabla horizontal se reemplaza por el acordeón por módulo |
| Invitaciones (demo) | 0 → 0 | 0 → 0 | empty state compacto sin título duplicado |
| Preferencias | 0 → 0 | 0 → 0 | KPIs en una línea (3 tarjetas → 1 línea) |

```bash
# Stack (deja corriendo):
QA_SESSION=plt-qa-session.txt SCALE_OS_OWNER_EMAIL=qa-plt@example.invalid \
SCALE_OS_OWNER_PASSWORD=qa-plt-12345678 node build-tools/visual-harness/e2e-plt-stack.mjs
# Capturas:
LABEL=despues QA_SIZES=390x844,768x1024,1440x900 QA_THEMES=light,dark \
QA_SESSION=plt-qa-session.txt node build-tools/visual-harness/capture-plt-143.mjs
```

## Verificación

- `npm run test:release-regression` ✅ (suma `tests/activity-format.test.ts`;
  guardas actualizadas en `plt-hardening`, `ux-consistency` y `ui-v2`).
- `npx next build` ✅ (`.next/BUILD_ID` verificado) · `npx tsc --noEmit` ✅.
- `npm --prefix backend run test:release` ✅ (la actividad conserva permisos,
  ventanas y contratos; `test-suite` suma el contexto de cliente/referencia).
- Sin marcadores de conflicto.

## Coordinación

- **#137** (tabs móviles): ya en main; se adopta sin variantes nuevas.
- **#138** (tarjetas/⋯, skeletons, KPIs compactos): el KPI compacto queda como
  prop opt-in (`compact`) en `ui-v2` y la vista de permisos ya usa filas
  priorizadas y bloqueables por módulo; cuando DSN publique el patrón, se
  adopta el objeto compartido sin cambiar los datos.

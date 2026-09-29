# Compactación del resto de Plataforma (#96) — evidencia

_2026-09-29 · rama `SOS-PLT` sobre `origin/main` v1.0.146 · capturas 1440×900 y
390×844 en claro/oscuro (`node build-tools/visual-harness/capture-compact-plt.mjs`
contra el stack local de QA; pantallas con datos de la demo y, en Invitaciones y
Superadmin, de la empresa real con enlaces/solicitudes/acceso global sembrados)._

## Antes → después (distancia al primer contenido real)

| Pantalla | 1440×900 antes | después | 390×844 antes | después | Cambio principal |
| --- | --- | --- | --- | --- | --- |
| Configuración | 212 px | **212 px** | 332 px | **332 px** | separación entre columnas 24 → 16 px; ya mostraba el primer ajuste arriba |
| Preferencias | 349 px | **212 px** | 498 px | **332 px** | se quitó el `PageHeader` duplicado del shell |
| Papelera | 571 px | **490 px** | 1032 px | **919 px** | se quitó el `PageHeader`; política en una línea; tipo como chip |
| Invitaciones | 615 px | **478 px** | 1000 px | **835 px** | se quitó el `PageHeader`; KPIs y tablas densas quedan arriba |
| Roles y permisos | 1175 px | **1037 px** | 2170 px | **2024 px** | se quitó el `PageHeader`; matriz densa con su franja de KPIs |
| Actividad | 1261 px | **1164 px** | 2645 px | **2530 px** | uso del equipo en una línea (detalle en tooltip) y feed sin título duplicado |
| Superadmin | 481 px | **481 px** | 894 px | **894 px** | vacíos compactos; header de 64 px y listas de 38 px ya cumplían |

En 1440×900 todas las pantallas muestran contenido real arriba del pliegue
(Papelera/Invitaciones/Superadmin con filas completas; Permisos con su explorador
de cargos; Actividad con la grilla de uso y las primeras filas del feed).

## Archivos de la evidencia

- `<pantalla>-{antes,despues}-{1440,390}-{light,dark}.jpg` por cada una de las 7
  pantallas.
- `metricas-{antes,despues}.json`: medición cruda (top del primer contenido y
  filas completas visibles).

## Cambios

- `app/sections/preferencias.tsx`, `app/archive-controls.tsx`,
  `app/invite-links.tsx`, `app/permissions-matrix.tsx`: la identidad vive en el
  shell (título + apartados); la sección conserva su nombre accesible
  (`aria-label`) y ya no dibuja un `PageHeader` propio. La papelera además
  muestra el tipo de registro como chip y resume la política en una línea.
- `app/suite.tsx` (Actividad) y `app/presence.tsx` (Uso del equipo): encabezado
  compacto de una línea con el dato a la vista y el detalle en el `title`.
- `app/superadmin/{catalog,audit,access}.tsx`: vacíos `compact`.
- `app/sections/configuracion.tsx`: separación entre columnas de 16 px.
- `tests/plt-hardening.test.ts` y `tests/ux-consistency.test.ts`: guardas de los
  encabezados compactos, el chip de la papelera y los vacíos del panel global.

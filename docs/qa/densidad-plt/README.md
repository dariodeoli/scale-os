# Densidad integral PLT (#98) — evidencia

_2026-09-29 · rama `SOS-PLT` sobre `origin/main` v1.0.147 · capturas 1440×900 y
390×844 en claro/oscuro (`build-tools/visual-harness/capture-compact-plt.mjs`
contra el stack local de QA; demo con 9 colaboradores)._

## Equipo (corrección prioritaria)

| Métrica (1440×900, claro) | Antes | Después |
| --- | --- | --- |
| Alto de la tarjeta de persona | **438 px** | **302 px** (−31%) |
| Primera tarjeta del directorio (grid) | 357 px | **307 px** |
| Primera fila del directorio (lista) | 390 px | **340 px** |
| Filas de lista visibles sin scroll | 9 | **9** (fila de 44 px) |
| «Acceso habilitado» | 2 veces (cuerpo + bloque «Acceso al panel») | **1 chip** |
| Espacio muerto dentro de la tarjeta | bloque grey `Correo/Acceso/Ingreso` + pie `flex:1` | **~0** (contenido y pie en una línea) |

Qué cambió en la tarjeta/fila:

- Cabecera: checkbox, avatar, **nombre + cargo**, estado «Activo/Inactivo».
- **Correo en una línea secundaria** (con `title`), ya no dentro del bloque de hechos.
- Metadata como chips: **rol** + **ingreso** (solo si existe; en la fila densa el
  chip muestra la fecha y el tooltip dice «Ingreso …»).
- **Remuneración como chips**: modalidad, día de pago, emite factura y **moneda**
  (antes la moneda no se veía).
- **Un solo estado de acceso** (chip de `TeamAccess`); el bloque «Acceso al panel»
  con su título desapareció y solo queda la acción de invitar/reinvitar cuando aplica.
- Pie en una línea: chip de acceso + `Perfil` + eliminar iconográfico, anclado con
  `margin-top:auto` y sin reservar alto.
- **Selección masiva contextual**: la barra de lote solo aparece con ≥1 seleccionado
  (sin la fila permanente «Seleccioná integrantes…»).
- Lista densa de **7 columnas** (Persona · Correo · Datos · Estado · Ficha · Acceso ·
  Acciones), 44 px por fila, chips con scroll silencioso cuando hace falta.
- Card sin ficha laboral: «Sin ficha laboral» como chip y acciones iconográficas
  (restaurar / agregar ficha / editar / eliminar del equipo).

## Plattforma

| Pantalla | 1440 antes → después | 390 antes → después | Cambio |
| --- | --- | --- | --- |
| Actividad — Uso del equipo | 1152 → **959** | 2535 → **1072** | las 9 tarjetas de 180 px pasan a **lista fina** (44 px/fila) con estado en chip; la explicación va al tooltip |
| Papelera | 474 → **405** | 924 → **681** | barra de lote contextual, tipo como chip y 2 KPIs (se quitó «Seleccionados», que repetía la barra) |
| Historial | 366 → 366 | 533 → 533 | filas con padding compacto (`px-3 py-2`) y texto en una línea con tooltip |
| Alta de persona (popup) | — | — | ya usaba 2 columnas y controles de 40 px; se verificó con captura |

Las pantallas ya compactadas en #92/#96 (Invitaciones, Roles y permisos,
Configuración, Preferencias, Superadmin) se mantienen: la evidencia antes/después
vive en `docs/qa/compact-plt/` y su densidad se auditó de nuevo en #98 sin cambios
pendientes.

## Archivos de la evidencia

- `equipo-{antes,despues}[-lista]-{1440,390}-{light,dark}.jpg`
- `equipo-alta-{antes,despues}-{1440,390}-{light,dark}.jpg`
- `actividad-*`, `papelera-*`, `historial-*` (mismas combinaciones)
- `metricas-{antes,despues}.json`

## Cambios

`app/operations.tsx`, `app/operations.css` (tarjeta/fila de personas y toolbar),
`app/team-access.tsx` + `app/team-access.css` (chip único + acción en una línea),
`app/presence.tsx` + `app/presence.css` (uso del equipo como lista fina),
`app/archive-controls.tsx` (lote contextual), `app/work-history.tsx` (filas densas),
`tests/{team-toolbar-density,collaborator-access-compact,ux-consistency,plt-hardening,release-regression-audit}`.

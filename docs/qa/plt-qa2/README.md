# QA ola 2 — Plataforma y Equipo (#125) — evidencia

_2026-10-01 · rama `SOS-PLT` · stack local del harness (`e2e-plt-stack.mjs`:
Postgres 17 temporal + API real + demo privada + datos de Plataforma + front
`next start` y proxy de un solo origen)._

## Cobertura

76 capturas en claro/oscuro a **390×844** y **768×1024** (16 pantallas + 2
estados vacíos con la empresa real), más `metricas-despues.json` con el sondeo
por pantalla (scroll horizontal de página, títulos, diálogos y controles chicos).

| Bloque | Pantallas |
| --- | --- |
| Equipo | Personas (tarjetas y lista), búsqueda, filtros, alta, permisos, vacío de búsqueda |
| Plataforma | Invitaciones y solicitudes, Roles y permisos, Actividad, Historial, Configuración, Preferencias, Papelera |
| Superadmin | Panel global (resumen, secciones) |
| Cuenta/acceso | Mi perfil, login, registro, invitación no disponible |

## Correcciones (antes → después)

1. **Migraciones en bases nuevas** (`backend/server.js`,
   `test-release-migrations.mjs`). Al levantar el stack limpio, `/api/agency/team`
   respondía 500 (`42703`): la cadena explícita del server no incluía
   `20260929_member_purge.sql`, `20260929_destructive_platform_actions.sql` ni
   `20260930_lead_contact_opposition.sql`, y el baseline las marcaba como
   aplicadas en una base nueva. Ahora la cadena es única y **es** el `knownFiles`
   del baseline; el test de release compara cadena ↔ `migration-order.mjs` para
   que no vuelva a divergir. Evidencia: `purged_at` presente y Equipo con datos.
2. **Historial sin slugs crudos** (`app/work-history.tsx`). Los cambios de estado
   se pintaban como `→ pending`, `→ to_record`, `→ blocked`: ahora usan
   `workStatusLabel` (piezas), las etiquetas de proyecto y las de tarea interna.
   Evidencia: `historial-antes-390-light.jpg` / `historial-despues-390-light.jpg`
   (y 768).
3. **Área táctil de los interruptores de permisos**
   (`app/permissions-matrix.tsx`). En tablet el interruptor medía 18 px de alto;
   el overlay de la etiqueta ahora llega a ~44 px en todos los tamaños (medido
   con `elementFromPoint` a ±20 px: impacto). Evidencia:
   `permisos-antes-768-light.jpg` / `permisos-despues-768-light.jpg`.
4. **Contador del Historial vacío** (`app/work-history.tsx`): con 0 filas
   mostraba `de 0`; ahora `0 de 0`. Evidencia: `historial-vacio-despues-390-light.jpg`.

## Verificado OK (sin cambios)

- **Modales**: abren con foco adentro, cierran con Escape, bloquean el scroll del
  fondo, tienen scroll interno con pie fijo y sin controles bajo 40 px de caja
  (`equipo-alta`, `equipo-permisos`, `perfil`, `nueva-empresa`; 390 y 768).
- **Formularios**: el alta de persona muestra «Completá nombre completo» inline;
  selects y fechas funcionan a teclado y touch; los campos de teléfono/correo son
  los objetos compartidos.
- **Equipo**: tarjetas y lista con encabezado, búsqueda, filtros por estado,
  contador honesto, «0 de 9» al filtrar y vacío con «Limpiar filtros»; el sello
  de acceso y la remuneración solo donde corresponde.
- **Invitaciones**: KPIs de pendientes/activos/unidos, solicitud con aprobación,
  alta de enlace (rol + tipo) y enlaces recientes con estados (`Vence`,
  `Utilizado`).
- **Permisos**: explorador por cargo (tarjetas) y matriz densa con scroll
  horizontal silencioso y encabezado fijo.
- **Actividad**: uso del equipo + feed paginado («Cargar 20 más»), contador
  honesto del API.
- **Historial**: filtros, paginación, «Ver historial importado de Trello» y
  vacío con CTA a Producción.
- **Configuración / Preferencias / Papelera**: formularios, integraciones,
  suscripción del demo, inicio del espacio y filtros guardados; papelera con
  KPIs, chips de tipo y vacío correcto.
- **Superadmin**: barra de secciones con scroll silencioso, KPIs, avisos y
  enlaces; sin cortes en 390 ni 768.
- **Cuenta/acceso**: «Mi perfil» (datos, foto, privacidad), login con aviso
  honesto sin Google configurado, registro (paso 1) y enlace de invitación
  inválido con su estado.
- **PDP**: contacto visible solo para quien corresponde; sin cambios de
  enmascarado.

## Pendientes (patrones compartidos — coordinar con DSN)

- Al cerrar un diálogo el foco vuelve a `body`, no al botón que lo abrió
  (comportamiento único de `Dialog`; afecta a toda la app).
- Botones secundarios y enlaces del panel miden 32 px en 768 (el criterio
  ≥44 px se cumple en móvil); conviene decidirlo en los primitivos, no por
  pantalla.
- En la matriz de permisos a 768 las etiquetas de rol quedan fuera del corte
  inicial (scroll silencioso); el explorador por cargo cubre la edición.

## Archivos

- `*-antes-*` / `*-despues-*`: pares de lo corregido (permisos e historial).
- `metricas-antes.json` / `metricas-despues.json`: sondeo crudo.
- Harness: `build-tools/visual-harness/e2e-plt-stack.mjs`,
  `capture-plt-qa2.mjs`, `qa-plt-modal-check.mjs`.

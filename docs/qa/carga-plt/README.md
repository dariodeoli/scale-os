# Ventanas y carga inicial de Plataforma (#106) — mediciones y evidencia

_2026-09-29 · rama `SOS-PLT` sobre `origin/main` v1.0.148 · medición local con
sesión real (demo privada con 9 personas, 20 proyectos, 992 movimientos
auditados) contra el stack de QA (`qa-proxy.mjs`, API real y Postgres local)._

## 1. Ventanas de las listas largas (aditivo)

| Lista | Antes | Después |
| --- | --- | --- |
| Actividad (`/api/agency/activity`) | siempre 100 filas (21,6 KB), sin total; paginación en cliente | `?limit`/`?offset` (1..100, por defecto 20), `total` real y `hasMore`; 20 filas = **4,4 KB** |
| Papelera (`/api/agency/trash`) | todas las filas de todos los tipos | `?limit`/`?offset`, `total` y `kinds` del API (no del recorte) |
| Historial (`…/productivity/history` y `source-events`) | ya paginaba 10/50/100 con `hasMore` | suma `page.total` para el contador «1–10 de N» |
| Superadmin (agencias, usuarios, cupones, auditoría) | `limit=50` sin total ni «Ver más» | `total` + `hasMore` por colección y **«Ver más»** que anexa la página siguiente |
| Equipo (`/api/agency/team`) | ya paginado por el front (ventana de 50 + búsqueda) | sin cambios |

Sin `?limit` el contrato anterior sigue igual (actividad ≤100 filas + `total`,
papelera completa + totales), así que ningún consumidor se rompe. Los parámetros
inválidos responden 400 (`test-list-windows.mjs`).

Capturas: `actividad-despues-*` (contador «Mostrando 20 de 992» + «Cargar 20
más»), `papelera-despues-*` («1 de 1 registros»), `historial-despues-*`
(«1–10 de N»), `superadmin-despues-*` («1 de 1 agencias»).

## 2. Carga inicial autenticada — método

`build-tools/visual-harness/measure-load-plt.mjs` (reproducible): Chrome CDP,
sesión real sembrada en el stack local, por pantalla y por ancho. Mide:

- **Auth**: cuándo termina `/api/auth/me` (espera de autorización tras montar el shell).
- **TTFB**: `responseStart − requestStart` del documento.
- **Lista lista**: `performance.now()` cuando aparece el contenido de la pantalla.
- **Llamadas** y **peso**: `transferSize` de los recursos `/core-api/*`.
- **Más lenta**: la petición de mayor duración.

La tabla cruda queda en `mediciones.md`/`mediciones.json` (1440×900 y 390×844).

### Resultado (valores locales; el TTFB local no representa producción)

| Pantalla | Ancho | TTFB | Auth | Lista lista | Llamadas | Peso | Más lenta |
| --- | --- | --- | --- | --- | --- | --- | --- |
| equipo | 1440 | 15 ms | 8 ms | 289 ms | 12 | 612 KB | control-center (35 ms) |
| actividad | 1440 | 7 ms | 13 ms | 159 ms | 12 | 533 KB | activity (29 ms) |
| historial | 1440 | 4 ms | 4 ms | 137 ms | 12 | 550 KB | projects (11 ms) |
| invitaciones | 1440 | 3 ms | 6 ms | 135 ms | 12 | 6 KB | auth/me (6 ms) |
| permisos | 1440 | 3 ms | 7 ms | 134 ms | 11 | 455 KB | usage (12 ms) |
| papelera | 1440 | 6 ms | 5 ms | 144 ms | 11 | 449 KB | projects (25 ms) |
| preferencias | 1440 | 3 ms | 5 ms | 134 ms | 10 | 449 KB | projects (10 ms) |
| configuración | 1440 | 3 ms | 3 ms | 136 ms | 12 | 450 KB | projects (9 ms) |
| superadmin | 1440 | 5 ms | 5 ms | 131 ms | 7 | 4 KB | overview (8 ms) |

Mobile (390×844): mismos pesos y llamadas (el shell pide lo mismo; cambia el
layout), `Lista lista` entre 18 y 137 ms. La paridad de payload confirma que el
recorte de peso beneficia a los dos anchos por igual.

### Peso por endpoint (demo: 20 proyectos, 9 personas, 992 movimientos)

| Endpoint | Peso | Detalle |
| --- | --- | --- |
| `/api/agency/projects?fields=…` | **344,6 KB** | 333,9 KB son `assignees` (fotos en `data:` dentro del JSON) |
| `/api/agency/team` | **166,4 KB** | 77,6 KB son `photo_url` `data:image/webp;base64` |
| `/api/agency/activity?limit=20` | 4,4 KB | ventana nueva (antes 21,6 KB fijos) |
| `/api/agency/productivity/history?limit=10` | 2,9 KB | ventana |
| `/api/agency/trash?limit=50` | 0,3 KB | ventana |
| `/api/agency/control-center` | 0,4 KB | — |
| `/api/auth/me` | 0,7 KB | — |

## 3. Propuesta de recortes (para DSN/API transversal)

1. **Fotos como URL cacheable, no `data:` embebido (el corte grande).** Hoy cada
   `photo_url` viaja como WebP base64 dentro de cada payload y se repite por
   endpoint: ~8–16 KB por persona. Servirlas con un endpoint propio
   (`Cache-Control: private, max-age=86400` + `ETag`) baja `team` de 166 KB a
   ~1,5 KB y `projects` de 344 KB a ~11 KB, y el navegador cachea una sola vez
   cada avatar entre pantallas. Es un cambio de contrato *compatible* (el front
   ya dibuja `photo_url` en un `<img>`), pero toca a todos los slots → coordinar.
2. **`assignees` de proyectos con proyección**: hoy el shell pide
   `fields=…,assignees` y eso es el 97% del peso de la lista. Con fotos como URL
   queda en ~11 KB; si además se limita a `id`/`name`/`is_primary` en el shell, baja a ~2 KB.
3. **Ventanas ya aplicadas** (Actividad/Papelera/Historial/Superadmin): la
   primera página de actividad bajó 80% (21,6 → 4,4 KB) y el resto se pide con
   «Ver más», así que el costo por pantalla deja de crecer con el histórico.
4. **Control center / dashboard**: 0,4–1,7 KB, no requieren recorte.

## 4. Remanentes de espacio del dominio (auditoría #96/#98)

- **Tabs y header del shell (56–64 px)**: superficie compartida → DSN (#97/#89).
  Verificado: una sola barra de apartados por módulo, sin barras duplicadas.
- **«Último acceso» real en Equipo**: `/api/agency/team` no expone `last_seen_at`
  (el uso vive en `/api/agency/usage`, solo dueños); la tarjeta muestra el
  ingreso laboral cuando existe. Agregar el campo implica cambio de API → coordinar.
- **Historial a fila finita de columnas**: contrato de OPS (#94); se dejó el
  padding compacto y el recorte a una línea con tooltip.

## Archivos

`backend/list-projection.js`, `backend/agency-suite.js`,
`backend/record-lifecycle.js`, `backend/productivity.js`,
`backend/history-page.js`, `backend/platform-admin.js`,
`backend/test-list-windows.mjs` (nuevo, en `test:release`),
`backend/test-platform-admin.mjs`, `app/suite.tsx`, `app/archive-controls.tsx`,
`app/work-history.tsx`, `app/superadmin/{page,model,states,agencies,catalog,access,audit}`,
`tests/{plt-hardening,density-system}`,
`build-tools/visual-harness/measure-load-plt.mjs` (nuevo) y esta evidencia.

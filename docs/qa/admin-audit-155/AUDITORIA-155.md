# Auditoría + propuesta — Panel admin (superadmin) · #155

- Base auditada: `origin/main` **v1.0.168** (`app/superadmin/*`, `app/superadmin/platform-admin.css`).
- Superficies: Resumen, Agencias, Cupones, Accesos, Auditoría, encabezado/avisos y estados (carga, redirect, **acceso denegado**, **solo lectura**).
- Método: fixtures del harness espejando el JSX real (`admin-redesign.mjs` + nuevo
  `admin-audit-155.mjs`), Chrome headless con el CSS construido,
  **390/1440 × claro/oscuro/alto contraste** = 54 capturas en `docs/qa/admin-audit-155/`.
  Medición en `work/visual-harness/admin-audit-155/baseline.md`.
- Fidelidad: se corrigieron los fixtures móviles (Agencias/Cupones/Accesos) para espejar
  las ramas `useDenseTableFit` reales y el `SearchField` de la biblioteca; antes el 390
  no mostraba las tarjetas y el buscador medía mal.

## Medición

| Chequeo (harness) | 390 | 1440 |
| --- | --- | --- |
| Overflow horizontal / bleed / pseudo-overflow | 0 | 0 |
| Texto recortado sin salida | 0 | 0 |
| Superposiciones | 0 | 0 |
| Filas (44–52 px, plantilla compartida) | 0 hallazgos | 0 hallazgos |

La consola actual es **geométricamente sólida**; los hallazgos son de jerarquía,
densidad y flujo, no de desbordes.

## Estado actual (lo que hay)

Consola de una pantalla con tabs + contadores (Resumen · Agencias · Cupones ·
Accesos · Auditoría), encabezado sticky con chip de permiso honesto (#147) y
acciones condicionales, KPI strip, listas densas con plantilla compartida,
tarjetas en mobile con acciones al pie, avisos de diagnóstico y estados
(carga/redirect/denegado/solo lectura). Usa `panel`, `KpiStrip`, `ListGrid`/
`ListRow`, `StateChip` y los tres temas.

## Hallazgos

| # | Sev. | Hallazgo | Evidencia |
| --- | --- | --- | --- |
| 1 | Alta | **Desperdicio de espacio en desktop**: a 1440 el Resumen deja >50 % del alto vacío; dos paneles en 2 columnas no aprovechan el ancho ni resumen más operación | `admin-resumen-1440-{light,dark,contrast}.png` |
| 2 | Media | **Encabezado sobrecargado**: marca + «Administración global» + H1 + chip + fecha + 2 botones en una fila; en 390 ocupa ~4 filas antes del contenido | `admin-resumen-390-*`, `admin155-*` |
| 3 | Media | **Tab activo débil**: el estado activo es solo `bg-fono/15`; sin indicador inferior se pierde en alto contraste y con 5 tabs a 390 «Auditoría» queda fuera sin señal de scroll | `admin-cupones-390-*`, `admin-auditoria-1440-contrast` |
| 4 | Media | **Toolbar de Agencias desbalanceada en 390**: buscador full width y luego select + «4 de 134» apretados en una fila | `admin-agencias-390-*` |
| 5 | Media | **Tarjetas móviles de Agencias a 140 px** (contrato de cuadrícula ~200 px / pie anclado); Cupones y Accesos sí usan 200 px | `admin-agencias-390-*` vs `admin-cupones-390-*` |
| 6 | Baja | **Carga ajena**: el panel arranca con la `LoadingScreen` genérica del workspace, que no tiene la forma del panel (tabs + KPIs) | `admin-carga-*` |
| 7 | Baja | **Alto contraste**: los avisos usan `border-bad/30` y `border-warn/40`; sobre negro el borde casi no se ve (el icono/título cargan el estado) | `admin155-avisos-1440-contrast` |
| 8 | Info | **Pie del panel**: `WorkspaceFooter` incluye enlaces de workspace («Ver el plan» no aplica al panel global); Privacidad sí | `admin-resumen-1440-*` |

## Propuesta (a aprobación del dueño)

Sin cambios de API, permisos, datos ni auditoría. Todo con los objetos v2.

### A · Resumen útil a 1440 (hallazgo 1)
- Grilla principal `minmax(0,1fr) + 22rem`: columna izquierda con KPIs, «Agencias
  por vencer» y «Últimas acciones»; riel derecho con **«Requiere tu atención»**
  (bootstrap pendiente, suspendidas/vencidas, usuarios sin rol) y **atajos**
  (Nueva agencia, Crear cupón, Ver auditoría).
- Paneles en 3 columnas `xl` sumando **Suscripciones** al resumen (dato ya cargado;
  hoy es solo un KPI).

### B · Encabezado y tabs (hallazgos 2, 3)
- Desktop: identidad y utilidades en una fila, sticky; se mantiene chip real (#147).
- Mobile: máximo 3 filas (marca + H1 en una; chip + actualizado; acciones de 44 px).
- Tabs: indicador activo con barra inferior de marca además del fondo; a 390 sombra
  de continuidad a la derecha y `title`/`aria-label` de la sección siguiente.
- Orden propuesto: **Resumen · Agencias · Accesos · Cupones · Auditoría**
  (personas antes que catálogo) — sujeto a aprobación.

### C · Estados (hallazgos 6, 7)
- **Skeleton del panel** (encabezado + tabs + KPI strip + 2 paneles) en lugar de la
  carga genérica.
- Avisos con borde tokenizado de contraste (`border-*-text`/outline) y acción de
  recuperación dentro del aviso cuando aplique (Reintentar / Volver a ingresar).
- Vacíos por vista con CTA contextual (Cupones/Accesos/Auditoría ya lo tienen; sumar
  Resumen sin datos y Agencias filtradas).

### D · Flujo (hallazgo 4, 5)
- Toolbar: en 390 el resumen «N de M» pasa debajo del buscador (o badge en el título)
  y el select de estado comparte fila con «Limpiar filtros».
- Tarjetas móviles de Agencias a 200 px con pie anclado, igual que Cupones/Accesos.
- Fila de agencia: «Gestionar suscripción» como acción primaria visible y el resto
  en el menú ⋯ ya existente; se conserva la confirmación con reautenticación.

### Alcance de Fase 2 (post aprobación)
A + B + C en una pasada (fixtures + capturas antes/después + tests de capacidades);
D en la misma pasada si se aprueba. Las capacidades, permisos, endpoints, datos y
auditoría no cambian.

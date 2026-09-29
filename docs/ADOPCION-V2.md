# Adopción v2 — Scale OS (tanda owncoding-ui v0.51.0)

Fuente de la tanda: **owncoding-ui v0.51.0** — `docs/REGLAS.md` **§14** (pie
institucional), **§15** (11 reglas transversales), **§16** (formato de
notificaciones) · `docs/SHELL.md` §6 · `docs/ADOPCION-V2.md` (proceso incremental
con puentes y checklist §10). Issues de esta rama: **#82** (fundación, pie y
marco) y **#83** (bandeja de avisos).

Proceso: una pantalla/objeto por cambio, reemplazando la copia local por el
objeto publicado **y borrando la copia en el mismo commit**; puentes sin lógica
para que los consumidores no cambien de ruta.

## 1. Fundación de la dependencia (Refs #82)

| Punto | Estado | Evidencia |
| --- | --- | --- |
| Tag fijado | `git+https://github.com/dariodeoli/owncoding-ui.git#v0.51.0` (0.51.0 instalado) | `package.json`, `package-lock.json` |
| `npm ci` limpio | Verde, incluso con SSH deshabilitado (`GIT_SSH_COMMAND=false`, caché nueva): el build de Coolify no necesita llaves | verificación local del 29-09 |
| Preset + `content` | `tailwind.config.mjs` usa el preset y suma `./node_modules/owncoding-ui/dist/**/*.js` | `tailwind.config.mjs` |
| Orden de carga | `owncoding-ui/styles.css` primero; después `globals.css`/legacy, `ui-system.css`, `contrast.css` y `tailwind.css` | `app/layout.tsx` |
| Parche CSS retirado | `build-tools/patch-owncoding-css.mjs`, su `postinstall` y el `COPY` del Dockerfile se eliminaron (el bug se corrigió en v0.40.1) | `package.json`, `Dockerfile` |
| Scope `tema-v2` | **No** se aplica: la app declara sus reglas equivalentes de shell en `app/tailwind.css`/`app/ui-system.css` (pendiente P1) | `rg "tema-v2\|v2-piloto" app` → 0 |
| Guarda de contraste de la app | `tests/contrast-theme.test.tsx` mide AA/AAA de los tokens en los tres temas | test verde |

## 2. Checklist de cierre (§10 de la biblioteca)

- [x] Tag fijado, preset y `styles.css` en el orden correcto.
- [ ] Scope `tema-v2`/`v2-piloto` aplicado donde corresponde → **pendiente P1**
      (la app usa tokens `--c-*` + reglas propias del marco; el retiro del bloque
      local y la adopción del scope van juntos, con capturas antes/después).
- [x] Guarda de contraste en la app (claro, oscuro y alto contraste).
- [x] Shell con los objetos y alto táctil de 44 px (`toque-44`, `min-h-11`).
- [x] Pantallas migradas de a una, con capturas antes/después (ver §7).
- [x] Copias locales inventariadas (§4) y retiradas las de esta tanda.
- [x] Íconos: todo `<Icon name="…">` literal existe en `ICONOS` (verificado
      sobre `app/**`).
- [x] Puentes sin lógica para lo migrado (§3); lo divergente queda documentado.

## 3. Puentes vivos (sin lógica)

| Ruta de la app | Objeto de la biblioteca | Qué aporta la app |
| --- | --- | --- |
| `app/workspace-footer.tsx` | `ProductFooter` | marca (`Scale OS`), versión real (`app/app-version.ts`) y los enlaces del landing |
| `app/notification-inbox.tsx` | `CampanaAvisos` + `SegmentedField` | datos, polling, filtros, mutaciones, preferencias y el detalle por aviso |

`app/workspace-footer.css` conserva **sólo layout** (separación del contenido,
gutter de la tarjeta de acceso y aire móvil); tipografía, colores y subrayados
del pie los define el objeto.

## 4. Inventario de copias locales (reemplazadas ↔ pendientes)

| Pieza | Estado | Detalle |
| --- | --- | --- |
| Pie institucional (`<footer>` a mano) | **Reemplazado** (#82) | `ProductFooter` en las 4 superficies; contenido canónico garantizado por el objeto |
| Bandeja de avisos (campana + panel + tarjetas) | **Reemplazado** (#83) | `CampanaAvisos`; la app conserva datos y acciones, y el detalle del aviso |
| Reglas del pie impreso | **Excepción documentada** | `reports-print.tsx` mantiene versión + crédito en texto (ver §5) |
| Estados de carga/vacío/error | Envuelven objetos | `app/ui-v2.tsx`: `LoadingBlock`→`Skeleton`, `EmptyState`/`ErrorState`/`SectionState` directos de la librería |
| Paleta `--c-*` | App (mapeo de marca) | `app/tailwind.css` traduce la identidad de Scale OS a los tokens del grupo; la biblioteca no conoce la marca |
| `ThemeToggle` | App | Suma el **tercer tema** (alto contraste) sobre el contrato de tokens; el objeto de la librería sólo conoce claro/oscuro |
| Toasts (`feedback.ts` + `notification-center.tsx` + `toast.css`) | **Pendiente P3** | Un solo sistema y sólo resultados de acciones en pantalla; `ToastProvider`/`useToast` no es incremental (ver P3) |
| Guía del panel (`WorkspaceGuide`) y buscador (`WorkspaceSearch`) | **Pendiente P2** | `AyudaModulo`/`PaletaComandos` requieren migrar la guía por módulo y el buscador global (ver P2) |
| Reglas del marco (nav, riel, drawer) | **Pendiente P1** | Viven en `app/tailwind.css` + `app/ui-system.css`; se retiran con el scope `tema-v2` |

## 5. Excepciones documentadas (§14, contenido canónico mantenido)

La regla pide el objeto en todas las páginas; estas superficies **no pueden**
usarlo y conservan el contenido canónico (versión real + crédito):

1. **`app/reports-print.tsx`** — Informe A4 en una ventana de impresión sin
   Tailwind ni interacción: el pie impreso suma `Scale OS v<versión> ·
   Desarrollado por Owncoding · owncoding.dev` como texto plano.
2. **`app/inventory-label.tsx`** — Etiqueta física de 80×50 mm: no hay lugar
   para el pie; se documenta la excepción y el objeto no entra.
3. **`app/global-error.tsx`** — Reemplaza el layout raíz (puede pintarse sin la
   hoja de la app): mantiene versión + crédito con enlace en texto plano, sin
   depender del objeto.

## 6. Pendientes por regla (§14 / §15 / §16)

| Regla | Estado | Pendiente / plan |
| --- | --- | --- |
| §14 Pie institucional | ✅ Adoptado en panel, acceso, públicas y tokenizadas; impresión con excepción documentada | — |
| §15.1 Cero éxito falso | ✅ El marco no silencia fallos: errores con salida (`ErrorBlock`/`ErrorState` con reintento), `IndicadorConexion`, guardado con `completeSave`; los `catch{}` restantes son sólo preferencias locales (`localStorage`/`sessionStorage`) | Revisión de dominio por slot (COM/OPS/FIN/PLT) |
| §15.2 Paridad demo | ✅ La demo monta el mismo shell y las mismas secciones (`demo_owner_user_id`, `demoStorage`), sin pantallas aparte | Seguir la paridad en features nuevas |
| §15.3 Cuatro estados | ✅ Primitivas únicas (`LoadingBlock`, `EmptyBlock`/`EmptyState`, `ErrorBlock`/`ErrorState`); secciones pesadas con `dynamic()` + esqueleto | Auditar pantalla por pantalla en cada slot |
| §15.4 Tres temas + toque 44 | ✅ Claro, oscuro y **alto contraste** (`app/contrast.css` + `ThemeToggle` de 3 estados + `prefers-contrast: more`); 44 px en el marco | Verificar pantallas de dominio en alto contraste (capturas por lote) |
| §15.5 Una entidad, una fuente | ✅ Montos (`money`/`amount-format`), fechas (`list-format`), seriales (`SerialTexto`) y clientes comparten derivación | — |
| §15.6 Microcopy es-PY | ✅ Aviso en segunda persona y vocabulario del negocio en el marco | Revisión de textos por slot |
| §15.7 Rutas canónicas | ✅ `app/navigation.ts` declara secciones y `legacyRoutes` redirige; sin slugs dinámicos duplicados | — |
| §15.8 Búsqueda y atajos | ⚠️ `WorkspaceSearch` (un solo buscador) sin Ctrl/Cmd+K; la ayuda es `WorkspaceGuide`, no `AyudaModulo`; el estado del sistema ya se alcanza desde la ayuda | **P2**: evaluar `PaletaComandos`/`AyudaModulo` como migración dedicada |
| §15.9 Dinero y sensibilidad | ✅ Gates por rol (`capabilities.ts`/`workspace-access.ts` + `backend/permissions.js`) y auditoría del API | — |
| §15.10 Versión visible y novedades | ✅ Pie con versión real; **aviso de versión nueva** con `hayVersionNueva` contra `/health` → `release.version` (`VersionNotice`); `/status` desde la ayuda | — |
| §15.11 Rendimiento | ⚠️ Secciones pesadas lazy con esqueleto; listas acotadas por `BATCH_LIMITS`/proyecciones | **P4**: `ventanaDeLista` en las listas más largas (dueño por dominio) |
| §16 Bandeja | ✅ `CampanaAvisos` con mapeo único (`avisoDeNotificacion`), vacío con acción y detalle con las acciones de la app | Contador del objeto acotado a los avisos cargados (P5) |
| §16 Push | ⚠️ La app no tiene canal push | **P6**: contrato futuro con `payloadPush`/`enHorarioSilencioso` (coord. #84, PLT) |
| §16 Toast | ⚠️ Un solo sistema propio, sólo acciones en pantalla | **P3**: evaluar `ToastProvider`/`useToast` (no incremental hoy) |

### Pendientes con motivo

- **P1 · Scope `tema-v2` y retiro del bloque local del marco.** La app no usa el
  scope: sus reglas de nav/riel/drawer viven en `app/tailwind.css` y
  `app/ui-system.css`. Retirarlas exige adoptar el scope en el shell y volver a
  medir contraste y geometría de las tres verticales; es un cambio de marco
  completo, no incremental para esta tanda.
- **P2 · `PaletaComandos`/`AyudaModulo`.** El buscador ya es único
  (`WorkspaceSearch`) pero no tiene Ctrl/Cmd+K, y la guía por módulo tiene
  lógica propia (`workspace-guide-data.ts`). Migrar pide rediseñar la ayuda por
  rol/módulo y el índice de búsqueda (hoy alimentado por clientes, proyectos y
  piezas); se agenda como lote propio.
- **P3 · `ToastProvider`/`useToast`.** El aviso nace en la capa de datos
  (`notifyMutation` → evento `scale:feedback`) y el contrato propio pide 2–3 s y
  sin botón de cerrar; el objeto usa 4 s fijos, botón de cerrar y un hook dentro
  de React. Adoptarlo sería un refactor de ~34 sitios sin ganancia funcional:
  el resultado (§16: sólo acciones en pantalla) ya se cumple.
- **P4 · `ventanaDeLista`.** Ninguna lista virtualiza todavía; las largas se
  acotan por proyección/lote. La virtualización toca cada dominio (Comercial,
  Operaciones, Finanzas) y se despacha al slot dueño con el contrato del objeto.
- **P5 · Contador global de la bandeja.** `CampanaAvisos` deriva el contador de
  los avisos que recibe y el API pagina de a 30 con `unread` global. La app
  muestra el conteo de lo cargado (honesto) y el pie suma los pendientes del
  servidor; el conteo global exacto requiere que el objeto acepte un contador
  explícito (mejora propuesta a la biblioteca) o que la bandeja cargue todos los
  no leídos.
- **P6 · Push.** No existe canal push en Scale OS; queda el contrato de §16
  (`payloadPush` genérico y `enHorarioSilencioso`) para cuando PLT lo abra (#84).
- **P7 · Título truncado sin salida en el objeto.** El harness marca dos
  hallazgos (uno alto) en el panel de `CampanaAvisos`: el `titulo` se recorta con
  `truncate` y el objeto no emite `title`. La app mitiga acotando el título a 90
  caracteres y mostrando el texto completo en el detalle; la mejora propuesta a
  la biblioteca es `title={aviso.titulo}` en el aviso.

## 7. Evidencia de esta tanda

`docs/qa/tanda51-dsn/` — 24 capturas del harness visual con el CSS construido
(`npm run build`), ancho 390 (móvil real) y 1440, temas claro/oscuro y alto
contraste:

| Superficie | Archivos |
| --- | --- |
| Panel (shell + pie) | `tanda51-panel-pie-{390,1440}-{light,dark}.png`, `tanda51-panel-pie-1440-contrast.png` |
| Acceso (registro) | `tanda51-acceso-pie-{390,1440}-{light,dark}.png` |
| Tokenizadas (portal) | `tanda51-portal-pie-{390,1440}-{light,dark}.png` |
| Públicas (landing, documento real) | `landing-{390,1440}-light.png` |
| Bandeja con avisos | `tanda51-bandeja-avisos-{390,1440}-{light,dark}.png`, `…-1440-contrast.png` |
| Bandeja vacía con acción | `tanda51-bandeja-vacia-{390,1440}-{light,dark}.png` |

Fixtures: `build-tools/visual-harness/fixtures/tanda51-footer-inbox.mjs` (el pie
es el objeto real renderizado, la bandeja espeja `CampanaAvisos.jsx` con el
mapeo de la app) y el pie de `auth-portal-landing.mjs` quedó actualizado al
objeto. Medición: `work/visual-harness/latest/baseline.md` (0 desbordes
horizontales; 2 hallazgos de texto truncado del objeto → P7).

Tests que fijan lo adoptado: `tests/product-footer.test.tsx`,
`tests/workspace-footer.test.tsx`, `tests/notification-inbox.test.tsx`,
`tests/notifications-api-integration.test.tsx` (handler/SQL reales con PGlite:
filtros, paginación, resolver/reabrir, read-all y aislamiento por empresa),
`tests/version-notice.test.tsx`, `tests/contrast-theme.test.tsx`.

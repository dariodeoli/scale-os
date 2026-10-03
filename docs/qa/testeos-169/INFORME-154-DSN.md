# Testeos #154 — vertical DSN (v1.0.169)

Campaña integral del issue #154, alcance DSN: shell/nav (riel, drawer, activos),
paleta ⌘K, ayuda por módulo, landing, a11y, responsividad 390/430/1440,
claro/oscuro, skeletons y vacíos. Evidencia en `docs/qa/testeos-169/`.

## Método

- **Automatizado (main v1.0.169):** `npm run test:release-regression` (incluye
  shell, mobile-layout, tab-scroller, paleta/ayuda, landing, contraste y a11y),
  `npx next build` y `rg "<<<<<<<"`.
- **Live producción v1.0.169:** demo real con `build-tools/visual-harness/qa-dsn-154.mjs`
  (riel/drawer/activos, paleta por atajo real de teclado y navegación, ayuda,
  a11y de nombres/foco/targets, overflow 390/430/1440, landing).
- **Contraste AA en vivo:** `build-tools/visual-harness/qa-dsn-contrast-154.mjs`
  sobre Producción, Clientes y Presupuestos (claro/oscuro) y landing.
- **Skeletons y vacíos:** 14 fixtures del harness con el CSS construido,
  390/1440 × claro/oscuro.

## Resultados

| Área | Resultado |
| --- | --- |
| Regresión + build | ✅ suite completa verde, `BUILD_ID 9kyy4RM_tTGPNsTRh4p2R`, 0 marcadores |
| Shell/riel | ✅ activo correcto (`aria-current`), colapsado a 60 px sin etiquetas visibles (captura) |
| Drawer 390/430 | ✅ targets ≥44 px, activo, grupos expanden, sin overflow |
| Paleta ⌘K | ✅ abre por atajo de teclado, resultados con grupos, navegación real a `/clientes` con activo |
| Ayuda por módulo | ✅ resumen + enlaces `/status` y `/privacidad` |
| a11y | ✅ 0 imágenes sin `alt`, 0 controles sin nombre, foco visible 3 px, targets 44 |
| Responsive | ✅ 390/430/1440 sin overflow horizontal (shell y landing) |
| Landing | ✅ imágenes con alt, sin overflow; hero/eyebrow clasificados (abajo) |
| Skeletons/vacíos | ✅ 14 superficies capturadas en ambos temas; sin recortes ni saltos |

18/19 checks del recorrido live; el único "fallo" era del propio script (contaba
`.nav-label` en el DOM aunque el colapso los oculta por CSS): la captura confirma
el estado correcto y el check quedó ajustado a visibilidad.

## Hallazgos

1. **[Media · corregido] AA en oscuro del primitivo `text-button`.**
   «Filtros» (Producción) medía **3.77:1** y «Ver los 9 sin plan» (Clientes)
   **2.98:1** (AA pide 4.5 para 12 px/600). Fix: en `html[data-theme="dark"]` el
   primitivo usa el token de texto de marca `--c-fono-text` (#d18ad9, 5.27:1
   sobre el tinte). Verificado con fixture nuevo (`154-text-button-*`):
   **0 fallas en oscuro y claro**. `app/ui-system.css`, `Refs #154`.
2. **[Baja · a decisión del dueño] CTA de la landing con gradiente.**
   Blanco sobre el extremo claro del gradiente (`#c05fd8`): **3.36:1** medido por
   el audímetro (3.58:1 por cálculo directo) para 14 px/750; el extremo oscuro
   pasa 5.85. Propuesta sin perder la marca: arranque `#a94bbf` (**4.72:1**;
   ~4.4 con el hover `brightness(1.04)`) o `#a344b8` (**5.15:1**). Es un cambio
   de marca: no se aplica sin aprobación.
3. **[Baja · corregido] `.demo-tag` de la landing.** `#8b718f` sobre `#fbf8fc`
   = **4.1:1** (8.5 px). Corregido a `#75607a` (**5.37:1**) en
   `public/scale-os.html`.
4. **[Info] Falsos positivos del audímetro en la landing:** el titular con
   gradiente (`-webkit-text-fill-color: transparent`) y el eyebrow sobre la
   sección oscura (7.75:1 real) no son fallas.

## Evidencia

- `docs/qa/testeos-169/` — 92 capturas: live 390/430/1440 claro/oscuro y
  fixtures de skeletons/vacíos (390/1440 × claro/oscuro).
- `work/visual-harness/al4/testeos-169.json` (checks) y `contrast-169.json`
  (mediciones AA).
- Scripts reproducibles: `build-tools/visual-harness/qa-dsn-154.mjs`,
  `qa-dsn-contrast-154.mjs`; fixture `build-tools/visual-harness/fixtures/al4-a11y-154.mjs`.

Nota: el issue menciona `docs/qa/testeos-168/`; esta pasada corre sobre la
**v1.0.169** (producción ya actualizada) y la evidencia queda en
`docs/qa/testeos-169/` según la coordinación.

## Pendiente

- CTA de la landing (hallazgo 2): decisión de marca del dueño.
- Sin otros hallazgos DSN; el resto de los dominios sigue su propia campaña.

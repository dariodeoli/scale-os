# #241 — Legibilidad de acciones y selector de empresa

Fuente: rama `codex/ui-button-readable`, basada en `e80899db`. Evidencia sintética local; no representa un deploy.

El botón canónico conserva su ancho natural mediante `flex-shrink:0`, con `max-width:100%` y wrapping de texto largo existentes. No agrega wrappers, variantes ni props. Una clase de composición `shrink` puede optar explícitamente por contraerlo.

Inventario aplicaba cuadrados 44px a todos los botones, incluido «Editar». Sus constantes de tamaño ahora apuntan exclusivamente a `data-ui-icon-button` y al trigger de menú con `aria-haspopup=menu`; no cambian permisos ni callbacks. El encabezado tenía además un problema independiente previo: `.workspace` podía medir 479px con un nombre largo. El máximo de ancho se acota sólo dentro de `.topbar-company`; el nombre conserva texto completo y tooltip y trunca visualmente con ellipsis.

La prueba Chromium compila Tailwind real y renderiza fragmentos extraídos del JSX actual: pie/acciones de inventario, pie de ProjectCard y botones Comentarios/Archivar/Editar, wrapper/trigger de empresa. Las funciones de negocio se sustituyen por callbacks sin efectos; los objetos Button/IconButton/IconAction y menú son reales. Agrega casos de texto sin espacios, children ricos directos y una composición que opta por shrink. La comparación «antes» restaura exclusivamente los estilos defectuosos en el contexto aislado y vuelve a retirar esa hoja antes de capturar.

Resultados en claro, oscuro y contraste, a 1440 y 390px:

- «Editar» conserva una sola línea: aproximadamente 89×40px en escritorio y 89×44px móvil.
- «Comentarios» y «Archivar» conservan palabras enteras; el pie de ProjectCard puede envolver sus acciones.
- Iconos y menús móviles mantienen targets de 44px.
- Tokens largos y contenido rico se ajustan sin overflow; no cambia la anatomía SVG/div de los children.
- Selector de empresa: 479→240px en la columna de prueba, nombre completo conservado, ellipsis y cero overflow de página.

Verificaciones ejecutadas:

```sh
./node_modules/.bin/tsx --test tests/ui-button.test.tsx tests/ui-tokens.test.mjs tests/ops-v2-contract.test.ts tests/inventory-cards-103.test.ts tests/inventory-compact.test.ts
SCALE_QA_ARTIFACT_DIR=/tmp/scale241-button-readable ./node_modules/.bin/tsx --test tests/ui-button-browser.test.tsx
QA_OUT=/tmp/scale241-button-readable/tokens QA_TAILWIND_CSS=/tmp/scale241-button-readable/tailwind.css node build-tools/qa-ui-tokens.mjs
./node_modules/.bin/tsc --noEmit --incremental false
```

12 pruebas focales PASS; 3 pruebas de Button en Chromium PASS (incluye seis combinaciones de tema/ancho para legibilidad); seis escenarios adicionales del navegador de tokens PASS; TypeScript y diff-check PASS. El CSS Tailwind del último comando se genera con `tailwindcss -i app/tailwind.css -o /tmp/scale241-button-readable/tailwind.css --minify`.

Artefactos: `/tmp/scale241-button-readable/button-readability-metrics.json`, `button-readability-{light,dark,contrast}-{1440,390}.png` y `tokens/report.json`. Capturas generadas por Chromium, sin retoque. El refresh de hashes de acciones se reserva para la integración final del paquete numérico.

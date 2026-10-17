# Tokens locales de Scale — #241

`app/ui-tokens.css` es la fuente local de roles de color, temas y métricas.
Se carga después de la hoja de la dependencia instalada y antes de las reglas
locales de anatomía. `ui-system.css` conserva los objetos; las hojas de módulo
conservan layouts y estados de negocio. No se cambió la dependencia compartida.

## Colores y compatibilidad

- `--ui-color-*` almacena canales RGB por rol. El color legacy usa
  `rgb(var(--ui-color-…))`; el alias `--c-*` conserva canales sin envolver.
  No usar un HEX donde un consumidor espera canales ni sustituir una familia
  completa por la otra.
- El tema claro vive en `:root`; oscuro y contraste sobrescriben roles en
  `html[data-theme]`. No se cambió cómo se elige o persiste el tema.
- Algunas equivalencias cambian de rol según el tema por compatibilidad:
  `--c-fore` usa text-strong en claro y text en oscuro; `--c-ink-900` usa
  surface-subtle en claro y canvas-elevated en oscuro. No se igualaron colores
  parecidos que tenían contratos distintos.
- `--c-pass` sólo se sobrescribía en contraste: se conserva esa frontera, sin
  introducir un valor local en claro/oscuro que tape el de la dependencia.
- `--on-brand`, `--on-success`, `--on-warning` y `--on-danger` proporcionan tinta
  sobre relleno. Los tokens `--c-*-text` tienen otra función: texto sobre
  superficie o tinte suave. Un tono de relleno no sustituye automáticamente
  su tinta legible.
- Se preserva el borde oscuro efectivo `#867493`, corregido anteriormente para
  ≥3:1, en vez del valor antiguo `#5d4b66` que quedaba sobreescrito.
- El canvas del shell usa canvas-elevated→canvas. **Corrección de T09:** en
  contraste ambos extremos son negros; desaparece el inicio claro literal.
  El foco de `.secondary` usa el anillo sólido, no el halo translúcido.
  La acción destructiva rellena usa su tinta semántica en los tres temas.

## Métricas y variantes

| Rol | Contrato preservado |
| --- | --- |
| Espaciado | 4, 8, 12, 16, 20 y 24px; aliases `--ui-space-1…6` |
| Controles operativos | 40px; a ≤760px, 44px |
| Página | 16px; desde 768px, 24px; desde 1280px, 32px |
| Card/panel | Padding 16/20px; móvil 14/16px. Card radius 12; native radius 8; control operativo radius 10 |
| Dialog/pill | Dialog alias del radius-lg 18; pill 999. Anatomía y safe area siguen en Dialog |
| Auth | Control 48, radius 12 y superficie inversa propia; no se hizo más denso |
| Foco | Anillo sólido3, offset2; halo como efecto adicional |
| Tipografía/transición | Familia Outfit/Arial y DM Mono; duración rápida 160, normal 180, easing ease |

Los breakpoints siguen siendo **condiciones literales**, no variables CSS que
no podrían evaluarse en `@media`. Se preservó el comportamiento de 760/768 y
el sheet 540; no se normalizaron todavía todos los módulos. Los queries de
contenedor 560/900 son otro contrato y permanecen junto al layout del formulario.

`Button`/`IconButton` nuevos se optan con `data-ui-button`, variantes
primary/secondary/outline/ghost/danger, colores brand/neutral/success/warning/danger,
y tamaños compact/medium/large. Usan hooks de la fundación acordada con su dueño,
sin añadir clases legacy ni migrar consumidores desde este lote. Compact 32
conserva 44 en móvil o puntero coarse; medium usa el control operativo y large 48.
Icon-only tiene ancho y alto del mismo tamaño. Disabled/loading mantienen
semántica nativa en el componente; CSS define su presentación y reduced-motion.

El grupo `.ui-temporal` dispone input flexible y botón de picker en una sola
superficie con borde. El control interior no agrega un segundo borde. No se
oculta el indicador nativo: si `showPicker` no existe, la entrada manual y el
control del navegador siguen disponibles. La validación civil y la interacción
pertenecen al componente temporal, no a CSS.

## Verificación y límites

- Los tests de contraste conservan sus pares y umbrales AA/AAA; ahora resuelven
  aliases desde la fuente única. Los de densidad siguen verificando alturas,
  gutters y límites, incluidos 760/761/767/768.
- `tests/ui-tokens.test.mjs` verifica compatibilidad legacy/RGB, dueño único de
  declaraciones globales, canvas de contraste, foco y contrato `hidden` de
  PersonSheet. Está registrado en el fragmento 92 de regresión.
- Para la comprobación computada local:

  ```sh
  npx tailwindcss -c tailwind.config.mjs -i app/tailwind.css -o /tmp/scale241-tailwind.css
  node build-tools/qa-ui-tokens.mjs
  ```

  Usa Chromium, CSS de la dependencia instalada, hojas locales, utilidades
  generadas y fuentes públicas locales. No necesita cuenta ni backend. Comprueba
  tres temas × 1440/390, pares de texto de los 25 botones tono/variante por escenario,
  foco por teclado, alturas, bordes del temporal, tabs ocultos y overflow.
  La medición estabiliza las transiciones con reduced-motion. Reporte y capturas
  se guardan fuera del repo; se puede indicar `QA_OUT`, `QA_TAILWIND_CSS` y
  `CHROME_PATH`.

El harness emplea markup sintético de los contratos visuales. No acredita
navegación autenticada, permisos, validación civil ni picker nativo en todos los
navegadores; esas interacciones y la adopción de consumidores corresponden a
los lotes propietarios y a la QA integrada. Los módulos todavía tienen estilos
legacy deliberadamente conservados. No se eliminaron reglas de dominio ni se
hizo publicación, cambio de versión o deploy.

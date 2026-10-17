# #241 — Button con clases heredadas

Base: `599c4418`, campaña local de biblioteca sobre Scale 191. Este lote modifica
CSS de presentación y pruebas, sin migrar JSX, permisos, handlers, navegación,
versión, dependencias ni publicación.

## Contrato elegido

El `Button`/`IconButton` local conserva `className` y los hijos directos. Sus props
`variant`, `color` y `size` son dueñas del tono, borde, radio, fuente, altura y
padding. `className` puede seguir definiendo layout/contexto. Las clases antiguas
`primary`, `secondary`, `text-button`, `icon-button`, `danger`, etc. ya no deciden
la presentación cuando el elemento tiene `data-ui-button`.

Las reglas visuales del propio botón se restringen con
`:not(:where([data-ui-button]))`. El filtro agrega **cero especificidad** y no
se usa `!important` nuevo. En reglas mixtas se conserva la parte de layout sin
ese filtro y se separa la presentación. Las reglas de composición de b/span/svg internos se conservan: el filtro se
aplica al botón objetivo, sin excluir sus ancestros para estilizar hijos ricos.
Los anchors, controles aún nativos,
inputs, labels y contenedores siguen recibiendo sus reglas anteriores. Los
`!important` heredados permanecen en su rama legacy, excluida del canon.

Las cinco variantes y los tres tamaños tienen reglas explícitas. Esto cubre
las utilidades visuales retenidas del código actual, incluso hover/focus, sin
subir especificidad mediante atributos repetidos ni listas de pantallas sobre
el componente canónico. Los selectores se basan en props reales del API.

El caso de acceso usa `size="large"` para 48px; es una decisión del consumidor,
no una excepción CSS a la clase `login-card`. Los ajustes de adopción pertenecen
al dueño de la migración JSX. La presentación nativa de acceso todavía se
conserva hasta que ese consumidor se migre.

Se retiró el hook huérfano `data-ui-button-label`: Button no envuelve sus hijos.
La fixture de tokens ahora renderiza Button/IconButton reales mediante SSR,
con hijos directos. Se conservan `.ui-form-fields` y la regla `hidden` de las
pestañas de PersonSheet.

## CSS revisado y cambiado

Las referencias corresponden a las hojas locales. Cada cambio de esta tabla
se limita a aislar presentación de botones; se mantienen los valores legacy,
las condiciones media y el layout salvo la ampliación táctil indicada al final.

| Archivo | Presentación aislada / layout conservado |
| --- | --- |
| `app/globals.css` | Base de button, primary/text/choice, Google y acceso, switcher y acciones. Se conservan posición, anchura de formulario, margen y composición. |
| `app/ui-system.css` | Legacy de acciones, iconos, dropdowns y estados; canon explícito por prop. Se conservan grids, wrappers de formularios, tablas y temporal compuesto. |
| `app/tailwind.css` | Reset nativo y colores heredados de navegación. Utilidades y configuración siguen intactas. |
| `app/qa-fixes.css` | Primary/secondary/remove/choice y controles de foto. Se conservan filtros y viewport. |
| `app/mobile-forms.css` | Alturas/padding heredados de acciones; labels, límites de formulario y geometría del popup permanecen. |
| `app/dialog.css` | Apariencia de cierre y footer; se conservan flex/grid, anchuras, safe areas y anatomía del diálogo. |
| `app/operations.css` | Choice, menciones, dropdowns, acciones de formulario y stepper; se conservan filas, columnas y textos. |
| `app/control-center.css` | Acciones compactas, señales y controles de kanban; se conservan disposición y filtros de Producción. |
| `app/client-directory.css` | Geometría/tono de acciones de filas/cards; se conservan pistas y ubicación de acciones. |
| `app/client-identity.css` | Apariencia/foco de acciones personales del pie; se conservan posición, detalles y composición. |
| `app/cliente/portal.css` | Botones y estados visuales de portal; se conservan formulario, entregas, anchors y superficie editorial. |
| `app/superadmin/platform-admin.css` | Acciones, navegación y peligro; se conservan paneles, carriles, flex de formularios y datos. El ajuste de hijos `.ui-form-fields` es otro lote y debe conservarse al integrar. |
| `app/assignee-picker.css` | Botones de asignación/quitar y sus estados; se conservan lista, búsqueda, chips y selección. |
| `app/commenting.css` | Acciones/menciones; se conservan composer y layout de opciones. |
| `app/company-legal-profile.css` | Altura heredada de acciones; el perfil legal mantiene su grid. |
| `app/company-settings.css` | Botón de predeterminado y disabled; se conservan filas y configuración. |
| `app/contracts-workspace.css` | Altura heredada de botones; tarjetas, preview y revisión se mantienen. |
| `app/drive-links.css` | Acciones de enlaces; chips, URLs y filas conservan estructura. |
| `app/employee-tasks.css` | Alturas de acciones; se conservan cards, tabs, filtros y detalle. |
| `app/entity-picker.css` | Wrapping heredado de choice; la composición de opciones permanece. |
| `app/finance-balance.css` | Dimensión de acciones financieras; no se cambian dinero, columnas ni cálculos. |
| `app/manual.css` | Acciones/disabled en preview; se conservan contenido, permisos e inercia. |
| `app/photo-cropper.css` | Dimensión de acciones de foto; se conservan crop, zoom, viewport y controles nativos. |
| `app/productivity.css` | Apariencia de filas accionables y previews; se conservan drawer, listas y estructura de revisión. |
| `app/project-card.css` | Altura heredada de acciones; no se modifica anatomía de la card. |
| `app/search-field.css` | El clear conserva flex, usa IconButton y tiene mínimo táctil 44px en ≤760/coarse. |
| `app/settings-slice.css` | Acciones, dropdowns y foco; se conservan paneles, navegación y agrupación de ajustes. |
| `app/team-access.css` | Acciones y estado visual; el layout de accesos/permisos permanece. |
| `app/theme-toggle.css` | Presentación heredada del botón; posición de acceso y variantes de contexto permanecen. |
| `app/ui/select.css` | Presentación legacy del trigger/acciones; wrappers, labels, popup y reglas nativas siguen vigentes. |
| `app/work-checklist.css` | Botones y estados de checklist; se conservan layout, progreso y campos. |

No se activó ni eliminó `reports-workspace.css`, hoja sin import activo en esta
base. Si se vuelve a incorporar, deberá migrarse su presentación con su dueño.

## Verificación

- Comparación de fuente contra 599c: **6592 declaraciones nativas** de 31 hojas.
  Sólo hay dos diferencias deliberadas: `min-width` y `min-height` 44px del clear
  bajo la nueva condición móvil/coarse. No se alteraron los demás valores,
  prioridades heredadas ni condiciones de layout.
- Chromium usa **Button/IconButton reales renderizados por SSR**, estilos
  instalados, hojas locales y Tailwind generado. Se conserva el className real
  de 16 casos: workspace, finanzas, toolbars, footer de diálogo, login/Google,
  acceso, portal, superadmin, lookup, equipo, clear, utilidades, select y ajustes. Se verifica además que
  el nombre dentro del botón de perfil conserva nowrap/ellipsis.
- Matriz de 18 escenarios: claro/oscuro/contraste × 390/760/761/767/768/1366.
  **1056 comparaciones** de estilos normales, disabled, loading, hover y foco
  entre el canon sin clases y las mismas props con clases heredadas. Se prueban
  también targets coarse 44px en viewport 1366.
- **96 comparaciones de botones nativos antes/después** en 390/1366 y tres temas.
  Única diferencia esperada: el clear nativo también pasa de 32 a 44px en móvil
  (tres muestras, una por tema). El harness registra esas diferencias explícitas;
  cualquier otra divergencia falla.
- Matriz de tokens: seis escenarios y 150 pares de texto/fondo, foco, temporal
  con un borde, pestañas ocultas y overflow. Ahora usa el renderer real del botón.
- Tests de contrato nuevos en `tests/ui-action-styles.test.mjs`, fragmento 94.
  Las pruebas históricas de controles nativos pueden leer la rama legacy con
  `legacyButtonCss`: sólo retira el filtro de especificidad cero y reúne mitades
  adyacentes de layout/presentación, sin cambiar declaraciones, valores ni media
  queries. Las pruebas canónicas y el navegador inspeccionan CSS real, sin ese
  adaptador. El guard de comentarios sigue leyendo el archivo original.

Comandos locales:

```sh
npx tailwindcss -c tailwind.config.mjs -i app/tailwind.css -o /tmp/scale241-actions-tailwind.css
QA_BASELINE_SHA=599c4418 node build-tools/qa-ui-action-styles.mjs
node --test tests/ui-action-styles.test.mjs
node tests/ui-system.test.mjs
```

`QA_OUT`, `QA_TAILWIND_CSS` y `CHROME_PATH` permiten seleccionar artefactos/binario.
`QA_BASELINE_SHA` es opcional y sólo consulta git local para controles nativos;
no crea datos ni llama APIs. Reporte y capturas se escriben fuera del repositorio.

## Límites de esta entrega

Son fixtures contextuales con CSS real, no navegación autenticada ni validación
de permisos o picker nativo. Los hijos, eventos, submit y estados semánticos
pertenecen al componente y conservan sus propias pruebas. La migración de JSX y
las props de tamaño/color de cada acción se revisan en el candidato integrado.

La regresión amplia de esta base se detuvo en el contrato antiguo `ariaLabel`
de SearchField en `team-toolbar-density`, anterior a este cambio CSS. TSC de 599c
reportó sólo exports de `./smart-field` sin ese módulo presente en esa base.
Ambos necesitan los lotes de migración ya coordinados por el integrador; no se
modificaron archivos de otro dueño para silenciar esos errores. Focales de este
lote y las verificaciones de CSS se acreditan por separado. No se ejecutó deploy.

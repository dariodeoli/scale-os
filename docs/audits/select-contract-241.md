# Selector local — Refs #241

## Modelo consolidado

`SelectCustom` y su `PlainSelect` interno en `app/profile-controls.tsx` siguen siendo el único selector simple de Scale. No se crea un segundo selector ni se cambia el API scalar `value/onChange(string)`.

Ampliaciones opt-in de `SelectProps`: `kind`, `loading`, `error`, `searchable`, `loadingText`, `emptyText`, `noResultsText`. `SelectChoice` añade `disabled`; ya disponía de `secondary`, `searchText`, `photoUrl` y `kind`.

- `kind:'entity'` explícito, en selector o elecciones, evita confundir logos con fotos de personas por heurística. La selección de personas explícita tiene prioridad sobre la inferencia; un selector de entidades puede forzarse mediante su prop.
- La búsqueda simple incluye label, secondary y searchText con plegado de acentos. Mantiene umbral histórico de más de8 opciones salvo `searchable` explícito.
- Opciones simples muestran dato secundario e imagen opcional con clase de logo/avatar según kind. Imagen decorativa sin texto alternativo duplicado. Sin CSS nuevo: clases quedan disponibles para tokens del sistema local.
- Opciones disabled son nativamente inhabilitadas y además no emiten cambios aunque se invoque el callback programáticamente. Navegación omite esas opciones. La elección actual no se reescribe por quedar disabled.
- Loading/error/empty se presentan en el menú simple sin opciones seleccionables, sin borrar valor actual ni disparar normalizaciones. Error utiliza rolealert y carga/vacío rolestatus.

## Teclado del selector simple

- Flechas/Home/End recorren solamente opciones habilitadas y no fallan cuando no quedan opciones.
- Apertura enfoca selección habilitada; si no existe usa primera opción habilitada.
- Escape cierra, detiene propagación al diálogo y devuelve foco al trigger.
- Tab/ShiftTab cierra y sale al control siguiente/anterior del orden del formulario respecto del trigger. Como el menú vive en un portal, se calcula el control adyacente visible y habilitado, excluyendo menú; no vuelve al trigger. Si no existe control adyacente no se impide el comportamiento nativo del borde.
- Home/End dentro del buscador mantienen su comportamiento de edición del texto.

## Modelos distintos que se conservan

`PersonSelect` sigue componiendo `BuscadorPersonas` con su contrato actual. No se inspeccionó ni modificó la dependencia. Sus estados de búsqueda y opciones deshabilitadas no se acreditan por estas ampliaciones de PlainSelect: los consumidores de personas deben seguir usando sus permisos/listas reales, sin asumir nuevas capacidades externas.

AssigneePicker y selección múltiple gestionan pertenencias/varias identidades; no se sustituyen por el selector scalar aunque visualmente se parezcan. Los selects HTML nativos de documentos tampoco se migran automáticamente por similitud.

## Evidencia y límites

`tests/plain-select-contract-241.test.tsx` prueba interacción mediante react-test-renderer, portal sustituido únicamente en test y DOM mínimo controlado: refs de trigger/menú, búsqueda, logo explícito, disabled nativo/callback, selección, flechas y cierre/foco. Se registró en fragmento propio `92-dsn-selector-contract-241.list`.

Foco real de navegador, orden con tabindex positivo, interacción con el focus trap del diálogo, lector de pantalla, teclado móvil, recorte/scroll y layout de imágenes requieren verificación visual integrada; el fake DOM no los acredita. Sin backend, endpoints, campos de negocio, CSS ni producción modificados.

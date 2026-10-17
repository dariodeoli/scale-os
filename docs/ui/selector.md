# Selector local — #241

`app/ui/select.tsx` es el único motor de selección de estas fachadas y adaptadores:

- `SelectCustom`, `PlainSelect` y `PersonSelect` en `profile-controls.tsx`.
- `EntityPicker`: conserva las opciones visibles en línea y el contexto de negocio de cada fila; su variante de personas utiliza la misma fachada.
- `AssigneePicker`: conserva selección principal, límite de 100, IDs ausentes y las reglas de actualización en su adaptador; la búsqueda, las opciones y los checkboxes usan `Selector`.

No consulta endpoints, decide permisos ni guarda datos. `AmountInput` conserva su implementación previa.

## Contrato

`Selector` recibe `options: {value, primary, secondary?, avatarUrl?, kind?, searchText?, disabled?, pinned?}[]`. `kind` y `variant` aceptan `plain`, `person` y `entity`; las dos últimas variantes dibujan el avatar canónico `FotoPerfil`. `pinned` conserva una acción explícita como «Sin asignar» visible durante la búsqueda. El tipo explícito de una opción prevalece sobre la variante de la lista. El texto de la etiqueta y la presencia de una URL nunca clasifican personas.

`value` y `onChange` son controlados: string en selección simple y string[] con `multiple`. Seleccionar otra opción conserva los IDs seleccionados que ya no están disponibles; se informa ese estado en vez de borrarlos. El adaptador puede presentar su propio tratamiento mediante `showMissingSelection={false}`.

`presentation="popover"` usa un botón con `aria-haspopup="listbox"`, portal y posicionamiento acotado a la ventana. Dentro de un diálogo el portal pertenece a ese mismo diálogo. `presentation="inline"` mantiene las opciones visibles; la selección múltiple utiliza checkboxes nativos. `renderOption` y `renderValue` permiten composición sin reemplazar la lógica de selección.

`searchable`, `searchLabel`, `searchPlaceholder` y `searchText` controlan la búsqueda local, que incluye los textos primario y secundario y pliega acentos. `disabled`, `loading`, `error`, `invalid` y `describedBy` se aplican al control real. Los textos de carga, origen vacío, búsqueda sin resultados y selección ausente son configurables.

## Teclado y foco

Flechas abren el menú y recorren opciones habilitadas. Inicio/Fin recorren opciones, salvo dentro del campo de búsqueda donde conservan su función de edición. Escribir desde una opción enfoca la búsqueda; Enter en búsqueda selecciona el primer resultado habilitado. Enter/Espacio en una opción utilizan el botón nativo. En selección múltiple el menú permanece abierto.

La selección simple y Escape restauran el foco al botón. El primer Escape cierra el selector y el siguiente llega al diálogo. Tab cierra el menú y continúa desde el botón. No se intercepta Escape con el menú cerrado.

## Migración de consumidores

La API previa de `SelectCustom` se conserva y añade `variant`, `loading`, `error` y `choices[].disabled`. La clasificación transitoria usa exclusivamente `variant` o `choices[].kind`; sin metadata explícita se presenta como `plain`. Los consumidores que antes dependían de palabras como «responsable» o de `photoUrl` deben declarar `variant="person"` o `kind: 'person'`; la migración de esos consumidores se integra por separado. `PersonSelect` declara la variante de forma explícita y usa este mismo motor.

La composición de filas de entidades y responsables permanece en los adaptadores porque presenta contexto, fichas, responsable principal y restricciones de dominio. No introduce otro motor de búsqueda o selección.

## Validación focal

- `tests/ui-select.test.tsx`: selección controlada, ausentes, búsqueda por acentos/metadata, estados y clasificación explícita.
- `tests/ui-select-browser.test.mjs`: Chromium real, teclado, búsqueda, multi, foco, portal, Escape, errores, carga, deshabilitado y límites de ventana 1366/390. Usa componentes locales y un servidor descartable; no usa cuentas, APIs ni proveedores.
- Pruebas existentes de `AssigneePicker`, `EntityPicker`, diálogos, posicionamiento, responsables de registros y montos.

La prueba aislada acredita interacción y geometría del selector; la revisión visual del catálogo y de los consumidores con los estilos completos corresponde a la integración.

## Consumidores declarativos — lote completo #241

`OptionsSelect` en `app/ui/options-select.tsx` convierte children `<option>`, arrays, fragments y `<optgroup>` en datos del mismo `Selector`. Respeta valores numéricos convertidos a string, texto compuesto, label explícito, deshabilitado por opción/grupo y metadata `data-kind`, `data-photo-url`, `data-secondary`, `data-search-text`. Los grupos conservan su rótulo visible.

La fachada recibe `label`, `value`, `onChange(string)`, `id`, `className`, `disabled`, `loading`, `error`, `required`, `invalid`/`aria-invalid`, `describedBy`/`aria-describedby`, `hideLabel` y `onBlur()`. El ID pertenece al botón real; los rótulos externos conservan su destino. `required` informa el estado requerido mediante ARIA: los esquemas y los gates existentes validan el formulario. No es un select nativo ni ofrece equivalencia genérica de FormData, constraint validation o ref de HTMLSelectElement. Los consumidores migrados no dependían de esas funciones y siguen controlados; no se agregan proxies ocultos ni eventos simulados.

`onBlur` se emite una sola vez después de que el foco sale de todo el widget, incluyendo su portal. Abrir, buscar, seleccionar o cerrar con Escape y volver al trigger no marca touched. Se comprueba la posición final del foco tras un frame, incluyendo el caso de cerrar un portal cuyo nodo enfocado desaparece por un click externo.

| Archivo | Controles migrados |
| --- | ---: |
| `client-commercial-lifecycle.tsx` | 1 |
| `client-directory-toolbar.tsx` | 1 |
| `client-reporting.tsx` | 6 |
| `demo-toolbar.tsx` | 2 |
| `phone-field.tsx` | 1 |
| `privacy-panel.tsx` | 1 |
| `quote-composer.tsx` | 3 |
| `sections/pipeline.tsx` | 3 |
| `sections/produccion.tsx` | 1 |
| `superadmin/agencies.tsx` | 1 |
| `superadmin/audit.tsx` | 1 |
| `superadmin/errors.tsx` | 2 |
| `superadmin/inquiries.tsx` | 1 |
| `superadmin/reports.tsx` | 1 |
| `superadmin/usage.tsx` | 1 |
| `ui-v2.tsx` | 1 |
| **Total** | **27** |

Son los 23 Select de la dependencia y los cuatro selects nativos previos (incluido país). El inventario AST en `tests/options-select.test.tsx` verifica que no quede select nativo/import Select externo en la aplicación, que las fachadas tengan label/value/onChange explícitos y que no dependan de ref o eventos de select.

Clientes y planes declaran kind entity; colaboradores, person. Los clientes usan logo cuando el dato ya está disponible, sin pedir contactos ni ampliar endpoints. El teléfono conserva los 12 códigos, el valor internacional desconocido/parcial, el bloqueo pendiente y el ref al input nacional. Su campo nacional mantiene el espacio en la grilla de 390/1366.

`tests/options-select-browser.test.mjs` acredita en Chromium el label/ID real, optgroups deshabilitados, teclado, 4 transiciones de foco (portal/selección/Escape/salida), el gate real `quoteReadiness`, teléfono/ref/pending y geometría. Las suites de reporting y lifecycle conservan comprobaciones de versiones, permisos y payloads; no se cambian esquemas ni permisos.

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

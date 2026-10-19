# Auditoría de Recursos — #265

Rama `codex/responsive-resources-265`, base `f2d52f5e` (1.0.194).

## Hallazgo corregido

La cabecera de las tarjetas de inventario reunía selección, foto de 56 px,
identidad y estado en una sola fila. En 320 px el nombre se reducía a unas
pocas letras, aunque la página no tuviera overflow horizontal.

La cabecera ahora usa columnas para foto, identidad y selección. El estado
queda bajo la identidad; la fotografía, el código, la categoría, la ubicación,
la propiedad, el importe, la verificación y las acciones siguen disponibles.
No cambia el catálogo ni las mutaciones, permisos o contratos del API.

También se acorta la pestaña a «Reservas»: «Calendario y reservas» excedía el
carril visible en 320 px al recibir foco con Tab. El título interior conserva
«Calendario y reservas». Las dos pestañas ahora caben y el foco queda visible.

## Evidencia local

`node build-tools/qa-resources-responsive-265.mjs` monta los componentes reales
InventoryWorkspace, PeopleWorkspace y StudioWorkspace, y los bloques reales
SettingsWorkspace / IntegrationSettings / ExchangeRateSettings. Usa Chromium,
CSS del proyecto y Tailwind compilado, con HTTP sintético local, sin datos reales.

- Viewports: 320, 390, 768, 1024 y 1440 px.
- 20 casos de superficies: inventario, equipo, estudio y bloques de configuración.
- 15 casos de diálogos: agregar equipo, agregar persona y nueva reserva de estudio.
- Sin overflow del documento ni elementos cortados fuera de los carriles que
  deliberadamente permiten desplazarse (tablas y pestañas).
- Sin excepciones JavaScript durante los escenarios.
- Foco por teclado desde Equipos a Reservas visible, completo dentro del carril,
  en los cinco anchos.
- Solo lecturas GET a fixtures; no se confirma ningún formulario.
- Ancho del título de inventario tras el cambio: 134 / 204 / 124 / 252 / 258 px,
  respectivamente. El test comprueba un mínimo de 95 px con nombre largo.
- Capturas y geometría: `/tmp/scale265-resources/`, `report.json`.

No aparecieron defectos geométricos nuevos en los bloques de equipo, estudio y
configuración medidos; se preservan sin modificaciones de producto.

## Límites

Es una auditoría de componentes y altas con fixtures, no del shell autenticado
completo ni de producción. No cubre empresa legal, suscripción, privacidad,
zona de peligro, edición de todos los tipos de registro, datos de terceros,
teclados físicos de móviles o dispositivos físicos. Las tablas conservan
columnas y desplazamiento horizontal local; no se ocultan datos para encajar.

El build completo y la validación del árbol integrado corresponden al integrador.
Deploy pendiente de integración, CI y publicación de la entrega del issue #265.

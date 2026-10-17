# QA local — modelos de contratos y fichas legales (#220)

Fecha: 17/10/2026, zona de referencia America/Asuncion. Código: agregado `8b35d27a`, más mejoras de edición `16aba7bb` y precisión comercial `7a914a4d`, en checkout QA aislado `codex/qa-modelos`. No se modificó código de producto durante QA.

Se ejecutó Chromium 154 real contra Next dev y API con PostgreSQL 17.11 nativo, usando únicamente una empresa y clientes sintéticos locales. Viewports 1440 × 1000 y 390 × 844; la emulación móvil no acredita dispositivo físico.

## Resultados comprobados

- Configuración → Mi empresa: guardado por formulario de ciudad, departamento, representante, documento y cargo; lectura posterior del API confirma persistencia. Identidad fiscal y domicilio de empresa se precargan desde configuración.
- Clientes: alta desde formulario real con razón social, RUC, tipo de parte, documento, domicilio contractual, ciudad, departamento y representante/cargo. El GET posterior confirma los datos guardados.
- Catálogo: modelos reutilizables disponibles sin identidad de ejemplo de cliente. Selección de «Producción audiovisual · paquete único» e importación como plantilla editable por interfaz.
- Contrato desde presupuesto: selección de cliente y presupuesto por interfaz; precarga de partes, representante firmante, entregables e importe decimal 600000.00. Los campos faltantes aparecen y bloquean la emisión.
- Edición manual por interfaz: importe negociado 550000 y plazo personalizado. «Completar solo campos vacíos» conserva ambos; guardado del borrador confirmado. Las restantes condiciones obligatorias se completaron mediante el API local para probar emisión, sin presumir condiciones comerciales del ejemplo.
- Revisión humana por interfaz y emisión 201. El PDF real respondió 200, firma `%PDF-`, A4 y 3 páginas; `pdftotext` confirmó ambas partes sintéticas y plazo manual. La versión emitida se mantuvo idéntica después de cambiar el importe del borrador.
- Contrato desde plan por interfaz móvil: entregables y precio 400000 copiados del plan. Formularios de creación desde plan y detalle emitido caben en 390 px sin desbordamiento horizontal y con acciones táctiles de 44 px como mínimo.

## Límite visual conocido

El botón preexistente «Volver arriba» de Configuración → Mi empresa mide 32 px de alto en 390 px; es el único objetivo táctil menor a 44 px en ese bloque. Los campos y acciones legales cumplen 44 px y no hay desbordamiento. Seguimiento en la campaña de layout #222; no es un fallo funcional del flujo de contratos.

## Evidencia y automatización

- Reporte principal: `/tmp/scale-contract-models-qa/report.json`: 54 registros, 51 PASS; una aserción visual fallida corresponde al botón «Volver arriba», y dos registros de error son el mismo fallo propagado por el control fail-fast, no tres defectos distintos.
- Capturas: `/tmp/scale-contract-models-qa/`, incluyendo formularios desktop, modelo, creación desde presupuesto, campos faltantes, detalle emitido desktop/móvil y plan móvil.
- PDF: `/tmp/scale-contract-models-qa/issued-model.pdf` (3 páginas A4).
- Runner de esta campaña: `/tmp/scale-contract-models-qa.mjs`; no se alteró el harness versionado.
- Los primeros intentos detectaron problemas del runner: campos dentro de acordeones cerrados, igualdad de importe con/sin decimales, selector ambiguo entre dos checkboxes y recarga automática de Chromium al alternar `isMobile`. Fueron corregidos en `/tmp`; no justificaron cambios de producto. El checkbox humano se verificó dentro del panel «Emitir versión», diferenciándolo de «Mostrar otros campos disponibles».

No se realizaron consultas a proveedores, cambios en producción, revisión jurídica ni pruebas en hardware. La aceptación legal del texto y los términos específicos del negocio requieren revisión del responsable antes de emitir contratos reales.

## Suplemento de ficha cliente móvil

`/tmp/scale-contract-models-mobile-report.json`: 4/4 PASS. En 390 px se recorrieron los pasos del editor móvil con «Siguiente» hasta el paso 4 (datos para contratos), se escribió un domicilio contractual visible y se midió el formulario: ancho 390 px, alto 743 px, región interior desplazable, sin desbordamiento horizontal. Las acciones cumplen 44 px; los enlaces de texto inline del aviso de privacidad miden 16 px y se registran como texto, excluidos de la aserción de botones. Captura: `/tmp/scale-contract-models-qa/client-legal-form-390.png`.

Resultado combinado: 55 aserciones PASS; un hallazgo visual preexistente de botón de 32 px pendiente en #222. Las dos entradas adicionales de error del reporte principal son propagaciones de ese mismo hallazgo. No se acreditó persistencia móvil adicional: la persistencia completa de los campos legales se verificó mediante alta desktop y lectura API.

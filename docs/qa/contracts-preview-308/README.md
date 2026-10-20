# Contratos: documento, ejemplo y PDF — #307/#308

El backend comparte un único renderer HTML A4 entre la vista previa profesional y el PDF de cada versión emitida. Diferencia explícitamente ejemplo con datos ficticios, borrador sin emitir y documento emitido. Escapa contenido, bloquea recursos externos/scripts y conserva las condiciones de revisión y emisión existentes.

## API para la interfaz

`POST /api/agency/contracts/preview` exige permiso de ver contratos. Para completar/editar fuentes o modelos también exige gestionar contratos. Un usuario de sólo lectura puede enviar únicamente `{contract_id}` para consultar el borrador guardado, con el mismo control de datos bancarios; no puede enviar overrides ni seleccionar otras fuentes.
Seleccionar exactamente uno de `model_key`, `template_id` o `contract_id`.

- Ejemplo: `{model_key:"marketing-monthly",sample:true}`. No admite clientes, colaboradores, banco, plan, presupuesto, variables o texto reales. Los datos ficticios no completan ni guardan un contrato real.
- Modelo/plantilla con datos reales: selector de origen, `client_id` o `collaborator_id`, opcional presupuesto o plan/banco, `variables`, `title` y `body` editados. Se validan tenant, disponibilidad y permisos de cada origen.
- Contrato existente: `{contract_id,title,body,variables,expected_revision?}`. Conserva sus contrapartes y fuentes; no permite sustituir IDs desde una vista previa.
- Respuesta: `{preview:{title,html,rendered_text,missing,simulated,draft:true}}`. Los campos faltantes aparecen como pendientes, sin inventar datos; esta respuesta no acredita emisión ni firma.

La selección de sólo un cliente completa su identidad y las condiciones vigentes que el rol puede consultar, aunque el acuerdo no tenga plan de catálogo. Plan o presupuesto explícitos mantienen su precedencia y controles existentes. Los catálogos incluyen logo del cliente y foto del colaborador mediante las URLs protegidas de medios.

El PDF definitivo continúa descargándose desde `GET /api/agency/contracts/:id/versions/:version/pdf`, únicamente después de completar/revisar/emitir. Se usa el texto inmutable de esa versión; editar el borrador no modifica un PDF emitido.

## Verificación

- `node backend/test-contracts.mjs`: PASS, con nuevos casos de aislamiento de ejemplos, contraparte/tenant/permisos, datos bancarios, escape HTML, borrador sin escritura/emisión, campos pendientes, revisión y logos/fotos. También autofill implícito del acuerdo con permiso y su exclusión sin permiso.
- `node backend/test-contract-models.mjs`: PASS para los cuatro modelos existentes.
- `PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium node backend/qa-contract-document.mjs`: PASS.20 casos (4 modelos×320/390/768/1024/1440), sin overflow horizontal ni variables sin resolver, y4 PDFs A4 reales con texto extraído por `pdftotext` y geometría verificada por `pdfinfo`.
- La primera ejecución del runner detectó que las cláusulas cuyo título y texto compartían bloque no se reconocían como encabezado. Se corrigió el renderer para separar la primera línea del párrafo; el runner conservó su aserción y aprobó después.
- Capturas adjuntas de ejemplo revisadas en1024 y390. Son HTML standalone del renderer; no acreditan rutas autenticadas, móviles físicos ni una impresora.

El runner escribe HTML/PDF y JSON en `CONTRACT_DOCUMENT_QA_OUTPUT` o `/tmp/scale-contract-document-308`. Sólo datos ficticios. Requiere Chromium, `pdftotext` y `pdfinfo`; no instala dependencias ni modifica la base. El gate completo, CI y deploy pertenecen al integrador; este informe no los declara aprobados.

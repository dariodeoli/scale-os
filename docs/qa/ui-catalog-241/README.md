# Catálogo visual local — #241

Ruta: `/biblioteca-ui`. Fuente basada en `52a9c6d2`; Next dev aislado en loopback para esta evidencia. No corresponde a un despliegue de producción.

La página server declara `noindex, nofollow`. El catálogo cliente importa los componentes desde `app/ui`, sin montar workspace, Editor ni módulos de negocio. Las 26 fichas se distribuyen en ocho familias: acciones, campos/números, contacto/consulta, temporales, selectores, formularios/overlays, colecciones e identidad/estados. Cada ficha documenta props actuales, ejemplos correctos/incorrectos sólo textuales, reutilización y límites UI/negocio.

Los datos son ficticios, los correos usan `example.invalid`, los logos son SVG embebidos y los estados sólo viven en memoria. La consulta por RUC es una simulación explícita de LookupField/LookupReview, sin proveedor, algoritmo fiscal ni catálogo de ciudades inventados. No se consultan identidades, roles, empresas o cuentas reales. La prueba del navegador intercepta y falla ante cualquier request API o proveedor; sí carga recursos locales de Next y fuentes de la aplicación.

El formulario sintético usa PendingFields, useSingleFlightSubmit, useFormFocus y SaveActions. La validación del ejemplo no redefine reglas de Scale. Se acredita el error con valor/foco conservado, bloqueo real pendiente, un solo intento ante doble submit y reintento explícito. El mismo formulario en Dialog conserva el borrador al pedir cerrar y ofrece seguir editando o descartarlo. Drawer es una variante del mismo Dialog. La confirmación reforzada sólo incrementa un contador local.

RootLayout ya monta el único NotificationCenter/ToastViewport: el catálogo llama a notify y no monta otro viewport. SaveActions registra pending/dirty para su formulario y su footer. La API adicional DialogFormState sirve para consumidores que ya poseen otro footer; no hace falta un segundo registro en este ejemplo.

El tema claro/oscuro/contraste se aplica temporalmente al atributo raíz, sin localStorage, y se restaura exactamente al desmontar. Los controles conservan sus estilos canónicos; catalog.css sólo organiza el catálogo.

## Verificación

- `npx tsx --test tests/ui-catalog.test.tsx`: 3 PASS. Cobertura de fichas, aislamiento de imports/requests/persistencia/modelos UI y restauración del tema anterior.
- `npx tsc --noEmit --incremental false`: PASS sobre esta fuente.
- `SCALE_CATALOG_URL=http://127.0.0.1:3013/biblioteca-ui node tests/ui-catalog-browser.test.mjs`: 39 comprobaciones PASS en la ruta Next real. Anchos 1366/390, tres temas, label/teclado/selectores, multiselección, focus/error/dirty/doble submit, Lookup con revisión y cola de toasts única. Cero requests API/proveedor y cero console/runtime errors. Detalle en [results.json](results.json).
- La ruta respondió HTTP 200. El integrador ejecutará build/CI del candidato conjunto; este agente no ejecutó release, merge ni deploy.

## Capturas

Las ocho capturas son artefactos locales en este directorio; `.gitignore` excluye imágenes de `docs/qa` para no inflar el contexto de build. Se versionan este informe y results.json, sin forzar las imágenes al repositorio. Las capturas provienen de Next en desarrollo; el indicador circular «N» es del framework y se conserva en la evidencia. No se ocultaron fallos ni se modificaron imágenes.

| Ancho real | Claro | Oscuro | Contraste |
| --- | --- | --- | --- |
| 1366 | [Vista](catalog-1366-light.png) | [Vista](catalog-1366-dark.png) | [Vista](catalog-1366-contrast.png) |
| 390 | [Vista](catalog-390-light.png) | [Vista](catalog-390-dark.png) | [Vista](catalog-390-contrast.png) |

- [Selectores · 1366 claro](selectors-1366-light.png).
- [Formulario · 390 oscuro](form-390-dark.png).

## Medición de color y límites

El harness espera 500 ms tras cambiar tema antes de medir/capturar. Los botones canónicos tienen una transición de 0,18 s. Una lectura inicial demasiado temprana encontró colores interpolados (texto 62/56/65 y fondo 175/92/191), que **no acreditaban un defecto en los tokens estables**. Se corrigió el momento de medición y se regeneraron las capturas; no se agregó un override local.

En oscuro estable, `#buttons [data-ui-button][data-ui-variant=primary][data-ui-color=brand]` tiene texto rgb(29,21,32), fondo rgb(192,107,208), opacity 1 y disabled false. `--ui-button-ink` usa `--on-brand`; danger usa el mismo texto sobre rgb(224,106,128). Los valores y variables completas de cada tema se registran en `results.json` dentro de styleSamples. La revisión visual/geométrica de este catálogo no sustituye una auditoría WCAG completa de cada combinación y estado.

Esta entrega no publica componentes externos ni afirma que se probaron servicios fiscales, correo, OAuth o datos de producción. Los ejemplos incorrectos nunca se montan ni ejecutan. El integrador refresca el manifiesto AST de acciones para registrar las nuevas fuentes del catálogo.

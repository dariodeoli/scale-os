# Validación mobile final — Scale OS 1.0.198

19/10/2026 · America/Asuncion. Refs #292, #295, #297; PR #302.

El portal conserva nombres y archivos extensos dentro de las tarjetas y utiliza
el tamaño del botón canónico. Comentarios y decisiones comparten el bloqueo de
envío; los dos borradores quedan protegidos mientras responde el servidor y se
pueden editar/reintentar después de un error. Cerrar sesión muestra un error
recuperable. Las pruebas negativas reprodujeron clipping, doble comentario y
pérdida de texto antes de esas correcciones.

## Artefacto comprobado

| Identidad | Valor |
| --- | --- |
| Versión | 1.0.198 |
| Commit preparado | `38da9866ac59964c8d0555fcb7d1da2d0f74ebb8` |
| Árbol compilado | `0dd12f1bb78ae3ba5b28b8f936ab62bcc6884f2b` |
| BUILD_ID servido | `_CwxQgq5vJLcAt0cJxDax` |
| Candidato de integración | `752e3a7c9cdf802af073524906d9d90dacf90f90` |

El árbol del commit preparado coincide exactamente con el capturado al compilar.
El candidato añade cinco archivos de QA/memoria; **los árboles completos son
distintos**, con código de runtime, configuración y lockfiles idénticos. El
[manifiesto](build-source.json) conserva los paths y la comprobación. Los campos
`sourceSha` de runners identifican su checkout al ejecutarse; el árbol y BUILD_ID
anteriores identifican el artefacto servido. Se verificó200 y contenido del
manifiesto Next de ese BUILD_ID.

Next de producción se sirvió en loopback3028. Un proxy local3027 conserva el
Host de la app para el middleware y lleva `/core-api` al API/PostgreSQL aislado
4127. El build conserva sus rewrites de producción; no se modificaron sus
artefactos para apuntar a QA. Superadmin se comprobó directamente en3028 con API
interceptada. Su primer intento a través del Host de app sin cookie interna fue
redirigido por la guarda existente; no se trató como un defecto del producto.

## Resultados

| Superficie | Resultado y evidencia |
| --- | --- |
| 25 rutas internas | **375 combinaciones únicas aceptadas**, cinco anchos × tres temas; mismo artefacto. [16 rutas](internal-layout-summary.json) + [9 secundarias](secondary-routes-summary.json). |
| Portal cliente, rutas Next reales | **42 PASS**, dos vistas × tres temas × siete geometrías; navegación real, texto de estrés y API sintética. [JSON](portal-next-results.json). |
| Superadmin, 12 secciones | **202 PASS**, incluye180 vistas, diálogos, menús, viewer y focales touch/landscape; API sintética. [JSON](superadmin-results.json). |
| Formularios internos | **35 combinaciones PASS**, siete flujos y75 aserciones;249 instancias de controles medidas. Componentes reales, transporte sintético. [JSON](form-actions-results.json). |
| Preferencias y datos legales | **94 comprobaciones PASS**, cinco tamaños; guardado/API/reload/restauración reales sobre PostgreSQL local. Un503 deliberado verifica error y reintento. [JSON](secondary-routes-summary.json). |
| Propiedad CSS | **1056 comparaciones PASS**,18 escenarios y0 diferencias entre botones canónicos y sus contextos. El gate queda incorporado al CI. [JSON](css-ownership-results.json). |
| Regresión local | **275 entradas /55 fragmentos PASS**; Next y tipos,64 páginas;61 scripts backend PASS;20 grupos browser PASS; presupuestos de acceso/registro PASS. |

Se revisaron capturas de muestra del [portal390](portal-light-detail-390.png) y
[superadmin390](superadmin-dark-390.png), además de las revisadas por los agentes.
Los JSON conservan registros por ruta/ancho/tema y distinguen los controles
pequeños candidatos a revisión de los hallazgos acreditados; no se afirma que
todos los controles de toda la aplicación midan44px.

## Contador público de Informes y resultado raw

La primera matriz de16 rutas produjo240 layouts sin hallazgos ni errores de
runtime, pero su resultado raw es **`passed:false`** por15 respuestas403 del
contador público: el adaptador `fetch` local no conservaba el Host solicitado.
Se preservan los15 errores, el hash del raw y su ruta en el resumen. No se
convirtieron silenciosamente en un PASS.

La [prueba de origen](local-origin-proof.json) con `node:http` confirma200 con
Host canónico,403 con Host loopback y403 cuando el Origin no está permitido.
Sin cambiar la aplicación, se repitió **sólo Informes en las15 combinaciones**
mediante un adaptador que conserva el Host y entrega la respuesta real del API
local: [15 PASS,0 errores HTTP/runtime](reports-focal-summary.json). La matriz
aceptada sustituye esos15 registros por el focal y conserva225 registros
originales:240 claves únicas. Junto con las135 secundarias, son375 claves de25
rutas sobre el mismo artefacto. No se fabricó ningún body de ese contador.

El [runner](browser.mjs) reproduce las16 rutas con el transporte local corregido;
usar `QA_ROUTES=/informes` limita la ejecución al focal. Requiere base loopback,
`QA_COMPILED_SOURCE`, `QA_BUILD_ID` y `QA_SESSION_FILE` con una sesión sintética
local; no versionar su contenido. La versión ejecutada en `/tmp` sólo difiere
en la ruta de resolución del paquete backend respecto a esta copia portable.

## Límites, integración y publicación

Chromium emula viewports, touch y orientación. **Safari/iPhone/iPad y Android
físicos siguen pendientes en #296**. No se acreditan teclado virtual físico,
OAuth real ni cada CRUD/rol de los módulos. Portal/superadmin usan fixtures de
API; las lecturas internas y los guardados de Preferencias/legal usan API y
PostgreSQL locales reales, sin datos de clientes de producción.

Los límites detallados de las siete acciones permanecen en
`docs/qa/mobile-actions-295/README.md`. Esta entrega no incorpora impresión del
PR #288. Sin migraciones ni cambios de permisos: una reversión debe preservar
comentarios, decisiones y demás registros.

CI, merge y publicación se acreditan por separado. Esta primera versión del
informe documenta el artefacto local y no declara todavía un deploy verificado.

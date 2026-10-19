# Resultado local de la auditoría responsive #265

Se completaron **240 casos de layout**:16rutas×5anchos(320/390/768/1024/1440)×3temas(light/dark/contrast), con720estados de scroll. Los240 casos pasaron geometría, imágenes visibles, contenido, ruta y foco;15casos abrieron el diálogo de cliente con Enter, recorrieron Tab, cerraron con Escape y comprobaron retorno de foco. No hubo errores de ejecución. No es evidencia de publicación.

El runtime probado corresponde al árbolGit `a64d05a6cbf366f3fc7350385517e1a629a6da19`, releasecommit `16d2278282ec8e4bbb7260966430d6e2030a067c`, versión1.0.195, BUILD_ID `dtP8bVHY7yhVbiap7bBxe`. El runner fue `0adf7612`, fuente de QA separada. Se confirmó200 del manifiesto estático de ese BUILD_ID en el servidor local. El integrador revisó tres capturas de muestra antes de ampliar la matriz.

La emulación usa touch+viewport móvil para320/390, touch+viewport de escritorio para768/1024(iPad), y puntero fino para1440. Cada snapshot confirmó `matchMedia('(pointer:coarse)')`; esto no acredita gestos en un dispositivo físico. La sesión demo y siete grupos de fixtures se verificaron antes de navegar. Una cookie inválida se probó por separado:401,0casos auditados y exit1, sin convertir el login en un PASS.

## Excepción de transporte local documentada

**El resultado raw de la matriz es `passed:false`**: hubo15respuestas403 de `/core-api/api/public/live-visitors/count`, una por combinación de ancho/tema en Informes. No hubo otros errores API. Se conservaron los403 y el resultado raw.

La causa es la allowlist de Host/Origin en `backend/live-visitors.js`: el Host loopback se rechaza por diseño. La [prueba de origen](live-count-origin-proof.json) muestra403con Hostlocal,200con Hostcanónico,200con Host+Origincanónicos y403con Hostcanónico+Originlocal, contra el mismo API local y sin sesión ni escritura. No depende de heartbeat, demo o los POST bloqueados. El integrador aceptó la clasificación como restricción esperada del entorno, sin relajar seguridad ni modificar backend.

Para comprobar además el widget exitoso, un adaptador de QA hizo el GET real al API loopback con `Host:api.scaleparaguay.com`, sin Originlocal, y entregó al navegador el body real recibido. No inventó respuestas ni contactó producción. El [focal de Informes](reports-host-focal.json) pasó320/768/1440:3respuestas reales200, número visible igual al API,0overflow y0errores runtime. El script quedó en `/tmp/scale265-reports-host-focal.mjs`.

## Alcance y evidencias

[Resumen compacto](production-summary.json):240claves únicas,0faltantes/duplicadas,0hallazgos de layout/fotos/foco/diálogos; `rawMatrixPassed:false` y `expectedLocalOrigin403Count:15` explícitos. JSON completos y255capturas se conservan fuera de git en las rutas indicadas por el resumen. Los candidatos de targets<44px se preservan para revisión contextual; linksinline, espaciado y controles densos no se convierten automáticamente en fallos. Esta auditoría no afirma que todos los controles de toda la app midan44px.

No cubre producción, páginas públicas, portal, superadmin, OAuth, dispositivos físicos, Safari ni todas las acciones CRUD; esas superficies requieren sus pruebas específicas. La baseline dev previa fue mixta por HMR y no se usa como prueba del build final.

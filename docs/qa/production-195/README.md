# Evidencia de Scale 1.0.195

Registro después de integrar PR272. El candidato `5df51698d02e8d58c7f57b6fa70234a03cfc1dee` pasó CI39187634381 y se integró como `fca3c8e5e6e11eb90ca4d8e67c47a2e2bfef215d`. Sus árboles son idénticos; el build local y la comparación explícita de cambios sólo QA/documentación quedan en `git-content.json`.

Preparación local:266entradas frontend/48fragmentos, build/tipos64páginas,61scripts backend,19grupos browser y versiones/footer/initial-assets aprobados. La revisión visual de tres capturas representativas del build aceptó formulario320, Balance768 e Inventario1440. Controles del marco táctil44px verificados a768/820/1023/1024; no se extiende esa afirmación a todos los controles de la aplicación.

Auditoría responsive: [informe](../responsive-265/production.md), [resumen](../responsive-265/production-summary.json), cuatro combinaciones de Host/Origin y focal3anchos con respuestas reales.240estados de layout completos,720estados de scroll y15diálogos de teclado, sin hallazgos geométricos, imágenes rotas, errores de ejecución o foco. El resultado RAW global false se conserva:15GET403 del contador corresponden a la allowlist de dominio del entorno local. No se cambió esa protección; el contador público en producción responde200, evidencia `public-counter-before.json` con versión servida194 previa al rollout.

Estado en este registro: CI de main39188094803 y publicación automática195 pendientes de verificación. La integración dispara un único deploy de web/API. No se solicitará otro mientras el proveedor procesa este SHA. El estado público observado todavía194 no se presenta como publicación195.

No se expone SHA del contenedor del proveedor. Se distinguen mergeSHA, árbol/build local y versión realmente servida. Esta rama conserva evidencia posterior al merge sin un segundo push/deploy de main con la misma versión.

Límites: emulación Chromium no prueba Safari/iOS físico, OAuth/correo real, dispositivos de impresión ni todas las operaciones privadas de portal/superadmin. La recuperación de fotos heredadas depende de auditoría retenida; no se accedió a los originales reales50/43/42.

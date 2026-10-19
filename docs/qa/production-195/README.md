# Evidencia de Scale 1.0.195

Registro después de integrar PR272. El candidato `5df51698d02e8d58c7f57b6fa70234a03cfc1dee` pasó CI39187634381 y se integró como `fca3c8e5e6e11eb90ca4d8e67c47a2e2bfef215d`. Sus árboles son idénticos; el build local y la comparación explícita de cambios sólo QA/documentación quedan en `git-content.json`.

Preparación local:266entradas frontend/48fragmentos, build/tipos64páginas,61scripts backend,19grupos browser y versiones/footer/initial-assets aprobados. La revisión visual de tres capturas representativas del build aceptó formulario320, Balance768 e Inventario1440. Controles del marco táctil44px verificados a768/820/1023/1024; no se extiende esa afirmación a todos los controles de la aplicación.

Auditoría responsive: [informe](../responsive-265/production.md), [resumen](../responsive-265/production-summary.json), cuatro combinaciones de Host/Origin y focal3anchos con respuestas reales.240estados de layout completos,720estados de scroll y15diálogos de teclado, sin hallazgos geométricos, imágenes rotas, errores de ejecución o foco. El resultado RAW global false se conserva:15GET403 del contador corresponden a la allowlist de dominio del entorno local. No se cambió esa protección; el contador público en producción responde200, evidencia `public-counter-before.json` con versión servida194 previa al rollout.

Estado final: **web y API1.0.195 verificadas el18/10/2026 a las23:18:50 (America/Asuncion)**. CI de main39188094803 aprobado en frontend/backend, sin reintentos. Un único merge inició el rollout automático; no se hicieron solicitudes manuales adicionales. API195 se observó primero y la web después; la secuencia completa está en `deployment-observation.json`.

`public-proof.json`: status/registro con versión visible195, health200 con database ready195, auth/me sin sesión401, providers/mantenimiento200, landing SHA256idéntico a main `a5712880d3958c0512d24b6ffa70a6c3b6f7af68d67e03234dde063b3cf00046`, scripts iniciales disponibles/sin artefactos bancarios y dentro del presupuesto1,75MB. JS inicial servido1.346.464bytes raw/410.766gzip calculado; el cálculo gzip no es una medición de transferencia.

`public-counter-after.json` vuelve a acreditar contador público200 con API195. Su lectura0sesiones es válida y no se presenta como tráfico positivo. `api-first.json` conserva la prueba parcial previa al final del rollout. Los archivos de cleanup verifican los puertos locales3025/4125/4126/55460 cerrados y las bases de prueba conservadas.

No se expone SHA del contenedor del proveedor. Se distinguen mergeSHA, árbol/build local y versión realmente servida. Esta rama conserva evidencia posterior al merge sin un segundo push/deploy de main con la misma versión.

Límites: emulación Chromium no prueba Safari/iOS físico, OAuth/correo real, dispositivos de impresión ni todas las operaciones privadas de portal/superadmin. La recuperación de fotos heredadas depende de auditoría retenida; no se accedió a los originales reales50/43/42.

## Cierre y seguimiento

Issue265 cerrado tras acreditar aceptación y publicación; PRs264/266–271 cerrados como incorporados en272, conservando ramas. Issue263 sigue abierto para verificar las tres fotos privadas; su implementación ya está integrada y publicada. La segunda lectura pública `public-followup.json` confirmó web/API195 y base lista el18/10/2026 a las23:22:39 (America/Asuncion).

`followup-state.json` conserva los issues externos pendientes y0ejecuciones del supervisor246, que no quedó programado. El padre202 permanece abierto por esos seguimientos; no se afirma que esté cerrado todo el plan operativo externo.

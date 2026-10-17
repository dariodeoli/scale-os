# Runner194 preparado, todavía no ejecutado

`browser.mjs` requiere `QA_RUN_APPROVED=1` y `QA_COMPILED_SOURCE` explícito; no inicia Next, no construye producto ni aplica migraciones. Esperar señal del integrador con SHA/BUILD_ID y API194 reiniciada sobre fuente congelada antes de ejecutar.

Preparado para24 escenarios Contratos (0/1/4 plantillas y readonly0 ×390/1440 ×3temas), más6 Resumen y6 Estudio. Captura geometría y viewport con datos sintéticos; comprueba único CTA, prerequisito accesible, gestión secundaria, empty readonly, teclado/foco del selector de modelos, borrador local y cierre cancelado/descartado. El preview de modelos sólo hace GET/cancel: **no acredita importación exitosa ni persistencia de un borrador**. Ese caso con escritura local autorizada debe añadirse/separarse cuando el integrador congele el candidato y se dedique una fixture de mutación, sin contaminar los conteos0/1/4 del recorrido.

Resumen registra posiciones reales de encabezados, Hoy/vencidas y overflow; la aceptación de prioridad del nuevo #206 se ajustará a la especificación entregada por su implementador antes de un verdict. Estudio compara reservas con fecha civil America/Asuncion y alterna Hoy/Mes completo en móvil conservando otras fechas. Fecha fija de fixtures17/10/2026: si cambia el día real antes de ejecutar, detener y actualizar sólo fixtures sintéticas de forma explícita, no reportar como fallo del producto.

El runner bloquea todas las escrituras y hosts externos; clasifica analytics y presence como peticiones automáticas bloqueadas. No se usa un falso PASS de consola limpia cuando el bloqueo genera errores de recurso. Los permisos create y templates_manage están acoplados en la API actual y se informan como tales.

Reparto acordado: este agente206/249/250 geometry; `contract_commercial` lleva #207 reprogramar/completar/invalidación y usará una tarea propia distinta para evitar conflictos de versión. No se muta la tarea3 compartida desde este runner. #184/#186 quedan pendientes de fuente y contrato final; no hay pruebas inventadas para endpoints aún no integrados.

Comando futuro, **no ejecutado**:

```bash
QA_RUN_APPROVED=1 QA_COMPILED_SOURCE=<sha-congelado> QA_BUILD_ID=<build-id> \
QA_OUT=/tmp/scale194-focused node docs/qa/integration-194/browser.mjs
```

Sólo `node --check` se ejecutó durante preparación. Las aserciones DOM se validarán contra el build real; cualquier discrepancia de selector se separará de un defecto del producto.

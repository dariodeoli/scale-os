# Resultado local final #297 · versión1.0.198

19/10/2026, **07:42–07:46 America/Asuncion**. Matriz y acciones sobre Next de
producción compilado; este documento no acredita deploy.

- Árbol compilado: `0dd12f1bb78ae3ba5b28b8f936ab62bcc6884f2b`.
- BUILD_ID: `_CwxQgq5vJLcAt0cJxDax`; ambos runners comprobaron200 y contenido
  del manifiesto correspondiente servido desde el navegador.
- Fuente de los runners: `2513d757` en `codex/mobile-secondary-297`, identificada
  separadamente del árbol compilado del producto.
- Candidato de integración: `752e3a7c9cdf802af073524906d9d90dacf90f90`, árbol
  `0c7ab157dc7a34bb0083792d07828022d41fc6e4`. **No es igualdad literal con el
  árbol compilado**: después del build se integraron únicamente tres runners de
  `docs/qa/mobile-secondary-297/` y dos archivos de memoria `.engram/`. El diff
  verificado no contiene cambios de producto, configuración ni lockfiles.
- Transporte: proxy QA local3027 sirve el artefacto Next de3028 sin modificarlo
  y deriva `/core-api` al API local4127 con PostgreSQL aislado. Host canónico se
  adapta sólo para middleware. Todas las conexiones son loopback; no producción.

## Resultado

| Comprobación | Resultado |
| --- | --- |
| Nueve rutas × cinco anchos × tres temas | **135/135 PASS**,135 claves únicas |
| Estados de scroll superior/medio/inferior | **405**, sin overflow documental |
| Observaciones de imágenes visibles | **321**, ninguna rota; no son321 imágenes únicas |
| Ruta, contenido, puntero emulado y foco | PASS en135 casos |
| Errores runtime, respuestas GET>=400, fallos de transporte GET API | **0/0/0** |
| Acciones Configuración/Preferencias, cinco tamaños | **94/94 comprobaciones PASS** |
| Capturas de matriz / acciones |135 /15, conservadas fuera de git |

El [resumen verificable](final-198-summary.json) conserva cobertura, fuente,
resultados por escenario, estados de contenido, diagnósticos y los94 checks.
Los JSON completos y capturas viven en `/tmp/scale297-final198` y
`/tmp/scale297-actions-final198`. No contienen credenciales; sus sesiones se leen
por archivo privado y nunca se exportan al reporte.

## Datos y acciones realmente probados

La matriz leyó filas reales de la base sintética: Métricas30, Planes3,
Invitaciones1, Comisiones8, Historial10, Actividad20 y Papelera1 en la muestra
320/claro. Roles y Preferencias son superficies de configuración, no listas
vacías de entidades. Invitaciones usa dueño sintético normal; las otras ocho
rutas usan demo. No se sustituyeron respuestas de API para la matriz.

Los focales320×844,390×844,768×844,390×568 y844×390 ejercitaron:

- selector de inicio y persistencia de Preferencias tras recarga;
- diálogo Nueva empresa: bounds, foco, ocho pasos Tab, Escape y retorno de foco,
  sin ejecutar creación;
- edición del representante legal, guardado por el API real, lectura del valor
  desde el API y restauración de la ficha tras recargar;
- un503 deliberadamente inyectado en transporte del primer guardado legal,
  conservación del borrador y reintento real exitoso;
- restauración de los valores originales de representante y preferencias,
  aceptada por el API200; los registros de auditoría se conservan.

Hubo **50 respuestas200 reales** de los dos endpoints observados y **un503
sintético declarado**. No se afirma que el backend originó ese503. No se
crearon empresas, no se enviaron invitaciones externas ni se ejecutaron eliminaciones.

## Revisión visual y límites

Se inspeccionaron capturas de Roles320/oscuro, Planes320/claro y Nueva empresa
844×390. Texto y controles se mantienen contenidos; el comparador de planes
conserva su scroll horizontal propio y la instrucción visible correspondiente.
Los controles de40px en768/844 se registran como candidatos táctiles para revisión
contextual; no se afirma44px universal ni702 defectos por repetir candidatos en
varios temas y rutas. No hubo un bloqueo reproducible al tocar los focales.

Los135 casos acreditan geometría y carga, con un paso de teclado por escenario;
no prueban todos los CRUD de las nueve rutas ni todos los roles. Configuración
no queda acreditada en cada proveedor, integración, formulario de privacidad o
flujo de eliminación por estos focales. OAuth, Safari y dispositivos físicos
siguen fuera de esta ejecución. Portal/superadmin están en #292, otros siete
componentes en #295 y pruebas físicas en #296. La matriz central #265 repetida
por el integrador se informa por separado; aquí no se mezclan sus240 casos con
estos135 ni se cuentan los resultados históricos como evidencia de este build.

La muestra inicial sobre Next dev sólo fue diagnóstico. Un fallo de primera
conexión durante el reinicio de Next y un reemplazo incompleto por triple click
se corrigieron en el procedimiento de QA, no en producto. La ejecución final
usa Ctrl+A y comprueba el valor completo antes de guardar. No hubo correcciones
de producto dentro de este subalcance.

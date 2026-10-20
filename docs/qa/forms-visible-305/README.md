# Errores visibles de formularios — #305

20/10/2026. El error de guardado/validación ya no depende de que la persona descubra un mensaje al fondo del scroll.

## Cambio compartido

- `Dialog` muestra una franja de errores entre el título y el cuerpo desplazable. Lee mensajes visibles ya renderizados (`role=alert`/`.error`) y el primer control que falla la validación nativa. La franja permanece arriba aunque el cuerpo se desplace.
- El observer sólo observa el cuerpo, nunca su propia salida. Deduplica mensajes, conserva `role=alert` en su fuente y no anuncia el mismo texto en una segunda live region. Los errores ocultos y los de otros diálogos no se mezclan. No mueve el foco mientras se escribe.
- `Editor` pone errores generales y resumen de campos antes de todos los campos, también sin secciones. Dentro de Dialog mantiene el foco coordinado al primer control inválido; fuera de Dialog lleva foco y scroll al resumen superior. Se desactiva el autofocus diferido de react-hook-form porque el foco ya lo coordina Editor y podía devolverlo al fondo.
- No cambia lógica de dominio, transporte, permisos, datos ni componentes de botón. Las fuentes conservan el detalle junto al campo y los errores del servidor hasta el reintento/corrección correspondiente.

## Pruebas focales

`node tests/form-errors-visible-305.test.mjs`: Chromium real con componentes reales;390×568 y1366×768; ocho combinaciones (Editor, nativo, custom y Editor fuera de modal). Comprueba formulario largo desplazado al fondo, requerido, error API, borrador/reintento, error superior visible, foco estable al escribir y aislamiento de diálogos anidados. Usa CSS real de Dialog con estilos básicos del fixture; no ejecuta toda la aplicación ni una base real. La prueba negativa con Dialog anterior falló por ausencia de la franja, antes de restaurar el código corregido.

Regresiones existentes ejecutadas: Editor6 casos, popups6, Dialog15, browser de foco390 y browser de Reportar problema/acciones del footer. `check-ui-architecture` y TypeScript sin emisión. Ver [resultados](results.json) para hashes de logs y geometrías.

El gate browser nuevo queda en `tests/release-regression.d/97-forms-305.list`. El integrador ejecuta regresión/build/CI del conjunto; este informe focal no los declara completados. Sin prueba física de Safari/iPhone/Android ni operaciones de producción.

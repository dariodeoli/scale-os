# Presupuestos y planes: ciclo de formulario (#241)

El compositor conserva su esquema, cálculos, IVA, monedas, reemplazo por plan y contratos HTTP. Usa el bloqueo compartido durante validación, escritura y actualización de la vista. Los selectores, importes, switches y ambos contextos de arrastre reciben además el estado deshabilitado explícito. Un evento tardío de arrastre no altera el borrador bloqueado.

`useFormFocus` recorre los errores anidados de RHF (por ejemplo `items.0.quantity`), evita recorrer referencias DOM y abre el `details` del primer campo inválido después del desbloqueo. Los errores de API se vinculan sólo cuando existe un mapa explícito y la ruta pertenece al formulario; permanecen hasta cambiar ese valor.

Después de una escritura exitosa se establece la línea base guardada y se conserva el documento de sólo lectura mientras termina la actualización. Si ésta falla, el mensaje confirma el guardado y «Reintentar actualización» ejecuta sólo el callback, sin repetir POST/PATCH. Cancelar permite cerrar sin un aviso falso de cambios pendientes.

Validaciones ejecutadas:

- `tsx --test tests/form-focus-paths-241.test.tsx tests/quote-composer-data.test.ts`: 8 PASS.
- `tsx tests/quote-composer.test.tsx`: PASS en alta, presupuesto y plan; error/reintento, exclusión de cierre, orden persistido y evento tardío de drag descartado.
- `node tests/quote-composer-browser-241.test.mjs`: Chromium PASS con controles reales y respuestas sintéticas locales. Error anidado por teclado, apertura de sección, selección de cliente por teclado, bloqueo completo/drag/cierre, doble envío con una escritura, borrador conservado, error de campo hasta corregirlo, readiness sin API y fallo de actualización sin segundo guardado.
- `node tests/workspace-form-lifecycle-browser-241.test.mjs`: Chromium PASS de regresión del helper compartido con formularios RHF existentes.
- `tsc --noEmit --incremental false`: PASS.

El navegador usa un origen de loopback y reemplaza el transporte con respuestas sintéticas; no contacta servicios externos ni crea datos reales. No se ejecutaron deploy, migraciones ni cambios de dependencias.

# Reportar problemas y acciones del diálogo (#241 / #245)

El formulario reutiliza `useSingleFlightSubmit` antes de validar y `PendingFields` para bloquear sus controles. Conserva borrador y error al fallar; la categoría o el texto inválidos reciben foco después del desbloqueo. Un error del API sin campos asociados conserva su mensaje y enfoca el resumen general, sin deducir un campo a partir del texto.

`DialogFormState` registra pending/dirty con el diálogo compartido y no agrega otro footer. El botón Cancelar de ConfirmDialog ahora pasa por el mismo cierre protegido que X, Escape y fondo. Sus confirmaciones, requireText y callbacks originales permanecen intactos.

Se corrigió además la asociación de acciones portadas al footer: FormActions identifica Button/IconButton canónicos con submit explícito o implícito, manteniendo la omisión de type y un form explícito. Recorre Fragments conservando su estructura. No adivina el contenido DOM de componentes arbitrarios. Los botones secundarios mantienen su comportamiento.

Pruebas:

- `tsx tests/report-problem-dialog.test.tsx`: 7 PASS, incluidos validación, payload, privacidad de ruta, iconOnly y doble confirmación con una solicitud/un cierre.
- `tsx tests/dialog-interactions.test.tsx`: 15 PASS, incluidos pending, dirty, cierre anidado y asociación de acciones. El fixture usa ahora el Button canónico de la app, conservando las aserciones previas.
- `node tests/report-problem-lifecycle-browser-241.test.mjs`: Chromium PASS con ConfirmDialog real. X/Escape/fondo/Cancelar protegen borrador; Seguir editando conserva y Descartar cierra. También valida foco, draft, exclusión de doble envío, bloqueo pending y reintento; click/Enter de Button implícito, IconButton, Fragment, destino explícito y wrapper desconocido.
- `node tests/quote-composer-browser-241.test.mjs`: Chromium PASS completo después de la migración de botones canónicos, incluido Guardar desde footer.
- `tsc --noEmit --incremental false`: PASS.

Las pruebas de navegador usan callbacks sintéticos locales. Sin proveedores, datos reales, migraciones, versiones, merge ni deploy.

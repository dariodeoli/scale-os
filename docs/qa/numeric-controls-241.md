# Controles numéricos compartidos (#241)

`NumericControl` es el motor de texto crudo con eventos y ref del input real. Lo consumen `InputControl type="number"`, `NumberInput` y `PercentageInput`. El adapter conserva `name`, callbacks nativos, valores controlados/no controlados y registro RHF; no fabrica eventos ni normaliza el texto. El foco y el caret permanecen en el punto de edición.

Las políticas vienen del consumidor. Las fachadas conservan su notación plana anterior, precisión y unidades explícitas. El adapter nativo conserva notación científica completa y la regla nativa de step (1 por defecto; base min/defaultValue/0). Los límites y pasos se comparan mediante enteros escalados, sin redondear dinero ni convertir porcentajes/ratios. La notación nativa conserva rechazo de overflow y cero en underflow durante validación; el texto enviado permanece intacto.

El motor fija `customValidity` para que un formulario nativo/RHF no guarde «-», «.» o un valor fuera de sus reglas. El Editor usa `noValidate`: su adapter del resolver añade la misma comprobación antes del save, sin modificar el schema ni reemplazar validadores existentes. Así `integer:true` mantiene también la regla previa de dígitos sin signo. No se infieren rangos por nombre de campo.

Adopción real: Editor y los tres campos ya construidos con InputControl en pipeline (orden) e inventario (vida útil). No se modificaron sus payloads, esquemas, cálculos ni calendarios.

Pruebas:

- `tsx --test tests/ui-numeric-engine-241.test.tsx`: 3 PASS; comparación exacta/step/precisión, evento y ref originales, pending, formatos parciales y Editor sin escrituras inválidas.
- `node tests/ui-numeric-browser-241.test.mjs`: Chromium PASS con controles reales, formularios nativos, RHF, fachadas y Editor. Cubre tecleo parcial, caret, foco al error, bloqueo de guardado, negativos/cero, min/max/step, transporte científico crudo y porcentaje 0–100 frente a ratio 0–1.
- `tsx tests/ui-number-amount.test.tsx`: PASS de compatibilidad con fachadas e importes.
- Contrato Editor de `e594d3ca`: 6 PASS ejecutados sobre copia temporal del fixture actualizado; no se duplica ese cambio en esta rama.
- `tsc --noEmit --incremental false`: PASS.

Las pruebas usan respuestas/callbacks sintéticos locales. No hubo API real, migraciones, dependencias, merge ni deploy.

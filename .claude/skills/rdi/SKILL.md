---
name: rdi
description: Reglas de inputs y campos de Scale OS — fuente única antes de crear o tocar un campo. Trigger: rdi, input, textfield, campo, teléfono, correo, serial, importe, contraseña.
---

# rdi — inputs y campos

La fuente única es la sección "Reglas de campos (fuente única)" de `AGENTS.md` y los módulos que nombra:

- `app/field-rules.ts` — reglas puras y testeables (teléfono, serial, correo, dígitos) y sus mensajes.
- `app/phone-field.tsx`, `app/email-field.tsx`, `app/password-field.tsx`, `app/profile-controls.tsx` (`AmountInput`, `SelectCustom`) y `app/operations.tsx` (`Editor` con sus tipos de campo).
- API: `suite-validation.js` (`phone`, `serial`, `email`) para la revalidación en el borde.

Al tocar un campo: usá el componente compartido existente; si el caso no existe, agregalo al módulo correspondiente y adoptalo en todos los lugares que hoy escriben a mano. El valor se guarda normalizado y el símbolo o etiqueta lo dibuja el campo; el backend revalida siempre.

# Verificación en producción — #149

- **Antes (v1.0.168, sin #149)**: `antes-1.0.168/` — botones habilitados en vacío,
  grillas de botones sin buscador, correos `@demo.example.invalid`, «Al día» y
  meses cortos. `verificacion.txt` con los 24 checks fallidos (comportamiento viejo).
- **Después (v1.0.171, con #149)**: `prod-1.0.171/` — 48/48 checks a 1440/390 en
  claro y oscuro: factura y cobro bloqueados con pickers con buscador, custodios
  con nombre/rol, mes largo, «Sin mora», gastos bloqueados y demo coherente
  (titular Agencia Horizonte E.A.S.).

Método: `build-tools/visual-harness/qa-fin-149.mjs` contra
`https://app.scaleparaguay.com` con demo privada fresca creada por
`POST /api/demo/start` (Origin sistema.scaleparaguay.com) en cada corrida.

# Evidencia #149 — Validaciones, pickers y formatos (Finanzas)

**Después** (stack local FIN: Postgres temporal + API real + demo con datos de
estrés, build de la rama `SOS-FIN`): `build-tools/visual-harness/qa-fin-149.mjs`
recorre `/pagos`, `/pagos/prevision` y `/pagos/mora` a 390/1440 en claro y oscuro.

Comprueba en cada ancho/tema:
- «Crear factura» y «Registrar cobro» abren deshabilitados con obligatorios
  vacíos, con el buscador del picker visible.
- El modal de cobro no muestra correos `@demo.example.invalid` y el custodio
  aparece con nombre.
- Previsión usa el mes largo («Octubre 2026») y los gastos planificado/real
  quedan bloqueados sin monto/cuenta.
- Mora rotula «Sin mora» y ya no usa «Al día».
- La cuenta demo de Horizonte muestra titular propio (sin Scale Strategy Group).

`verificacion.txt` es la salida de comprobaciones del harness. El estado
«antes» se describe en el issue (botones habilitados en vacío, grillas de 20+
botones y correos técnicos del demo) y queda cubierto por los tests de regresión.

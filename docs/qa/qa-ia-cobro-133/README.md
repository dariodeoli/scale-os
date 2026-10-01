# Parcial/seña, división y cuentas visibles en `registrar_cobro` (Refs #133)

Extensión de la acción de cobro de «Carga con IA» al estándar portable: pagos
**parciales/seña**, **división en partes/cuentas** con suma exacta y **método
real** de la cuenta visible en la confirmación.

- Script de evidencia: `build-tools/visual-harness/qa-ia-cobro-133.mjs`
  (stack local real + motor de IA interceptado con un análisis canónico).
- Resultado: `evidencia-api.json` + capturas en `docs/qa/qa-ia-cobro-133/`.

## Reglas

**Parcial / seña** (`parcial`)
- El monto puede ser **menor al saldo** del cliente: se aplica FIFO sobre las
  facturas con saldo (la más antigua primero) sin exigir completar el total.
- La respuesta del API viaja con `parcial: true` y `pending` (saldo restante);
  la tarjeta queda con estado **`parcial`** (cápsula «Parcial») y el mensaje
  «Pago parcial: quedan Gs … pendientes». Al completar el saldo, `parcial:false`.
- La factura alcanzada queda en estado `partial` (visible en Finanzas y Mora).

**División en partes/cuentas** (`parts`)
- Misma acción y misma confirmación: `parts: [{accountId, amount}, …]` en
  `POST /api/agency/payments` (variante por cliente), 2–10 partes en el API y
  hasta 5 en la UI.
- La **suma exacta** debe coincidir con el monto del cobro; cada parte entra a
  su cuenta real; todas las cuentas deben ser de la empresa, estar activas y
  usar la **misma moneda**. La operación es atómica y conserva la idempotencia
  por lote (`requestId` y `requestId#n`).
- La UI muestra «Suma: Gs X de Gs Y» (en rojo si no cuadra), permite agregar y
  quitar partes, y explica el error sin ejecutar nada.

**Cuenta/método visible**
- El selector y la línea «Método: …» muestran **banco/institución · número o
  alias** (y el titular en el detalle), nunca una cuenta genérica.
- **Sin cuentas activas** de la moneda: se dice («No hay una cuenta de ingreso
  en PYG activa…») y el botón de confirmar queda deshabilitado.

**Validaciones sin efectos**: monto ≤ 0 o no entero, suma de partes ≠ monto,
cuenta inexistente/inactiva, monedas mezcladas y rol sin `payments.manage`.
Los **duplicados** se avisan como antes (mismo cliente + monto + fecha) y el
`requestId` evita repetir el lote en un reintento.

## Evidencia (stack real)

| Captura | Qué muestra |
| --- | --- |
| `parcial-1440-light.jpg` / `parcial-390-dark.jpg` | Seña de 200.000 sobre 800.000: estado «Parcial» y pendiente restante |
| `division-1440-light.jpg` / `division-390-dark.jpg` | Dos partes (350.000 banco + 250.000 caja), métodos visibles y «Saldo del cliente al día» |
| `division-suma-error-1440-light.jpg` | Suma 590.000 ≠ 600.000: error visible y **sin filas nuevas** |
| `sin-cuentas-1440-light.jpg` | Sin cuentas activas: aviso y confirmación deshabilitada |

`evidencia-api.json` incluye las cuentas con su método, los cobros generados por
cada caso (fila, factura, cuenta y referencia) y el conteo de filas antes del
rechazo por suma.

Nota: la empresa del stack es un Demo privado y su botón de IA está oculto para
el dueño por diseño; la corrida habilita el asistente en esa base local (solo
para la evidencia) y el motor se responde con un análisis canónico interceptado.

## Tests

- `backend/test-daily-controls.mjs`: seña con estado parcial y pendiente; FIFO
  con dos facturas; división con dos cuentas (filas por cuenta y factura);
  reintento idempotente del lote; suma inexacta, una sola parte, cuenta
  inexistente, moneda mixta y cuenta inactiva → rechazo **sin filas**;
  completar el saldo deja de ser parcial.
- `tests/ia-cobro-data.test.ts`: método/detalle de cuenta; `validarPartesIa`
  (2–5, suma exacta, importes y cuentas); POST con `parts` y mapeo de
  `parcial`/`pending`; división inválida sin tocar la red.
- `tests/ia-carga-120.test.tsx`: contrato de la tarjeta (método visible,
  división, suma, estado parcial, sin cuentas).

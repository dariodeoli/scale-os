# Acción `registrar_cobro` de «Carga con IA» (Refs #121)

Evidencia y contrato de la ejecución financiera de la acción Fase 2: la frase
«tal cliente me pagó X» se propone desde el motor (#119), la UI (#120) confirma
y acá se registra con los flujos reales de Finanzas.

## Contrato (propuesta mínima, publicada en el issue)

`POST /api/agency/payments` acepta **una** de dos formas:

| Campo | Cobro por factura (vigente) | Cobro por cliente (nuevo, #121) |
| --- | --- | --- |
| `invoiceId` | obligatorio | — |
| `clientId` | — | obligatorio (cliente existente y activo) |
| `accountId` | obligatorio | obligatorio: **cuenta de ingreso** |
| `amount` | positivo | positivo (Gs entero desde la acción) |
| `receivedOn` | opcional | opcional; **futura → 400** (hora de Asunción) |
| `reference` | ≤120 | ≤120 (el `detalle` de la acción) |
| `receivedByUserId` | opcional | opcional (por defecto, quien registra) |
| `requestId` | idempotente | idempotente por lote (`requestId` y `requestId#n`) |

- **FIFO**: el monto se aplica a las facturas con saldo de la moneda de la
  cuenta, de la más antigua a la más nueva (`due_on` nulos al final,
  `issued_on`, `id`), repartiendo en **una fila de cobro por factura**.
- Si la suma con saldo no alcanza → 409 **sin escribir nada**; cliente
  inexistente → 404; inactivo o archivado → 409; rol sin `payments.manage` → 403.
- Sin `invoiceId` ni `clientId` no hay atajo: la validación de siempre responde.
- La variante por factura conserva intactos su contrato (`{payment}`),
  validaciones e idempotencia.

Front (`app/ia-cobro-data.ts`):

- `normalizarAccionCobro(accion)` — tolera la forma del motor (cliente id o
  candidatos, monto número o dígitos, fecha ausente = hoy con aviso, detalle
  recortado a 120) y devuelve avisos claros cuando falta o es ambiguo.
- `validarCobroIa(cobro)` — cliente, monto entero > 0, fecha real no futura,
  detalle ≤120; los rechazos no tocan la red.
- `cargarCuentasCobro()` / `cuentaSugeridaIa()` — la cuenta de ingreso la elige
  la confirmación; se sugiere solo cuando hay una única cuenta activa de la
  moneda.
- `buscarCobrosDuplicados(cobro)` + `registrarCobroDesdeIa({permitirDuplicado})`
  — mismo cliente + monto + fecha en la ventana reciente de cobros: primero se
  advierte y **no se registra**; con la decisión explícita se reejecuta. El
  `requestId` mantiene idempotente el reintento exacto.

## Evidencia

- `evidencia-api.json`: corrida contra el API real del stack local —
  cobro FIFO (2 facturas, 600.000 Gs), reintento idempotente, y rechazos
  (monto mayor al saldo, fecha futura, cliente inexistente, cliente inactivo)
  con conteo de filas antes/después para probar los «sin efectos».
- `finanzas-cobros-1440-light.jpg` y `finanzas-cobros-390-dark.jpg`: la lista
  «Quién cobró y dónde quedó» de Finanzas con las filas del lote generado por
  la acción (mismo endpoint, misma auditoría, mismo listado real).

Reproducir: `node build-tools/visual-harness/e2e-fin-stack.mjs` y luego
`node build-tools/visual-harness/qa-ia-cobro-121.mjs`.

## Tests

- `tests/ia-cobro-data.test.ts` — normalización, validaciones, cuentas,
  duplicado (incluye reversión/otro cliente/otro monto), camino feliz con dos
  facturas, reintento, 403 y rechazos sin red.
- `backend/test-daily-controls.mjs` — reparto FIFO real, factura antigua
  saldada, idempotencia por lote, 409/404/400/403 sin filas nuevas y `client_id`
  en la lista de cobros (para la detección de duplicados).

## Pendientes de integración

- #120 (DSN): la tarjeta de acción debe incluir la cuenta de ingreso y, ante
  `{estado:'duplicado'}`, pedir la decisión antes de reintentar con
  `permitirDuplicado`.
- #119 (PLT): la acción tiene que traer el cliente resuelto (id) o candidatos;
  FIN tolera ambas formas y avisa si falta.
- Producto: confirmar FIFO como criterio de imputación (si se prefiere elegir
  factura, el mismo endpoint acepta la variante por `invoiceId`).

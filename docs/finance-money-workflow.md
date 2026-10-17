# Cobros y cierres de tesorería

Refs #228 y #229. `agency_cash_movements` sigue siendo la proyección canónica
del dinero. Las cuentas conservan su saldo mediante los mecanismos existentes.
Una aplicación a una factura o mora modifica el pendiente, sin registrar otro
cobro ni cambiar el saldo de la cuenta.

## Registro y asociación

- `POST /api/agency/payments`: se conserva el registro por factura y la
  distribución FIFO por cliente. `mode: "unassigned"` registra un cobro libre
  con `accountId`, `amount`, `receivedOn`, `reference`, `requestId` UUID y
  `clientId`, `projectId`, `planId` opcionales. La cuenta determina la moneda.
  Se admite una fecha real anterior; una fecha futura se rechaza.
- `GET /api/agency/payments` y `/api/agency/finance/receipts`: devuelven
  `{payments, receipts, hasMore}`; ambos nombres contienen la misma colección.
  Se admiten `limit` (1–100) y `offset`; `limit=all` tiene un máximo de 10.000.
  Cada fila incluye `available_amount`, `links_revision`, `reversal_id` y, si
  corresponde, `corrected_payment_id`.
- `PATCH /api/agency/payments/:id/links`: `{clientId,projectId,planId,
  expectedRevision}`. Permite asociar después y registra una revisión auditada.
  Las relaciones deben pertenecer a la empresa y coincidir entre sí. Los
  clientes inactivos pueden conservar deuda y recibir cobros históricos.
- `POST /api/agency/payments/:id/applications`: `{invoiceId|receivableId,
  amount,requestId}`. Aplica parcialmente un cobro libre, limitado por su
  disponible y el pendiente real del destino. Moneda y cliente deben coincidir.
- `GET /api/agency/payments/:id/applications`: `{applications,available_amount}`.
  `DELETE /:id/applications/:applicationId` exige `{reason}` y revierte únicamente
  la asociación, con auditoría. La reversión del cobro original libera también
  sus aplicaciones, además de registrar la salida real del dinero.
- `POST /api/agency/payments/:id/date-correction`: `{receivedOn,reason,
  requestId}`. En una transacción crea un reemplazo, revierte el original en su
  fecha previa y traslada las aplicaciones. Conserva dinero y pendientes netos,
  incluso cuando parte del efectivo ya se gastó. No modifica recibos inmutables.
  Los dos períodos deben estar abiertos. La corrección y el reintento se auditan.

## Mora inicial, gastos y apertura

`GET/POST /api/agency/finance/opening-receivables` registra obligaciones previas
con `clientId`, `amount`, `currency`, `period` (AAAA-MM), `dueOn`, `reason`,
`forecastIncluded`, `expectedOn` opcional y `requestId`. `dueOn` es el vencimiento
original; `expectedOn` es la fecha estimada de cobro y nunca altera la mora.
No se crea factura ni movimiento de caja. La vista
`agency_opening_receivable_balances` expone importe, aplicado y pendiente; la
vista existente `client_payment_status` incluye estas obligaciones y conserva
sus indicadores de facturación real. La previsión consume la fecha estimada
explícita por separado, sin convertir esta deuda en ingreso nuevo.

Los gastos conservan `POST/GET /api/agency/expenses` y su reversión existente.
Se admite una categoría propia de hasta 80 caracteres y `requestId` UUID para
evitar duplicaciones. El listado incorpora `reversal_id`. Se conserva el
contrato de importes enteros de esta API.

`POST /api/agency/finance/account-openings` admite `{accountId,amount,openedOn,
reason,requestId}`. Requiere permiso de cuentas y una cuenta activa sin saldo
ni movimientos anteriores. Su única fuente `agency_account_openings` se
incorpora a la misma vista de movimientos como tipo `opening`. La apertura no
es un ingreso operativo. Los saldos iniciales históricos existentes se
reconstruyen desde el saldo actual menos los movimientos posteriores; no se
vuelven a cargar como una entrada de dinero.

## Cierre y reapertura

`GET /api/agency/finance/periods` lista los períodos. Sólo un dueño puede usar
`POST /api/agency/finance/periods/AAAA-MM/close|reopen`, con `{reason,
expectedRevision}`. Una reapertura requiere el cierre vigente; los meses futuros
no pueden cerrarse. Cada transición deja un evento inmutable con actor, motivo,
revisión y copia del resumen de cuentas.

`GET /api/agency/finance/treasury?month=AAAA-MM` expone cuentas, saldos iniciales,
entradas, salidas, saldos finales y movimientos reales del mes, además del estado
del período y la copia del cierre. Cada moneda permanece separada. Las
transferencias y aperturas no deben sumarse a resultados operativos.

Los triggers de base protegen cobros, transferencias, honorarios, gastos,
reversiones y aperturas, también al escribir directamente en las tablas. Una
fecha que afecte un período cerrado o un cierre posterior se rechaza con 409;
el dueño debe reabrir los períodos afectados. El mutex por empresa precede a los
bloqueos de cuenta y se combina con un mutex por período: esto evita que una
carga retroactiva de un mes abierto escape al cierre de otro mes posterior.
Las asociaciones posteriores no cambian caja y siguen habilitadas; los cambios
de texto sin efecto monetario conservan el proceso de anonimización existente.

## Integración y verificación

El integrador debe montar `financeTreasury` de `backend/finance-treasury.js`
**antes** de `financeControls`, registrar
`20261017_finance_periods_receipts.sql` al final de la cadena y agregar
`node test-finance-periods.mjs` a las pruebas del API. No reemplazar el handler
de balance independiente ni la previsión con un segundo ledger.

Las pruebas focales cubren migración repetible, aislamiento, cobros libres e
idempotencia, asociación sin duplicar caja, aplicaciones parciales, reversión,
corrección de fecha, mora sin factura, categorías propias y cierres con motivo.
`test-finance-periods-postgres.mjs` usa PostgreSQL real en un clúster temporal
con socket Unix y observa bloqueos entre conexiones independientes: cierre antes
del cobro, cobro antes del cierre y aplicaciones que compiten por una factura.
El clúster se detiene y elimina al terminar. Esto no acredita conciliación
contra un banco externo ni un deploy de producción.

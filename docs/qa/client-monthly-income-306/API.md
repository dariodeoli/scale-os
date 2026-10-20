# Ingresos mensuales por cliente — Refs #306

Este contrato registra acuerdos de servicios: base manual de un mes y extras adicionales. No emite facturas, no registra un pago, no aplica deuda ni modifica caja. Cobros, gastos y salarios siguen usando sus fuentes canónicas.

## Endpoints

- `GET /api/agency/clients/:id/monthly-income?month=2026-10`
- `POST /api/agency/clients/:id/monthly-income`
- `PATCH /api/agency/clients/:id/monthly-income/:entryId`
- `DELETE /api/agency/clients/:id/monthly-income/:entryId`

POST/PATCH reciben `{month,kind,label,amount,currency,requestId,expectedRevision,reason}`. `month` es AAAA-MM; `kind` es `base` o `extra`; descripción1–180 y motivo5–1000 caracteres. Importe entero seguro>=0 para base y>0 para extra; seis monedas existentes. `requestId` UUID y `expectedRevision` revisión global del cliente. DELETE recibe sólo UUID/revisión/motivo. PATCH puede mover un extra de mes; ambos meses deben estar abiertos.

Cada respuesta contiene `{clientId,month,revision,canManage,archived,periodClosed,entries,totals}`. Las filas manuales incluyen `{id,kind,label,amount,currency,month,version,createdAt,updatedAt}`. Los totales por moneda incluyen `{currency,planBaseAmount,manualBaseAmount,baseAmount,extrasAmount,totalAmount}`. `manualBaseAmount` puede ser null; borrar la base restaura el plan vigente de ese mes y moneda. Las cantidades públicas son enteros, siguiendo la proyección whole-money existente; Balance mantiene su formato monetario económico. POST201, PATCH/DELETE200; reintentos idénticos200 y `alreadyRecorded:true`.

La revisión se incrementa por evento de cliente, incluso si se cambia otro mes. La misma UUID con datos distintos devuelve409; editar con revisión vieja también409. Sólo hay una base manual por cliente/mes/moneda. Si existe plan, la base manual sustituye su importe únicamente en ese mes/moneda. Los extras se suman una vez y no se repiten en meses posteriores. Una moneda diferente se mantiene separada, sin conversiones.

## Permisos, persistencia y cálculo

Lectura con `billing.view`. Escritura con `commercial-terms.manage` o `expenses.manage`, para mantener el acceso comercial e incluir Finanzas. `canManage` también considera papelera y período cerrado. Toda consulta/operación está acotada a empresa y cliente; cambios y cierres comparten el lock financiero por organización. Se usan snapshots de lectura consistentes y revisión optimista, auditoría de operación y eventos con snapshots/motivo/actor. Borrar conserva el registro y su historial mediante baja lógica.

La migración es aditiva y reentrante. Los triggers de período también impiden escrituras SQL directas sobre meses cerrados o anteriores a cierres posteriores. Una FK compuesta evita asociar eventos a una fila de otro cliente/empresa. No se reescriben acuerdos generales de `agency_client_commercial_terms`.

`agency_client_income_for_month` es la fuente común para Balance y Previsión. Balance entrega `base_amount`, `extras_amount` y `contracted_amount=base+extras` por cliente/moneda y agregados activos. Previsión usa el mismo total para ingresos contractuales. La proyección de caja existente sigue basada en facturas/presupuestos y deuda con fecha explícita, sin convertir un acuerdo en cobro; el resultado contractual previsto se obtiene separadamente a partir de contratado menos salarios/gastos previstos. Cobros reales permanecen separados. No se suma la factura a lo contratado para formar ingresos ni se suma dos veces un extra.

## Comprobaciones

`node backend/test-client-monthly-income.mjs`: cliente sin plan, base/varios extras/zero, mover mes, plan/fallback, moneda separada, total único en Balance/Previsión, idempotencia, tenant, permisos, revisión obsoleta, papelera, cierre financiero y guardas SQL, sin movimientos/facturas.

Focales existentes: `node backend/test-economic-history.mjs`, `node backend/test-forecast.mjs`, `node backend/test-release-migrations.mjs`. Usan PGlite y datos sintéticos aislados. La concurrencia está serializada por el lock financiero existente; este cambio no añade operaciones de ledger/caja. La integración y CI completos los acredita el integrador; este documento no declara un deploy.

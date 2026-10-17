# Balance, cobros libres y deudas anteriores

Seguimiento: #227, #228 y #229. La vista `BalanceSection` se monta con una clave
por organización y requiere acceso a Finanzas. `FinanceCollections` amplía
Cobranza y mora y respeta el permiso efectivo `payments.manage`.

## Fuentes y significado

- `finance/treasury?month=AAAA-MM`: saldos actuales, iniciales y al cierre por
  cuenta; movimientos del libro existente `agency_cash_movements`.
- `forecast`: contratado mensual, facturado, cobrado neto, gastos
  previstos y personal; conservar la definición canónica de cada agregado.
- `expenses`: gastos pagados contra una cuenta, reversibles y auditados.
- `planned-expenses`: gastos mensuales o recurrentes personalizables; no mueven caja.

No se convierten monedas. La suma de saldos y movimientos usa punto fijo con
`BigInt`, incluido el histórico decimal. Las transferencias entre cuentas no
son ingresos ni gastos del resultado efectivo. Saldo actual y cierre del mes
se presentan por separado. Las previsiones salariales no se suman otra vez a
pagos ya registrados. Los detalles salariales respetan `salary.view`.

## Operaciones

El mismo `Editor` canónico sirve para gastos reales/previstos, cierre o
reapertura del mes, recibir cobro, asociar metadatos, aplicar un cobro a factura
/deuda anterior, deshacer aplicación, corregir fecha y revertir cobro.

Los cobros libres requieren cuenta, importe y fecha efectiva. Cliente,
proyecto y plan son opcionales y se pueden asociar después sin repetir caja.
La aplicación parcial sí reduce una factura/deuda pendiente y nunca genera un
segundo ingreso. La revisión de vínculos se envía como `expectedRevision`.

Un UUID permanece estable durante los reintentos del mismo formulario de cobro,
gasto, aplicación o corrección; un formulario nuevo genera uno distinto. La
clave se envía desde el controlador del formulario porque la validación del
Editor descarta campos que no forman parte de su esquema.

El contexto financiero consulta sólo entidades autorizadas de la organización,
permite buscar por `q` y avisa si se alcanza el límite de catálogo. Los cobros
se cargan en páginas de 20 y permiten continuar, sin ocultar el histórico.
Los clientes inactivos se identifican en los selectores de mora anterior.
El vencimiento original de una deuda y su fecha estimada de cobro son campos
distintos: previsibilidad no modifica la antigüedad de la mora.

Cerrar un mes es una operación exclusiva del dueño y requiere motivo. Los
controles de período y el registro monetario son autoritativos en el API y la
base; ocultar o deshabilitar un botón no sustituye esa validación.

## Verificación focal

`node --import tsx --test tests/finance-balance.test.ts tests/finance-collections.test.tsx`

Incluye precisión por encima del entero seguro de JavaScript, monedas
independientes, separación caja/contratado/nómina, permisos efectivos, fallo de
API con reintento, UUID estable al reintentar un cobro y revisión de vínculos.
La validación de transacciones y cierres corresponde además a las suites de
backend y QA integrado. No se realizaron movimientos bancarios externos.

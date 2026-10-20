# Ingresos mensuales de clientes — frontend #306

El mismo editor se abre desde el resumen de la ficha, el editor de cliente/plan, los datos comerciales y la fila de Balance. Permite elegir mes, acordar una base manual sin plan, sumar extras, editar y eliminar con motivo. La base manual se limita al mes; eliminarla restaura el plan cuando existe. Registrar un acuerdo no registra un cobro ni toca caja.

El borrador captura la revisión al abrirse. Cada contenido de operación conserva su UUID durante reintentos; no se combina un borrador antiguo con una revisión nueva obtenida automáticamente. Las lecturas usan AbortController y transporte fresco para evitar caché de versiones. Cambiar de mes exige guardar o cancelar la edición en curso. Una revisión obsoleta conserva el borrador; «Descartar borrador y recargar» hace explícita la pérdida.

Balance muestra base y extras dentro de contratado, sin sumarlos otra vez al total servido por API. El resultado previsto usa contratado menos gastos y salarios previstos; el de caja usa cobros, gastos y salarios efectivamente pagados, excluyendo transferencias y saldos iniciales. Las monedas permanecen separadas. Se amplía el resumen de caja existente para mostrar el resultado, sin crear otro bloque paralelo que repita contratado, facturado y cobrado. Los gastos recurrentes y puntuales reutilizan el editor existente: alquiler, Internet, traslados, compra de equipo o mobiliario son conceptos personalizables.

Equipo conserva modalidad/tarifa por hora, proyecto, servicio o importe fijo. Se distingue del salario mensual de Finanzas y se enlaza al Balance para salario, ajustes y pagos, sin crear otra fuente económica.

## Validación

- TypeScript `tsc --noEmit --incremental false`: PASS.
- 40 pruebas existentes focales: balance, detalle, columnas actuales, cliente y reportes: PASS.
- 5 pruebas nuevas: respuestas coherentes, cliente sin plan, UUID/revisión en reintento, eliminación de base/restauración de plan, protección por cierre y resultado previsto/caja separado: PASS.
- `node build-tools/qa-client-income-306.mjs`:9 combinaciones (320/390/1440 por claro/oscuro/contraste), componentes React y CSS reales; validación requerido, alta/edición/eliminación de extra, recarga de origen, Escape y devolución de foco. Sin overflow horizontal ni errores runtime. [Resultados](responsive.json).
- `node build-tools/check-ui-architecture.mjs`: PASS,323 módulos locales.

El API de la prueba browser es sintético. No acredita persistencia backend/PostgreSQL, Safari, dispositivos físicos ni teclado virtual real; esas pruebas se registran por separado. No se usaron datos de clientes de producción. Regresión y build completos, CI y deploy quedan a cargo del integrador.

El nuevo control usa Button/IconAction canónicos, MonthPicker, Editor, AmountInput, MoneyText y Dialog compartidos. La evidencia revisa una muestra [320 oscuro](extra-320-dark.png) y [1440 claro](extra-1440-light.png).

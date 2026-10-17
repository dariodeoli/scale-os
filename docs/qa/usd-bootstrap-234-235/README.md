# QA local — centavos USD y bootstrap (#234, #235)

17/10/2026. Candidato funcional `89df4755e0935ab29cd137ae58d0f5b1a6fa4cc1`, previsto para v1.0.190. **51/51 comprobaciones finales de navegador aprobadas**, más reinicio con snapshot idéntico. El consumidor Scale se mantuvo en ese candidato y se aisló la biblioteca corregida `owncoding-ui` 0.68.16, fuente/build `ba5e77819ede4906904fb3af9dbd3fdc61e849dd`. Este suplemento no acredita merge, CI ni deploy. Chromium 154, Next/API aislados y PostgreSQL 17.11 nativo; exclusivamente empresas demo sintéticas en localhost.

## Persistencia y cálculos

La primera ejecución válida de persistencia completó **39/39 comprobaciones** ([reporte](persistence-paste.json)). Los importes se insertaron completos mediante `insertText` en los campos reales de la UI para aislar backend y almacenamiento del fallo de tecleo descrito abajo. Después de corregir ambos fallos del componente compartido se repitieron las mismas **39/39 comprobaciones con teclado real a 60 ms por carácter**, sin `insertText` para importes ([ejecución final](keyboard-flow.json)); además pasaron 12 comprobaciones focales de Previsión. No se reenfocó el campo por carácter.

| Operación | Importe USD | Caja de la cuenta QA |
| --- | ---: | ---: |
| Apertura | 100.25 | 100.25 |
| Gasto real desde Balance | 12.34 | 87.91 |
| Gastos reales desde Previsión | 0.10 + 0.20 | 87.61 |
| Recibo | 10.75 | 98.36 |
| Aplicación parcial a deuda anterior de 20.55 | 4.25 | 98.36 |
| Corrección de fecha del recibo | 10.75 conservado | 98.36 |
| Reversión de los tres gastos | 12.64 | 111.00 |
| Reversión del recibo corregido | 10.75 | 100.25 |

La deuda quedó en 16.30 tras aplicar 4.25 y volvió a 20.55 al revertir el recibo. Previsión mostró el gasto real de 12.34; los tres gastos de la cuenta sumaron exactamente 12.64. Los importes de transporte se compararon como unidades menores `BigInt`, sin comparaciones monetarias de coma flotante. Las capturas finales se tomaron sobre la ejecución con teclado; Balance y Cobranza corresponden al estado anterior a las reversiones. Las reversiones se ejecutaron por API local autenticada; los restantes formularios se operaron desde el navegador.

Una demo nueva mostró el KPI mensual contratado de **22.000.000 PYG + 2.400 USD**, confirmado tanto en el resumen API como en Inicio; ya no mostró «Sin contratos».

## Bootstrap y segundo reinicio

Se reprodujo un fallo real previo: con 110 migraciones registradas y 36 eventos válidos `ownership.changed`, el bootstrap repetía una migración histórica que reducía los tipos permitidos; health quedaba 503 y la migración de centavos no llegaba a aplicarse. El candidato #235 corrigió el orden para ejecutar y registrar únicamente las migraciones pendientes.

Se reinició la misma base sin borrar trazas ni fixtures: health 200 listo, 111 migraciones y `agency_expenses.amount numeric(22,2)`, conservando los 36 eventos. Después del flujo USD y nuevas demos, un segundo reinicio real conservó **idéntico snapshot** de 111 migraciones —incluidos sus timestamps—, 66 eventos de propiedad, apertura 100.25, gastos 12.34/0.10/0.20, saldo 100.25 y movimientos históricos con centavos. Véanse [antes](restart-before.json) y [después](restart-after.json). Tras la repetición final con teclado se hizo otro reinicio: 111 migraciones, **120 eventos de propiedad**, los mismos valores decimales y saldo 100.25, conservando exactamente también los timestamps y movimientos ([antes](keyboard-restart-before.json), [después](keyboard-restart-after.json)). Las nuevas demos explican el incremento del contador entre escenarios; cada par antes/después fue idéntico.

## Tecleo decimal: fallo reproducido y corrección canónica

Se confirmó un fallo real del widget compartido, separado del almacenamiento: teclear `100.25` o `100,25` a 60 ms por tecla terminaba en `10.025,00`. Tras el separador, el cursor seguía antes de los centavos; el siguiente dígito se agregaba a la parte entera. Insertar el valor completo producía `100,25`. La [traza por tecla](typing-before-fix.json) conserva ambas variantes. La corrección canónica `owncoding-ui` 0.68.16 se probó desde el worktree de release exacto `969c4a989e92216f2b6a0b6a0799095893afc263`, con dependencias QA aisladas: no se modificó la instalación compartida ni se presupuso un pin global. Su `dist/index.js` tuvo SHA256 `0441f09b37d6736b49333e80928a310ddaf83f4f6538100dfaf8f91c6b609aea`. Seis comprobaciones independientes del navegador aprobaron ambas variantes de tecleo a 60 ms/tecla, ambas de pegado y el avance correcto del cursor al pasar el separador ([reporte](typing-fixed.json)).

Al continuar el flujo real se encontró una segunda causa en `FormField`: mostrar el error transitorio de cero remontaba el input y quitaba el foco. En Previsión, escribir el primer `0` de `0.10` dejaba el nodo original desconectado; las teclas siguientes no llegaban al campo. La [traza de foco](forecast-focus-before-fix.json) lo reproduce sin reenfocar por carácter. Los importes que comienzan con `1`, como `100.25`, conservaban nodo y foco. La corrección canónica de `FormField` se incorporó al build final `ba5e77819ede4906904fb3af9dbd3fdc61e849dd`, `dist/index.js` SHA256 `16285ae25a08c7395ba2c3241b26b86a9126f50d710d1667f3a776f225559201`. En la aplicación real, **12/12 comprobaciones focales** aprobaron `0.10`, `0.01`, `.10`, `0,10`, `,10` y `100.25`: todos conservaron el nodo original y el foco durante cada tecla, y el valor esperado después de Tab ([reporte final](forecast-focus-fixed.json)). La repetición del flujo financiero completo también aprobó los 39 checks; no quedan fallos de producto abiertos dentro de este suplemento.

## Evidencia y límites

- [KPI mensual de la demo nueva](evidence/demo-home-monthly-contracted-kpi-1440.webp).
- [Gasto real con centavos en Previsión](evidence/usd-forecast-real-expense-cents-1440.webp).
- [Cobranza tras corregir fecha](evidence/usd-collections-cents-1440.webp).
- [Balance con saldo USD 98.36](evidence/usd-balance-cents-1440.webp).

El harness corrigió un supuesto de etiqueta: las deudas se muestran con fecha completa, por lo que se seleccionó su motivo sintético único. Ese error del selector no se clasificó como fallo del producto. Los errores de caret, remonte por validación y bootstrap sí se reprodujeron como comportamientos del producto y se revalidaron tras sus respectivas correcciones.

El inicio anónimo adaptó sólo el header Origin del POST demo al origen canónico permitido; el proxy local adaptó cookies para localhost. No se contactó producción, no se probaron proveedores reales y no se repitieron los 79 checks independientes documentados en `../demo-232/`. La demo persiste temporalmente en el servidor y tiene TTL; no se afirma borrado físico automático ni datos guardados exclusivamente en el navegador.

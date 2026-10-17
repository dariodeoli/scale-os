# QA local — Balance, historial y cuentas dentro del recibo (#238, #240)

17/10/2026. **143/143 comprobaciones aprobadas**, agrupadas en siete reportes de navegador y medición DOM ([índice](results.json)). Chromium 154 real, PostgreSQL 17.11 nativo y Next/API en servicios aislados. Fuente frontend `11a71500`; backend financiero `f8983807`, con 114 migraciones. Sólo datos sintéticos locales, sin empresas reales.

Este informe acredita el comportamiento local del candidato. El entorno de QA conservó metadata y footer `1.0.190`; el integrador valida por separado el bump, CI, merge y publicación de `1.0.191`. No se presenta una captura local como evidencia de deploy.

## Balance alineado y legible

En 1440 y 390 px, claro y oscuro, se verificaron las tablas reales con 21 clientes y 10 personas: encabezados y celdas tienen las mismas posiciones y anchos, sin desbordamiento horizontal del documento. En móvil el contenido completo se conserva dentro de regiones de scroll de 944 y 1088 px; el documento sigue midiendo 390 px. Previsión dejó de duplicar ambos detalles.

La tabla comercial muestra Cliente/logo, Plan, Contratado, Pagado en mes y Factura como requisito, más acciones. «Pide factura» se confirmó verde y «No pide factura» rojo en ambos temas; no se confundió el requisito con emisión de comprobantes. La tabla del equipo muestra persona/foto, salario base, ajuste, cierre previsto, pagado y diferencia prevista. Esta última es orientativa y no acredita una deuda ni un período salarial cancelado.

El logo y la foto ficticios se decodificaron realmente (`complete=true`, 64×64 naturales). Sus contenedores de 24×24 tienen `border-radius:50%` y `overflow:hidden`: el recorte circular está en CSS, no solamente en el archivo de imagen. Para medir fotos con carga diferida se desplazó la fila al viewport antes de comprobar `naturalWidth`.

Se reprodujo y corrigió un fallo real de la primera tarjeta de Banco Continental: su encabezado largo ampliaba la pista interna y desplazaba el texto del monto fuera de la tarjeta. Antes, el texto llegaba a x551.81/563.81 con borde de tarjeta x512.5 ([medición previa](card-before-fix.json)). Después, el monto ocupa 262.5 px dentro de una tarjeta de 288.5 px, con borde derecho x499.5. Todos los montos quedaron dentro de sus tarjetas en los cuatro escenarios, sin reducir fuente ni ocultar cifras ([medición final](card-avatar.json)).

## Dos vigencias comerciales y salariales

La fixture inicial declaró explícitamente julio como fecha del acuerdo; no se dedujo de una antigüedad laboral. Desde la interfaz se guardaron dos cambios salariales y dos cambios de plan con motivo y vigencia:

| Mes consultado | Salario USD | Plan | Contratado USD |
| --- | ---: | --- | ---: |
| Julio | 500.00 | Plan QA Julio | 1000 |
| Agosto | 600.10 | Plan QA Agosto | 1200 |
| Septiembre | 750.25 | Plan QA Septiembre | 1500 |
| Octubre, antes de la prueba de concurrencia | 750.25 | Plan QA Septiembre | 1500 |

Las consultas posteriores conservaron esos importes por mes y la economía del snapshot original del plan. Las facturas existentes, payouts, saldo de cuenta y movimientos del libro permanecieron idénticos tras cambiar salario y plan. El payout histórico de 120.05 siguió visible; con salario 750.25, la diferencia prevista fue exactamente 630.20.

Se encontró un bloqueo real al guardar planes USD: el campo producía `1200.00`, pero la validación heredada exigía sólo dígitos. El fix normaliza la representación de un entero monetario a `1200`, manteniendo el contrato entero de ese campo; no se atribuyó al plan soporte de fracciones reales. Tras incorporar el fix, ambas vigencias se guardaron desde la UI. Los salarios USD sí se probaron con centavos.

La concurrencia también se ejerció realmente: con el Balance mostrando 750.25 y su revisión anterior, otra operación registró 800.50 desde octubre. Al abrir el editor, la UI detectó la revisión nueva y bloqueó la combinación de importe viejo y revisión nueva. Un POST con revisión anterior respondió 409; repetir la operación idéntica respondió 200 idempotente. Sólo se agregó un acuerdo y la caja permaneció intacta. Julio, agosto y septiembre conservaron sus valores ([reporte](concurrency-invoice.json)).

## Pagado real, deuda y previsibilidad separados

Las cantidades se compararon como unidades menores `BigInt`, sin usar coma flotante para las aserciones monetarias.

| Operación del cliente QA | Pagado en mes USD | Aplicado a factura del mes USD | Deuda registrada USD |
| --- | ---: | ---: | ---: |
| Factura anterior 500 + actual 1000, sin cobros | 0 | 0 | 1500 |
| Cobro actual 200 aplicado sólo a la anterior | 200 | 0 | 1300 |
| Cobro libre del cliente 50, sin aplicar | 250 | 0 | 1300 |
| Cobro 100 aplicado a factura actual | 350 | 100 | 1200 |

El cobro libre no redujo deuda hasta aplicarse y el dinero de períodos anteriores no dio por cancelado el contrato actual. Un cobro adicional de 25 sin cliente aumentó sólo caja y el total no asignado, sin inventar una fila de cliente. En otro tenant, un cliente «No pide factura» mostró un cobro real de 100.25 sin tener ninguna factura; tampoco se inventó una deuda de `250−100.25`.

Como comprobación focal de previsibilidad, registrar una deuda previa de 100 con fecha esperada en octubre aumentó lo previsto en 100 y dejó lo recibido intacto. Cobrar y aplicar 30 dejó 70 previstos, sumando sólo 30 a los cobros reales. Los totales por moneda conservaron esa separación ([reporte](expected-receipts.json)).

## Crear una cuenta sin perder el recibo (#240)

En un tenant normal nuevo, inicialmente sin cuentas, se completó un recibo de USD 100.25 con cliente, fecha 15/10 y referencia. Cancelar la cuenta anidada —incluida la confirmación de descarte— y recibir un error de cuenta mantuvieron el borrador completo. El 400 se inyectó deliberadamente en el harness local para ejercitar el error; no fue un fallo del backend.

Crear la primera cuenta USD la seleccionó automáticamente y conservó el importe, la fecha, la referencia y el cliente. Un doble clic emitió un solo POST de cuenta; guardar el recibo con doble clic emitió un solo POST de pago y aumentó la caja exactamente 100.25 una vez. La asociación, fecha y referencia guardadas se verificaron en la base.

Una cuenta nueva en PYG exigió «Revisar moneda del cobro». «Conservar borrador» mantuvo la cuenta USD y 25.50; la elección explícita «Usar cuenta y revisar importe» seleccionó PYG y limpió el importe. No hubo conversión silenciosa ni otro cobro. En 390 px ambos diálogos quedaron dentro del viewport; cerrar la cuenta conservó 18.75 y su referencia.

## Permisos e historial desconocido

Un usuario financiero del mismo tenant con `salary.view=false` obtuvo importes y revisión salariales nulos, `payments=[]` y ningún 777.77 del salario ficticio en JSON ni UI. El historial salarial respondió 403. Otro tenant recibió 404 al consultar salario, plan e imagen privados por ID.

Con `accounts.manage=false`, la UI mantuvo el recibo pero ocultó «Agregar cuenta», no pidió custodios y el POST directo de cuenta respondió 403 sin crear registros.

La fila heredada ficticia se preparó explícitamente sin fecha efectiva. El historial la mostró como «Valor anterior importado» y «Vigencia anterior no registrada», sin inventar 2001 como inicio del acuerdo. La nueva ficha con antigüedad laboral en 2001 registró únicamente el mes observado actual, octubre de 2026. El caso de backfill real por migración corresponde además a las pruebas de bootstrap ejecutadas por el integrador; no se confundió esa prueba con esta fixture de presentación.

## Evidencia y límites

- [26 checks de tablas, imágenes y móvil](layout.json), [45 de historial/caja](history-cash.json).
- [21 de cuenta anidada](inline-account.json), [20 de permisos/móvil](permissions-mobile.json).
- [18 de concurrencia/requisito fiscal](concurrency-invoice.json), [6 de tarjetas/recorte circular](card-avatar.json), [7 de previsibilidad](expected-receipts.json).
- Balance [1440 claro](evidence/balance-1440-light.webp), [1440 oscuro](evidence/balance-1440-dark.webp), [390 claro](evidence/balance-390-light.webp), [390 oscuro](evidence/balance-390-dark.webp).
- [Editor bloqueado por revisión anterior](evidence/stale-salary-revision-blocked-1440.webp), [cuenta anidada móvil](evidence/mobile-inline-account-390.webp), [historial heredado explícitamente desconocido](evidence/unknown-legacy-salary-history-1440.webp).

Los intentos iniciales conservaron errores del harness separados de los fallos reales: cambiar `isMobile` recarga la página y exige esperar sus tablas; la cronología carga después del título del diálogo; el POST de recibo requiere `mode:'unassigned'`, tal como lo envía la UI. Las ejecuciones finales usan esos contratos correctos y fixtures nuevas. Para sembrar el payout histórico por SQL se preparó también el cache de saldo que normalmente actualiza el handler, antes de iniciar las comparaciones.

El inicio anónimo local adaptó el Origin del POST demo al origen canónico permitido y el proxy adaptó cookies a localhost. Las otras identidades y sesiones se crearon sólo en la base QA. No se probaron correo real, OAuth, proveedores, impresoras ni un dispositivo físico. El indicador de desarrollo de Next y el warning global de hidratación del tema documentado en QA #239 no se presentaron como fallos funcionales de Balance. CI, build final, merge y deploy pertenecen al informe del integrador.

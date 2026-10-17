# QA de integración local — campaña #221–#229

17/10/2026, zona de referencia America/Asuncion. **97 aserciones únicas aprobadas** entre navegación y ejecuciones focales. No quedó un defecto funcional de producto reproducido en los flujos probados. La evidencia de CI, integración y producción corresponde al integrador; este informe acredita solamente QA local.

Código: candidato `768acbd7`, más fixes `76cc280e` (cobros históricos y monedas), `70ef74e8` (custodia histórica), `cd111d2d` (identidad retenida), `93a1375b` (buscador) y `9fe2f97d` (alineación de contratos). Checkout aislado `codex/qa-campana221`, con dependencias compartidas y compilación `.next` propia.

Entorno: Chromium 154 real, Node 24.19.0 y PostgreSQL 17.11 nativo. Datos íntegramente sintéticos en un clúster local independiente. Se bloquearon solicitudes externas del navegador; no se hicieron mutaciones en producción ni llamadas a proveedores.

## Qué se comprobó

- **Nueve pantallas en 1440 y 390 px:** Contratos, Proyectos, Inventario, Clientes, Presupuestos, Equipo, Finanzas, Mora y Balance. Las 18 vistas se renderizaron autenticadas sin desbordamiento horizontal del documento. Las listas densas pueden desplazarse dentro de su contenedor.
- **Contratos y proyectos:** no hay acciones portadas al footer cuando el editor contractual está cerrado; abrir/cerrar conserva ese resultado después del observador de visibilidad. Tres tarjetas de contratos alinean su borde superior. El buscador compuesto conserva un solo borde visible. Proyectos muestra imágenes de responsables tanto en cuadrícula como en lista.
- **Inventario:** unidad de nombre único creada desde formulario, valor inicialmente vacío y guardado como cero, propiedad personal con ID distinto del campo de custodia inicialmente vacío. El selector muestra imágenes, permite elegir la persona y cierra sus opciones con Escape. El botón Editar de la cuadrícula abre la ficha y guarda 900000 mediante PATCH 200 al ID correcto; se tomó captura móvil del inventario guardado.
- **Custodio histórico inactivo:** se preparó una unidad legacy en la base sintética y luego se desactivó su membresía. El formulario mostró su identidad registrada —en este fixture, correo, porque esa fuente no tenía nombre de perfil— en vez de «Sin custodio». Una edición real de nombre y valor guardó 850000 con respuesta 200 y conservó en PostgreSQL tanto el ID del custodio como el del propietario. La membresía sintética se reactivó al finalizar.
- **Cobros y caja:** alta por interfaz de un cobro libre de 500000 sin cliente ni factura; asociación posterior de cliente y aplicación parcial de 200000 a factura mediante HTTP autenticado. El saldo de caja siguió en 500000, y la factura registró 200000.00 pagados. No se duplicó el dinero al asociar ni aplicar.
- **Deuda anterior:** alta autenticada de saldo pendiente con vencimiento 01/09 y cobro estimado 25/10. Se preservó el vencimiento original para mora y no cambió la caja.
- **Balance:** gasto real de 100000 registrado por formulario; saldo real de 400000. Corrección auditada de fecha sin movimiento neto adicional; reversión del gasto restituye 500000 y reversión del cobro devuelve la caja a cero. Cierre de octubre por dueño, rechazo 409 de un nuevo movimiento y reapertura autorizada.
- **Cobro histórico ligado a factura:** aparece con número de factura, Fecha y Revertir, sin Asociar ni Aplicar. La corrección de fecha se realizó desde la interfaz y respondió 201; conservó saldo real y pago aplicado a factura.
- **Banco y custodia:** Banco Continental usa el SVG embebido del catálogo: `src` de tipo `data:image/svg+xml`, `complete=true`, tamaño natural 201 × 40. Se verificó el nombre de la persona que custodia la cuenta. Esto acredita imagen decodificada, no solamente la presencia del componente.
- **Equipo:** se observó «vos» y estado de acceso. Para una membresía nueva de dueño sin ficha de colaborador, se abrió el menú de su fila, apareció Quitar acceso, se leyó la confirmación y se confirmó desde UI; DELETE 200 y estado revocado persistido. La protección del dueño restante se verificó por HTTP en el caso independiente previo.

## Evidencia

[Resultados de las 97 aserciones](results.json). Las comprobaciones repetidas de un mismo saldo o endpoint cuentan una sola vez por nombre. Las rutas de los reportes originales y capturas completas están en ese JSON; son archivos de la sesión local y pueden dejar de estar disponibles cuando termine el entorno.

- [Confirmación de quitar acceso a otro dueño sin ficha](evidence/owner-removal-confirmation.png).
- [Balance con banco y custodio](evidence/balance-bank-and-custodian.png).
- [Formulario de inventario con propiedad personal](evidence/inventory-owner-and-empty-value.png).
- [Contratos alineados y buscador](evidence/contracts-aligned-search.png).

## Límites y observaciones

La emulación de 390 px no acredita un dispositivo físico. No se probaron impresora, App Store, OAuth, consulta de RUC, servicios bancarios ni despliegue en esta campaña. Las fotos corresponden a imágenes sintéticas; la comprobación de decodificación explícita se hizo sobre el logo bancario.

En el relevamiento inicial móvil se registraron controles preexistentes menores de 44 px: los resúmenes de ubicaciones/categorías de Inventario (20 px) y el acceso Cargar plan y pago en Clientes (28 px). Los enlaces inline de Privacidad miden 15 px y se distinguen de los botones. Estos hallazgos visuales no se contaron como defectos de los flujos nuevos y deben conservar seguimiento; el documento no afirma que todos los controles del producto cumplen 44 px.

Los primeros intentos del runner fallaron por selectores o sincronización: contar acciones inline dentro de un `details` cerrado como visibles, no esperar el observador del footer, buscar Nuevo equipo en vez de Agregar equipo, tratar el selector de personas como botón en vez de combobox, ignorar las iniciales decorativas en el texto de opciones, pulsar antes del refetch, reutilizar nombres de unidades y buscar `aria-label` en el botón de menú cuando el rótulo está en su contenido. También se ajustó la lectura de facturas a la colección real y el reconocimiento del logo a su fuente SVG inline. Cada caso objetivo se volvió a ejecutar con su interacción correcta; no se cambiaron fuentes de producto para esconder esos errores. Los reportes preliminares conservan sus errores y no se presentan como ejecuciones completas exitosas.

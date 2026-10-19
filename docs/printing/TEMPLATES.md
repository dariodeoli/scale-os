# Plantillas térmicas de Scale: 80 mm

Refs #278, #282. El dueño confirmó **únicamente impresora térmica de 80 mm**.
La guía adjunta describe otros productos y modelos: sus nombres, rutas, anchos
de 58 mm, Brother y 3nStar no son configuración ni funcionalidades de Scale.

## Contrato compartido

`backend/printing-renderer.js` es ESM puro, sin Node, red, DOM ni dependencias.
`printing-renderer.d.ts` permite importarlo desde el frontend estricto. La API
normaliza nuevamente cada entrada; la vista previa no autoriza trabajos.

```js
const template = normalizePrintTemplate({
  version: 1, widthMm: 80, heightMm: 'auto', orientation: 'portrait',
  marginsMm: { top: 2, right: 4, bottom: 2, left: 4 },
  fontSize: 10, autoCut: false
});
const document = normalizePrintDocument('test', {
  reference: 'PRUEBA-001', title: 'Prueba sin valor',
  lines: [{ label: 'Estado', value: 'Prueba de composición' }]
});
const result = renderPrintDocument({ template, document, copies: 1 });
// result: { snapshot, html, payloadBase64, payloadBytes }
```

`renderPrintPreview({template, document})` devuelve exactamente el HTML de
`renderPrintDocument`. Ambos componen primero las mismas filas, con el mismo
ancho en celdas, saltos, datos normalizados y versión. El HTML no ejecuta scripts
ni carga recursos externos; escapar los datos sigue siendo obligatorio aunque
el consumidor use un iframe sandbox sin permisos.

El snapshot retornado contiene **solo la definición**, sin empresa, cliente,
sufijo de confirmación ni contenido del documento. La API guarda por separado
los datos privados necesarios para el trabajo. El HTML y los bytes sí contienen
el sufijo de confirmación: no exponerlos en listados, auditoría ni logs.

`renderPrintDocument` permite generar 1 a 5 copias para composición/pruebas y el
payload retornado ya contiene esas copias. En el contrato del sistema, **la API
lo llama siempre con `copies: 1`**, guarda un solo payload y el trabajo lleva
`job.copies` por separado. El agente expande ese payload una sola vez antes de
un único envío, verificando el límite total de 64 KiB. Nunca multiplicar un
payload que ya contiene copias. Ninguna función envía bytes a una impresora.

## Datos y límites

Tipos iniciales: `test`, `receipt`, `quote`, `inventory-label`. Siempre aparece
**Documento no fiscal - No valido como factura**. El generador no calcula IVA,
facturas, numeración fiscal, cambios ni pagos; imprime los datos proporcionados
y autorizados. No inventa empresa, cliente, importe ni fecha actual.

| Campo | Límite |
| --- | --- |
| reference | obligatorio, 80 caracteres |
| title, companyName, customerName | 120 caracteres |
| companyRuc | 40 caracteres |
| issuedAt | fecha ISO `YYYY-MM-DD` o timestamp UTC ISO |
| lines | hasta 30 filas con label 120, value opcional 80 |
| total | texto explícito, 80 caracteres |
| notes | 600 caracteres |
| inventoryCode | existente, Code39, máximo 24 y sujeto al ancho seguro |
| confirmationSuffix | alfanumérico/guion, 4–16 caracteres; generado por API |

Se rechazan caracteres de control (incluidos ESC y NUL), campos
desconocidos, versiones futuras, otros anchos, orientación horizontal, alturas
fijas y QR. Solo en `notes`, saltos LF y CRLF de un textarea se normalizan a
espacios; los otros controles y saltos en otros campos se rechazan. Márgenes entre 0 y 10 mm, enteros de fuente entre 8 y 14, corte
booleano. Los cambios se guardan en la versión de plantilla del API; el `version`
del documento aquí es el formato del renderer (1), no el contador de edición.

## Papel, fuente, corte y códigos

El perfil inicial supone ESC/POS a **203 dpi**, fuente A de 12 × 24 puntos y
avance de 30 puntos. Fuentes 8–12 usan escala 1; 13–14 escala 2. Los valores son
presets de legibilidad, no una promesa de puntos tipográficos arbitrarios. La
vista previa usa las mismas medidas de celda y filas; la forma exacta de cada
glifo depende de la fuente del navegador y del firmware. `printMmToPx` usa 96 dpi
CSS (80 mm ≈ 302,36 px), independientemente de la densidad física del monitor.

Como todavía no se conoce el modelo/tabla de caracteres, ambas salidas usan
ASCII: `Muñoz Álvarez` se imprime `Munoz Alvarez`; caracteres sin aproximación
se sustituyen por `?`. No se promete que acentos o Unicode estén probados en el
dispositivo. Verificar una página de códigos real antes de habilitarla.

El corte está **desactivado inicialmente**. Si se habilita explícitamente se
añaden tres avances y un comando de corte parcial ESC/POS. Una impresora sin
cortador puede ignorarlo. El rollo de 80 mm no confirma ni el ancho imprimible
real, ni el modelo, ni el soporte del comando.

`inventory-label` reutiliza el **código existente**, sin generar ni modificar
identificadores. Code39 es idéntico al encoder de `app/inventory-label.tsx`,
comprobado por regresión. Se genera una imagen raster ESC/POS y el mismo patrón
SVG, con módulo de 2 puntos y zona libre de 20 puntos por lado. Se rechaza un
código que no cabe; no se reduce hasta volverlo ilegible. La etiqueta original
80 × 50 mm del inventario sigue disponible y no se modifica. El ticket es
continuo y **no supone papel adhesivo, gap ni etiquetas precortadas**.

No se imprime QR en esta primera versión: no existe una ruta pública aprobada
para estos documentos. No se inventan rutas `/pedidos`, tokens de acceso ni
payloads de otra aplicación. Los enlaces privados con credenciales o tokens no
deben convertirse automáticamente en QR.

## Verificación

```sh
node --check backend/printing-renderer.js
node backend/test-printing-renderer.mjs
```

La suite verifica dimensiones, límites, copia múltiple sin multiplicación
posterior, corte explícito, escape HTML, rechazo de controles, política ASCII,
composición idéntica de vista previa y payload, snapshot sin sufijo, paridad del
Code39 histórico, raster y rechazo de códigos demasiado anchos.

Pendiente físico: identificar modelo, transporte y ancho útil; imprimir/leer
Code39 con lector real, revisar márgenes, caracteres, avances y corte; confirmar
papel desde la interfaz. Registrar fecha, modelo, rollo, plantilla/versión y
transporte efectivamente usado. Una prueba unitaria, un socket aceptado o una
vista previa **no acreditan papel impreso ni lectura física**. No marcar esta
plantilla como perfil físico verificado hasta documentar esa aceptación.

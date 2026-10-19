# Operación pendiente — issues #214, #215 y #216

Auditoría del 19/10/2026 UTC (18/10/2026 en Asunción), sobre `main`
`fca3c8e5e6e11eb90ca4d8e67c47a2e2bfef215d`, versión 1.0.195.

Se revisaron el plan original adjunto, los tres issues y sus comentarios,
`docs/tasks-contracts-design.md`, `app/inventory-label.tsx`, las acciones de
inventario y `backend/inventory-reservations.js`. El plan original menciona una
impresora existente y papel adhesivo; **no identifica modelo, tecnología,
consumible, cantidad ni responsable**. Los documentos contractuales adjuntos no
son una fuente de inventario operativo.

## Resultado por criterio

| Issue | Evidencia acreditada | Pendiente concreto para finalizar |
| --- | --- | --- |
| [#214](https://github.com/dariodeoli/scale-os/issues/214) | Se distinguió la carga real de los fixtures/demo y del volumen local de `docs/qa/carga-prod/README.md`. La autorización general del dueño ya existe. | Fuente operativa real autorizada y persona que confirme clientes, filmaciones, trabajos personales y tareas vigentes. Sin ella no se puede medir cobertura, detectar faltantes reales o asignar su carga. No se modificó producción. |
| [#215](https://github.com/dariodeoli/scale-os/issues/215) | El alcance es comprar únicamente consumible compatible. El tamaño CSS existente es 80×50 mm; esto no identifica papel compatible con una impresora. | Marca/modelo o ficha de la impresora, soporte admitido (hoja/rollo, tecnología, ancho y sensores), tamaños y cantidad requeridos. Después corresponde cotización y coordinación de recepción con responsable. No se eligió papel ni se hizo una compra. |
| [#216](https://github.com/dariodeoli/scale-os/issues/216) | Code 39 actual comparado con una referencia independiente: 43/43 caracteres y símbolos de inicio/parada correctos. Se conserva el código del ítem para imprimir; la edición del API rechaza cambiarlo. Pruebas locales de inventario aprobadas. | Conciliar cobertura real con #214 y comprobar impresión/lectura física con impresora y papel confirmados en #215. No hay evidencia para afirmar que existen QR ni para reemplazar códigos. |

Los tres issues permanecen abiertos. El entorno actual no publica credenciales,
identidades externas ni capacidades de hardware; no hay una sesión productiva
proporcionada para esta auditoría. Esto es falta de acceso/datos de ejecución,
no una nueva solicitud de autorización al dueño.

## Verificación de software

- `node --import tsx --test tests/inventory-label.test.ts tests/inventory-data.test.ts tests/inventory-workspace.test.tsx`: **3 entradas PASS**, registro [focused-tests.txt](./focused-tests.txt). El workspace simula API/Editor; no equivale a una operación física o a producción.
- Tabla de anchuras Code 39 de ZXing, fijada al commit `9172a3da2010082a6c134fa5cade5cb133aae60d`, contrastada con las barras emitidas por Scale: **0 diferencias**. Datos y hash de referencia en [code39-software.json](./code39-software.json).
- La etiqueta abre un documento con `@page` 80×50 mm y una columna de código de 29 mm. La anchura física del módulo depende del largo del código y del escalado de impresión: hay que validar resolución, escala 100 %, márgenes reales y lectura con el hardware. Este cálculo no acredita que la impresora soporte ese formato.
- El API conserva `old.inventory_code` y devuelve 409 ante cambios de código en una edición (`backend/inventory-reservations.js`). No se generaron, migraron ni reconstruyeron códigos existentes.

Reproducir el contraste independiente desde la raíz del repositorio, con las
dependencias existentes instaladas:

```bash
curl --fail --silent --show-error \
  https://raw.githubusercontent.com/zxing/zxing/9172a3da2010082a6c134fa5cade5cb133aae60d/core/src/main/java/com/google/zxing/oned/Code39Reader.java \
  -o /tmp/scale-code39-reference.java
node --import tsx docs/qa/pending-operations/audit-code39.cjs /tmp/scale-code39-reference.java
```

El script produce evidencia local; no hace consultas a clientes, no escribe en
la base y no imprime ni modifica identificadores. Los ejemplos de IDs son
sintéticos, incluso cuando usan números pequeños.

## Cierre operativo y deploy

Para #214, el responsable contrasta la fuente operativa con registros reales y
comunica cantidades conciliadas, faltantes y duplicados; el detalle personal se
mantiene fuera de GitHub. Para #215 registra modelo, consumible, cotización,
cantidad y recepción. Para #216 registra fecha, impresora, soporte, medidas,
escala, resolución y resultado de lectura de etiquetas medianas/grandes.

No se encontró un defecto de software demostrado que justifique cambiar la app
en este alcance. Esta entrega documenta la auditoría y evidencia; no solicita
un nuevo deploy ni acredita una prueba física. No se ejecutaron build completo,
CI nuevo, compra, conciliación productiva ni ensayo de hardware en esta rama.

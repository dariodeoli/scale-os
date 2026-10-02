# Ronda de popups — Presupuestos y Oportunidades (#150)

Evidencia de la auditoría del dueño (02-10) sobre los modales de creación y las
condiciones del enlace público de un presupuesto.

## Causas encontradas

1. **«Guardar» habilitado en un presupuesto vacío**: el compositor solo bloqueaba
   el botón mientras guardaba; con título, cliente e ítems vacíos el submit
   llegaba al API (o al guard local) sin señales claras de lo que faltaba.
2. **Editor demasiado cargado**: al abrir un presupuesto, el diálogo montaba
   directo la edición completa (título, cliente, plan base, moneda, IVA,
   vigencia, ítems, secciones con reordenamiento y vista previa), tanto para
   consultar como para editar.
3. **Enlace público sin condiciones**: «Habilitar enlace público» ejecutaba el
   POST en el primer clic, sin explicar alcance, vencimiento ni revocación.
4. **Alta de oportunidad**: el aviso legal (`AvisoPrivacidad`) ocupaba el primer
   bloque visual y empujaba los campos hacia abajo.

## Fix

- **Guardado bloqueado**: `quoteReadiness()` (puro, en `quote-composer-data.ts`)
  define los campos que bloquean (título ≥ 2, cliente en el alta e ítems con
  descripción, cantidad positiva y precio válido). El botón queda deshabilitado
  y el pie dice qué falta; los campos obligatorios se marcan y los errores van
  inline por campo (mensajes del schema en castellano, `aria-invalid` y
  `aria-describedby`). El submit por Enter tampoco escribe sin los campos.
- **Consulta ≠ edición**: abrir un presupuesto muestra su detalle (estado,
  cliente, vigencia, ítems, totales y condiciones) con las acciones visibles
  arriba (PDF, enlace, editar, factura). «Editar presupuesto» monta el
  compositor; en el compositor, IVA, vigencia y secciones viven en «Opciones del
  documento» (plegable) y la vista previa en su propio bloque. `BUDGET_STATE`
  pasó a `app/budget-status.ts` para que lista y detalle usen una sola etiqueta.
- **Enlace con condiciones**: el clic abre un bloque que explica alcance (quien
  tenga el enlace ve el presupuesto completo y puede aceptarlo o rechazarlo),
  vencimiento (la vigencia cargada o «sigue activo hasta que lo desactives») y
  revocación (queda sin efecto al instante). Recién el botón «Habilitar enlace»
  ejecuta el POST; la confirmación de revocación también explica el efecto.
- **Oportunidad**: los campos van primero; el aviso legal queda como resumen de
  una línea con enlace «Privacidad» y el detalle (finalidad + derechos) en la
  ayuda desplegable «Finalidad y tus derechos». La oposición «No contactar»
  sigue visible junto a los datos.

## Antes / después (medidas crudas)

| Dato (1440 light, presupuesto de evidencia) | Antes | Después |
|---|---|---|
| Abrir presupuesto | editor completo montado (`composer: true`) | detalle de consulta (`composer: false`) |
| Guardar en alta vacía | **habilitado** | **deshabilitado** + «Completá el título, el cliente y los ítems» |
| IVA / vigencia / secciones | siempre visibles | dentro de «Opciones del documento» |
| Enlace público | POST directo, sin condiciones | bloque de alcance, vencimiento y revocación antes del POST |
| Alta de oportunidad | aviso legal en el primer bloque (índice 18) | campos primero (índice 18); aviso en una línea + detalle plegable |

## Archivos

- `{antes,despues}-presupuesto-detalle-{1440,390}-{light,dark}.jpg`
- `{antes,despues}-presupuesto-vacio-{1440,390}-{light,dark}.jpg`
- `despues-presupuesto-enlace-{1440,390}-{light,dark}.jpg`
- `despues-presupuesto-editor-{1440,390}-{light,dark}.jpg`
- `despues-presupuesto-opciones-{1440,390}-{light,dark}.jpg`
- `{antes,despues}-oportunidad-alta-{1440,390}-{light,dark}.jpg`
- `despues-oportunidad-privacidad-{1440,390}-{light,dark}.jpg`
- `medidas-{antes,despues}.json`

Guion reproducible: `node build-tools/visual-harness/capture-com-150.mjs antes|despues`
(stack local de COM levantado con `QA_SESSION=com-qa-session-150.txt` y `.next`
construido). El guion crea un presupuesto de evidencia en la demo y recorre
consulta, enlace, alta vacía y alta de oportunidad; `WIDTHS=390` permite retomar
solo un ancho sin perder lo capturado.

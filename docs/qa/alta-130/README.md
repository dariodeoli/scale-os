# Alta manual de equipos (#130) — divulgación progresiva, cantidad y «guardar y agregar otro»

_2026-10-01 · rama `SOS-OPS` · base `origin/main` v1.0.160. Evidencia contra la
app real (stack `e2e-ops-stack.mjs`: Postgres 17 + API + demo privada + front
construido) con `qa-ops-alta-130.mjs`._

## Decisión de secciones

La primera pasada queda en **Básico** y el resto entra en **«Más datos»**
(colapsable nativo, `<details>`), **sin eliminar ningún campo**:

| Sección | Campos |
| --- | --- |
| **Básico** | Nombre, Cantidad (solo alta), Categoría, Serie/IMEI, Valor, Moneda, Ubicación de guardado (lugar · personalizada · fila · crear lugar) |
| **Más datos** | Foto, Valor de compra + Fecha de compra, Depreciación (método · vida útil · valor residual), Estado, Custodio, Fecha de adquisición, Notas |

- En **edición** no hay Cantidad; «Más datos» arranca **abierto** si la ficha ya
  trae foto, compra, depreciación, custodio, adquisición, notas o un estado
  distinto de «Disponible» (nada queda escondido de forma sorpresiva).
- **Obligatorios mínimos: nombre** (como pide la auditoría). El valor queda con
  el default **0** y el catálogo lo muestra como «valor faltante» para
  completarlo después; la moneda sale de la empresa.
- Los errores de validación viven **junto al campo** (`role="alert"`,
  `aria-invalid`, `aria-describedby`); si el error es de depreciación, «Más
  datos» se abre solo.
- Los campos alimentan igual que antes etiquetas, depreciación y mantenimiento:
  el payload del API no cambió (un POST por unidad, el mismo contrato).

## Decisión de cantidad

- **Cantidad (1–25)**, solo al crear: N copias idénticas con **un registro por
  unidad reservable** (mismo tope que la Carga con IA, `IA_REGISTROS_MAX`);
  cada unidad recibe su propio código Scale OS. El CTA dice cuánto va a crear
  («Crear 3 equipos»).
- **Serie/IMEI bloquea la cantidad**: con serie la cantidad queda en 1 y el
  campo se deshabilita (una serie nunca se duplica); el aviso lo explica.
- **Corte a mitad de serie**: si una unidad falla, la lista se refresca sin
  cerrar el diálogo, la cantidad vuelve a 1 (para no duplicar lo ya creado) y el
  error dice cuántas se crearon.

## «Guardar y agregar otro»

- Guarda, deja el formulario limpio, avisa arriba qué se creó y **reenfoca el
  nombre**; el diálogo no se cierra.
- Se conservan los **defaults del equipo anterior**: categoría, valor, moneda,
  ubicación y estado; se limpia lo único (nombre, serie, foto, notas, custodio,
  compra, depreciación, adquisición).
- El guardado simple (CTA principal) sigue cerrando el diálogo.

## Evidencia (390×844 y 768×1024, claro y oscuro)

- `alta-basico-{390,768}-{light,dark}.jpg`: básico visible y «Más datos»
  plegado (los campos avanzados no ocupan la primera pasada y siguen en el DOM).
- `alta-mas-datos-*.jpg`: bloque abierto con foto, compra, depreciación,
  estado, custodio, adquisición y notas.
- `alta-error-nombre-*.jpg`: error junto al campo.
- `alta-cantidad-*.jpg`: «Crear 3 equipos» + verificación en Postgres
  (3 unidades persistidas).
- `alta-agregar-otro-*.jpg`: aviso de creado, formulario limpio, valor previo
  conservado y foco en el nombre.
- `alta-serie-*.jpg`: cantidad en 1 y deshabilitada con serie.
- `informe.json` + `qa-alta-130.txt`: las verificaciones de la corrida.

## Reproducir

```sh
node build-tools/visual-harness/e2e-ops-stack.mjs   # queda corriendo
node build-tools/visual-harness/qa-ops-alta-130.mjs # capturas + informe
npx tsx tests/inventory-alta-130.test.tsx           # contrato del flujo
```

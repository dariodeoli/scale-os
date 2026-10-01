# QA ola 2 — Operaciones (#123) — evidencia

_2026-10-01 · rama `SOS-OPS` · base final `origin/main` v1.0.158 + owncoding-ui
v0.59.0. Barrido contra la app real con el stack local `e2e-ops-stack.mjs`
(Postgres 17 temporal + API + demo privada + front construido + proxy de un solo
origen) y el harness `qa-ola2-ops.mjs`; el dnd con `e2e-drag.mjs`._

## Cobertura

**77 verificaciones OK / 0 fallas** (`qa-despues.txt`) a **390×844** y
**768×1024**, claro y oscuro, sobre Inventario, Producción, Proyectos y Estudio:
capturas en esta carpeta (39 imágenes, claro/oscuro).

| Bloque | Qué se barrió |
| --- | --- |
| Cáscara | Menú móvil (foco, Escape, retorno al disparador, target 44), toggle de tema |
| Inventario | Lista (scroll horizontal real), estado vacío de búsqueda, alta de equipo (foco, Tab atrapado, targets, scroll interno con pie visible, validación visible), pipeline con reordenamiento de ubicaciones, reservas y su modal (scroll interno + validación) |
| Producción | Tablero (scroll por etapas), alta de pieza (foco, targets, validación, fecha/hora), planificador |
| Proyectos | Lista a 390/768, alta de proyecto (validación visible) |
| Estudio | Vacío inicial, alta de espacio (validación y guardado), reserva de estudio (selects con opciones, fechas `datetime-local`, responsable, guardado) |

Además:

- `harness-baseline-390-768.md`: **36 fixtures a 390/768, 0 hallazgos** (overflow,
  bleed, superposiciones, filas, cuadrículas, encabezados).
- `dnd-despues.txt`: `e2e-drag.mjs` **PASS** — tablero mouse/touch/filtro,
  pipeline mouse/touch, custodia de solo lectura rechazada y viewer sin efecto,
  contra la app real y Postgres.

## Correcciones (arnés, no producto)

No hubo correcciones de producto: el barrido quedó verde. Los arreglos fueron al
arnés, que producía falsos negativos:

1. **`e2e-drag.mjs` — custodia por empresa.** La precondición marcaba retirada la
   reserva más antigua del clúster entero; con varias empresas demo, la empresa
   bajo prueba quedaba sin columna de custodia y el chequeo fallaba. Ahora retira
   una reserva **por organización** y, si la empresa no tiene retiros, el chequeo
   se omite con una nota en vez de fallar.
2. **`e2e-drag.mjs` — pipeline actual.** Las tarjetas ya no usan `<code>` (el
   código vive en el detalle `small`), el destino se elige como la **columna
   adyacente** (los recorridos largos activaban el auto-scroll de dnd-kit y el
   drop caía fuera), el gesto **táctil corre en sesión limpia** (la secuencia
   mouse→touch emulada no registra el touch en la misma sesión de dnd-kit, aunque
   aislada funciona) y el estado del pipeline se **normaliza por corrida** (una
   ubicación activa + equipos sin ubicación) para que sea determinista. Extra: el
   log parcial se imprime si algo falla.
3. **`e2e-ops-stack.mjs` + `qa-ola2-ops.mjs` (nuevos).** Stack OPS con sesión
   viewer vía el modo «ver como» del shell (`demo_role='viewer'`, la organización
   demo solo deja entrar al dueño) y barrido interactivo completo.

### El fallo reportado, verificado a mano

El «✗ pipeline: la tarjeta en custodia está deshabilitada: undefined» era el
arnés (no había columna de custodia en la empresa mirada). Con la precondición
por empresa: la tarjeta en custodia se anuncia `aria-disabled` y el drop sobre la
columna de solo lectura no cambia la ubicación (ver `dnd-despues.txt`). El
arrastre táctil del pipeline también se reprodujo aislado contra la app real
(mueve y persiste), y con un clic **real** de mouse el modal devuelve el foco al
disparador al cerrar con Escape.

## Pendientes (patrones compartidos, coordinar con DSN)

- El retorno de foco al disparador quedó verificado en OPS con clic real; PLT
  reportó el caso «vuelve a body» según cómo se abra el diálogo — criterio
  compartido de `Dialog`/`Modal` para DSN.
- En desktop (768) los botones secundarios conservan ~32–36 px de caja (los ≥44
  se cumplen en móvil y el patrón `toque-44` de la librería estira el área
  táctil del cierre de los modales). Decisión de primitivos, no por pantalla.
- La vista de reservas de inventario no ofrece «Reservar equipos» cuando la
  lista tiene registros (el alta vive en la pestaña Equipos): es el diseño
  actual, se deja anotado por si producto quiere un acceso directo.

## Reproducir

```sh
node build-tools/visual-harness/e2e-ops-stack.mjs   # queda corriendo
node build-tools/visual-harness/qa-ola2-ops.mjs     # barrido + capturas
node build-tools/visual-harness/e2e-drag.mjs        # dnd contra la app real
node build-tools/visual-harness/run.mjs --only produccion,proyectos,inventario,estudio,ops- --widths 390,768
```

# Producción, detalle de pieza e Inventario — ruido, formatos y atribución (#151)

Evidencia de la auditoría del dueño (02-10) sobre la demo: tablero de Producción,
detalle de pieza e Inventario visual. Guion reproducible:
`node build-tools/visual-harness/qa-ops-151.mjs --tag antes|despues [--checks]`
(stack local de OPS levantado y `.next` construido).

## Hallazgos y fix

1. **«Sin definir» / «Sin clasificar» repetidos**: cada tarjeta del tablero
   anunciaba `Urgencia: Sin definir` y un chip `Sin clasificar` aunque la pieza
   no tuviera dato. Se ocultan los campos vacíos en la tarjeta, el encabezado
   del detalle, el detalle y la lista del planificador (ahí un `—` honesto).
2. **Horas «3.00 h»**: el API devuelve decimales de Postgres. `app/hours-format.ts`
   es la fuente única (`3.00 → 3`, `2.50 → 2,5`): tarjeta, detalle y planificador.
3. **Vencido vs. aprobado/publicado**: las piezas terminadas mostraban
   «venció hace…» en rojo. `DueDate` acepta `done` (aprobado/publicado): la
   entrega pasada se lee «entregada» en tono neutro y el planificador no pinta
   la alerta en esas filas.
4. **Email demo crudo en el detalle**: los responsables del detalle mostraban el
   `secondary` con el correo técnico (`persona-11-4@demo.example.invalid`).
   `actor-identity` expone `isTechnicalDemoEmail`/`personDisplayName`: ningún
   correo `@demo.example.invalid` / `@scale-demo.example.invalid` se dibuja como
   identidad (nombre, y «Persona del demo» cuando no hay mejor dato); aplica a
   `ActorIdentity`, `PersonContainer`, `AssignedPeople`, `AssigneePicker` y
   `RecordAssignees`.
5. **Checklist con «por» sueltos**: la atribución escondía el nombre en el
   avatar y solo se veía «por [iniciales]»; los ítems completados sin registro
   no decían nada. Ahora: completado con nombre → `Completado por Sebastián ·
   fecha`; completado sin datos → `Completado · sin registro`; agregado →
   `por Sebastián` (nombre visible, `title` con el completo, nunca el correo).
6. **Inventario — foto rota**: un enlace caído dejaba el `<img>` quebrado con el
   alt «Foto». `EquipmentPhoto` cae al mismo placeholder limpio (`Sin foto`) al
   fallar y reintenta si cambia la foto.
7. **Inventario — nombres recortados**: la columna Artículo tenía
   `minmax(8.5rem,1.4fr)`. Pasa a `minmax(11rem,1.8fr)` (mayor `fr` y mínimo más
   ancho): el nombre completo entra antes de truncar; el código y el resto de
   las columnas no se cortan.

## Verificación del guion (`--checks`)

| Check (390 y 1440) | Antes | Después |
|---|---|---|
| Tarjetas con «Sin definir»/«Sin clasificar» | todas (muestreadas 3/3) | **0** |
| Horas con decimales vacíos (`3.00 h`) | todas | **0** |
| Aprobadas/publicadas con «venció» o `.overdue` | sí | **0** |
| Detalle con `@demo.example.invalid` en el DOM | sí (`persona-11-4@…`) | **no** |
| Checklist completado sin registro | vacío | `Completado · sin registro` |
| Foto rota deja `<img>` quebrado | sí | **no** (placeholder de la casa) |
| Nombres de equipos recortados | «Monitor de cam…» en 390 | **0** |

28/28 checks en verde (`informe-despues.json`, `qa-despues.txt`).

## Archivos

- `{antes,despues}/produccion-tablero-{1440,390}-{light,dark}.jpg`
- `despues/produccion-etapas-finales-{1440,390}-{light,dark}.jpg` (entregada vs. vencido)
- `{antes,despues}/pieza-detalle-{1440,390}-{light,dark}.jpg`
- `despues/pieza-checklist-{1440,390}-{light,dark}.jpg` (atribución dentro del pliegue)
- `{antes,despues}/inventario-lista-{1440,390}-{light,dark}.jpg` (foto rota preparada por el guion)
- `{antes,despues}/informe-*.json`, `{antes,despues}/qa-*.txt`

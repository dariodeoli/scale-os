# Estudio: Hoy en móvil (#249)

Base `2ecdc7f3` (main 193), implementación frontend sin cambios de API, permisos ni reglas de reserva.

La vista móvil abre la lista existente con las reservas que se cruzan con el día civil de Asunción. «Mes completo» vuelve al calendario y a todas las reservas del mes; cambiar Mes elige esa vista. «Hoy» vuelve al mes y fecha actuales sin borrar búsqueda, espacio ni estado. Los vacíos nombran el día y permiten consultar otras fechas. Espacio y Estado comparten una fila móvil; escritorio conserva filtros, calendario y tabla mensual.

El botón mensual «Seleccionar visibles» permanece en escritorio/mes completo; se oculta en Hoy móvil para no seleccionar fechas que esa vista no muestra. Selección individual y operaciones existentes permanecen. No se agregan botones nativos ni se modifica el JSX/hash de ninguno de los 55 widgets estructurales revisados de #241. Hay tres sitios nuevos de Button canónico; el snapshot global de acciones debe refrescarse al integrar la entrega.

## Evidencia

- [Referencia anterior390](screens/before-390-light.png): captura heredada de auditoría #248, build `0afdbd08`, con días vacíos 1–8 en el primer pliegue. No se presenta como una nueva ejecución de main 193.
- [Después390 claro](screens/390-light.png), [oscuro](screens/390-dark.png), [contraste](screens/390-contrast.png).
- [Después1440 claro](screens/1440-light.png), [oscuro](screens/1440-dark.png), [contraste](screens/1440-contrast.png).
- [Medición y peticiones](browser-report.json): componente StudioWorkspace y controles reales, HTTP fixture local, fecha fija 2026-10-17, cabecera sintética112 px. A 390×844, reserva de hoy y587–781, Hoy 44×44 y ancho del documento390. A 1440 permanece el calendario mensual.

Los seis escenarios pasan en claro/oscuro/contraste. Se prueban vacío de hoy, reservas sólo en otra fecha, error recuperable y lectura sin acciones mutantes. Se abren y cierran alta, edición y confirmación de cancelación existentes. La navegación Hoy se activa con teclado. Todas las peticiones observadas son GET locales; no se envían reservas ni se usa producción. Esta evidencia no sustituye QA del shell autenticado integrado ni pruebas físicas.

## Reproducción y gates

```bash
npx tailwindcss -i app/tailwind.css -o /tmp/scale249-tailwind.css --minify
node build-tools/qa-studio-agenda.mjs
node --import tsx --test tests/studio-agenda.test.tsx tests/studio-data.test.ts tests/ops-compact-94.test.ts tests/ops-v2-contract.test.ts
npx tsc --noEmit --incremental false
```

Browser 6 layouts+casos funcionales y8 focales PASS. La prueba nueva queda registrada en `95-studio-agenda.list`. El guard global de acciones detecta el snapshot previo (588 canónicos) frente a 591; las 55 excepciones y su renderer permanecen idénticos. El integrador actualiza ese inventario junto al resto de 194. Build/CI/merge/deploy se acreditan por separado en la integración, sin bump ni publicación desde esta rama.

Reversión: retirar el commit restaura la presentación mensual anterior; no modifica reservas ni requiere migración.

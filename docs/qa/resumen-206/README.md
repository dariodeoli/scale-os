# Resumen compacto — QA focal #206

17/10/2026. Rama `codex/resumen-tareas-prioridad`, base main 193 `2ecdc7f3`.

La vista inicial muestra una tarea real de la consulta propia de Hoy, con estado,
prioridad, contexto, vencimiento y avance. «Ver checklist y detalle» abre el
mismo diálogo y mutación existentes. «Ver todas mis tareas» despliega el dashboard
completo, conservando categorías, filtros, paginación y borradores de filtro.
Volver al resumen conserva la vista seleccionada: no cambia IDs ni consulta por
otra persona. La ficha de Proyecto conserva la variante completa predeterminada.
La guía inicial pasa después de las señales y resúmenes, sin retirar sus acciones.

Al refrescar la misma consulta tras una mutación se conservan las tarjetas
montadas hasta la respuesta, para que el diálogo pueda devolver foco al botón
original. Una consulta diferente limpia sus tarjetas; empresa/usuario conservan
la clave de aislamiento existente. No se añadieron endpoints ni mutaciones.

## Comprobaciones ejecutadas

- `npx tsx tests/employee-tasks.test.tsx`: PASS. Incluye permisos, CAS/conflicto y
  recuperación, aislamiento de empresa, tres registros que se expanden desde uno
  sin escritura ni consulta adicional y filtros conservados al contraer/expandir.
- `com-compact-screens`, `capability-gates`, `ops-transversales` y
  `ui-patterns-138`: PASS con sus comandos `npx tsx tests/<nombre>.test.ts[x]`.
- `npx tsc --noEmit --incremental false`: PASS.
- Runner Chromium propio: 12 composiciones antes/después, 1440×1000 y 390×844,
  claro/oscuro/contraste: cero desborde del documento. Checklist escribe una vez
  al mismo ID con `expected_version=1`; Escape restaura foco al botón, Enter
  despliega la lista; tres registros siguen accesibles. Consulta `assignee=me`,
  vacío, error y recuperación por Reintentar: PASS.

Comparación controlada, tema claro (los tres temas conservan estas medidas):

| Viewport | Alto tareas antes → después | Y de urgencia antes → después |
|---|---|---|
| 1440×1000 | 597.70 → 268.59 px | 888.58 → 481.47 px |
| 390×844 | 1357.58 → 351.44 px | 1792.02 → 707.88 px |

La prioridad elegida deja una tarea propia y su acceso al checklist, el contador
Hoy y el enlace Vencidas antes de las señales y la factura vencida. La lista
completa y la edición secundaria están a una acción de distancia. La urgencia
registrada entra en ambos primeros pliegues de esta fixture.

## Evidencia y límites

`results.json` conserva mediciones y la escritura sintética. Capturas locales:
`/tmp/scale206-browser/{1440|390}-{light|dark|contrast}-{before|after}.png`.

Este runner monta componentes reales (`EmployeeTasks`, `ControlCenter`,
`WorkspaceGuide`) y usa exclusivamente un servidor HTTP loopback propio con
fixtures sintéticas. «Antes» reproduce la composición completa y orden anterior
de guía; no ejecuta un build histórico. Usa CSS compilado local de Scale y CSS
de tareas candidato, con contenedor de prueba acotado al viewport. No prueba el
shell Next, backend real, cálculos financieros, persistencia PG, contraste AA,
dispositivo físico ni aislamiento entre sesiones. El resumen comercial devuelve
intencionalmente una respuesta incompleta y muestra su estado de error; no se
acredita ese flujo por estas capturas. La comparación mide geometría y acciones
concretas, no aceptación global de la aplicación.

```bash
QA_BASE_CSS_DIR=/ruta/al/build/local/.next/static/css \
node docs/qa/resumen-206/browser.mjs
```

No se usaron servicios, cookies o API de otros agentes ni proveedores externos.
El runner cierra su propio servidor y navegador. QA de la app candidata y gates
completos de release 194 quedan a cargo del integrador. La guarda de acciones
requiere refresco de hashes por el integrador al congelar la entrega; este PR no
edita manifiestos compartidos. Sin merge, deploy ni cierre del issue.

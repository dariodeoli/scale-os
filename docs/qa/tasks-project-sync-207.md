# QA #207: misma tarea entre Resumen y ficha de proyecto

17/10/2026, Chromium real, Next production local `50091b70` (1.0.192), API `127.0.0.1:4115` con metadata1.0.191. Datos exclusivamente de demoA sintética en PostgreSQL55450. **22/22 comprobaciones PASS**, cero errores runtime y cero intentos de proveedores externos.

Se seleccionó una tarea propia de Hoy con proyecto/checklist a partir de respuestas HTTP reales: tarea `3`, proyecto `3`, «Confirmar set y equipos de la grabación» / «Campaña · Órbita Fitness». Los nombres sirvieron para localizar controles; la identidad se acreditó mediante GET/PATCH del ID y el GET filtrado por `project_id=3`, conservados en el JSON. No se dedujo la identidad sólo del título.

| Viewport | Secuencia real |
| --- | --- |
| 1440×1000, claro | Resumen abre GET tarea3 v1; clic checklist emite PATCH misma tarea v2; abrir ficha del proyecto y detalle de tarea muestra v2/checkbox marcado; desmarcar allí emite v3; volver a Resumen muestra v3/desmarcado |
| 390×844, claro | Misma secuencia: v3→v4 desde Resumen; ficha de proyecto muestra v4; desmarcar desde la ficha emite v5; Resumen muestra v5/desmarcado |

La entrada al proyecto fue el botón real `Ver detalle del proyecto: Campaña · Órbita Fitness` de `/proyectos`. Su drawer incluyó el bloque `Tareas del proyecto`; el GET filtrado devolvió el mismo ID. Los cambios se observaron tras navegación/recarga de cada vista. **No se acredita invalidación simultánea sin recarga entre dos pestañas.** No se probaron reprogramación ni el estado completo/done: el caso focal modifica un ítem del checklist en ambas direcciones.

La comparación de todos los IDs antes/después conservó las siete tareas; ningún POST de tarea se emitió. El checklist quedó idéntico al original y status/due-date no se modificaron. La versión final es5: los cuatro cambios y su auditoría son reales y permanecen en la fixture; no se borró historia para simular que no ocurrió la prueba. No se necesitó restauración de emergencia por API.

## Evidencia y reproducción

Runner portable: `docs/qa/tasks-project-sync-207/browser.mjs`. Resultados HTTP/aserciones: `docs/qa/tasks-project-sync-207/results.json`. Capturas locales `/tmp/scale207-project-sync/`: Resumen cambiado/restaurado y detalle de tarea del proyecto para ambos tamaños. Las dos capturas adicionales `*-project-drawer-tasks-restored.png` son lecturas posteriores, desplazadas al bloque de tareas, sin nuevas mutaciones. Las imágenes no se fuerzan a git.

```bash
QA_COMPILED_SOURCE=50091b70 \
QA_BASE_URL=http://127.0.0.1:3013 \
QA_API_URL=http://127.0.0.1:4115 \
QA_SESSION_FILE=/ruta/privada/sesion-demo \
node docs/qa/tasks-project-sync-207/browser.mjs
```

El runner limita hosts a loopback, usa una tarea ya existente, alterna/restaura sólo el primer ítem y conserva las versiones CAS. No imprimir tokens ni usar una sesión real. Servicios del integrador y de otros agentes conservados; sin cambios de producto, merge ni deploy.

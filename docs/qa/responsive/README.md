# Auditoría responsive de Scale

Seguimiento: [issue #265](https://github.com/dariodeoli/scale-os/issues/265).

Las fuentes externas y sus revisiones están en [SKILLS.md](SKILLS.md). Fueron
consultadas como documentación. No se instalaron globalmente, no se activaron
hooks ni se ejecutaron sus motores. Esta configuración no equivale a tener
skills instaladas en Codex.

[agents.json](agents.json) contiene briefs de dominio y la matriz mínima para
que el coordinador delegue trabajo en ramas/worktrees independientes. Es una
configuración de campaña, no un scheduler ni un lanzador automático. El dueño de
primitivos debe asignarse una sola vez. Si el coordinador edita CSS global, el
agente shell queda en modo lectura y entrega recomendaciones.

## Aplicación de las metodologías

- Taste: registrar antes/después, separar app y landing, conservar marca y
  tipografía. Las reglas de app son las pertinentes para el área operativa.
- Pro Max: consultar problemas concretos de UX y el stack detectado. No generar
  otro sistema de diseño sobre OwnCoding UI y los tokens de Scale.
- Impeccable: diagnóstico por accesibilidad, rendimiento, temas, responsive e
  integridad; después adaptación y revisión final. La petición de implementar
  del dueño ya autoriza corregir los hallazgos dentro del alcance.

Las preferencias externas que contradigan AGENTS.md, DESIGN-SYSTEM.md o el
brief del dueño no reemplazan las reglas del proyecto. Por ejemplo, preservar
violeta/marca y el contrato de listas finitas con columnas alineadas; contener
el desplazamiento de tablas donde sea necesario, sin convertirlas en tarjetas
por una regla genérica externa.

## Evidencia y entrega

Cada hallazgo lleva severidad P0–P3, ruta/estado, viewport, archivo/línea cuando
sea identificable, medida observada, comportamiento esperado, evidencia y dueño.
Se reejecuta la comprobación tras corregirlo y se revisa escritorio también.
No se exige un score artificial ni se presentan sugerencias como defectos
comprobados.

El reporte distingue geometría, revisión visual, interacción de navegador y
prueba física. Chromium con viewport de iPhone no valida Safari ni un teléfono
real. La ausencia de esos equipos se documenta como limitación concreta.

Los implementadores entregan commit, rama, archivos, pruebas focales y PR. El
integrador ejecuta los gates reales de [WORKFLOW.md](../../WORKFLOW.md) antes de
publicar. Esta documentación por sí sola no acredita auditoría de páginas, CI
completo ni deploy.

# Seguimiento del plan Scale — 17/10/2026

Los 16 documentos describen una issue madre y 15 issues de ejecución. Son requisitos y criterios pendientes de verificación; no prueban implementación ni integración.

- Fuente: plan pegado por el usuario y `docs/tasks-contracts-design.md`.
- Corrección: OwnData = extracción de RUC; owncoding-ui = biblioteca de objetos. Ocoin requiere identificación y acceso verificables.
- Backlog único: `dariodeoli/scale-os`, front y API juntos. Sin asignación de personas ni compras automáticas.
- Compras, inventario operativo y pruebas físicas se siguen por separado del desarrollo.

Para revisar sin escribir en GitHub: `node build-tools/create-plan-issues.mjs --check`.
Para publicar, una vez disponible el acceso de lectura/escritura de GitHub: `node build-tools/create-plan-issues.mjs --create`.

El script lee todas las issues, incluidas cerradas, antes de cualquier mutación; busca marcadores por clave y evita duplicarlas. Si una lectura falla, aborta sin crear. Reanudar con el mismo comando después de una interrupción recupera las issues existentes. Añade relaciones mediante comentarios idempotentes; guarda el índice de URLs en `/tmp/scale-plan-issues-20261017.json`, sin credenciales. No altera estados, responsables ni etiquetas de issues existentes.

# Resultado de QA: tareas y contratos

Ejecución final: **2026-10-17 03:35:05–03:36:09 UTC**
(00:35:05–00:36:09, America/Asuncion). Resultado: **104 checks aprobados,
0 fallos**, 24 capturas automáticas y 2 evidencias visuales adicionales.

Aplicación real: Next en `http://127.0.0.1:3000`, API local y PostgreSQL local
aislado. Identidades sintéticas de administrador, editor y viewer; ningún dato
de producción. Chromium 154, Node 24 y Puppeteer del backend. Sin despliegue,
mensajes externos ni uso de proveedores IA.

## Comprobaciones aprobadas

- Tareas a 390 y 1440 px: alta con proyecto, descripción, prioridad, fecha/hora,
  material y subtarea; completar checklist; comentar; reprogramar por formulario;
  pasar a Próximas; completar y consultar Completadas.
- Dashboard, formulario y detalle sin desborde horizontal del documento;
  controles móviles medidos de al menos 44 px; teclado y foco dentro del diálogo.
- Consulta por proyecto conserva el mismo id de tarea. Escritura con versión
  antigua devuelve 409 sin sobrescribir el cambio actual.
- Fallo de red inducido sólo en una consulta local: error visible, reintento que
  recupera el API real y estado vacío real al filtrar por fecha sin registros.
- Editor crea y completa tareas propias; viewer no crea. Ambos carecen de
  acceso al listado de equipo, tarea privada del administrador y contratos.
- Contratos a 390 y 1440 px: crear plantilla, crear borrador, señalar campos
  faltantes, editar datos manualmente con procedencia visible, previsualizar,
  guardar y emitir tras marcar revisión humana explícita.
- Exportación PDF desde la interfaz, respuesta autenticada 200 y tipo correcto;
  firma `%PDF-`, texto esperado, última cláusula y **7 páginas A4** en ambos
  documentos. Editar el borrador conserva la versión emitida. Conflicto de
  revisión devuelve 409.
- Perfil legal empresarial: GET/PATCH/GET, aumento de revisión y persistencia
  de los mismos valores; captura móvil adicional sin overflow.

## Evidencia local

El manifiesto final está en `work/qa-tasks-contracts/report.json`. Las capturas
y PDF quedan ignorados por Git; no se incorporan al contexto de build.

| Evidencia | Archivo bajo `work/qa-tasks-contracts/` |
| --- | --- |
| Inicio móvil | `tasks-390.png` |
| Formulario móvil | `task-form-390.png` |
| Subtarea, materiales y comentario | `task-detail-with-comment-390.png` |
| Reprogramación | `task-upcoming-390.png` |
| Tarea completada | `task-completed-390.png` |
| Fallo de red y vacío | `tasks-network-error-390.png`, `tasks-empty-390.png` |
| Contratos | `contracts-390.png`, `contracts-1440.png` |
| Plantilla y creación | `contract-template-form-390.png`, `contract-create-form-390.png` |
| Versión emitida | `contract-detail-issued-390.png`, `contract-detail-issued-1440.png` |
| Documentos exportados | `contract-390.pdf`, `contract-1440.pdf` |
| Primera página inspeccionada visualmente | `contract-pdf-390-page1.png` |
| Perfil empresarial | `company-legal-profile-390.png` |
| Accesos restringidos | `role-employee-390.png`, `role-viewer-390.png` |

La descarga se verifica primero en el navegador. Para comprobar los bytes se
consulta el mismo endpoint loopback con `fetch` de Node y las cookies del
contexto conservadas sólo en memoria. `pdfinfo` y `pdftotext` verifican páginas y
contenido; `pdftoppm` permitió revisar visualmente la primera página.

## Alcance y reversión

Esta aceptación usa Chromium headless en 390 y 1440 px. No sustituye pruebas con
teclado virtual Android/iOS, lectores de pantalla ni impresora/lector QR físicos.
No se validaron proveedores IA/RUC reales: faltan las credenciales y el acceso
de red necesarios. Las pruebas de servicios externos de esta entrega usan
PGlite/mocks y no acreditan conexión real a Groq/OwnData/Ocoin. La carga y revisión
de proyectos de producción y la compra/impresión/lectura de etiquetas son
pendientes operativos fuera de esta suite.
La sincronización con proyecto se comprueba mediante la consulta real por id;
la captura específica del drawer de proyecto queda para una revisión posterior.

La ejecución crea registros QA en la empresa local descartable. Para revertir
el QA se puede descartar esa empresa/base local; no hay que eliminar tablas ni
versiones emitidas en producción. El rollback funcional y las migraciones de
aplicación se documentan en el informe general de la entrega.

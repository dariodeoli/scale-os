# QA adicional #207 — una sesión SPA, sin recarga

Candidata local 194: Next `127.0.0.1:3013`, BUILD_ID
`idq89FzslJpah3GGyKU5u`, fuente compilada `bf7ae398`; API local 4115,
metadata 1.0.194 y PostgreSQL QA aislado. Los commits posteriores del integrador
son de documentación/pruebas. Este informe no acredita producción ni deploy.

## Alcance y fixture

Se prepara una tercera demo guest temporal con el endpoint **local** de demo;
no se reutilizan demoA/B ni sus tareas. Bootstrap Node usa el Origin que exige
el endpoint público; las solicitudes del navegador mantienen su Origin loopback.
No se cambian CORS, guards ni configuración del servidor. Token guardado sólo en
archivo privado 0600, fuera del repositorio. Sin proveedores, correos o cobros.

Tarea propia `37`, proyecto `93`, título sintético «QA207 SPA …», con checklist,
fecha de hoy de America/Asuncion y hora 13:45. La creación de fixture usa API antes
del baseline; las acciones examinadas después se ejecutan desde la interfaz.
El runner admite reutilizar esa fixture propia con QA_TASK_ID, verifica su
prefijo y conserva versiones/auditoría. No elimina historia ni copia tareas.

## Criterios del runner

- Una entrada inicial por documento. Después sólo enlaces Next reales del menú
  y callbacks existentes: performance.timeOrigin y marcador sessionStorage
  permanecen idénticos; contador de solicitudes document igual a 1.
- Checklist en Resumen → Proyecto, restaurado desde Proyecto → Resumen.
- Reprogramación desde lista de Resumen → fecha observada en Proyecto;
  restauración desde Proyecto → fecha observada en Resumen.
- Marcar completada desde Resumen → estado observado en Proyecto; devolver a
  Pendiente desde el editor de Proyecto → estado observado en Resumen.
- Después de cada PATCH, misma tarea y CAS incrementa exactamente una vez;
  el dashboard montado consulta de nuevo y recibe misma versión/estado/fecha.
  Los contadores Hoy/Próximas/Vencidas/Completadas se actualizan cuando corresponde.
- 1440×1000 y 390×844. Resumen usa cuadrícula y lista; Proyecto su lista de tareas
  y diálogo canónicos. No usar goto/reload después de la entrada inicial.
- IDs antes/después idénticos; ningún POST de tarea desde la UI. Restaurar
  checklist, fecha y estado; conservar historial de cambios y versión final.

## Ejecución

```bash
QA_BUILD_ID=idq89FzslJpah3GGyKU5u \
QA_COMPILED_SOURCE=bf7ae398 \
QA_OUT=/tmp/scale207-advanced \
node docs/qa/tasks-project-sync-207-advanced/browser.mjs
```

Para repetir sin crear otra demo/fixture, proporcionar QA_SESSION_FILE (archivo
privado fuera de Git) y QA_TASK_ID del registro creado por este runner. Todos los
destinos se restringen a localhost/127.0.0.1; cualquier origen externo se bloquea.
El BUILD_ID/fuente se recibe del integrador, no se deduce de un SHA del proveedor.

Las capturas y JSON de resultados se generan en QA_OUT. El runner cierra sólo
su propio Chromium. No construye, reinicia API/Next ni despliega. Si una prueba
falla después de una mutación, restaura sólo su tarea propia por API y registra
esa recuperación como tal; no la hace pasar por interacción UI aprobada.

## Resultado final

**119/119 PASS**, ejecución final con fixture versión 25→37: doce PATCH desde la
interfaz, cada uno con expected_version y un único incremento. Mismo ID 37 y
proyecto 93 en lecturas individuales, listado y consulta filtrada por proyecto.
95 respuestas HTTP de tareas registradas. Ningún POST desde la interfaz; los
IDs propios antes/después permanecen idénticos.

- Una sola solicitud document, GET `/resumen`. Todas las navegaciones posteriores
  usan enlaces Next y mantienen performance.timeOrigin y marcador sessionStorage.
- Los doce PATCH provocan consulta del dashboard montado: respuesta contiene el
  mismo ID con versión/estado/fecha actualizados. Contadores reales acreditados:
  la hora 13:45 ya había pasado en Asunción, por lo que reprogramar hoy→mañana
  mueve Vencidas→Próximas, y restaurar revierte ambos; Done/Pendiente actualiza
  Completadas y el bucket abierto correspondiente. No se asumió que toda fecha
  de hoy pertenezca a Hoy después de su hora de vencimiento.
- Checklist, reprogramación y completar/restaurar se repiten en 1440×1000 y390×844.
  Reprogramación se abre desde Lista de Resumen; checklist y Done desde
  Cuadrícula. Las otras vistas reciben cambios al navegar por SPA y abrir la
  misma tarea. La selección del bucket Todas evita confundir un cambio de
  categoría con desaparición del registro.
- Siete clicks de expansión registrados como eventos nativos trusted. El harness
  espera el menú móvil cerrado, dos frames de geometría estable y hit-test sobre
  la acción antes de pulsar; no fuerza callbacks ni cambia estado React desde QA.
- Cero errores runtime y cero solicitudes a proveedores externos. Esto no afirma
  consola global limpia ni valida analytics de un origen loopback.
- Estado final: Pendiente, fecha/hora originales y checklist sin marcar. Sin
  recuperación de emergencia en la ejecución aprobada. Versiones y autoría de
  todos los intentos previos permanecen; no se borró historia para fingir seed v1.

El HTML local `/status` confirmó v1.0.194 y BUILD_ID esperado; `/health` confirmó
200, release.version 1.0.194, ok=true y database=ready. Fuente compilada indicada
por el integrador; no se atribuye un SHA interno a ningún proveedor.

`results.json` acredita el resultado completo y conserva scope, HTTP/CAS,
contadores, marcador de sesión, metadata y archivos. Catorce capturas finales:
`/tmp/scale207-advanced/{1440|390}-{summary-checklist|project-checklist-restored|summary-reprogrammed|project-date-restored|summary-done|project-status-restored|summary-restored}.png`.

Durante preparación hubo errores de espera/selección de controles del harness,
combinación de teclado Puppeteer y una expectativa incorrecta del bucket de la
hora 13:45; se corrigieron contra DOM/transporte reales. No se modificó producto
ni se confirmó un defecto de expansión móvil en la secuencia final. Los intentos
previos también conservaron el mismo tenant sintético y su auditoría.

## Límites

Rol dueño dentro de una tercera demo guest local. No repite matriz de roles,
concurrencia entre escritores, dispositivo físico ni otro navegador. Una sesión,
un documento: no acredita invalidación automática entre pestañas o ventanas.
Las vistas de ruta se montan al navegar; la prueba sí acredita refetch de la vista
montada después de cada mutación y lectura fresca de la contraparte por SPA,
no actualización de una vista desmontada. No se recargó la página ni se usó API
para aplicar cambios de UI en la ejecución aprobada. API sólo para bootstrap,
baseline/observación/final y recuperación registrada si un intento falla.

Sin cambios de producto, build, merge ni deploy. No se editaron ni cerraron
issues desde esta rama de QA.

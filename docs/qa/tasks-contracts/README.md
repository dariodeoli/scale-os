# QA local de tareas y contratos

Responsable de esta entrega: agente QA mobile. El runner usa la aplicación y API
reales con una base PostgreSQL local aislada. Las capturas de fixtures HTML no
cuentan como aceptación de los flujos.

## Ejecución

Requisitos: Node 24, dependencias frontend y backend instaladas, Chromium,
frontend y API locales arrancados, migraciones aplicadas y empresa QA aislada.
`puppeteer-core` ya pertenece al backend; no se agregan dependencias.
El API debe permitir el origen local con `PUBLIC_ORIGIN=http://127.0.0.1:3000`
y disponer de Chromium para exportar PDF (`PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium`,
según la configuración del renderer). No ampliar el CORS de producción.

```bash
QA_BASE_URL=http://127.0.0.1:3000 \
QA_FIXTURE_FILE=/tmp/scale-qa-identities.json \
CHROME_PATH=/usr/bin/chromium \
node build-tools/qa-tasks-contracts.mjs
```

El JSON de identidades contiene `admin`, `employee` y `viewer`. Cada identidad
acepta `email`/`password` de desarrollo o `session` local. Mantenerlo fuera del
repositorio con permisos 0600. Alternativa para administrador: `QA_EMAIL` y
`QA_PASSWORD`, o `QA_SESSION`. Nunca pegar credenciales en los reportes.
Sin identidades secundarias el reporte declara pendientes los checks de roles.
El objeto opcional `project: {id, name}` permite asociar tareas y comprobar el
mismo identificador al consultar sus tareas desde el proyecto.

El runner rechaza destinos remotos y bloquea solicitudes externas del navegador.
Crea registros con prefijo `QA-<timestamp>` en la empresa del administrador y no
los borra automáticamente. Usar exclusivamente una empresa QA local descartable.
No envía prompts a IA ni mensajes, no compra productos y no publica documentos.
El contenedor no ofrece el sandbox de Chromium; el runner usa `--no-sandbox`
únicamente para QA local, con red externa bloqueada y perfil descartable.

Resultados: `work/qa-tasks-contracts/report.json` y capturas PNG a 390 y 1440 px.
`QA_OUT` permite cambiar el directorio. Las capturas pueden contener datos de la
empresa QA: no usar una copia de producción ni datos personales reales.

## Aceptación

- Inicio: Hoy, Próximas, Vencidas, Completadas, Sin fecha; estados vacíos,
  errores de carga y reintentos. Filtros empleado, proyecto, cliente y fecha.
- Alta y edición: teclado, foco, fechas/horas, scroll, responsables múltiples,
  prioridad, enlaces y checklist. Acciones alcanzables con targets de 44 px.
- Misma tarea/id en inicio y ficha proyecto; completar/reprogramar se refleja
  al instante. Cambios concurrentes devuelven 409 conservando el borrador.
- Empleado ve tareas asignadas y completa sólo las propias; asignación y
  edición restringidas. Viewer no escribe. Administrador gestiona la empresa.
- Contratos: plantillas, autofill con origen y campos faltantes, edición,
  previsualización segura y revisión humana explícita antes de emitir versión.
- PDF descargable, firma `%PDF`, texto legible y multipágina; modificar borrador
  no modifica versión emitida. Datos bancarios sólo con permiso propio.
- Mobile 390 y desktop 1440 sin overflow del documento; ampliar revisión manual
  a 320/360/430, teclado virtual real y lector de pantalla antes del despliegue.

## Entrega, riesgos y reversión

Cada entrega debe adjuntar cambios, rutas, pruebas ejecutadas, capturas reales,
fallos y límites, migraciones y rollback. No convertir checks omitidos en verdes.
La prueba automatizada de teclado usa Chromium headless: no simula el teclado
virtual de Android/iOS. Los controles de proveedor externo se informan aparte.

Reversión del QA: detener únicamente sus procesos y descartar la empresa/base
QA local. Los registros de prueba no requieren migraciones inversas. La
reversión funcional debe conservar versiones emitidas y auditoría; no eliminar
tablas ni datos de producción para revertir la interfaz.

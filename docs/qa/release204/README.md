# Release 1.0.204 — evidencia de integración y publicación parcial

PR #349 integrado en main `feafd529f0484e9816dabfc12ce49f5f6a1241ff`.
Candidato `8315c9f391df0398cb575bb75296681a1e719384`, con árbol idéntico al merge.

- CI candidato [39456936841](https://github.com/dariodeoli/scale-os/actions/runs/39456936841): frontend y backend PASS.
- CI de main [39458388120](https://github.com/dariodeoli/scale-os/actions/runs/39458388120): frontend y backend PASS.
- Local: 295 entradas/70 fragmentos, build `rGlLo7UFuO13JeKGNY7SU`, backend, PostgreSQL real, sintaxis, versiones/footer y bundles PASS.
- QA de identidad: 12 flujos Chromium en 320/768/1440 px; resultados y capturas en `../loading-identities343344/`.

## Producción

La web y el registro sirven 1.0.204. La API devuelve HTTP 200, base lista y versión 1.0.202. El smoke inicial encontró web antigua; después de publicarse la web se ejecutó de nuevo y quedó bloqueado por la versión de API. Los probes independientes de sesión anónima, proveedores y mantenimiento respondieron lo esperado. No acreditan las herramientas nuevas del backend ni una sesión autenticada del dueño.

El SHA servido por Coolify no se expone en estas respuestas; se registra como no disponible, separado del SHA de GitHub. No se escribieron pagos ni cuentas reales. No hay acceso a la consola de Coolify en esta sesión: se solicitó estado/error del servicio API para este commit, sin credenciales. #343 y #344 permanecen abiertos.

Esta rama guarda únicamente evidencia posterior al merge. No requiere PR, merge a main ni otro deploy.

## Diagnóstico posterior del API — #253

La imagen API 1.0.204 construye correctamente con las dependencias de producción; se usó un Dockerfile temporal que sólo incorpora la CA de la sesión mediante secretos BuildKit para las operaciones de red. Sin cambios de código ni Dockerfile versionado. La auditoría de 120 archivos no encontró imports relativos ni dependencias de producción faltantes.

El arranque local no pudo comprobarse: Docker agotó el disco del entorno de diagnóstico. No se atribuye ese fallo a Coolify. Se retiraron los artefactos nuevos de Docker y se conservaron los anteriores en un archivo local verificado. Web sigue en 1.0.204 y API en 1.0.202 con base lista. No hubo un nuevo deploy ni escrituras de producción. No hay conector, credenciales, webhook directo o SSH administrativo disponible. Se solicitó únicamente la URL del panel para determinar el acceso necesario. Ver `api-build-diagnostic.json` y `api-image-build.log`.

# Publicación 1.0.198 — verificada

19/10/2026 · America/Asuncion. PR [#302](https://github.com/dariodeoli/scale-os/pull/302), merge a las07:59:34.

- Main: `89e6750ee56fb1f5db412e181573bd6b2b2f243a`.
- Candidato: `752e3a7c9cdf802af073524906d9d90dacf90f90`; árboles completos iguales al merge.
- CI candidato [39239938132](https://github.com/dariodeoli/scale-os/actions/runs/39239938132): frontend/backend aprobados antes del merge.
- CI main [39241393791](https://github.com/dariodeoli/scale-os/actions/runs/39241393791): frontend/backend aprobados. [Respuesta GitHub](main-ci.json).
- El único merge dispara Coolify; no se llamó otro webhook ni se repitió el deploy.
- [Smoke público](smoke.log): seis controles PASS; web/registro198, API198 con base `ready`, sesión anónima401JSON, proveedores y mantenimiento200JSON.
- [Tres lecturas consecutivas](observations.json): web200 con versión visible198 y API200 con versión198/base ready, con fecha y hash de respuesta.

El SHA interno del proveedor y su BUILD_ID no están expuestos: no se acredita una identidad de contenedor por inferencia. La comparación opcional de CSS público conserva siete coincidencias y dos filenames distintos; no acredita equivalencia de todo el build. Se consultó sólo la shell anónima del portal, sin probar acciones autenticadas ni modificar datos reales en producción.

La [evidencia local](../mobile-198-final/README.md) distingue artefacto, rutas, fixtures y API/PostgreSQL reales. Software responsive de #292, #295 y #297 completado; **Safari/iPhone/iPad y Android físicos siguen abiertos en #296**. No se declara cada CRUD/rol, OAuth real ni impresión física.

Sin migraciones ni cambios de permisos. Reversión: revertir el código y la versión mediante otro PR, conservar comentarios/decisiones/datos; no restaurar ni borrar la base por este cambio.

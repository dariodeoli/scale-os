# Scale v1.0.192 — validación de integración

17/10/2026. Release preparado una sola vez mediante `release:patch -- --prepare`, commit `50091b70`. Fuente funcional y dependencia publicada en `99e7f5c6`; auditoría final en `fa282b79`. Los commits posteriores de documentación y CI conservan la misma fuente funcional.

## Gates

- Regresión frontend: **263 entradas / 45 fragmentos PASS**.
- Build Next, tipos y `.next/BUILD_ID`: **PASS**. Instalación privada real de OwnCoding UI `0.68.17`.
- Backend: **58 scripts PASS**, salida 0 de la cadena completa.
- Chromium obligatorio: **16 grupos PASS**, sin éxito por omitir navegador.
- Baseline del paquete: 1.584 vectores, 14 configuraciones, identidad de exports y bundles: PASS. Ref/eventos, pegado, raw/caret, RHF/Editor y campos temporales acreditados en los informes del piloto.
- PostgreSQL 17 real: gate previo PASS con 114 migraciones y carreras de tesorería/inventario. Esta entrega no agrega migraciones; los cambios posteriores del backend son metadata de versión y pruebas.
- `release:check`, `footer:check` y `git diff --check`: PASS.

Preparación: log local `/tmp/scale192-prepare.log`; navegador: `/tmp/scale192-browser-final.log`; instalación/tipos: `/tmp/scale241-published-dependency-{install,types}.log`.

## Artefacto compartido

[OwnCoding UI PR #56](https://github.com/dariodeoli/owncoding-ui/pull/56), main `ce28d33b879571801b7b27124483bd84e830ad63`. CI de candidato `39022449313` y main `39022579301`: PASS. Tag anotado `v0.68.17`, objeto `7836d2c0bdfdd657352e12fbc78a5562c3e1a317`, comprobado en remoto. Lockfile de Scale resuelve el SHA de main.

Pack `owncoding-ui-0.68.17.tgz`, SHA256 `06568783742bfd090de7b16bfb7eaa732dee3a8682ba024faf2e7cc45c668471`. Sus 39 archivos dist coinciden con la instalación real desde Git y el candidato probado. `InputBase`/`TextareaBase` y controles numéricos se reexportan; `number-utils` conserva la entrada pura sin React ni frontera cliente.

La galería web no se acredita como desplegada: requiere publicación manual y su status respondió HTTP 403 desde este entorno. Publicar el tag y verificar el consumidor son hechos separados del deploy de la galería.

## QA de la app

Build local de producción sobre `50091b70`, puerto 3013, con rewrites comprobados exclusivamente hacia API sintética 4115. El API local conserva metadata 1.0.191 sobre backend funcional estable; el backend del release 192 se valida por separado mediante su cadena de 58 scripts. Esto no es un smoke de producción.

El catálogo del build integrado pasó **39/39** comprobaciones y la cabecera **34/34** sin repetir logout. Matriz final: **96/96 PASS**; controles visuales puntuales: **150/150 PASS**. El informe [QA final](ui-app-241/FINAL.md) distingue la matriz anterior de los resultados posteriores.

Correcciones verificadas: cabeceras de Balance alineadas mediante subgrid, logos con máscara circular e imagen sin crecimiento intrínseco, deuda previa contenida en móvil, KPI de monedas legible, acciones sin palabras partidas y tamaños cuadrados limitados a iconos. El catálogo es sintético, noindex y sin solicitudes a proveedores.

Auditoría adicional de 16 rutas: cero errores runtime y solicitudes externas. Se observaron 17 respuestas HTTP 403 exclusivamente de analytics/visitantes por guardas de origen local; se documentan como límite del entorno, sin afirmar que la consola global esté vacía ni acreditar esos servicios.

No se acreditan OAuth/correo/RUC externos reales, dispositivos ni impresoras físicas. No existe un script independiente de lint. Capturas locales excluidas del repositorio; JSON y runners versionados.

## Integración y producción

[PR #251](https://github.com/dariodeoli/scale-os/pull/251) preparado con las evidencias anteriores. El primer CI de frontend falló; la instalación limpia reprodujo el fallo al resolver `puppeteer-core` para la prueba visual #147. El job sólo instalaba la raíz, mientras el harness utiliza la dependencia existente en `backend/`.

El workflow ahora instala esas dependencias con scripts desactivados antes de la regresión. La instalación limpia pasó las tres pruebas #147, incluido Chromium, sin omitir ni debilitar aserciones. No se agregó una dependencia nueva ni cambió el código funcional. Logs locales `scale192-ci-clean-{regression,dsn,dsn-fixed,browser-deps}.log` conservan la reproducción y corrección.

CI candidato corregido [39024251669](https://github.com/dariodeoli/scale-os/actions/runs/39024251669): frontend y backend PASS. PR #251 integrado a main `b965d9dd33113a27f6a53f3fc3cbec651e008922`. CI de main [39024703523](https://github.com/dariodeoli/scale-os/actions/runs/39024703523): frontend y backend PASS; confirmado10:29UTC.

Smoke público `release:smoke` PASS el 17/10/2026 a las 10:27 UTC. Verificación adicional 10:27:43 UTC: `/status` y `/registro` HTTP200, versión visible1.0.192; API `/health` HTTP200, `ok:true`, `database:ready`, release1.0.192. Landing `/scale-os.html` HTTP200, SHA256 `b328da09a25458e04c6c0969a22b80bcb15ee1b13bcb847857acdb310b9e5b2d`, idéntico al archivo de main. Durante la transición hubo una lectura antigua de status; la repetición posterior acreditó los cuatro endpoints en la misma comprobación.

El SHA interno del proveedor no está expuesto y no se infiere del número de versión. El merge disparó la publicación; no se llamó otro deploy. Main local sincronizado al merge, árbol limpio y dependencia instalada0.68.17. Logs `/tmp/scale192-production-smoke.log`, `/tmp/scale192-public-proof.json`, `/tmp/scale192-main-ci.log`.

Este cierre posterior y la QA adicional de [sincronía de tareas #207](tasks-project-sync-207.md),22/22PASS, se conservan en una rama de evidencia para la próxima integración documental. No forman parte del SHA desplegado ni justifican un segundo deploy de192.

Seguimiento: #241, #245, #247 y #248. #249/#250 y la mejora de primer pliegue de #206 son propuestas adicionales. #246 permanece bloqueado: cinco revisiones periódicas no programadas, cero ejecuciones.

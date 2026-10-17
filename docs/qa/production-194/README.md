# Scale 1.0.194 — producción verificada

Web y API sirven **1.0.194**. Smoke completo aprobado el **17/10/2026 a las 22:26:32 UTC**, 19:26:32 en Asunción; observación posterior a las 22:26:48 confirma ambos servicios en194 y base lista.

## Integración y CI

- [PR #262](https://github.com/dariodeoli/scale-os/pull/262), merge `f2d52f5ecd42d4aa629a80bb353ab1e39cc44dd0`, 22:14:46 UTC.
- Candidato `ecf27c7d34a123fcd94da5ae31a24474e9135b54`; su árbol y el del merge coinciden: `a01d84eee45a00d41b7a95c421740468d9880467`. [Prueba por contenido](git-content.json).
- [CI del candidato](https://github.com/dariodeoli/scale-os/actions/runs/39073884868): frontend/backend SUCCESS. [Registro](candidate-ci.json).
- [CI de main](https://github.com/dariodeoli/scale-os/actions/runs/39074267801): frontend/backend SUCCESS, sin reintentos. [Registro](main-ci.json).
- Un único bump194 y un único merge. Se siguió la publicación automática; no se disparó otro deploy manual. Los PR256–261 se incorporan por262, sin merges/deploys individuales.

## Smoke público

[Resultados completos](public-proof.json) y [script reproducible](verify-production.mjs).

| Comprobación | Resultado |
| --- | --- |
| `/status`, `/registro` |200, versión visible1.0.194 |
| API `/health` |200, ok=true, database=ready,1.0.194 |
| `/core-api/api/auth/me` sin credenciales |401 esperado |
| Proveedores de autenticación y mantenimiento |200 |
| Landing |200, SHA-256 remoto idéntico al archivo integrado |
| Scripts iniciales de login |Todos200,1.345.890 B raw /410.592 B gzip calculado, dentro del presupuesto; sin arte bancario completo inicial |

Hash de landing: `a27a931f3510b7dde602fecacd690cd265f3221354bdefe399d083c442426676`.

El gzip se calcula sobre el contenido recibido; no es una medición de bytes de red ni de rendimiento del usuario. Los tamaños públicos difieren de los del build local y se registran separadamente. No se atribuye el SHA de integración a un contenedor: el proveedor no expone aquí su SHA interno.

La [observación de publicación](deployment-observation.json) conserva el tránsito: antes del merge ambos193; API194 detectada a las22:23:03; web194 acreditada por smoke a las22:26:32 y ambos194 en el siguiente intervalo. No se deduce causa de fallo, estado de cola ni logs de Coolify de esas respuestas. GitHub no exponía deployments y la integración no tenía permiso para leer webhooks; no se usó una vía alternativa para acceder a secretos.

## Alcance de QA y datos

Regresión local final266 entradas/48 fragmentos, backend61 scripts y17 grupos Chromium aprobados. [Entrega y gates](../release-194.md), [QA integrada](../integration-194/FINAL.md), [tareas SPA119/119](../tasks-project-sync-207-advanced/README.md), [Balance y logo visible](../performance-balance-lazy-254/README.md).

El primer build de QA funcional fue `bf7ae398` / `idq89FzslJpah3GGyKU5u`; el ajuste final de altura del logo fue `aabcaee3` / `GqJFkxpQNFfrgoIPojWVw`. Se repitieron focales, build, visibilidad y medición de Balance y regresión completa del frontend. El CI volvió a construir el candidato y main. No se presenta una comprobación de decode como prueba de visibilidad: el crop final es positivo y está dentro de ambos viewports.

El smoke público es de lectura y sin sesión. No ejecutó cobros, contratos ni modificaciones en datos reales. `database=ready` es la señal del servicio; no se hizo inspección SQL directa de la base de producción. Las migraciones116 y las transacciones se probaron localmente en las suites y en PostgreSQL real. No acredita OAuth real ni la conciliación operativa.

[Servidores de QA propios apagados](qa-service-cleanup.json), datos y fixtures conservados;3008/4109/55449 ajenos permanecen abiertos. No se reconstruyó su `.next`.

## Seguimientos que permanecen abiertos

#202 conserva los pendientes externos: #212 Groq real, #213 OwnData/licencia y acceso comercial, #214 conciliación operativa, #215 consumibles compatibles, #216 impresión/escaneo físico, #158 Search Console, #246 supervisor persistente y #253 causa interna del incidente anterior de API. El supervisor no fue programado y tuvo cero ejecuciones; esta entrega no simula revisiones futuras.

La evidencia posterior al deploy se guarda en una rama documental para integrarla en una siguiente versión. No se vuelve a pushear main con la misma194 para publicar estos registros.

## Cierre de seguimiento

Se cerraron #184/#186/#206/#207/#208/#217/#249/#250/#254 y OwnCoding#61 después de verificar publicación. Los PR256–261 se cerraron como incorporados por262, conservando sus ramas. [Estados finales de GitHub](followup-state.json). El issue202 continúa abierto por los pendientes externos detallados arriba.

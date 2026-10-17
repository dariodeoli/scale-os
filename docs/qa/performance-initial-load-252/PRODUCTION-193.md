# Verificación pública de Scale 1.0.193

Comprobación del 17/10/2026 a las 16:27 UTC (13:27 America/Asuncion).

- PR [#255](https://github.com/dariodeoli/scale-os/pull/255) integrado en `main`: `2ecdc7f38f466f29a37194783726b985583a5b0e`.
- CI del candidato [39048812341](https://github.com/dariodeoli/scale-os/actions/runs/39048812341): frontend y backend aprobados.
- CI de `main` [39049125289](https://github.com/dariodeoli/scale-os/actions/runs/39049125289): primer intento backend aprobado, frontend falló en Release regression. Logs firmados inaccesibles (HTTP 403); la anotación sólo indica exit code 1. No se atribuye una causa sin evidencia. Se repitió únicamente el job fallido: segundo intento aprobado, incluyendo regresión, build y guard de artefactos iniciales, a las 16:32 UTC. Backend aprobado en el primer intento. El fallo inicial se conserva como incidencia sin causa confirmada.
- Merge activó la publicación habitual. No se solicitó otro deploy ni se incrementó nuevamente la versión.
- `npm run release:smoke`: aprobado; web `/status`, `/registro` y API `/health` muestran 1.0.193.
- Health: HTTP 200, `ok:true`, `database:ready`.
- Proxy público: `auth/me` sin sesión HTTP 401; providers y maintenance HTTP 200. Ya no se observa el 503 del registro enviado por el dueño.
- Landing pública SHA-256 `f7a3141ef9bfe7c54cae0dbef395548303109dcc002e4c0a1bb8a1b49da36b2d`, idéntica al archivo del merge.
- JavaScript inicial del login público: 1.339.265 bytes sin comprimir, 407.943 bytes gzip calculados. Todos los scripts responden 200, sin marcadores de arte bancario inicial y dentro del límite de 1.750.000 bytes. El gzip calculado no representa una medición de transferencia de red.

[Respuestas y tamaños por script](production-193.json) y [verificador reproducible](verify-production-193.mjs). Ejecutar desde el checkout 1.0.193 con `NODE_USE_ENV_PROXY=1 SCALE_RELEASE_SHA=2ecdc7f38f466f29a37194783726b985583a5b0e node docs/qa/performance-initial-load-252/verify-production-193.mjs`.

## Límites

El proveedor no expone aquí el SHA del contenedor; se acredita el SHA de integración de GitHub, la versión pública y el hash de landing por separado. No se probó una autenticación Google ni una sesión real del dueño. Las mejoras de tiempo de login corresponden al protocolo local controlado documentado en COMPARISON.md; esta prueba pública verifica disponibilidad y artefactos. La causa del incidente anterior sigue pendiente de logs de Coolify en #253. El peso del catálogo al abrir Balance continúa en #254.

Esta evidencia se guarda en una rama documental para incorporarla en una próxima publicación; no requiere repetir el deploy de 1.0.193.

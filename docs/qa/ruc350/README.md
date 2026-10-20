# OwnData RUC — issue #350, versión 1.0.205

El parser ignora `status` y `stateRaw`, sin importar valores o presencia. Las respuestas y la caché se proyectan al contrato público con `tax_state` vacío. Se conserva la validación de identidad/DV, nombre, equivalencia/partición opcionales y metadata obligatoria de ambiente, procedencia HTTPS/hash/fechas y cuota. Los errores sólo publican códigos seguros y mensajes propios; claves/activación se distinguen de errores del parser.

La ruta real de Scale es `POST /api/agency/ruc-lookup`; `/api/ruc` es un ejemplo genérico. Autenticación de Scale, permisos, origen y límites SQL siguen vigentes. La llamada a OwnData usa sólo una clave del backend y omite cookies; respuesta limitada a 64 KiB, sin retries ni fallback ilimitado.

## Pruebas

`local-gates.json` registra comandos, BUILD_ID y hashes de fuente. Pasaron TypeScript, 295 regresiones frontend en 70 fragmentos, build, suite completa backend (incluido test-ruc), versiones/footer y assets iniciales. La prueba negativa reproduce el 503 sin stateRaw en fuente anterior a 203, sólo con mocks. La revisión estática independiente no encontró bloqueos.

Los casos focales incluyen ACTIVO, INACTIVO, SUSPENDIDO, otro estado y tipos futuros, legacy, ausencia de ambos; ausencia de nombre, RUC/DV inválidos, procedencia/HTTPS/hash/ambiente/cuota inválidos, códigos de activación/clave y desconocidos, caché saneada, ausencia de secretos, respuesta demasiado grande y fallo del limitador sin llamada externa.

## Límites

Los fixtures y claves son sintéticos. No se acredita consulta real, activación de clave, sesión OAuth o aceptación autenticada de producción. El CI y el deploy se verifican después de publicar el PR. No hubo escrituras reales. La API disponible al inicio seguía en 1.0.202; Coolify requiere acceso de red y credencial administrativa aún no configurados en esta sesión.

## Estado de publicación

Rama `codex/ruc-optional-fiscal-state` publicada, con todas las pruebas locales aprobadas. No se pudo crear el PR por CONNECT 403 del proxy hacia `api.github.com`. No se inició CI, no se hizo merge ni deploy. Se guardó un borrador aditivo con los dominios GitHub API, Coolify, OwnData y Scale; para aplicarlo se requiere guardar/publicar el entorno. Se dejó preparado el requisito de secreto administrativo de Coolify en la configuración, sin valores ni claves en el repositorio. El cuerpo del PR está en `pull-request.md`.

## Reanudación

Recuperado el acceso de red, se creó el PR #351. Contrato público OpenAPI 1.4.0 contrastado: no exige campos fiscales y requiere limit/resetAfter positivos. Se agregaron dos rechazos focales para cuota cero y pasaron. El juego completo local corresponde al commit de release registrado; el ajuste de cuota final se valida con la prueba focal y el CI completo del candidato. Se mantiene la versión 1.0.205, sin otro bump. La nota de bloqueo de red anterior es histórica. Coolify responde al login pero no hay una credencial administrativa configurada.

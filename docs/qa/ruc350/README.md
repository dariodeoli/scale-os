# OwnData RUC — issue #350, versión 1.0.205

El parser ignora `status` y `stateRaw`, sin importar valores o presencia. Las respuestas y la caché se proyectan al contrato público con `tax_state` vacío. Se conserva la validación de identidad/DV, nombre, equivalencia/partición opcionales y metadata obligatoria de ambiente, procedencia HTTPS/hash/fechas y cuota. Los errores sólo publican códigos seguros y mensajes propios; claves/activación se distinguen de errores del parser.

La ruta real de Scale es `POST /api/agency/ruc-lookup`; `/api/ruc` es un ejemplo genérico. Autenticación de Scale, permisos, origen y límites SQL siguen vigentes. La llamada a OwnData usa sólo una clave del backend y omite cookies; respuesta limitada a 64 KiB, sin retries ni fallback ilimitado.

## Pruebas

`local-gates.json` registra comandos, BUILD_ID y hashes de fuente. Pasaron TypeScript, 295 regresiones frontend en 70 fragmentos, build, suite completa backend (incluido test-ruc), versiones/footer y assets iniciales. La prueba negativa reproduce el503 sin stateRaw en fuente anterior a203, sólo con mocks. La revisión estática independiente no encontró bloqueos.

Los casos focales incluyen ACTIVO, INACTIVO, SUSPENDIDO, otro estado y tipos futuros, legacy, ausencia de ambos; ausencia de nombre, RUC/DV inválidos, procedencia/HTTPS/hash/ambiente/cuota inválidos, códigos de activación/clave y desconocidos, caché saneada, ausencia de secretos, respuesta demasiado grande y fallo del limitador sin llamada externa.

## Límites

Los fixtures y claves son sintéticos. No se acredita consulta real, activación de clave, sesión OAuth o aceptación autenticada de producción. El CI y el deploy se verifican después de publicar el PR. No hubo escrituras reales. La API disponible al inicio seguía en1.0.202; Coolify requiere acceso de red y credencial administrativa aún no configurados en esta sesión.

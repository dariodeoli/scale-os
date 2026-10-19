# API y acceso público — seguimiento #253

## Recuperación observada

El 19/10/2026 a las 02:34:52 UTC (18/10 23:34:52 America/Asuncion),
las sondas de lectura devolvieron:

| Ruta | Respuesta |
| --- | --- |
| API `/health` | 200 JSON, `ok:true`, `database:ready`, versión `1.0.195` |
| Web `/status` | 200 HTML |
| Web `/core-api/api/auth/me` sin sesión | 401 JSON, `No autenticado` |
| Web `/core-api/api/auth/providers` | 200 JSON, tres indicadores booleanos |
| Web `/core-api/api/public/maintenance` | 200 JSON, `maintenance:false` |

El smoke ampliado se ejecutó contra producción el 19/10 a las 02:37 UTC
(18/10 23:37 America/Asuncion): **PASS**, seis sondas. Además de las rutas
anteriores comprobó la versión visible `v1.0.195` en `/status` y `/registro`.
No se inició sesión ni se probó OAuth, correo, datos privados o hardware.
No se disparó un deploy ni se modificó la base.

## Cambio preventivo verificable

El smoke anterior podía aprobar con web y health disponibles aunque el proxy
de login devolviera 503. Ahora exige los tres endpoints anónimos usados por el
acceso, sus estados HTTP y sus contratos JSON. Exige también `database:ready`.
Conserva orígenes HTTPS configurables y un único plazo global de reintentos.
Una redirección, HTML o respuesta con estado/tipos incorrectos falla el gate.
Las sondas no envían credenciales ni imprimen cuerpos o errores de red privados.

Pruebas focales: 14 escenarios con respuestas HTTP locales deterministas;
5 escenarios del preparador de release con comandos simulados, incluida la
invocación explícita del smoke después del push y la propagación de su fallo.
`--prepare` conserva cero push, webhook o smoke. La prueba del preparador no
hizo un release real ni bump en este repositorio.

## Lo que falta para cerrar

La disponibilidad está recuperada; la causa del 503 del 17/10 sigue sin
acreditarse. El runtime actual no expone capacidades, secretos, variables ni
identidades de infraestructura, y no hay herramienta Coolify disponible.
Faltan estado/logs del servicio del intervalo del incidente: reinicios y
exit code, readiness, puerto, mounts, eventos de conexión/migración y cola
de despliegue. Una lectura sana posterior no sustituye esos registros.
No se atribuye OOM, credenciales incorrectas o una falla de base sin evidencia.

#246 continúa separado: **no programado, 0/5**, pendiente de un planificador
capaz de iniciar un agente real durante los 225 minutos. No se creó un cron
o un workflow que simule ese servicio.

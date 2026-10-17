# #252 — comparación local de carga inicial

Smoke posterior con paquete publicado: [FINAL-193.md](FINAL-193.md).

Baseline: Next production compilado `50091b70`, BUILD_ID `URItRVJRNBHD2UWCqUN0M`, v1.0.192, servidor local3013. El árbol fuente del integrador contiene modificaciones posteriores, pero este baseline usa los assets ya compilados de `.next`, antes de aplicar lazy imports y separar `cn` en OwnCoding. Rewrites `/core-api`, `/p` y `/review` verificados a API local4115. PostgreSQL sintético55450; backend estable de la fixture con metadata1.0.191. No se consulta producción ni se prueba el incidente503.

## Método reproducible

Chromium headless, CPU4×, descarga1,6Mbps (200000 bytes/s), subida750kbps y latencia150ms por CDP. Contexto nuevo y caché browser deshabilitada para cada carga; servidor local caliente. Una sola observación por caso: login sin sesión y Resumen/Balance con sesión demo existente, en1440×1000 y390×844. No se presenta como benchmark estadístico ni dispositivo físico. El runner bloquea escrituras y hosts externos. Login sólo recibe texto ficticio por teclado; no hace submit.

`contentReadyWallMs` es tiempo desde navegación hasta el control de password, las tarjetas reales de tareas o ambas tablas de Balance, respectivamente, y loader principal ausente. La presencia de props React y respuesta al teclado se comprueba en login como proxy acotado de interactividad; no es una marca universal de hidratación completa. `loaderGoneAt` se registra con MutationObserver y es tiempo relativo de Performance API, distinto del reloj wall.

**`authResponse.atMs` es el instante de recepción de `/auth/me` desde el inicio de navegación, no la duración de esa petición.** La medición no separa cuánto transcurrió antes de emitirla y su RTT. No atribuir ese número al backend. Los bytes son `Network.loadingFinished.encodedDataLength` de recursos Script al finalizar contenido+2s; se conserva también encoded/decoded body de ResourceTiming. No se incluyen descargas posteriores fuera de esa ventana. No equivale al tamaño total del build.

## Ejecutar

Desde la rama QA aislada, con fixture/API ya disponibles:

```bash
QA_LABEL=baseline QA_COMPILED_SOURCE=50091b70 \
QA_BASE_URL=http://127.0.0.1:3013 QA_OUT=/tmp/scale252-baseline \
QA_SESSION_FILE=/ruta/privada/sesion-demo \
node docs/qa/performance-initial-load-252/browser.mjs
```

El import se resuelve mediante el package entry de `puppeteer-core`, actualmente `lib/puppeteer/puppeteer-core.js`; no usa el antiguo path `lib/esm`. Se generan seis capturas locales y JSON sin credenciales. No se fuerzan imágenes ignoradas a git.

Para comparar: terminar sólo el Next baseline propio, esperar build del integrador, verificar nuevamente rewrites loopback y arrancar candidato con los mismos puertos/fixture/condiciones; ejecutar el mismo runner con `QA_LABEL=candidate`, SHA compilado real y otro directorio. Usar `QA_SCREENSHOTS=0` para mantener el máximo total de seis capturas. Mantener API/PG sin reiniciar ni crear nuevas demos. No mezclar una fuente nueva con los assets anteriores ni afirmar mejoras antes de medir el candidato.

## Baseline observado

| Ancho | Vista | Contenido listo (s) | auth/me recibido desde navegación (s) | Scripts bytes de red | Scripts |
| --- | --- | ---: | ---: | ---: | ---: |
| 1440 | login | 15.587 | 15.420 | 2346161 | 24 |
| 1440 | resumen | 16.125 | 14.279 | 2362968 | 25 |
| 1440 | balance | 15.336 | 14.180 | 2340382 | 24 |
| 390 | login | 14.120 | 14.047 | 2346161 | 24 |
| 390 | resumen | 15.453 | 13.894 | 2362968 | 25 |
| 390 | balance | 14.937 | 13.922 | 2340382 | 24 |

Seis cargas completadas sin error del runner, cero errores runtime y cero hosts externos. Los POST automáticos de analytics se bloquearon explícitamente; sus errores de recurso no se ocultan en el JSON. No se afirma consola limpia. La comparación candidata y sus límites están en [COMPARISON.md](COMPARISON.md). Next baseline propio se detuvo; API/PG se conservaron para evitar cambios de fixture entre mediciones.

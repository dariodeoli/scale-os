# QA integrada local: estado previo a correcciones visuales

**Estado histórico:** los resultados del candidato final están en [FINAL.md](FINAL.md).

17/10/2026. Chromium real contra Next production `127.0.0.1:3013`, **build `0afdbd08`**, API sintética local `4115`, PostgreSQL propio `55450`. Versión visible 1.0.191. No es una verificación de producción ni un deploy.

## Resultados acreditados

| Alcance | Resultado |
| --- | --- |
| 13 módulos de navegación + Balance, Mora y Previsión; 1440×1000 y 390×844; claro, oscuro y contraste | **93/96 escenarios sin overflow de documento; 3 fallan** |
| Header ordinary sintético: orden campana/reporte/logout, diálogo, descarte, perfil y logout | **36/36 PASS** |
| Errores JavaScript de página | 0 en ambos runners |
| Envío de reportes | Ninguno |

La matriz comprueba navegación, render y geometría; un PASS no acredita todas las acciones de cada módulo ni cálculos financieros completos. El header confirma targets móviles de 44×44, formulario de reporte asociado, descarte/reapertura vacía, hover del perfil legible y contenido cargado de su ficha en los seis tamaños/temas. El logout sintético respondió 200 y la sesión quedó en 401. En demo el reporte permanece oculto según diseño.

Los temas se establecieron mediante storage/atributo HTML local de QA; no se cambió una preferencia de servidor. Todas las URLs fueron loopback; los runners bloquearon hosts externos y no registraron intentos externos. Se registraron respuestas 403 de `/api/public/analytics/collect`, conservadas en el JSON; no se interpretan como errores de render ni se afirma que analytics se haya validado.

## Hallazgos abiertos sobre este build

1. **Mora a 390 px:** overflow de documento **139 px en los tres temas**. La fila de deuda anterior mide 500,125 px y termina en x529,125 dentro de un grid de 332 px. El `min-width:auto` de la fila permite desbordar el track. Las tablas con scroll interno no son la causa. Evidencia DOM en `mora-overflow-dom.json`; origen `app/finance-collections.tsx:47`. El integrador preparó `6a9237ee`; aún no estaba servido al cerrar esta evidencia. No se hizo inyección CSS para convertirlo en PASS.
2. **Balance desktop:** títulos de ambos paneles alineados y tablas de 560 px, pero cabeceras de tabla a distinta altura: aproximadamente y506 clientes / y450 equipo, por dos monedas frente a una. El integrador coordina el fix de filas compartidas. Los logos cargaron (naturalWidth256); el contenedor real es circular, radio50% y overflow hidden, mientras la imagen interior tiene padding≈15%. `balance-logo-dom.json` conserva la medición anterior al fix. No se afirma un fallo de radio del contenedor.
3. **Clientes:** la revisión visual conjunta #248 observó contenido USD/contexto recortado en KPI contratado a 1440 claro. Es una observación de captura, sin medición DOM independiente de QA todavía. Corrección y comprobación servida pendientes.

Los tres FAIL de la matriz corresponden exclusivamente al punto 1. Los puntos 2 y 3 son observaciones visuales adicionales que la condición automática de overflow de documento no detecta.

## Evidencia e informe de distribución #248

Capturas locales: `/tmp/scale241-app-final/screens/{1440|390}-{light|dark|contrast}-{ruta}.png`, donde `/pagos/balance` se transforma en `pagos-balance`. Índice y coordenadas: `matrix-pre-fix.json`. Capturas de perfil: `/tmp/scale241-app-final/header/profile-{ancho}-{tema}.png`. Balance inicial: `/tmp/scale241-app-final/balance-first-1440.png`. No se agregan imágenes ignoradas a git.

El primer pliegue de Resumen está dominado por Mis tareas; Producción muestra contenido útil sin un vacío que justifique más colapso; Pipeline antepone KPIs/filtros al rail. En Contratos móvil las tres acciones ocupan dos filas: es una propuesta de jerarquía, no un fallo funcional. El agente responsable de `docs/audits/248-page-layout-review.md` recibió estas capturas para su apéndice. Los extractos de texto del runner no están filtrados por viewport: sólo las capturas y coordenadas permiten afirmar qué aparece en el primer pliegue.

## Límites y repetición pendiente

Esperar el nuevo build del integrador y repetir sólo Mora, Balance y KPI comercial afectados. Aún no se acredita comparación exacta API/UI de totales ni todas las interacciones de hover/foco fuera del header; tampoco auth público, checklist mutable, aislamiento entre las dos demos ni catálogo con esta matriz. Preparar dos demos distintas no equivale a probar todos sus flujos. El catálogo tiene QA separada del integrador.

Dos errores del runner de header se corrigieron antes de su resultado final: una referencia Node a `innerWidth` y una comprobación del perfil durante su skeleton de carga. Se esperaron campos reales; no se reporta el skeleton como ficha vacía del producto.

## Reproducción

Con los servicios y sesiones privadas descritos en `SETUP.md`:

```bash
node docs/qa/ui-app-241/browser-matrix.mjs
QA_SESSION_FILE=/ruta/privada/sesion-ordinary node docs/qa/ui-app-241/header-browser.mjs
```

Los runners aceptan `QA_BASE_URL`, `QA_OUT` y `QA_SESSION_FILE`; sólo destinos loopback. **El segundo termina haciendo logout de esa sesión sintética.** No ejecutar con una identidad real. Las sesiones y datos demo están en el servidor con TTL; no son datos exclusivos del navegador y no se ejecutó borrado físico.

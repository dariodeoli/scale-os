# Balance 194: carga diferida de bancos — evidencia local (#254)

El candidato local con OwnCoding UI **0.68.19** deja las tablas listas en unos
**5,1 s** y reduce alrededor de **80%** los bytes JavaScript transferidos frente
al precursor medido de la versión 193. El logo original de Continental está
**decodificado y visible** en escritorio y móvil después de corregir el
consumidor `alto="24px"` a la clase CSS `alto="h-6"`.

Esto compara candidatos locales. **El baseline es `21fe88ad`, precursor de 193;
no es el SHA publicado exacto de 193 ni una medición antes/después de producción.**

## Identidad y método

- Fuente compilada final: `aabcaee3`; BUILD_ID: `GqJFkxpQNFfrgoIPojWVw`.
- SDK instalado: `0.68.19`, Git `7cf63ad530384b2887551ddb50c9261270762202` (sin modificar el tag).
- Ventana: `2026-10-17T22:05:50.296Z` → `2026-10-17T22:06:09.471Z`.
- Localhost Next producción / API local, sesión sintética privada ya existente.
- 1,6 Mbps descarga, 750 kbps subida, latencia 150 ms y CPU Chromium 4×.
- Viewports 1440×1000 y 390×844; una ronda por viewport. Contexto nuevo y caché
  deshabilitada; servidor en marcha calentado por QA anterior.
- El coordinador terminó los gates intensivos y ambos agentes cerraron Chromium
  antes de esta ventana. No se recogió una traza de utilización de CPU del host.
- Proxy comparable de contenido usable: desaparece `.loading-page` y existen
  las dos tablas `.finance-balance-columns [role=table]`. Se observa 2 s más,
  igual que el [runner previo](../performance-initial-load-252/browser.mjs).
  Este proxy no afirma hidratación universal ni prueba aquí los botones de cobro.
- Todos los intentos de escritura se bloquearon. Sólo hubo presencia/analítica
  automática; ningún cobro, cuenta o contrato fue creado o modificado.

## Resultado comparable: tablas listas y deadline de +2 s

Los bytes de esta tabla son `Network.loadingFinished.encodedDataLength` de CDP,
con cabeceras/overhead de respuesta; no son tamaños raw del paquete npm.

| Ancho | Tablas baseline | Tablas 194 | Menos tiempo | JS baseline | JS 194 al deadline | Menos bytes |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1440 | 14.442 s | 5.101 s | 64.7% | 2,255,720 B | 451,411 B | 80.0% |
| 390 | 14.311 s | 5.126 s | 64.2% | 2,255,720 B | 443,315 B | 80.3% |

No había requests JavaScript en vuelo en ninguno de los deadlines.
El [baseline resumido](baseline-summary.json) conserva las cifras del
[candidato precursor](../performance-initial-load-252/candidate.json); aquel
necesitaba un chunk financiero de 2.618.537 B descomprimidos antes de completar
Balance. La corrida nueva y sus requests están en [final.json](final.json).

## Carga inicial, dinámica y revelado del logo

«Documental» significa scripts listados en el HTML original. «Dinámica» son
otros scripts iniciados antes del deadline. No equivale a que toda carga
dinámica sea un banco. El total final suma también requests terminadas después
del deadline, evitando contabilizar una request en vuelo como cero bytes.

| Ancho | JS documental | JS dinámico antes de revelar | JS nuevo tras revelar | JS total final | En vuelo deadline/final |
| --- | ---: | ---: | ---: | ---: | ---: |
| 1440 | 395,770 B | 55,641 B | 0 B | 451,411 B | 0 / 0 |
| 390 | 395,770 B | 47,545 B | 8,096 B | 451,411 B | 0 / 0 |

Continental se encontraba fuera del área inspeccionada: primero se cierra el
deadline comparable y luego se muestra su cuenta. En escritorio el grupo JS ya
estaba descargado; en móvil se añadieron 8.096 B de red al mostrarlo.

| Ancho | Revelado desde navegación | `img.decode()` desde navegación | Crop visible verificado | Decode tras revelado |
| --- | ---: | ---: | ---: | ---: |
| 1440 | 7.118 s | 7.138 s | 7.207 s | 20.3 ms |
| 390 | 7.139 s | 7.409 s | 7.479 s | 269.9 ms |

La espera deliberada de 2 s para cerrar el deadline **no es bloqueo de la app**.
Después de decodificar se esperan dos frames y se centra el crop óptico, con dos
frames adicionales antes de medir su posición. Se registra visibleAt separado
de decodeAt para no confundir reflujo/scroll con una imagen ya visible. No se
modificó CSS, dimensiones ni estilos desde el harness.

El SVG original horizontal tiene tamaño natural **201×40** y SHA-256
`91fcf492210dbe978b1954ac9de4d61afe0e7520b9402d092cc4ef1aa76b5822`.
Coincide con el baseline de recursos originales del SDK. IMG y crop renderizados
miden **52,4375×10,4375 px** dentro de ambos viewports; los wrappers canónico y
lazy miden **52,4375×24 px**. [Geometría anterior y final](logo-geometry.json).

El recurso Next descargado es:

- **10.713 B** descomprimidos;
- **6.938 B** de cuerpo comprimido con `Content-Encoding: gzip`;
- **8.096 B** de red reportados por CDP, incluidas cabeceras/overhead.

La comprobación del header gzip se hizo fuera de la ventana cronometrada.
Estas medidas no son los 10.819 B raw del harness esbuild de OwnCoding: aquel es
otro artefacto. El chunk lazy pedido contiene las dos variantes de Continental;
no se descargó el catálogo visual completo. Los conteos `inlineImageLiterals`
del JSON son ocurrencias léxicas de `data:image/`, no un inventario de imágenes
(otro chunk común contiene referencias de código a ese prefijo).

## Validación visual y corridas excluidas

La comparación de geometría preserva los dos builds: `bf7ae398` /
`idq89FzslJpah3GGyKU5u` con `alto="24px"` decodificaba el SVG pero tenía caja
0×0; `aabcaee3` / `GqJFkxpQNFfrgoIPojWVw` con `alto="h-6"` tiene caja positiva.
La corrección es del consumidor; no se cambió el tag SDK ni se alteró CSS en QA.

Las capturas finales se tomaron en una pasada readonly separada, sin throttle:

- `/tmp/scale194-balance-perf-final/screens/1440-continental-visible.png`
- `/tmp/scale194-balance-perf-final/screens/390-continental-visible.png`

No se versionan PNG. Las capturas iniciales y el raw 0×0 se conservan en
`/tmp/scale194-balance-perf/`; esa corrida acredita contenido/transferencia,
pero **no** visibilidad del logo. Una calibración con CPU contendida y el primer
harness que midió la posición antes de estabilizar el scroll quedaron excluidos,
en carpetas separadas. La corrida final exige tamaño positivo y crop dentro del
viewport; no se eliminaron esas aserciones para aprobar.

El runner ampliado está fuera de Git, según alcance acordado:
`/tmp/scale194-balance-perf.mjs`, SHA-256 `96e8ec92aa5ca90a7f38ebe769c397b165e457536c6007c5780ed01b8ddd4c3b`.
Para repetir en este entorno se requiere una sesión privada válida y el servidor
ya construido, verificando primero BUILD_ID y SDK; el runner rechaza otro build:

```bash
QA_OUT=/tmp/scale194-balance-perf-repeat \
QA_EXPECTED_BUILD_ID=GqJFkxpQNFfrgoIPojWVw \
QA_COMPILED_SOURCE=aabcaee3 QA_SCREENSHOTS=0 \
node /tmp/scale194-balance-perf.mjs
```

## Límites y estado

Una sola ronda por ancho, backend/fixture local y baseline precursor de otro
momento. El baseline no guardó cantidades de filas; la corrida actual renderiza
21/10 filas DOM de tabla (incluyendo encabezados) y tres cuentas. No se afirma igualdad exacta de volumen de
datos, causalidad aislada de cada cambio, SLA ni rendimiento en dispositivos
físicos. La reducción de bytes y el recurso original servido sí quedaron
registrados directamente. Cero errores runtime, cero requests externas y cero
scripts en vuelo al cerrar ambos puntos de observación.

CI, merge y deploy pertenecen al integrador; esta evidencia no acredita un deploy.

# QA temporal #241 — entradas manuales y selector confirmado

17/10/2026. **89/89 comprobaciones finales aprobadas** con `2bda81782f14c3f06b7a734076495ba88ac63460` ([reporte compacto](final-results.json)). Chromium real, React/esbuild y CSS real compilado con Tailwind/PostCSS, estilos del proyecto y `temporal.css`. Servidor efímero local, sin API, base de datos ni empresas reales. No se ejecutaron CI global, merge ni deploy desde esta QA.

El fallo detectado en la base `e0eecafa` quedó corregido: DateInput, TimeInput, DateTimeInput y MonthInput conservan el texto manual parcial o imposible. Al cambiar Otro y provocar rerender, DOM y estado mantienen el valor exacto; el envío opcional lo rechaza y no lo convierte en un borrado. Editor y Dialog reales también conservaron la fecha/hora parcial y no invocaron `save`.

| Tipo | Parcial preservado | Imposible preservado y rechazado |
| --- | --- | --- |
| Fecha | `2026-02-` | `2026-02-31` |
| Hora | `13:` | `25:70` |
| Fecha/hora | `2026-10-17T13:` | `2026-02-31T13:45` |
| Mes | `2026-` | `2026-13` |

El campo principal es texto y conserva la ref al elemento HTML real. La validación se refleja mediante `customError` y no depende del antiguo `badInput` de un input temporal nativo. El borrado completo intencional continúa permitido en un campo opcional. Las pruebas usaron teclas reales, incluyendo Ctrl+A, Backspace, escritura, Tab y Escape.

El icono abre el Dialog compartido con calendario y reloj de 24 horas. Cancelar y Escape conservaron el texto anterior incluso cuando era imposible. Una entrada incompleta en el selector bloqueó Aplicar; cancelar ese borrador no reemplazó el campo principal. Aplicar una selección válida sí actualizó DOM y estado. Se comprobó que el callback recibe un `HTMLInputElement` real y un evento DOM real: el componente despacha ese evento programáticamente al aplicar (`isTrusted:false`), mientras las ediciones manuales se realizaron por teclado. No se presenta ese evento interno como escritura humana.

Los valores civiles ISO permanecieron idénticos en America/Asuncion y Asia/Tokyo para los cuatro tipos. Aplicar `23:59` al datetime en Tokio conservó exactamente `2026-10-17T23:59`, sin conversión de día u offset. El reloj del Dialog no muestra AM/PM. El calendario nativo del selector puede conservar su formato visual de locale, separado del valor manual ISO.

Las nuevas estructuras pasaron pending/disabled/readOnly y límites min/max. En 1366 y 390 px, claro y oscuro, el Dialog cabe en el viewport y el documento no desborda. Hay cuatro [capturas finales](evidence/final-390-dark.webp), una por escenario en el reporte. La ejecución final no tuvo errores JavaScript de página ni solicitudes externas/API. No se validó un dispositivo físico ni se eligió una fecha pulsando el calendario de un sistema operativo: el campo nativo del selector se editó por teclado.

La primera ejecución final completó 88 comprobaciones funcionales, pero el guard de red clasificó erróneamente los SVG `data:` del calendario como externos. Se corrigió la allowlist del harness y se repitió la matriz con esos recursos permitidos; las 89 comprobaciones quedaron verdes. Ese falso positivo se distingue del fallo real anterior.

## Reproducción portable

Con dependencias del repositorio instaladas y Chromium disponible:

```bash
QA_SOURCE_SHA=SHA_DEL_CANDIDATO \
QA_OUT=/tmp/temporal-final \
CHROME_PATH=/usr/bin/chromium \
node docs/qa/ui-temporal-241/final-browser.mjs
```

El runner compila [fixture.tsx](fixture.tsx), que monta los controles y el Editor reales con valores ficticios; inicia un puerto loopback efímero y lo cierra junto al navegador. No requiere credenciales. La intercepción permite recursos locales/embebidos y bloquea orígenes externos o métodos de escritura. El JSON versionado conserva los últimos eventos y conteos; no duplica todas las pulsaciones en cada snapshot. Los runners `browser.mjs` y `controls-browser.mjs` documentan la base anterior y deben ejecutarse sobre `e0eecafa` para reproducir sus resultados históricos.

# Evidencia anterior: causa reproducida

Entorno aislado: Chromium real, componentes React empaquetados con esbuild y un servidor HTTP local efímero. Sin Next/API, base de datos, proveedores ni datos de empresas. Candidato inicial `e0eecafa`.

**El contrato de preservación de entradas parciales falla en los cuatro tipos.** Una fecha existente `2026-10-17`, editada con foco, seis ArrowLeft y Backspace, produce `value=''`, `validity.badInput=true` y un callback con vacío. Escribir en otro campo provoca un rerender y conserva el vacío; un consumidor opcional puede enviarlo como borrado. Se reprodujo con DateInput, TimeInput, DateTimeInput y MonthInput ([datos](before-partials.json)). Son teclas reales, sin setters ni eventos de entrada simulados.

Se confirmó además con **Editor y Dialog reales**: Fecha opcional inicialmente `2026-10-17`; tras la edición parcial y un cambio en Otro, Guardar llamó al callback `save` con `{date:'',other:'QA unrelated change'}` ([resultado](before-editor.json)). Después del reset, `badInput` incluso vuelve a false. No se ejecutó ninguna escritura de API.

El resto de la base tiene evidencia separada: **60 comprobaciones aprobadas** de ref, edición nativa con ArrowUp y rerender, icono que invoca el showPicker original, preservación del valor al abrirlo, pending/disabled/readOnly, validez nativa de min/max y geometría 1366/390 en claro y oscuro ([reporte](before-controls.json)). **8 comprobaciones** adicionales mantuvieron los valores civiles ISO idénticos en America/Asuncion y Asia/Tokyo. Estos resultados no convierten en aprobado el contrato completo: las cuatro pruebas de parciales fallaron.

Un intento real de escribir 31 de febrero produjo `value=''`, `badInput=true` y modelo vacío; el rerender mantuvo ese estado. Chromium en locale en-US muestra el datetime como `01:45 PM`, aunque el valor ISO es `13:45`. También dibuja su indicador nativo junto al icono personalizado. Son observaciones de la base anterior; no se acredita formato 24h ni selección de una fecha en un dispositivo físico.

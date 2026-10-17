# Comparación candidata #252

Next production local `21fe88ad`, BUILD_ID `UUJ_4A1rTruMxEJKJSMQv`, con imports `owncoding-ui/core` y secciones/formularios dinámicos. Paquete local candidato18 (`2724dee`, JS; dist types con ajuste de self-public del integrador); **tag18 todavía no publicado al medir**. No afirmar pin final publicado. El primer build reutilizado por caché fue rechazado por el integrador y nunca se midió como candidato. Rewrites loopback4115 verificados antes del navegador.

Mismo runner, seis cargas frías de browser, servidor caliente, red1,6Mbps/150ms/CPU4×, mismas fixtures/API/PG, sin escrituras ni proveedores. No se ejecutaron otros recorridos browser durante las seis mediciones. El smoke de páginas empezó después. Una observación por caso; las variaciones de tiempos no equivalen a garantías de producción. No hay prueba contra el503 productivo.

| Ancho | Vista | Baseline listo (s) | Candidato listo (s) | Reducción tiempo | Scripts baseline→candidato (bytes red) | Reducción payload |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| 1440 | login | 15.587 | 3.891 | 75.0% | 2346161→409765 | 82.5% |
| 1440 | resumen | 16.125 | 5.679 | 64.8% | 2362968→481971 | 79.6% |
| 1440 | balance | 15.336 | 14.442 | 5.8% | 2340382→2255720 | 3.6% |
| 390 | login | 14.120 | 3.947 | 72.0% | 2346161→409765 | 82.5% |
| 390 | resumen | 15.453 | 5.805 | 62.4% | 2362968→481971 | 79.6% |
| 390 | balance | 14.937 | 14.311 | 4.2% | 2340382→2255720 | 3.6% |

Login y Resumen descargan menos scripts y muestran antes contenido interactivo. En Balance la mejora de **tablas completas** es sólo4,2–5,8%; siguen llegando recursos financieros y bancarios diferidos. Su loader principal se retira a4,297s desktop y4,422s móvil (antes14,541/14,233), pero eso **no significa que las tablas estén listas**. No atribuirle la mejora75% del login a Balance.

`authResponse.atMs` sigue siendo recepción desde navegación (≈3,8–3,9s candidato), no duración de petición. `candidate.json` conserva loader/paints/recursos/tiempos y errores de recurso por POST automáticos bloqueados. Las seis cargas candidatas tuvieron cero errores runtime y cero hosts externos. Login respondió al teclado y expuso control enlazado por React, sin submit.

Las únicas seis capturas son las del baseline en `/tmp/scale252-baseline`; candidato usó `QA_SCREENSHOTS=0`. No se fuerza ninguna imagen ignorada a git. El servidor local permanece disponible para el smoke final coordinado; no se publica ni despliega desde QA.

## Comprobación de páginas y formulario diferidos

Después de terminar las mediciones se recorrieron16rutas×1440/390, claro:32cargas con contenido real, sin skeleton de sección ni módulos ausentes y sin overflow de documento. Se abrió la cuenta nueva en ambos tamaños, se escribió un borrador, seleccionó Banco Continental en el combobox y verificó el logo decodificado (naturalWidth156, render≈18×18); después Cancelar/Descartar cerró sin guardar. No se enviaron cuentas, pagos ni tareas. El actor era el dueño demo: no se acredita una nueva matriz de denegación de permisos.

**Resultado bruto del runner:**39 comprobaciones UI/runtime PASS y un fallo final del harness. Esa última aserción suponía que sólo analytics intentaba POST automático; registró también heartbeat de presencia. Ambos estaban bloqueados antes de red. Se conserva `lazy-pages-raw.json` con `passed:false` y el error original. `request-audit.mjs` reevalúa únicamente esa clasificación sobre lo capturado, sin repetir navegación:67analytics +35presence, cero writes inesperadas, auditoría PASS. El runner se corrigió para clasificar ambos en futuras ejecuciones; no se presenta un replay40/40 que no se hizo.

Cero errores runtime y cero hosts externos en el recorrido. Los errores de recurso de las peticiones bloqueadas no prueban una consola global limpia. No se tomaron más capturas. No se probaron proveedores, producción ni persistencia con esta prueba.

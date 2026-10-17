# Guard de artefactos iniciales

`node build-tools/check-initial-assets.mjs` recorre los chunks reales del manifest de Next para login/status/registro, incluyendo layouts y controles de error. Rechaza las marcas del registro visual bancario, archivos faltantes o más de1.750.000bytes raw iniciales por ruta. CI lo ejecuta después de producir BUILD_ID; no se valida por el nombre de un import.

Candidato21fe88ad, buildUUJ_4A1rTruMxEJKJSMQv, paquete core local18:

| Ruta | JavaScript raw | Gzip calculado | Scripts | Arte financiero |
|---|---:|---:|---:|---|
| Login | 1.230.798 | 369.365 | 22 | Ausente |
| Status | 647.631 | 194.913 | 15 | Ausente |
| Registro | 925.986 | 281.324 | 18 | Ausente |

Gzip aquí se calcula sobre archivos, separado de los bytes reales capturados por CDP en la comparación. El guard también se ejecutó contra el build histórico conservado de main: falló correctamente por arte financiero inicial. El guard sólo lee artefactos. Los logos se comprobaron al abrir Balance/cuenta diferidos. En la preparación del prototipo se invalidó la caché de webpack para que Next leyera el pack local nuevo que aún conservaba la versión anterior; eso no se presenta como una corrección para usuarios.

Una primera prueba con la separación privada de cn y otra con optimizePackageImports no retiraron el módulo de las referencias cliente de Next; no se presentan como mejoras de la app. El build verificado consume el subpath público core. La configuración experimental se retiró al comprobar que no resolvía el problema.

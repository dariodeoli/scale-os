# Navegador de CI — #352

Los gates respetan PUPPETEER_EXECUTABLE_PATH, conservando overrides anteriores y fallback local. En CI, una ruta inexistente falla; no se convierte en un skip exitoso. El fallo original fue un timeout de launcher en dsn-147-estados, que ignoraba el navegador seleccionado por el workflow. No se atribuye a snap ni memoria sin logs.

Siete tests pasaron usando Chromium real a través de una ruta alternativa con espacios; cero skips. La prueba negativa con ruta inexistente falló correctamente. Los helpers de tokens y acciones pasaron con Tailwind recién compilado (6 escenarios, y18 escenarios/1056 comparaciones respectivamente). TypeScript PASS. Ver hashes y resultados en local-gates.json.

El control negativo de legibilidad buscaba Editar en la tarjeta de inventario, pero esa acción ahora vive en el menú. Se conserva la tarjeta extraída del producto y se agrega markup histórico explícitamente sintético en otro contenedor. Se mantienen todas las aserciones, el before/after y su restauración. Sin cambios de producto.

Se identificaron lanzadores auxiliares fuera de la cadena de regresión con rutas locales fijas. No se acredita su aceptación de navegador remoto por estas pruebas; el alcance de esta corrección son los cinco gates principales. CI completo y publicación se verifican en el PR #351.

# Scale 1.0.195 — fotos de inventario

Preparación desde main194 `f2d52f5ecd42d4aa629a80bb353ab1e39cc44dd0`. Issues #263 y #265. Registro previo a publicación: versión195 preparada; aún sin merge ni publicación. El estado final se acredita en el PR272 y en su evidencia de publicación.

La consola del usuario muestra ERR_TOO_MANY_REDIRECTS en las fotos de los equipos50,43 y42. Los mensajes directo-adunit/config/content.js y el error de mensajería asíncrona parecen pertenecer a extensiones; no se encontró chrome.runtime/onMessage ni esas cadenas en las fuentes de Scale.

## Reproducción y corrección prevista

El catálogo convierte las fotos embebidas en URLs absolutas detrás del proxy. Guardar el formulario completo devuelve esa URL, pero el código anterior sólo reconocía la referencia relativa. Así podía reemplazar el binario por el enlace al propio endpoint, que después respondía302 hacia sí mismo. El implementador reprodujo la pérdida del data URL en una base sintética antes del fix.

Se reconocen referencias al mismo equipo y origen propio, incluyendo el prefijo /core-api, conservando los bytes y el sello existentes. Se rechazan referencias internas a otros equipos como fotos nuevas. Los enlaces HTTPS externos legítimos conservan el contrato anterior sin descargar contenido ajeno desde el servidor.

Las referencias circulares antiguas se resolverán únicamente si el último evento de auditoría que cambió la foto demuestra la transición exacta de una imagen raster válida al enlace actual. Se comprueban organización, ID, ambos snapshots y correspondencia del sello; no se salta una eliminación, reemplazo o evento posterior. La recuperación es de lectura: no reescribe la base ni el historial. Sin prueba suficiente, el endpoint termina con un error controlado y sin Location. No se afirma que existan copias de las tres fotos reales hasta comprobarlo con sus datos.

## Pruebas y publicación

Aprobados fotos: HTTP real+236 casos PGlite; PostgreSQL17 HTTP+7 carreras+exclusión; revisión independiente apta de 2fb4b2b2. Preparación aprobada:266entradas frontend/48fragmentos, buildNext64páginas/tipos,61scripts backend,19grupos browser, versión/footer e initial-assets. Revisión independiente apta. Pendientes: matriz final, CI, merge y un único deploy195. No agrega migraciones. La auditoría responsive sí modifica presentación y navegación, según el alcance siguiente.

La evidencia de publicación194 y sus seguimientos, guardada después de aquel deploy, se incluye ahora en esta siguiente entrega para evitar publicar dos veces la misma194.

## Auditoría responsive #265

Seis agentes revisaron fuentes/metodologías, público/acceso, flujo, recursos, finanzas y QA autenticado. Skills externas verificadas en `docs/qa/responsive/SKILLS.md`, sin instalación global ni hooks.

Correcciones: anclas de landing bajo header adaptable; login16px; plantilla contractual larga contenida; identidad de inventario legible y pestaña Reservas; demo compacta hasta1023px y targets del marco44px en puntero táctil; montos grandes de Previsión contenidos por ancho de panel; foco Tab/ShiftTab visible dentro del carril compartido de pestañas. Se conserva la información, datos y permisos.

Focales de agentes: 20 navegaciones landing, registro5anchos×2temas,27estados auxiliares; flujo6componentes×5anchos=30; recursos35escenarios+Tab5; finanzas42; TabScroller78 comprobaciones+2unitarios. El diagnóstico dev autenticado completó80/80,78PASS y2fallos de foco que motivaron las correcciones. Ese diagnóstico es mixto por HMR y NO acredita producción ni SHA inmutable. El runner final exige shell hidratado,7fixtures pobladas, identidaddemo, fuente/build, cobertura completa y falla ante auth401.

Acciones241: revisión independiente conserva55widgets exactos,602acciones canónicas y1renderer,0sinrevisar. Se reposicionan hashes y se documentan cuatro desajustes previos de metadatos canónicos;21pruebas del auditor PASS, sin relajar guardas.

Build final `dtP8bVHY7yhVbiap7bBxe` aprobado y19grupos browser completos PASS (incluye78checks TabScroller,20anclas,18escenarios/1056comparaciones de estilos sin fallos). La primera corrida encontró CSS temporal ausente; el runner ahora compila CSS actual en directorio aislado y la repetición completa pasó. La matriz240 (16rutas×5anchos×3temas con scroll/fotos/foco y diálogoCliente) está en curso con puntero táctil emulado hasta1024 y desktop1440; muestra previa9/9PASS inspeccionada visualmente. Se exige cobertura y resultado final para autorizar merge, junto con CI. Evidencia de Chromium emulado: no acredita Safari físico, correos/OAuth ni todas las operaciones comerciales privadas. Portal privado/superadmin no se declaran cubiertos por la matriz demo.

La fuente exacta compilada es el árbolGit `a64d05a6cbf366f3fc7350385517e1a629a6da19`, idéntico al árbol del commit de versión `16d2278282ec8e4bbb7260966430d6e2030a067c`. El runner posterior de emulación táctil y esta documentación cambian sólo QA, no el runtime compilado. Ver `responsive-265/build-source.json`.

Controles del marco en modo táctil verificados además a768/820/1023/1024: todos los botones ≥44×44 y overflow0; el diálogo demo abre con selector y cierra con Escape. Presupuesto inicial local: login1.229.714bytes raw/370.088gzip calculado,21scripts, sin artefactos bancarios iniciales. No son cifras de transferencia de producción.

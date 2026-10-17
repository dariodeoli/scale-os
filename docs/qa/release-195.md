# Scale 1.0.195 — fotos de inventario

Preparación desde main194 `f2d52f5ecd42d4aa629a80bb353ab1e39cc44dd0`. Issue #263. Todavía sin bump195, gates completos, merge ni publicación.

La consola del usuario muestra ERR_TOO_MANY_REDIRECTS en las fotos de los equipos50,43 y42. Los mensajes directo-adunit/config/content.js y el error de mensajería asíncrona parecen pertenecer a extensiones; no se encontró chrome.runtime/onMessage ni esas cadenas en las fuentes de Scale.

## Reproducción y corrección prevista

El catálogo convierte las fotos embebidas en URLs absolutas detrás del proxy. Guardar el formulario completo devuelve esa URL, pero el código anterior sólo reconocía la referencia relativa. Así podía reemplazar el binario por el enlace al propio endpoint, que después respondía302 hacia sí mismo. El implementador reprodujo la pérdida del data URL en una base sintética antes del fix.

Se reconocen referencias al mismo equipo y origen propio, incluyendo el prefijo /core-api, conservando los bytes y el sello existentes. Se rechazan referencias internas a otros equipos como fotos nuevas. Los enlaces HTTPS externos legítimos conservan el contrato anterior sin descargar contenido ajeno desde el servidor.

Las referencias circulares antiguas se resolverán únicamente si el último evento de auditoría que cambió la foto demuestra la transición exacta de una imagen raster válida al enlace actual. Se comprueban organización, ID, ambos snapshots y correspondencia del sello; no se salta una eliminación, reemplazo o evento posterior. La recuperación es de lectura: no reescribe la base ni el historial. Sin prueba suficiente, el endpoint termina con un error controlado y sin Location. No se afirma que existan copias de las tres fotos reales hasta comprobarlo con sus datos.

## Pruebas y publicación

Pendientes: focales PGlite/HTTP/PostgreSQL real, revisión independiente, suites del repositorio, build y versión sincronizada, PR/CI, merge y un único deploy195. El cambio no agrega migraciones ni modifica los controles visuales.

La evidencia de publicación194 y sus seguimientos, guardada después de aquel deploy, se incluye ahora en esta siguiente entrega para evitar publicar dos veces la misma194.

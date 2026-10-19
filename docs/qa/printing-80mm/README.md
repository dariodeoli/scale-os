# Impresión térmica 80 mm: evidencia de preparación

Única impresora indicada por el dueño: térmica de **80 mm**. Modelo, destino y
características físicas todavía no acreditados. PR: https://github.com/dariodeoli/scale-os/pull/288

Árbol de código probado: `f1597448cbdd9bab4b9f404b3df86101316053b0`.
Esta rama agrega solamente evidencia después de ese candidato; no cambia producto.
Los resultados locales están en [local-results.json](local-results.json).

CI: https://github.com/dariodeoli/scale-os/actions/runs/39194682759
Estado final registrado en `ci.json`. El job de impresión usa PostgreSQL17 real,
API/PGlite, agente y empaquetado; los transportes de hardware son fixtures.
Artefacto generado: https://github.com/dariodeoli/scale-os/actions/runs/39194682759/artifacts/12161940355
Usar el tar y su SHA256 juntos. No incluye credenciales ni activa servicios locales.
El digest del artefacto GitHub corresponde al contenedor ZIP, no al tar interior.

## Límite de publicación

No merge ni deploy de impresión. La guía adjunta exige prueba física y luego
«Sólo después publicar/deployar» (fase F). Falta imprimir en el equipo real y
verificar corte, márgenes, tres copias, lectura Code39/QR y confirmación humana.
No se validaron impresora física, Mac, controlador ni instalación local.

La versión 1.0.196 ya publicada es independiente; su prueba está en
[production-196](../production-196/README.md). No se incrementó versión ni se
repitió un despliegue para preparar impresión.

Pendientes de hardware/papel: #215, #216. Implementación: #278–282 y #287.
Instalación y aceptación: [docs/printing/README.md](../../printing/README.md).

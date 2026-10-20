# Release1.0.203 — código integrado y web publicada; API pendiente

PR #339 integrado en main `2bedb6c679215dfd8574eb5b235700d87de8a95e`.
Candidato aprobado `c6536cabd720937575cf901b6440abf81dc7bab9`.

- CI candidato39397283613 y main39398061883: ambos gates PASS.
- Regresión frontend292 entradas, backend completo y build PASS. Las pruebas focales posteriores incluyen adhesión78, demo-effects y SDK real para enlaces/permisos.
- SDK financiero HTTP/PostgreSQL97PASS; concurrencia real de tesorería e inventario PASS; migraciones/runner y sintaxis62JS/MJS PASS.
- Web/status/registro1.0.203 comprobados. Landing, tres guías, sitemap y fuente:6probesPASS. Catálogo público244 herramientas.
- Smoke integral agotó25min al esperar API1.0.203: la API respondía200, database ready, pero versión1.0.202. Por ello el MCP ampliado y el nuevo backend NO se acreditan publicados.

`production-state.json` registra la última observación. `production-smoke.log` conserva la condición exacta de fallo de verificación: versión inesperada, no caída del API. No se repitió un deploy para el mismo SHA. No hay acceso a Coolify desde esta integración y la consulta de webhooks GitHub devolvió403; se pidió al dueño el estado del servicio API sin credenciales.

Issues #330/#331/#335 abiertos hasta acreditar publicación completa y limitaciones. OwnData tiene adaptador actualizado y configuración informada por el dueño; consulta real pendiente (#213). Cuentas reales Claude/ChatGPT siguen en #312. El proveedor no expone SHA del contenedor: se registra SHA GitHub y versión servida por separado. No hubo movimientos financieros reales de QA.

Esta rama sólo conserva evidencia; no se integra a main para evitar una publicación adicional. Al confirmar API1.0.203, ejecutar nuevamente release:smoke y las sondas MCP/intake, actualizar esta evidencia y entonces cerrar los criterios acreditados.

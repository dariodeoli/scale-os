# Biblioteca interna #241 — gates antes de la fase externa

17/10/2026. Fuente de producto `0afdbd08`; últimas correcciones de guards/documentación en `11affc1c`. Producción conserva v1.0.191; esta evidencia local no acredita deploy de la biblioteca.

| Gate | Resultado |
| --- | --- |
| `npm run test:release-regression` | PASS: 261 entradas / 44 fragmentos; log local `/tmp/scale241-regression-complete.log` |
| `npm run test:ui:browser` | PASS: 16 grupos obligatorios con preflight Chromium; `/tmp/scale241-browser-final.log` |
| Catálogo en Next de producción local | PASS: 39 verificaciones, `/tmp/scale241-catalog-integrated-browser.log` |
| TypeScript | PASS; `/tmp/scale241-integrated-catalog-types.log` |
| Build Next con BUILD_ID | PASS; `/tmp/scale241-build-integrated-localapi.log` |
| Backend | PASS: 58 suites; `/tmp/scale241-backend-release.log` |
| PostgreSQL 17 real | PASS: 114 migraciones, carreras de tesorería/inventario y cleanup; `/tmp/scale241-backend-postgres-final.log` |
| Auditoría de acciones | 211 TSX / 644 sitios: 588 canónicos, 55 widgets revisados, un renderer nativo y cero acciones sin revisar |

La regresión completa incorpora correcciones acotadas de fixtures y guards para reconocer los objetos canónicos, sin ampliar excepciones genéricas. Las verificaciones AST incluyen casos negativos de imports, Field, acciones y separación de negocio. No existe un script independiente de lint.

La primera revisión autenticada sobre la app Next, API y PostgreSQL locales confirma que Balance abre con las tablas de clientes/equipo en la misma fila, 560 px cada una a 1440 px y cero overflow del documento. Continúa la matriz completa de páginas, móvil y temas; ver el informe de `ui-app-241` cuando finalice.

Sólo después de estos gates, catálogo y primera observación real se habilitó la inspección externa de OwnCoding UI. El piloto propuesto y sus invariantes están en `../ui/portable-components-241.md`. Este informe no acredita todavía compatibilidad ni publicación del artefacto externo.

Pruebas con fixtures sintéticos locales. No prueban OAuth real, correo entregado, extracción RUC de un proveedor, dispositivos físicos ni producción.

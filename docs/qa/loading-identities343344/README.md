# Contratos, cobros e identidades — #343 / #344

## Cambios

- Contratos y Cobranza validan respuestas antes de publicarlas en estado. Una respuesta parcial o inválida muestra un error recuperable; no simula una lista vacía. Reintentar Cobranza invalida el caché de sesión.
- `PersonContainer` conserva por defecto las fotos seguras recibidas; el `verified=false` explícito y las reglas de `AuditActor` permanecen vigentes.
- Logos bancarios guardados reutilizan el componente lazy del catálogo OwnCoding UI, tanto en Cuentas como en Balance y la selección de cuenta.
- Recibos incluyen identidad del cliente, receptor y custodio, sin depender del catálogo limitado de clientes. Las cuentas creadas/editadas devuelven la identidad del custodio.
- La identidad global y su eliminación explícita de foto se respetan. Los IDs se validan por empresa; no se aceptan imágenes suministradas por el formulario como identidad de otra persona.
- Proyectos, tareas y revisión de adhesiones comparten metadatos de selección de cliente.

## Evidencia y límites

Los agentes reprodujeron fallos contra la base anterior y ejecutaron pruebas focales. `results.json` registra 12 escenarios de Chromium (4 flujos por 3 viewports: 320, 768 y 1440), con SHA de referencia y hashes de fuentes exactas antes de compilar. Las capturas muestran selección de cliente, banco, receptor y custodio, y cuentas con saldo largo. El fixture de esta prueba no valida la previsión financiera; las capturas de cuentas están recortadas a la sección validada.

`postgres.json` registra las comprobaciones con PostgreSQL 17 real: tesorería/concurrencia/inventario y períodos financieros, sin conexión a producción. El test de navegador es repetible y está registrado en la regresión como `tests/loading-identities-343-browser.test.mjs`.

La regresión completa, build, backend, estado del CI e integración/publicación se siguen en [PR #349](https://github.com/dariodeoli/scale-os/pull/349). La versión candidata 1.0.204 se preparó con un solo incremento; no se repite el bump al continuar una validación.

La causa exacta del error autenticado de producción no se presume: se solicitó el mensaje y rol al dueño. Las pruebas locales no son pruebas con su sesión. No hubo escrituras financieras de producción.

A la inspección inicial, web publicaba 1.0.203 y API 1.0.202; el dueño informó que Coolify estaba en cola o en proceso. No se inicia un deploy duplicado. El cierre de issues requiere integración y publicación verificadas.

## Reversión

Revertir los commits de esta entrega conserva cuentas, pagos, contratos, fotos y relaciones existentes: no se agregan migraciones ni se cambian importes financieros.

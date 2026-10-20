# Evidencia MCP/OAuth #312

## Ejecución

```sh
node backend/test-mcp.mjs
SCALE_TEST_PG_BIN=/workspace/.qa-tools/postgres/usr/lib/postgresql/17/bin node backend/test-mcp.mjs
node backend/test-release-migrations.mjs
(cd backend && node test-auth.mjs)
```

La primera prueba usa PGlite y se incluye en `backend` `test:release`. El segundo comando necesita PostgreSQL 17 disponible y crea un clúster temporal propio, un puerto local reservado y una base vacía; los elimina al finalizar. No usa datos reales. PGlite excluye explícitamente escenarios de transacciones anidadas/aislamiento que se ejecutan sobre PostgreSQL real. No sustituye las comprobaciones de concurrencia de PostgreSQL.

El fixture HTTP usa `Client` y `StreamableHTTPClientTransport` oficiales para initialize, listado y llamadas; también usa los helpers oficiales para descubrir metadatos desde WWW-Authenticate, DCR, PKCE, canje y refresh. Un fetch de prueba permite exclusivamente el emisor HTTPS canónico y dirige sus requests al HTTP loopback del fixture. Esto verifica protocolo/descubrimiento, no TLS externo ni una conexión real de Claude/ChatGPT.

## Casos comprobados

- Crear/editar cliente, crear plan y proyecto invocando handlers canónicos reales; extra mensual canónico #306 en PostgreSQL.
- Tenant ajeno, inyección de organización/rol, cambio de rol, excepción de capacidades y suspensión/restitución de membresía. Restituir acceso no revive el grant revocado.
- Redirect exacto/HTTPS, rechazo de credenciales y fragmentos, recurso erróneo, PKCE incorrecto/plain, OAuth duplicado, CSRF/Origin, consentimiento denegado/expirado, código usado dos veces.
- Tokens hasheados, audiencia persistida, acceso expirado, scope de sólo lectura, refresh limitado, replay con revocación familiar, revocación por navegador y RFC7009.
- Cookie no autoriza MCP; Bearer no autentica administración por cookie. Callback conserva state y query fija.
- Planes/proyectos/extras no cambian caja. Sólo cobro explícito cambia saldo por el handler de pagos, y requestId impide duplicarlo. Login viejo o consentimiento viejo impiden registrar cobro real.
- Concurrencia: una operación por grant, tope global antes de reservar lease, adaptación a pool de dos conexiones y rechazo de pool de una. Se ejercita sobre PostgreSQL para evitar pasar por una simulación serial que esconda starvation.
- Migración adicional idempotente, registrada en orden y fixtures. SDK exacto 1.32.1; no se cambiaron versiones de dependencias previamente fijadas.

No se realizaron aquí OAuth real en Claude/ChatGPT, despliegue, firma digital ni pruebas físicas. El catálogo completo queda sujeto a los handlers canónicos existentes; las pruebas funcionales de este cambio se concentran en clientes/planes/proyectos/extras y cobros, además de autorización compartida. CI y publicación final corresponden al integrador.

## Archivos

`backend/mcp-server.js`, `backend/mcp-oauth.js`, `backend/mcp-tools.js`, migración `20261020_mcp_connections.sql`, montaje `backend/server.js`, SDK lockfile, `backend/test-mcp.mjs` y fixture `backend/scripts/test-mcp-db.mjs`. Se incluye la dependencia exacta #306 (`client-monthly-income.js`, su migración y registro) para que la rama sea comprobable antes de integrar.

## Resultado observado 2026-10-20

PostgreSQL real: PASS, 77 comprobaciones HTTP explícitas más flujos internos del SDK. PGlite: PASS, 63 comprobaciones explícitas más SDK (aislamiento anidado excluido). Release migrations: PASS, 118 migraciones. Auth VM, security hardening y platform guard: PASS. Logs sanitizados de fixtures sintéticos y hashes se adjuntan en esta carpeta. Revocación se probó con fallos inyectados en UPDATE y auditoría: rollback conserva tanto grant como nonce y permite reintentar.

Focal UTF-8: `node backend/test-mcp-utf8.mjs` PASS, seis requests HTTP segmentados reales. Se cortaron bytes internos de é y 🎬 tanto en registro OAuth como argumentos MCP; se conservan completos. Bodies multibyte superiores a los límites retornan 413. Los parsers acumulan buffers y cuentan bytes antes de decodificar una sola vez. El focal usa un handler sintético para aislar integridad de transporte, no simula cambios contables.

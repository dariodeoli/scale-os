# Conexiones MCP — frontend #312

20/10/2026. Configuración y Preferencias del espacio comparten el mismo `McpConnections`. Preferencias es accesible a todos los roles para administrar conexiones propias; no se amplía `settings.manage` ni se permite administrar conexiones ajenas. La empresa y el usuario forman la key del componente; se rechaza una respuesta de otra empresa y no se conserva contenido ante una denegación.

## Uso

Copiar URL HTTPS del servidor MCP y agregar un conector remoto con OAuth en Claude o ChatGPT, si el plan del proveedor ofrece esa función. Pegar una URL en un chat no crea una conexión. Las instrucciones no afirman conexión real ni disponibilidad de una modalidad comercial externa.

El navegador abre `/mcp/autorizar?request=<opaque>`. Antes de cualquier POST se muestran aplicación, callback completo, empresa y permisos `scale:read`/`scale:write`. El nombre lo declara la aplicación solicitante: no certifica que sea Claude o ChatGPT. Autorizar y denegar son decisiones explícitas, con CSRF de ese pending request; abrir la página no concede acceso. El redireccionamiento sólo se acepta por HTTPS, sin credenciales/fragmento, con mismo origen/path y query fija del callback mostrado.

La pantalla de conexiones muestra scopes y fechas. Revocar pide confirmación y envía su CSRF propio de un solo uso. El éxito directo exige `{revoked:true,id:<seleccionado>}`. Ante error o respuesta perdida se vuelve a consultar la lista para renovar CSRF y conciliar el estado: sólo `revokedAt` del ID seleccionado confirma una revocación completada. Una fila ausente no acredita éxito. Si la consulta también falla, el diálogo sólo permite actualizar; cancelar y volver a abrir no habilita una mutación con el nonce consumido. Si sigue activa, el usuario debe confirmar nuevamente con CSRF fresco. Errores de sesión/empresa eliminan el contenido anterior.

## Login y privacidad

El login real es `/`. `next` admite sólo `/superadmin` y la ruta de consentimiento con un único `request` base64url válido; no acepta destinos arbitrarios, query adicional, fragmento ni request duplicado. Un retorno con vencimiento15min en sessionStorage permite volver después de un login social que pierde la query. Sólo contiene la ruta y el identificador opaco; nunca access/refresh tokens, contraseña ni código OAuth. Se consume una sola vez y se elimina al volver al espacio. La preferencia de página inicial no reemplaza el retorno autorizado.

Los GET/POST/DELETE usan cookie, `no-store`, timeout20s y `redirect:error`. Los tokens OAuth permanecen en el backend/cliente externo. Metadatos de la página de consentimiento: noindex/nofollow y no-referrer. Un resultado de POST viejo, después de cambiar request o desmontar la pantalla, no puede navegar la solicitud nueva.

## Contrato coordinado con backend

- GET `/api/agency/mcp/connections`: URL pública, empresa, conexiones de la propia cuenta, capacidades y CSRF.
- DELETE `/connections/:id`: body `{csrfToken}` y confirmación `{revoked:true,id}`.
- GET `/authorization?request=…`: cliente/callback, empresa, scopes, vencimiento y CSRF propio.
- POST `/authorization`: `{request,approve,csrfToken}` y callback validado en `redirectUrl`.
- Errores OAuth muestran `error_description` en español.401 exige login;403 deniega sesión;410 vence/consume el request. La interfaz no autoriza scopes desconocidos.

## Evidencia

[JSON](results.json). Ocho pruebas focales PASS;19 preferencias y7 header, además del retorno login. Revisión independiente: cuatro adversariales PASS (revocación de otro ID, POST401/403/410, usuario anterior y query fija). TypeScript y arquitectura PASS.

Browser real con API sintética:30 combinaciones (consentimiento/conexiones ×5 geometrías ×3 temas), CSS real con Tailwind recompilado desde este checkout; sin overflow horizontal ni errores de runtime. Interacciones: retorno de login, vencimiento, rol denegado, denegación explícita, cancelación y confirmación de revocación. No equivale a OAuth real de proveedores ni dispositivos físicos. Gate `103-mcp-ui-312.list`. El integrador acredita build/CI y publicación del conjunto por separado.

## Corrección de integración: CSRF de revocación

Runner `./node_modules/.bin/tsx tests/mcp-ui-312.test.tsx`:8/8 PASS con fixture que consume cada nonce antes de simular un fallo, igual que el handler backend. Cubre reintentos con CSRF fresco, ID incorrecto, respuesta perdida con revocación ya completada, fallo de actualización seguido de recuperación sólo GET, cancelación/reapertura, fila ausente,401/403, empresa distinta y respuesta tardía tras cambiar de usuario. TypeScript PASS. Se repitió el runner browser existente sobre el delta:30 combinaciones y6 interacciones PASS. No se ejecutó OAuth real de proveedor ni deploy.

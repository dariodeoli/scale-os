# Conectores MCP de Scale OS

El endpoint es `https://api.scaleparaguay.com/mcp`. Implementa Streamable HTTP con el SDK oficial `@modelcontextprotocol/sdk` 1.32.1. Un cliente compatible puede descubrir el servidor OAuth desde el desafío `WWW-Authenticate` y registrar un cliente público mediante DCR. La conexión efectiva desde las interfaces de Claude o ChatGPT requiere validación externa; las pruebas del repositorio usan el cliente oficial del SDK, no una cuenta real de esos proveedores.

## Conexión y consentimiento

1. En la aplicación que admita conectores MCP remotos, crear un conector con la URL anterior y autenticación OAuth.
2. Iniciar sesión en Scale y revisar la empresa, la URL completa de retorno y los permisos solicitados en `/mcp/autorizar`.
3. Aprobar explícitamente. El nombre del cliente es autodeclarado, no prueba de identidad de Claude, ChatGPT u otro proveedor.
4. Administrar y revocar las conexiones propias desde Configuración/Preferencias. La revocación se aplica a los tokens de acceso y renovación de esa conexión.

`scale:read` permite consultar; `scale:write` permite solicitar cambios. Se anuncian ambos para que los clientes puedan ofrecer el catálogo completo, pero si el cliente solicita sólo lectura no se amplía su autorización. Cada llamada vuelve a verificar usuario, membresía activa, empresa, suscripción, rol y excepciones de capacidades actuales. Los scopes nunca conceden una capacidad que el usuario no tenga en Scale.

## Catálogo

El servidor ofrece hasta 41 herramientas; el listado efectivo se filtra según scopes y capacidades actuales:

| Área | Operaciones disponibles |
| --- | --- |
| Clientes | listar, consultar, crear, editar; consultar reporting y cronología; cambiar condiciones comerciales permanentes |
| Planes personalizados | listar, crear, editar |
| Proyectos | listar, consultar, crear, editar |
| Piezas/órdenes de trabajo | listar, consultar, crear, editar |
| Tareas internas | listar, consultar, crear, editar |
| Presupuestos | listar, consultar, crear, editar |
| Contratos | listar, consultar, crear, editar borradores mediante sus validaciones actuales |
| Inventario | listar, crear, editar |
| Gastos planificados | listar por mes, crear, editar |
| Ingreso mensual del cliente | consultar por mes, agregar y editar base/extras con revisión, motivo e idempotencia |
| Cobros | listar recibos, registrar cobro mediante el handler canónico |

No ofrece eliminación, purga, cambios de roles, administración global, secretos, deploy, SQL, transferencias ni edición directa de saldos. Tampoco emite/firma contratos mediante una herramienta alternativa. Los gastos disponibles son los **planificados**; otros flujos financieros no enumerados no se exponen.

El cambio permanente de plan/precio del cliente usa `scale_update_client_commercial_terms`, distinto del catálogo de planes y de extras de un solo mes. Primero consultar `scale_get_client_plan_history` para obtener la revisión actual. Se requieren todos los campos comerciales del editor, `effectiveFrom`, `reason`, `requestId` y `expectedRevision`; el handler conserva cronología, idempotencia y cierres financieros. `scale_get_client_reporting` y la cronología requieren `billing.view`; el cambio requiere `commercial-terms.manage`.

Las herramientas de escritura requieren `confirm: true` y los datos del editor canónico, y se marcan con `destructiveHint`. El agente debe obtener la confirmación del usuario antes de enviarlo: ese booleano no constituye firma ni prueba independiente de intención humana. El consentimiento OAuth sí pasa por una pantalla humana explícita.

Por ejemplo, se puede pedir consultar clientes, crear un plan personalizado con `name`, `currency` e `items`, crear un proyecto con `name` y `clientId`, o agregar un extra mensual con `month`, `kind`, `label`, `amount`, `currency`, `requestId`, `expectedRevision` y `reason`. Los esquemas de estas herramientas detallan sus campos; el resto reutiliza los campos y errores del formulario REST canónico. Las validaciones finales y la autorización pertenecen siempre al handler existente.

Registrar un cobro real exige, además, **inicio de sesión real y consentimiento OAuth de los últimos 15 minutos**. Se conserva la fecha de creación de la sesión del navegador al aprobar; autorizar con una sesión vieja no simula una nueva autenticación. Para volver a registrar dinero después de ese plazo hay que iniciar sesión y autorizar de nuevo. Crear planes, proyectos o extras mensuales no modifica el dinero en caja. Los cobros mantienen las reglas contables, cierres e idempotencia del handler de pagos.

## Contrato técnico y seguridad

- Metadatos: `/.well-known/oauth-protected-resource/mcp` (también raíz) y `/.well-known/oauth-authorization-server`.
- OAuth: `/oauth/register`, `/oauth/authorize`, `/oauth/token`, `/oauth/revoke`.
- Gestión con cookie: `/api/agency/mcp/connections`, `DELETE /api/agency/mcp/connections/:id` y `GET/POST /api/agency/mcp/authorization`.
- HTTPS, redirect registrado exacto (sin fragmentos/credenciales), PKCE S256 obligatorio y `resource` exacto en autorización, canje y renovación. Se preservan los parámetros fijos del callback y `state`.
- Solicitud 10 minutos, código de un uso 60 segundos, acceso 1 hora y renovación 30 días. Se guardan hashes de códigos, tokens y nonces; nunca tokens de acceso en el navegador de Scale.
- Rotación de refresh; reutilizar uno consumido revoca toda la conexión. Renovar puede reducir scopes, no ampliarlos. La conexión persiste su audiencia.
- Consentimiento y revocación requieren sesión, nonce ligado a sesión/usuario/empresa y Origin de la app. Bearer MCP no autentica gestión por cookie ni cookies autentican `/mcp`.
- `SCALE_MCP_ISSUER` y `APP_URL` permiten configurar los orígenes HTTPS canónicos; por defecto son API y app de Scale. El Host público debe coincidir con el emisor. OAuth/MCP público usa CORS sin credenciales; las rutas de gestión usan el proxy mismo origen de la aplicación.
- Límites: OAuth body 32 KiB, MCP body 128 kB/15 s, argumentos 60 kB, salida 80 kB; listas hasta 50 elementos, offset hasta 10000. Se omiten campos de secretos y las notas se tratan como datos no confiables.
- Máximo dos herramientas simultáneas y una por conexión, reducido a `floor(pool.max/2)`; con pool menor a dos se rechaza antes de reservar conexión. Esto deja capacidad para el handler canónico, que usa otra conexión. Saturación devuelve error de herramienta 429 con sugerencia de reintento.
- Auditoría guarda actor, conexión, operación/herramienta y estado, sin argumentos ni tokens. Lecturas y escrituras usan rutas y handlers permitidos explícitamente, nunca proxy arbitrario.
- DCR está implementado; Client ID Metadata Documents (CIMD) no está implementado. No se anuncian funcionalidades que lo requieran.

Especificación consultada: [MCP Authorization 2025-11-25](https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization). Evidencia reproducible en [QA #312](qa/mcp-312/README.md).

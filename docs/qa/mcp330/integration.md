# Integración MCP, finanzas y clientes — Refs #330 #331 #335

Entrega integrada en PR #339. Este documento distingue evidencia de pruebas y estado de publicación; no acredita un deploy por la existencia de código.

## Cambio

- Catálogo generado del registro real: 244 herramientas tipadas y únicas, repartidas entre clientes (6), finanzas (61), operaciones (136) y workspace (41). API/MCP comparten handlers, identidad y permisos vivos, cierres e idempotencia. Las operaciones protegidas conservan inicio de sesión y consentimiento recientes.
- Gerencia accede a operación general y cuentas/cobranza/previsión; no a Balance ni remuneraciones personales. La protección incluye descubrimiento MCP, equipo, historial de actividad y exportaciones administrativas. Permisos por rol y persona siguen jerarquía, no autopromoción ni concesión de capacidades superiores.
- Cuentas bancarias con catálogo OwnCoding UI, titular/RUC, modalidad y alias, nombre sugerido editable y control de revisión. Los cobros admiten asociación posterior y período/extra explícito; no se infiere pagador por monto.
- Revisión documental mensual empieza pendiente y no registra dinero. Directorio/ficha no presentan «Sin mora» por falta de información.
- Ficha compacta y enlaces de adhesión básica/contrato con token acotado, vencimiento/revocación, consentimiento y revisión de campos antes de crear/completar fichas. El logo se incorpora por el equipo dentro de la app.
- OwnData acepta la respuesta actual con estado fiscal opcional y conserva nombre oficial/procedencia. La clave sigue en configuración de servidor, nunca en frontend o Git.

## Evidencia

- SDK oficial + HTTP + PostgreSQL: 97 comprobaciones financieras sobre runtime root `17a07a21`, fuentes idénticas a `6d77e643`. Incluye dinero exacto, idempotencia, conflictos, cuentas, revisión, permisos revocados, privacidad y autenticación reciente. Pruebas exclusivamente aisladas.
- APIs de adhesión: 70 comprobaciones canónicas. Pruebas de jerarquía e invitaciones incluyen tenant, límites de rol y filtrado de eventos salariales.
- Migraciones aditivas 120→123: frontera histórica preservada, datos existentes y tracker conservados tras reinicios; no se crean cobros ni deudas por migración.
- Chromium: controles reales y HTTP sintético en 320/390/768/1440, temas claro/oscuro, errores superiores, permisos, adhesión y creación bancaria anidada. Ver `README.md`, JSON y capturas de este directorio. Esta evidencia no sustituye dispositivos físicos ni conexión real de cuentas Claude/ChatGPT.

## Límites y publicación

Matrices en `backend/mcp-*-coverage.json` documentan rutas soportadas y límites concretos de la API, incluidos endpoints que no existen y acciones físicas o de firma externa. El catálogo no es un proxy HTTP ni acceso a infraestructura, secretos o SQL.

El dueño informó haber configurado las tres variables OwnData y hecho deploy. La comprobación pública posterior dio API `/health` 200, versión1.0.202, base ready. No se ejecutó una consulta real con su sesión/clave; la disponibilidad del proveedor no se acredita con health. #213 conserva seguimiento externo; #312 conserva conexión real de asistentes.

Versión nueva, regresión completa, CI y smoke de producción: pendientes de completar por el integrador antes de cerrar issues. Se actualizarán con evidencia del SHA final.

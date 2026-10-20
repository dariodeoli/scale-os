# QA local de permisos, IA e ingreso de clientes — #330

Fuente: integración `09b4d8ee` más corrección de ayuda `55a81f39` (sin escrituras en producción).
Chromium real, React, Dialog, SelectCustom, Editor, MemberPermissions y PublicClientIntake reales. El servidor de datos es una fixture HTTP local: acredita las interacciones y los payloads de la UI, no sustituye las pruebas de permisos/transacciones del API.

- 320/390/768/1440 px: documento sin overflow y diálogos dentro del viewport.
- SelectCustom permite denegar un permiso individual y dibuja el resultado del PATCH local. Las filas salariales fuera del alcance no se muestran.
- El acceso temporal a IA desaparece en vivo al llegar a 30/10/2026 00:00 America/Asuncion, con acceso estable a Configuración.
- Intake básico: el envío inválido lleva el resumen de errores arriba; consentimiento requerido, nombre, honeypot vacío y envío HTTP local correctos; aparece la confirmación de revisión.
- 20 comprobaciones de flujo y cuatro registros adicionales de errores visibles. Cero pageerrors y cero solicitudes externas.
- 320 y 768 claros; 390 y 1440 oscuros usando `html[data-theme=dark]` y clase dark reales, además de media.

Capturas: `team-320.png`, `team-1440.png`, `client-390.png`, `client-768.png`. Datos completamente sintéticos. La barra superior es el control de la fixture, no el shell completo.

Hallazgo corregido: el formulario público sin consulta de RUC ofrecía «Enter o Buscar» aunque no existe lookup. La ayuda ahora depende de la consulta disponible; los datos protegidos tampoco ofrecen edición. `tests/client-intake-help-330.test.ts` cubre los tres estados. No se habilita consulta tributaria pública nueva.

Pendiente de otra entrega: formularios bancarios #331 todavía no integrados al tomar estas evidencias. Catálogo raíz auditado: 244 herramientas únicas, copias web/backend iguales; dominios clientes 6, finanzas 61, operaciones 136, workspace 41. No aparecen herramientas con nombres de purga, contraseñas, secretos, SQL o despliegue. El check canónico detectó únicamente metadata pendiente de regenerar en scale_update_salary; el integrador debe regenerar al congelar el registro.

Reproducción local: `node tests/team-access-intake-browser-330.test.mjs` (Chromium en `/usr/bin/chromium`, dependencias frontend/backend instaladas). La fixture sólo escucha en loopback, bloquea solicitudes externas y deja resultados en `/tmp/scale330-browser-qa.json`.

## Ronda final integrada de bancos y cobros

Fuente congelada `4d84779d`, con UI #331 integrada. `node tests/finance-nested-browser-330.test.mjs` reproduce 12 comprobaciones adicionales en 320/390/768/1440 (claro/oscuro real). Reutiliza FinanceCollections, ReceiptPaymentDialog, AccountCreateDialog, AccountForm, BancoCombobox/Logo diferidos y Editor reales; servidor HTTP local sintético.

- Pago vacío muestra el resumen superior de errores.
- Sin cliente, Proyecto está deshabilitado. Al elegir Alfa sólo se ofrece Proyecto Alfa; después de elegirlo y cambiar a Beta se limpia el proyecto anterior y sólo se ofrece Proyecto Beta. La fixture devuelve ambos proyectos deliberadamente para probar el filtro real de la UI.
- Crear cuenta anidada conserva el foco dentro del nuevo diálogo incluso con errores en el padre. Búsqueda Familiar selecciona el banco y su logo original decodifica (352 px de ancho natural).
- Nombre sugerido usa el banco y la cola 6789; titular y referencia se envían al endpoint local canónico.
- Al crear la cuenta, se conserva el importe 50000 y la referencia del borrador, y se selecciona la nueva cuenta 90. El pago local conserva cliente Beta, proyecto vacío, fecha, importe, referencia e identificador de operación.
- Documento y los dos diálogos no desbordan en ninguno de los cuatro anchos. Cero pageerrors o tráfico externo. No se crean cuentas ni movimientos reales.

Evidencia: `bank-nested-results.json`, `bank-nested-320.png` (claro), `bank-nested-1440.png` (oscuro). No se cambiaron las fuentes del producto en esta ronda. Las pruebas transaccionales de PostgreSQL y de autorización pertenecen al API; este reporte acredita la interacción visual de la UI.

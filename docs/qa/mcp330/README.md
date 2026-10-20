# QA local de permisos, IA e ingreso de clientes — #330

Fuente de la primera ronda: integración `09b4d8ee` (sin escrituras en producción).
Chromium real, React, Dialog, SelectCustom, Editor, MemberPermissions y PublicClientIntake reales. El servidor de datos es una fixture HTTP local: acredita las interacciones y los payloads de la UI, no sustituye las pruebas de permisos/transacciones del API.

- 320/390/768/1440 px: documento sin overflow y diálogos dentro del viewport.
- SelectCustom permite denegar un permiso individual y dibuja el resultado del PATCH local. Las filas salariales fuera del alcance no se muestran.
- El acceso temporal a IA desaparece en vivo al llegar a 30/10/2026 00:00 America/Asuncion, con acceso estable a Configuración.
- Intake básico: el envío inválido lleva el resumen de errores arriba; consentimiento requerido, nombre, honeypot vacío y envío HTTP local correctos; aparece la confirmación de revisión.
- 20 comprobaciones de flujo y cuatro registros adicionales de errores visibles. Cero pageerrors y cero solicitudes externas.
- 320 y 768 claros; 390 y 1440 oscuros usando `html[data-theme=dark]` y clase dark reales, además de media.

Capturas: `team-320.png`, `team-1440.png`, `client-390.png`, `client-768.png`. Datos completamente sintéticos. La barra superior es el control de la fixture, no el shell completo.

Hallazgo corregido: el formulario público sin consulta de RUC ofrecía «Enter o Buscar» aunque no existe lookup. La ayuda ahora depende de la consulta disponible; los datos protegidos tampoco ofrecen edición. `tests/client-intake-help-330.test.ts` cubre los tres estados. No se habilita consulta tributaria pública nueva.

Pendiente de otra entrega: formularios bancarios #331 todavía no integrados al tomar estas evidencias. El catálogo público estaba en transición; el integrador informa snapshot final de 244 herramientas, que debe pasar el check canónico al congelar el registro.

# API194: resultado real previo al navegador

Backend congelado del integrador con metadata1.0.194, API local4115/PG55450. Runner `api-domains.mjs` ejecutado con mutaciones manuales únicamente en fixtures sintéticas: **19/19 PASS**, `passed:true`, sin `error` en el JSON.

- #184: lista autorizada; actor denegado403 y tenant ajeno404; crear201/version1, editar200/version2, escritura obsoleta409 sin reemplazo, eliminar200; IDs de contactos originales restaurados y correo/teléfono/razón social/RUC principal intactos.
- #186: lectura con scope correcto, scope antiguo409, PATCH/lectura posterior persistentes; restauración de preferencias200.
- #208: catálogo explícitamente no oficial, selección con par incompatible400, entrada manual200 con procedencia manual, revisión obsoleta409; restauración del contenido del perfil200.

No se necesitaron limpiezas de emergencia por fallo. Revisiones/auditoría permanecen; restaurar el contenido no rebobina contadores. Si no había fila de preferencias/perfil, puede quedar la fila restaurada con valores por defecto. No se consultaron proveedores ni producción. Esta evidencia es API real local; no sustituye la QA visual del build integrado, todavía pendiente en este punto.

-- Logo de la empresa (agencia): lo cargan owner/admin en Configuración › Empresa
-- y se muestra en el selector de empresa y en el panel global.
-- Aditiva, idempotente y re-ejecutable: guarda la imagen normalizada (WebP data:) o un enlace HTTPS.
alter table organizations add column if not exists logo_url text;

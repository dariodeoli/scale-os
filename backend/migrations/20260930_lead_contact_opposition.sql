-- Oposición al contacto en oportunidades (Ley 7593/2025, Refs #114): el
-- titular revocó la autorización de contacto, así que el equipo conserva el
-- registro mínimo de la oportunidad y no la usa para volver a contactarlo.
-- Aditiva, idempotente y re-ejecutable; las altas nuevas arrancan en false.
alter table agency_leads add column if not exists do_not_contact boolean not null default false;

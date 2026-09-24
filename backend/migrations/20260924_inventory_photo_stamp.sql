-- Sello de la foto de inventario (#58): permite cachear la imagen servida en
-- `/api/agency/inventory/<id>/photo` sin leer ni hashear la foto en cada listado.
-- Aditiva, idempotente y re-ejecutable; tolera fixtures sin la migración de fotos.
alter table agency_inventory add column if not exists photo_updated_at timestamptz;
do $$ begin
 if exists(select 1 from information_schema.columns where table_name='agency_inventory' and column_name='photo_url') then
  update agency_inventory set photo_updated_at=coalesce(photo_updated_at,created_at) where photo_url is not null and photo_updated_at is null;
 end if;
end $$;

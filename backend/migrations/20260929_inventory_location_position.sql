-- Orden manual de «Ubicaciones de guardado» (#104).
-- Aditiva, idempotente y re-ejecutable: agrega `position` por empresa con el
-- orden vigente hasta ahora (`active desc, name`) como valor inicial, y deja el
-- índice que usa el listado (`position, name`). Si la tabla todavía no existe
-- (suites que no cargan la migración que la crea), no hace nada.
do $$
begin
  if to_regclass('public.agency_inventory_storage_locations') is null then
    return;
  end if;

  alter table agency_inventory_storage_locations add column if not exists position integer;

  with ranked as (
    select id,(row_number() over (partition by organization_id order by active desc,name) - 1) as pos
    from agency_inventory_storage_locations
  )
  update agency_inventory_storage_locations l
  set position = r.pos
  from ranked r
  where l.id = r.id and l.position is null;

  alter table agency_inventory_storage_locations alter column position set default 0;
  update agency_inventory_storage_locations set position = 0 where position is null;
  alter table agency_inventory_storage_locations alter column position set not null;

  create index if not exists agency_inventory_storage_locations_order_idx
    on agency_inventory_storage_locations(organization_id,position,name);
end $$;

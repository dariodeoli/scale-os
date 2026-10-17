-- Refs #239. La vinculación es explícita; no se deduce de nombres/documentos.
alter table agency_clients add column if not exists legal_representative_same_as_client boolean not null default false;

create or replace function sync_client_representative_name() returns trigger language plpgsql as $$
begin
 if new.legal_representative_same_as_client then
  new.legal_representative_name := coalesce(nullif(btrim(new.legal_name),''),btrim(new.name));
 end if;
 return new;
end $$;

drop trigger if exists agency_clients_representative_name_link on agency_clients;
create trigger agency_clients_representative_name_link
 before insert or update of name,legal_name,legal_representative_name,legal_representative_same_as_client
 on agency_clients for each row execute function sync_client_representative_name();

-- Refs #220. Datos declarados; los registros existentes permanecen desconocidos.
alter table agency_clients add column if not exists address text not null default '';
alter table agency_clients add column if not exists city text not null default '';
alter table agency_clients add column if not exists department text not null default '';
alter table agency_clients add column if not exists document_type text not null default '';
alter table agency_clients add column if not exists document_number text not null default '';
alter table agency_clients add column if not exists legal_representative_name text not null default '';
alter table agency_clients add column if not exists legal_representative_document text not null default '';
alter table agency_clients add column if not exists legal_representative_role text not null default '';
alter table agency_clients add column if not exists party_type text not null default '';
do $$ begin
 if not exists(select 1 from pg_constraint where conname='agency_clients_legal_document_type_check' and conrelid='agency_clients'::regclass) then
  alter table agency_clients add constraint agency_clients_legal_document_type_check check(document_type in ('','ci','ruc','passport','other'));
 end if;
 if not exists(select 1 from pg_constraint where conname='agency_clients_party_type_check' and conrelid='agency_clients'::regclass) then
  alter table agency_clients add constraint agency_clients_party_type_check check(party_type in ('','person','company'));
 end if;
end $$;

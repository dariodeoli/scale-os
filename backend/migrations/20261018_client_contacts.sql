-- Contactos secundarios; la ficha principal y los contratos emitidos no cambian.
create unique index if not exists agency_clients_contacts_tenant_id on agency_clients(organization_id,id);
create table if not exists agency_client_contacts (
 id bigserial primary key,
 organization_id bigint not null references organizations(id),
 client_id bigint not null,
 name varchar(120) not null check(length(trim(name)) between 2 and 120),
 role varchar(120) not null default '',
 email varchar(254), phone varchar(50),
 version integer not null default 1 check(version>0),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 created_by_user_id bigint references users(id),
 updated_by_user_id bigint references users(id),
 foreign key(organization_id,client_id) references agency_clients(organization_id,id) on delete cascade
);
create index if not exists agency_client_contacts_client on agency_client_contacts(organization_id,client_id,id);

create unique index if not exists agency_clients_intake_tenant_id on agency_clients(organization_id,id);
-- Refs #335: public credentials never contain existing client data or grant sessions.
create table if not exists agency_client_intake_links (
 id bigserial primary key,
 organization_id bigint not null references organizations(id) on delete cascade,
 client_id bigint,
 scope text not null check(scope in ('basic','contract')),
 token_hash text not null unique check(length(token_hash)=64),
 created_by bigint not null references users(id),
 created_at timestamptz not null default now(),
 expires_at timestamptz not null,
 revoked_at timestamptz,
 consumed_at timestamptz,
 unique(organization_id,id),
 foreign key(organization_id,client_id) references agency_clients(organization_id,id) on delete cascade
);
create index if not exists agency_client_intake_links_org_idx on agency_client_intake_links(organization_id,created_at desc);
create table if not exists agency_client_intake_submissions (
 id bigserial primary key,
 organization_id bigint not null references organizations(id) on delete cascade,
 link_id bigint not null unique,
 payload jsonb not null,
 status text not null default 'pending' check(status in ('pending','accepted','rejected')),
 created_at timestamptz not null default now(),
 reviewed_at timestamptz,
 reviewed_by bigint references users(id),
 client_id bigint references agency_clients(id) on delete set null,
 foreign key(organization_id,link_id) references agency_client_intake_links(organization_id,id) on delete cascade
);
create index if not exists agency_client_intake_submissions_org_idx on agency_client_intake_submissions(organization_id,status,created_at desc);

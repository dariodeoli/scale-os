create table if not exists agency_company_legal_profiles (
 organization_id bigint primary key references organizations(id),
 city text not null default '', department text not null default '',
 legal_representative_name text not null default '', legal_representative_document text not null default '', legal_representative_role text not null default '',
 provenance jsonb not null default '{}'::jsonb, revision integer not null default 1,
 updated_by bigint references users(id), updated_at timestamptz not null default now()
);
create table if not exists agency_contract_templates (
 id bigserial primary key, organization_id bigint not null references organizations(id),
 name text not null, agreement_type text not null default '', body text not null,
 required_fields jsonb not null default '[]'::jsonb, revision integer not null default 1,
 created_by bigint not null references users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists agency_contracts (
 id bigserial primary key, organization_id bigint not null references organizations(id),
 template_id bigint not null references agency_contract_templates(id), template_revision integer not null default 1, title text not null, body text not null,
 required_fields jsonb not null default '[]'::jsonb, variables jsonb not null default '{}'::jsonb, sources jsonb not null default '{}'::jsonb,
 client_id bigint references agency_clients(id), collaborator_id bigint references agency_collaborators(id), bank_account_id bigint references bank_accounts(id),
 contains_bank_data boolean not null default false, revision integer not null default 1,
 created_by bigint not null references users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists agency_contracts_org on agency_contracts(organization_id,id);
create table if not exists agency_contract_versions (
 id bigserial primary key, organization_id bigint not null references organizations(id), contract_id bigint not null references agency_contracts(id),
 version integer not null, title text not null, body text not null, rendered_text text not null,
 variables jsonb not null, sources jsonb not null, template_id bigint not null references agency_contract_templates(id), template_revision integer not null,
 contains_bank_data boolean not null default false, reviewed_by bigint not null references users(id), created_at timestamptz not null default now(),
 unique(contract_id,version)
);
create or replace function protect_issued_contract_version() returns trigger language plpgsql as $$ begin raise exception 'Issued contract versions are immutable'; end $$;
drop trigger if exists issued_contract_immutable on agency_contract_versions;
create trigger issued_contract_immutable before update or delete on agency_contract_versions for each row execute function protect_issued_contract_version();
-- Dedicated contract audit avoids placing document bodies/bank details in generic activity snapshots.
create table if not exists agency_contract_audit (
 id bigserial primary key, organization_id bigint not null references organizations(id), actor_user_id bigint not null references users(id),
 entity_type text not null, entity_id text not null, action text not null, revision integer, created_at timestamptz not null default now()
);

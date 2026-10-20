-- Additive finance management: metadata and idempotent request records never
-- create cash movements themselves. Existing ledger triggers remain authority.
alter table bank_accounts add column if not exists alias text;
alter table bank_accounts add column if not exists holder_tax_id text;
alter table bank_accounts add column if not exists account_subtype text;
alter table bank_accounts add column if not exists revision integer not null default 1;
create table if not exists agency_finance_requests(
 organization_id bigint not null references organizations(id),kind text not null,request_key uuid not null,
 payload jsonb not null,response jsonb not null,status integer not null,created_by bigint references users(id),created_at timestamptz not null default now(),
 primary key(organization_id,kind,request_key)
);
alter table agency_payment_links add column if not exists monthly_income_entry_id bigint references agency_client_monthly_income(id);
alter table agency_payment_links add column if not exists period date;
create table if not exists agency_client_payment_reviews(
 organization_id bigint not null references organizations(id),client_id bigint not null references agency_clients(id),month date not null,
 status text not null check(status in ('pending','reviewed')),note text not null default '',revision integer not null default 1,
 reviewed_by bigint references users(id),reviewed_at timestamptz,
 primary key(organization_id,client_id,month)
);
create table if not exists agency_client_payment_review_events(
 id bigserial primary key,organization_id bigint not null references organizations(id),client_id bigint not null references agency_clients(id),month date not null,
 status text not null,note text not null,revision integer not null,actor_user_id bigint references users(id),created_at timestamptz not null default now()
);
drop trigger if exists immutable_entry on agency_client_payment_review_events;
create trigger immutable_entry before update or delete on agency_client_payment_review_events for each row execute function immutable_finance_entry();

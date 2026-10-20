-- Refs #306. Planning agreements only: these rows never create cash/invoices.
create table if not exists agency_client_monthly_income (
 id bigserial primary key,
 organization_id bigint not null references organizations(id) on delete cascade,
 client_id bigint not null,
 month date not null check(extract(day from month)=1),
 kind text not null check(kind in ('base','extra')),
 label text not null check(length(label) between 1 and 180),
 amount numeric(20,0) not null check(amount>=0 and amount<=9007199254740991),
 currency text not null check(currency in ('PYG','USD','EUR','BRL','ARS','MXN')),
 version integer not null default 1 check(version>0),
 deleted_at timestamptz,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 foreign key(organization_id,client_id) references agency_clients(organization_id,id),
 check(kind='base' or amount>0)
);
create unique index if not exists agency_client_monthly_income_base_unique on agency_client_monthly_income(organization_id,client_id,month,currency) where kind='base' and deleted_at is null;
create index if not exists agency_client_monthly_income_month_idx on agency_client_monthly_income(organization_id,month,client_id) where deleted_at is null;
create unique index if not exists agency_client_monthly_income_tenant_id on agency_client_monthly_income(organization_id,client_id,id);
create table if not exists agency_client_monthly_income_events (
 id bigserial primary key,
 organization_id bigint not null references organizations(id) on delete cascade,
 client_id bigint not null,
 entry_id bigint not null,
 action text not null check(action in ('create','update','delete')),
 request_key uuid not null,
 request_json jsonb not null,
 before_state jsonb,after_state jsonb,
 actor_user_id bigint references users(id) on delete set null,
 reason text not null check(length(reason) between 5 and 1000),
 created_at timestamptz not null default now(),
 foreign key(organization_id,client_id) references agency_clients(organization_id,id),
 unique(organization_id,request_key),
 foreign key(organization_id,client_id,entry_id) references agency_client_monthly_income(organization_id,client_id,id)
);
create index if not exists agency_client_monthly_income_revision_idx on agency_client_monthly_income_events(organization_id,client_id,id desc);
drop trigger if exists agency_client_monthly_income_period on agency_client_monthly_income;
create trigger agency_client_monthly_income_period before insert or update or delete on agency_client_monthly_income for each row execute function guard_agency_finance_period('month');
drop trigger if exists operation_audit on agency_client_monthly_income;
create trigger operation_audit after insert or update or delete on agency_client_monthly_income for each row execute function audit_agency_operation();

-- One canonical amount per client/currency/month shared by balance and forecast.
-- A manual base replaces this month's plan amount in that currency only.
create or replace function agency_client_income_for_month(org bigint,month_on date)
returns table(client_id bigint,currency text,plan_base_amount numeric,manual_base_amount numeric,base_amount numeric,extras_amount numeric,contracted_amount numeric) language sql stable as $$
 with plans as (
  select t.client_id,t.currency,case when t.cadence='monthly' then coalesce(t.recurring_amount,case t.discount_type when 'percent' then t.monthly_price*(1-t.discount_value/100) when 'fixed' then greatest(t.monthly_price-t.discount_value,0) else t.monthly_price end) else 0 end as amount
  from agency_commercial_terms_for_month(org,month_on) t where t.cadence='monthly'
 ), manual as (
  select m.client_id,m.currency,max(m.amount) filter(where kind='base') as base,sum(m.amount) filter(where kind='extra') as extras
  from agency_client_monthly_income m where organization_id=org and month=date_trunc('month',month_on)::date and deleted_at is null group by m.client_id,m.currency
 ), keys as (select p.client_id,p.currency from plans p union select m.client_id,m.currency from manual m)
 select k.client_id,k.currency,coalesce(p.amount,0),m.base,coalesce(m.base,p.amount,0),coalesce(m.extras,0),coalesce(m.base,p.amount,0)+coalesce(m.extras,0)
 from keys k left join plans p on p.client_id=k.client_id and p.currency=k.currency left join manual m on m.client_id=k.client_id and m.currency=k.currency
$$;

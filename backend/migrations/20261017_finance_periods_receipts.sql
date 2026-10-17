-- Refs #228 #229. Existing cash ledger remains the sole movement projection.
create table if not exists agency_finance_periods (
 organization_id bigint not null references organizations(id),month date not null,
 status text not null check(status in ('open','closed')),revision integer not null default 1,
 reason text not null,closed_at timestamptz,reopened_at timestamptz,
 updated_by bigint not null references users(id),snapshot jsonb,
 primary key(organization_id,month),check(extract(day from month)=1)
);
create table if not exists agency_finance_period_events (
 id bigserial primary key,organization_id bigint not null references organizations(id),month date not null,
 action text not null check(action in ('close','reopen')),reason text not null,
 actor_user_id bigint not null references users(id),revision integer not null,snapshot jsonb,
 created_at timestamptz not null default now()
);
create or replace function lock_agency_finance_period(org bigint,on_date date) returns void language plpgsql as $$
begin
 -- The organization lock also prevents a close racing with an older-month
 -- backdate. A closed later snapshot would otherwise change indirectly.
 perform pg_advisory_xact_lock(hashtextextended('finance-periods:'||org,0));
 perform pg_advisory_xact_lock(hashtextextended('finance-period:'||org||':'||to_char(on_date,'YYYY-MM'),0));
end $$;
create or replace function assert_agency_finance_period_open(org bigint,on_date date) returns void language plpgsql as $$
begin
 perform lock_agency_finance_period(org,on_date);
 if exists(select 1 from agency_finance_periods where organization_id=org and status='closed' and month>=date_trunc('month',on_date)::date) then
  raise exception 'El período está cerrado o afecta un cierre posterior. Reabrilo con motivo antes de registrar movimientos.' using errcode='P2290';
 end if;
end $$;
create or replace function guard_agency_finance_period() returns trigger language plpgsql as $$
declare original jsonb;current_row jsonb;
begin
 current_row:=case when tg_op='DELETE' then to_jsonb(old) else to_jsonb(new) end;
 if tg_op='UPDATE' and (to_jsonb(new)-'reference'-'notes')=(to_jsonb(old)-'reference'-'notes') then return new;end if;
 perform assert_agency_finance_period_open((current_row->>'organization_id')::bigint,(current_row->>tg_argv[0])::date);
 if tg_op='UPDATE' then
  original:=to_jsonb(old);
  if original->>tg_argv[0] is distinct from current_row->>tg_argv[0] then
   perform assert_agency_finance_period_open(old.organization_id,(original->>tg_argv[0])::date);
  end if;
 end if;
 return case when tg_op='DELETE' then old else new end;
end $$;
do $$ declare entry text[];begin
 foreach entry slice 1 in array array[
  ['agency_payments','received_on'],['agency_payment_reversals','reversed_on'],['account_transfers','transferred_on'],
  ['agency_expenses','paid_on'],['agency_expense_reversals','reversed_on'],['agency_payouts','paid_on']
 ] loop
  execute format('drop trigger if exists aa_finance_period_guard on %I',entry[1]);
  execute format('create trigger aa_finance_period_guard before insert or update or delete on %I for each row execute function guard_agency_finance_period(%L)',entry[1],entry[2]);
 end loop;
end $$;
alter table agency_payments alter column invoice_id drop not null;
create or replace function guard_agency_payment_insert() returns trigger language plpgsql as $$
declare i agency_invoices%rowtype;a bank_accounts%rowtype;
begin
 if new.invoice_id is not null then
  select * into i from agency_invoices where id=new.invoice_id and organization_id=new.organization_id for update;
  if not found or i.status in ('cancelled','draft') or new.amount>i.total-i.paid_amount then raise exception 'Invalid outstanding balance';end if;
 end if;
 select * into a from bank_accounts where id=new.account_id and organization_id=new.organization_id and active=true for update;
 if not found or new.invoice_id is not null and a.currency<>i.currency then raise exception 'Invalid payment account';end if;
 return new;
end $$;
alter table agency_expenses add column if not exists request_key text;
create unique index if not exists expenses_request_unique on agency_expenses(organization_id,request_key) where request_key is not null;
create table if not exists agency_payment_links (
 organization_id bigint not null references organizations(id),payment_id bigint primary key references agency_payments(id),
 client_id bigint references agency_clients(id),project_id bigint references agency_projects(id),plan_id bigint references agency_plans(id),
 revision integer not null default 1,updated_by bigint not null references users(id),updated_at timestamptz not null default now()
);
create table if not exists agency_account_openings (
 id bigserial primary key,organization_id bigint not null references organizations(id),account_id bigint not null unique references bank_accounts(id),
 amount numeric(14,2) not null check(amount>0),opened_on date not null,reason text not null,
 request_key text not null,created_by bigint not null references users(id),created_at timestamptz not null default now(),unique(organization_id,request_key)
);
create or replace function sync_agency_account_opening() returns trigger language plpgsql as $$
declare a bank_accounts%rowtype;
begin
 if tg_op<>'INSERT' then raise exception 'Account openings are immutable';end if;
 select * into a from bank_accounts where id=new.account_id and organization_id=new.organization_id and active=true for update;
 if not found or a.balance<>0 or exists(select 1 from agency_cash_movements where organization_id=new.organization_id and account_id=new.account_id) then raise exception 'La apertura requiere una cuenta sin saldo ni movimientos anteriores' using errcode='P2280';end if;
 update bank_accounts set balance=balance+new.amount,updated_at=now() where id=a.id;return new;
end $$;
drop trigger if exists aa_finance_period_guard on agency_account_openings;
create trigger aa_finance_period_guard before insert or update or delete on agency_account_openings for each row execute function guard_agency_finance_period('opened_on');
drop trigger if exists account_opening_sync on agency_account_openings;
create trigger account_opening_sync before insert or update or delete on agency_account_openings for each row execute function sync_agency_account_opening();
create or replace view agency_cash_movements as
 select p.organization_id,p.account_id,'payment'::text as movement_type,p.id as movement_id,p.received_on as booked_on,p.amount,coalesce(p.reference,'') as reference from agency_payments p
 union all select r.organization_id,p.account_id,'reversal',r.id,r.reversed_on,-p.amount,r.reason from agency_payment_reversals r join agency_payments p on p.id=r.payment_id
 union all select t.organization_id,t.from_account_id,'transfer_out',t.id,t.transferred_on,-t.amount,coalesce(t.reference,'') from account_transfers t
 union all select t.organization_id,t.to_account_id,'transfer_in',t.id,t.transferred_on,coalesce(t.received_amount,t.amount),coalesce(t.reference,'') from account_transfers t
 union all select p.organization_id,p.account_id,'payout',p.id,p.paid_on,-p.amount,p.reference from agency_payouts p
 union all select e.organization_id,e.account_id,'expense',e.id,e.paid_on,-e.amount,e.reference from agency_expenses e
 union all select r.organization_id,e.account_id,'expense_reversal',r.id,r.reversed_on,e.amount,r.reason from agency_expense_reversals r join agency_expenses e on e.id=r.expense_id
 union all select o.organization_id,o.account_id,'opening',o.id,o.opened_on,o.amount,o.reason from agency_account_openings o;
create table if not exists agency_opening_receivables (
 id bigserial primary key,organization_id bigint not null references organizations(id),client_id bigint not null references agency_clients(id),
 amount numeric(14,2) not null check(amount>0),currency text not null,period date not null,due_on date not null,
 reason text not null,expected_on date,forecast_included boolean not null default true,request_key text,
 created_by bigint not null references users(id),created_at timestamptz not null default now(),
 check(extract(day from period)=1)
);
create unique index if not exists opening_receivables_request_unique on agency_opening_receivables(organization_id,request_key) where request_key is not null;
create table if not exists agency_payment_applications (
 id bigserial primary key,organization_id bigint not null references organizations(id),payment_id bigint not null references agency_payments(id),
 invoice_id bigint references agency_invoices(id),receivable_id bigint references agency_opening_receivables(id),
 amount numeric(14,2) not null check(amount>0),request_key text,
 created_by bigint not null references users(id),created_at timestamptz not null default now(),
 check((invoice_id is null)<>(receivable_id is null))
);
create unique index if not exists payment_applications_request_unique on agency_payment_applications(organization_id,request_key) where request_key is not null;
create index if not exists payment_applications_receipt_idx on agency_payment_applications(organization_id,payment_id);
create index if not exists payment_applications_invoice_idx on agency_payment_applications(organization_id,invoice_id) where invoice_id is not null;
create index if not exists payment_applications_debt_idx on agency_payment_applications(organization_id,receivable_id) where receivable_id is not null;
create index if not exists opening_receivables_forecast_idx on agency_opening_receivables(organization_id,expected_on) where forecast_included=true;
create table if not exists agency_payment_application_reversals (
 id bigserial primary key,organization_id bigint not null references organizations(id),application_id bigint not null unique references agency_payment_applications(id),
 reason text not null,created_by bigint not null references users(id),created_at timestamptz not null default now()
);
create table if not exists agency_payment_date_corrections (
 id bigserial primary key,organization_id bigint not null references organizations(id),
 original_payment_id bigint not null unique references agency_payments(id),replacement_payment_id bigint not null unique references agency_payments(id),
 previous_date date not null,corrected_date date not null,reason text not null,request_key text not null,
 created_by bigint not null references users(id),created_at timestamptz not null default now(),unique(organization_id,request_key)
);
create or replace view agency_active_payment_applications as
 select a.* from agency_payment_applications a join agency_payments p on p.id=a.payment_id and p.organization_id=a.organization_id
 where not exists(select 1 from agency_payment_reversals r where r.payment_id=p.id)
 and not exists(select 1 from agency_payment_application_reversals r where r.application_id=a.id);
create or replace view agency_opening_receivable_balances as
 select d.*,coalesce(a.paid_amount,0) as paid_amount,d.amount-coalesce(a.paid_amount,0) as outstanding_amount
 from agency_opening_receivables d left join lateral(select sum(a.amount) as paid_amount from agency_active_payment_applications a where a.receivable_id=d.id and a.organization_id=d.organization_id) a on true;
create or replace function refresh_agency_invoice_receipts(org bigint,invoice_key bigint) returns void language plpgsql as $$
declare paid numeric(14,2);
begin
 if invoice_key is null then return;end if;
 perform id from agency_invoices where id=invoice_key and organization_id=org for update;
 select coalesce(sum(amount),0) into paid from (
  select p.amount from agency_payments p where p.organization_id=org and p.invoice_id=invoice_key and not exists(select 1 from agency_payment_reversals r where r.payment_id=p.id)
  union all select a.amount from agency_active_payment_applications a where a.organization_id=org and a.invoice_id=invoice_key
 ) all_paid;
 update agency_invoices set paid_amount=paid,status=case when paid>=total then 'paid' when paid>0 then 'partial' else 'issued' end,updated_at=now() where organization_id=org and id=invoice_key;
end $$;
create or replace function sync_agency_payment() returns trigger language plpgsql as $$
begin
 if tg_op<>'INSERT' then raise exception 'Receipts are immutable; register a reversal';end if;
 update bank_accounts set balance=balance+new.amount,updated_at=now() where id=new.account_id and organization_id=new.organization_id;
 perform refresh_agency_invoice_receipts(new.organization_id,new.invoice_id);
 return new;
end $$;
create or replace function sync_payment_reversal() returns trigger language plpgsql as $$
declare p agency_payments%rowtype;a bank_accounts%rowtype;target record;
begin
 if tg_op<>'INSERT' then raise exception 'Reversals are immutable';end if;
 select * into p from agency_payments where id=new.payment_id and organization_id=new.organization_id for update;
 if not found then raise exception 'Invalid receipt';end if;
 select * into a from bank_accounts where id=p.account_id and organization_id=p.organization_id for update;
 if a.balance<p.amount then raise exception 'Insufficient balance to reverse receipt';end if;
 update bank_accounts set balance=balance-p.amount,updated_at=now() where id=a.id;
 perform refresh_agency_invoice_receipts(p.organization_id,p.invoice_id);
 for target in select distinct invoice_id from agency_payment_applications where payment_id=p.id and invoice_id is not null order by invoice_id loop
  perform refresh_agency_invoice_receipts(p.organization_id,target.invoice_id);
 end loop;
 return new;
end $$;
create or replace function sync_agency_payment_application() returns trigger language plpgsql as $$
declare p agency_payments%rowtype;target_currency text;target_client bigint;pending numeric;used numeric;linked_client bigint;
begin
 if tg_op<>'INSERT' then raise exception 'Applications are immutable; register a reversal';end if;
 select * into p from agency_payments where id=new.payment_id and organization_id=new.organization_id for update;
 if not found or p.invoice_id is not null or exists(select 1 from agency_payment_reversals where payment_id=p.id) then raise exception 'El cobro no está disponible para aplicar' using errcode='P2280';end if;
 select coalesce(sum(amount),0) into used from agency_active_payment_applications where payment_id=p.id;
 if used+new.amount>p.amount then raise exception 'La aplicación supera el importe disponible del cobro' using errcode='P2280';end if;
 if new.invoice_id is not null then
  select currency,client_id,total-paid_amount into target_currency,target_client,pending from agency_invoices where id=new.invoice_id and organization_id=new.organization_id and status not in ('draft','cancelled') for update;
 else
  perform id from agency_opening_receivables where id=new.receivable_id and organization_id=new.organization_id for update;
  select currency,client_id,outstanding_amount into target_currency,target_client,pending from agency_opening_receivable_balances where id=new.receivable_id and organization_id=new.organization_id;
 end if;
 if pending is null or pending<new.amount then raise exception 'La aplicación supera el pendiente del documento' using errcode='P2280';end if;
 if not exists(select 1 from bank_accounts where id=p.account_id and organization_id=p.organization_id and currency=target_currency) then raise exception 'La moneda del cobro y la deuda deben coincidir' using errcode='P2280';end if;
 select client_id into linked_client from agency_payment_links where payment_id=p.id and organization_id=p.organization_id;
 if linked_client is not null and linked_client<>target_client or exists(
  select 1 from agency_active_payment_applications a left join agency_invoices i on i.id=a.invoice_id left join agency_opening_receivables d on d.id=a.receivable_id
  where a.payment_id=p.id and coalesce(i.client_id,d.client_id)<>target_client
 ) then raise exception 'El cliente de la aplicación no coincide con el cobro' using errcode='P2280';end if;
 return new;
end $$;
create or replace function after_agency_payment_application() returns trigger language plpgsql as $$
begin
 perform refresh_agency_invoice_receipts(new.organization_id,new.invoice_id);return new;
end $$;
drop trigger if exists payment_application_guard on agency_payment_applications;
create trigger payment_application_guard before insert or update or delete on agency_payment_applications for each row execute function sync_agency_payment_application();
drop trigger if exists payment_application_sync on agency_payment_applications;
create trigger payment_application_sync after insert on agency_payment_applications for each row execute function after_agency_payment_application();
create or replace function sync_payment_application_reversal() returns trigger language plpgsql as $$
declare a agency_payment_applications%rowtype;
begin
 if tg_op<>'INSERT' then raise exception 'Application reversals are immutable';end if;
 select * into a from agency_payment_applications where id=new.application_id and organization_id=new.organization_id;
 if not found then raise exception 'Aplicación no encontrada' using errcode='P2280';end if;
 perform id from agency_payments where id=a.payment_id for update;
 perform refresh_agency_invoice_receipts(a.organization_id,a.invoice_id);return new;
end $$;
drop trigger if exists payment_application_reversal_sync on agency_payment_application_reversals;
create trigger payment_application_reversal_sync after insert or update or delete on agency_payment_application_reversals for each row execute function sync_payment_application_reversal();
create or replace function immutable_finance_entry() returns trigger language plpgsql as $$
begin
 if tg_op<>'INSERT' then raise exception 'Financial entries are immutable';end if;return new;
end $$;
do $$ declare t text;begin
 foreach t in array array['agency_opening_receivables','agency_finance_period_events','agency_payment_date_corrections'] loop
  execute format('drop trigger if exists immutable_entry on %I',t);
  execute format('create trigger immutable_entry before update or delete on %I for each row execute function immutable_finance_entry()',t);
 end loop;
 foreach t in array array['agency_payment_links','agency_payment_applications','agency_payment_application_reversals','agency_opening_receivables','agency_finance_periods','agency_finance_period_events','agency_payment_date_corrections','agency_account_openings'] loop
  execute format('drop trigger if exists operation_audit on %I',t);
  execute format('create trigger operation_audit after insert or update or delete on %I for each row execute function audit_agency_operation()',t);
 end loop;
end $$;
-- Same projection used by aging: imported debt is an obligation, never an invoice.
create or replace view client_payment_status as
with obligations as (
 select organization_id,client_id,currency,greatest(total-paid_amount,0) as outstanding,case when total>paid_amount then due_on else null end as due_on from agency_invoices where status not in ('draft','cancelled')
 union all select organization_id,client_id,currency,outstanding_amount,case when outstanding_amount>0 then due_on else null end from agency_opening_receivable_balances
)
select c.organization_id,c.id as client_id,c.name as client_name,o.currency,
 coalesce(sum(o.outstanding),0) as outstanding_amount,min(o.due_on) as next_due_on,
 greatest(0,coalesce((now() at time zone 'America/Asuncion')::date-min(o.due_on),0))::int as days_overdue,
 case when min(o.due_on)<(now() at time zone 'America/Asuncion')::date-30 then 'severe'
 when min(o.due_on)<(now() at time zone 'America/Asuncion')::date then 'late'
 when min(o.due_on)<=(now() at time zone 'America/Asuncion')::date+7 then 'due_soon' else 'up_to_date' end as payment_status,
 (select count(*)::int from agency_invoices i where i.organization_id=c.organization_id and i.client_id=c.id and i.currency is not distinct from o.currency and i.status not in ('draft','cancelled')) as invoice_count,
 exists(select 1 from agency_invoices i where i.organization_id=c.organization_id and i.client_id=c.id and i.currency is not distinct from o.currency and i.status not in ('draft','cancelled')) as has_invoice
from agency_clients c left join obligations o on o.client_id=c.id and o.organization_id=c.organization_id group by c.organization_id,c.id,c.name,o.currency;

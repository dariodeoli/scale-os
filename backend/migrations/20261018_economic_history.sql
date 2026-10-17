-- Preserve all legacy integers while allowing the same cent precision as the
-- compensation base when an explicit monthly salary is edited. No view depends
-- on this column; salary snapshots retain both fields.
alter table agency_collaborators alter column monthly_salary_amount type numeric(22,2) using monthly_salary_amount::numeric(22,2);

-- Salary observations are distinct from dated agreements. Legacy baselines do
-- not claim that today's salary was historically agreed on the employment date.
create table if not exists agency_salary_history (
 id bigserial primary key,
 organization_id bigint not null references organizations(id),
 collaborator_id bigint not null,
 foreign key(collaborator_id,organization_id) references agency_collaborators(id,organization_id),
 effective_from date,
 before_state jsonb,
 after_state jsonb not null,
 reason text not null,
 source text not null check(source in ('legacy-baseline','profile','salary-change')),
 actor_user_id bigint,
 request_key text,
 created_at timestamptz not null default clock_timestamp(),
 check(effective_from is null or effective_from=date_trunc('month',effective_from)::date)
);
create unique index if not exists agency_salary_history_request_idx on agency_salary_history(organization_id,request_key) where request_key is not null;
create unique index if not exists agency_salary_history_baseline_idx on agency_salary_history(organization_id,collaborator_id) where source='legacy-baseline';
create index if not exists agency_salary_history_effective_idx on agency_salary_history(organization_id,collaborator_id,effective_from desc,id desc);
insert into agency_salary_history(organization_id,collaborator_id,after_state,reason,source)
 select organization_id,id,jsonb_build_object('amount',compensation_amount::text,'currency',currency,'compensation_type',compensation_type,'monthly_salary_amount',monthly_salary_amount::text,'monthly_salary_currency',monthly_salary_currency),
 'Valor observado al habilitar el historial; vigencia anterior desconocida','legacy-baseline'
 from agency_collaborators c where not exists(select 1 from agency_salary_history h where h.organization_id=c.organization_id and h.collaborator_id=c.id);

create or replace function guard_agency_salary_history() returns trigger language plpgsql as $$
begin
 raise exception 'Salary history is append-only' using errcode='23514';
end $$;
drop trigger if exists agency_salary_history_immutable on agency_salary_history;
create trigger agency_salary_history_immutable before update or delete on agency_salary_history for each row execute function guard_agency_salary_history();

create or replace function record_agency_salary_history() returns trigger language plpgsql as $$
declare prior jsonb; next_state jsonb; effective date; actor text;
begin
 next_state=jsonb_build_object('amount',new.compensation_amount::text,'currency',new.currency,'compensation_type',new.compensation_type,'monthly_salary_amount',new.monthly_salary_amount::text,'monthly_salary_currency',new.monthly_salary_currency);
 if tg_op='UPDATE' then
  prior=jsonb_build_object('amount',old.compensation_amount::text,'currency',old.currency,'compensation_type',old.compensation_type,'monthly_salary_amount',old.monthly_salary_amount::text,'monthly_salary_currency',old.monthly_salary_currency);
  if prior=next_state then return new; end if;
 end if;
 effective=coalesce(nullif(current_setting('app.salary_effective_from',true), '')::date,
  date_trunc('month',(clock_timestamp() at time zone 'America/Asuncion')::date)::date);
 perform assert_agency_finance_period_open(new.organization_id,effective);
 if tg_op='UPDATE' then
  if exists(select 1 from agency_salary_history h where h.organization_id=new.organization_id and h.collaborator_id=new.id and h.effective_from>effective) then
   raise exception 'A later salary agreement already exists' using errcode='P2290';
  end if;
 end if;
 actor=current_setting('app.current_user',true);
 insert into agency_salary_history(organization_id,collaborator_id,effective_from,before_state,after_state,reason,source,actor_user_id,request_key)
 values(new.organization_id,new.id,effective,prior,next_state,
 coalesce(nullif(current_setting('app.salary_reason',true),''),'Actualización desde ficha; motivo no registrado'),
 case when nullif(current_setting('app.salary_request_key',true),'') is null then 'profile' else 'salary-change' end,
 case when actor ~ '^[1-9][0-9]*$' and exists(select 1 from users where id=actor::bigint) then actor::bigint else null end,
 nullif(current_setting('app.salary_request_key',true),''));
 return new;
end $$;
drop trigger if exists agency_salary_history_record on agency_collaborators;
create trigger agency_salary_history_record after insert or update on agency_collaborators for each row execute function record_agency_salary_history();

-- Snapshot lookup keeps an unknown legacy baseline explicitly unknown. A later
-- change never replaces the amount used by earlier months.
create or replace function agency_salary_at(org bigint,person bigint,on_date date) returns jsonb language sql stable as $$
 select after_state||jsonb_build_object('amount',coalesce(after_state->>'monthly_salary_amount',after_state->>'amount'),'currency',coalesce(after_state->>'monthly_salary_currency',after_state->>'currency'),'history_known',effective_from is not null,'effective_from',effective_from)
 from agency_salary_history where organization_id=org and collaborator_id=person
 and (effective_from<=on_date or source='legacy-baseline')
 order by effective_from desc nulls last,id desc limit 1
$$;

alter table agency_client_commercial_terms add column if not exists change_reason text;
alter table agency_client_commercial_terms add column if not exists changed_by_user_id bigint;
alter table agency_client_commercial_terms add column if not exists request_key text;
create unique index if not exists agency_client_terms_request_idx on agency_client_commercial_terms(organization_id,request_key) where request_key is not null;
-- Old reporting rows are retained. New edits close and append them instead of
-- changing their plan or price. Lifecycle's existing guard still governs closure.
create or replace function guard_agency_commercial_economics() returns trigger language plpgsql as $$
begin
 if (to_jsonb(new)-array['effective_until','ends_on','closed_at','version','updated_at']) is distinct from (to_jsonb(old)-array['effective_until','ends_on','closed_at','version','updated_at']) then
  raise exception 'Commercial economics are immutable; append an agreement' using errcode='23514';
 end if;
 return new;
end $$;
drop trigger if exists agency_commercial_economics_immutable on agency_client_commercial_terms;
create trigger agency_commercial_economics_immutable before update on agency_client_commercial_terms for each row execute function guard_agency_commercial_economics();

create or replace function record_agency_commercial_change() returns trigger language plpgsql as $$
declare actor text;
begin
 perform assert_agency_finance_period_open(new.organization_id,coalesce(new.effective_from,new.starts_on));
 new.change_reason=coalesce(new.change_reason,nullif(current_setting('app.commercial_reason',true),''));
 actor=current_setting('app.current_user',true);
 if actor ~ '^[1-9][0-9]*$' and exists(select 1 from users where id=actor::bigint) then new.changed_by_user_id=coalesce(new.changed_by_user_id,actor::bigint);end if;
 return new;
end $$;
drop trigger if exists agency_commercial_change_record on agency_client_commercial_terms;
create trigger agency_commercial_change_record before insert on agency_client_commercial_terms for each row execute function record_agency_commercial_change();
drop trigger if exists operation_audit on agency_salary_month_overrides;
create trigger operation_audit after insert or update or delete on agency_salary_month_overrides for each row execute function audit_agency_operation();
drop trigger if exists agency_salary_override_period on agency_salary_month_overrides;
create or replace function guard_agency_salary_override_period() returns trigger language plpgsql as $$
begin
 if tg_op='UPDATE' and (to_jsonb(new)-array['note','updated_at'])=(to_jsonb(old)-array['note','updated_at']) then return new;end if;
 if tg_op<>'DELETE' then perform assert_agency_finance_period_open(new.organization_id,new.month);end if;
 if tg_op<>'INSERT' then perform assert_agency_finance_period_open(old.organization_id,old.month);end if;
 return case when tg_op='DELETE' then old else new end;
end $$;
create trigger agency_salary_override_period before insert or update or delete on agency_salary_month_overrides for each row execute function guard_agency_salary_override_period();

-- One closing-month agreement per client, even if several amendments overlap
-- the queried month. The amount is an agreement snapshot, never a proration.
create or replace function agency_commercial_terms_for_month(org bigint,month_on date) returns setof agency_client_commercial_terms language sql stable as $$
 select distinct on(client_id) t.* from agency_client_commercial_terms t
 where organization_id=org and coalesce(effective_from,starts_on)<(date_trunc('month',month_on)+interval '1 month')::date
 and (coalesce(effective_until,ends_on) is null or coalesce(effective_until,ends_on)>=date_trunc('month',month_on)::date)
 order by client_id,coalesce(effective_from,starts_on) desc,id desc
$$;

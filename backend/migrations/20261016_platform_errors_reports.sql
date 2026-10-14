-- Errores agrupados por huella y reportes de usuarios para el panel global.
-- Aditiva, idempotente y re-ejecutable. Nunca guarda PII: la muestra se limpia
-- antes de escribir (sin query strings, correos, tokens, cookies ni encabezados
-- de autorización) y se trunca.
create table if not exists platform_error_groups(
 id bigserial primary key,
 fingerprint text not null,
 source text not null,
 message text not null,
 route text,
 sample_stack text,
 sample_meta jsonb not null default '{}'::jsonb,
 occurrences integer not null default 1,
 first_seen_at timestamptz not null default now(),
 last_seen_at timestamptz not null default now(),
 status text not null default 'new',
 resolved_by bigint references users(id) on delete set null,
 resolved_at timestamptz,
 updated_at timestamptz not null default now()
);
do $$ begin
 if not exists(select 1 from pg_constraint where conname='platform_error_groups_source_check') then
  alter table platform_error_groups add constraint platform_error_groups_source_check check(source in('api','web'));
 end if;
 if not exists(select 1 from pg_constraint where conname='platform_error_groups_status_check') then
  alter table platform_error_groups add constraint platform_error_groups_status_check check(status in('new','resolved','ignored'));
 end if;
end $$;
create unique index if not exists platform_error_groups_fingerprint_idx on platform_error_groups(fingerprint);
create index if not exists platform_error_groups_last_seen_idx on platform_error_groups(last_seen_at desc,id desc);
create index if not exists platform_error_groups_status_idx on platform_error_groups(status,last_seen_at desc);

create table if not exists platform_user_reports(
 id bigserial primary key,
 user_id bigint references users(id) on delete set null,
 organization_id bigint references organizations(id) on delete set null,
 category text not null,
 message text not null,
 route text,
 app_version text,
 status text not null default 'new',
 note text,
 handled_by bigint references users(id) on delete set null,
 handled_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
do $$ begin
 if not exists(select 1 from pg_constraint where conname='platform_user_reports_status_check') then
  alter table platform_user_reports add constraint platform_user_reports_status_check check(status in('new','in_progress','resolved'));
 end if;
 if not exists(select 1 from pg_constraint where conname='platform_user_reports_category_check') then
  alter table platform_user_reports add constraint platform_user_reports_category_check check(category in('error','datos','lentitud','sugerencia','otro'));
 end if;
end $$;
create index if not exists platform_user_reports_created_idx on platform_user_reports(created_at desc,id desc);
create index if not exists platform_user_reports_status_idx on platform_user_reports(status,created_at desc);
create index if not exists platform_user_reports_user_idx on platform_user_reports(user_id,created_at desc);

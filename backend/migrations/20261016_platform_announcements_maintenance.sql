-- Comunicados de la plataforma y modo mantenimiento (panel global, segunda etapa).
-- Aditiva, idempotente y re-ejecutable: solo crea tablas, restricciones e índices
-- que falten. Los textos se guardan planos (sin HTML); la UI los escapa.
create table if not exists platform_announcements(
 id bigserial primary key,
 title text not null,
 message text not null,
 kind text not null default 'info',
 priority smallint not null default 3,
 organization_id bigint references organizations(id) on delete cascade,
 starts_at timestamptz not null default now(),
 ends_at timestamptz,
 published_at timestamptz,
 created_by bigint references users(id) on delete set null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
do $$ begin
 if not exists(select 1 from pg_constraint where conname='platform_announcements_title_check') then
  alter table platform_announcements add constraint platform_announcements_title_check check(char_length(title) between 1 and 80);
 end if;
 if not exists(select 1 from pg_constraint where conname='platform_announcements_message_check') then
  alter table platform_announcements add constraint platform_announcements_message_check check(char_length(message) between 1 and 500);
 end if;
 if not exists(select 1 from pg_constraint where conname='platform_announcements_kind_check') then
  alter table platform_announcements add constraint platform_announcements_kind_check check(kind in('info','aviso','novedad'));
 end if;
 if not exists(select 1 from pg_constraint where conname='platform_announcements_priority_check') then
  alter table platform_announcements add constraint platform_announcements_priority_check check(priority between 1 and 5);
 end if;
 if not exists(select 1 from pg_constraint where conname='platform_announcements_window_check') then
  alter table platform_announcements add constraint platform_announcements_window_check check(ends_at is null or ends_at>starts_at);
 end if;
end $$;
create index if not exists platform_announcements_active_idx on platform_announcements(priority,starts_at desc) where published_at is not null;
create index if not exists platform_announcements_created_idx on platform_announcements(created_at desc,id desc);

-- Lectura única por persona y comunicado (cerrar el banner).
create table if not exists platform_announcement_reads(
 announcement_id bigint not null references platform_announcements(id) on delete cascade,
 user_id bigint not null references users(id) on delete cascade,
 read_at timestamptz not null default now(),
 primary key(announcement_id,user_id)
);
create index if not exists platform_announcement_reads_user_idx on platform_announcement_reads(user_id);

-- Ajustes globales de la plataforma (clave → jsonb). Hoy: `maintenance`.
create table if not exists platform_settings(
 key text primary key,
 value jsonb not null default '{}'::jsonb,
 updated_by bigint references users(id) on delete set null,
 updated_at timestamptz not null default now()
);
do $$ begin
 if not exists(select 1 from pg_constraint where conname='platform_settings_key_check') then
  alter table platform_settings add constraint platform_settings_key_check check(key ~ '^[a-z][a-z0-9_]{1,60}$');
 end if;
end $$;

-- Panel de uso de plataforma (#191): consultas por rango global de fechas, sin organización.
-- Aditiva e idempotente; la guarda cubre fixtures que no cargan la tabla de presencia.
do $$
begin
 if to_regclass('agency_usage_sessions') is not null then
  create index if not exists agency_usage_first_seen on agency_usage_sessions(first_seen_at);
  create index if not exists agency_usage_last_seen on agency_usage_sessions(last_seen_at desc);
  create index if not exists agency_usage_user_recent on agency_usage_sessions(user_id,last_seen_at desc);
 end if;
 create index if not exists users_created_at_idx on users(created_at);
 create index if not exists organizations_created_at_idx on organizations(created_at);
end $$;

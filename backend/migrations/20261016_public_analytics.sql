-- Analítica de primera parte de la web pública y de la demo (panel global «Tráfico y demos»).
-- Aditiva, idempotente y re-ejecutable. Sin PII: nunca guarda IP, correo, query
-- string, token ni user agent. El visitante es un id aleatorio que el navegador
-- renueva cada día (landing) o un hash con sal de la demo (servidor). Sin claves
-- foráneas a organizaciones: la limpieza de demos vencidas no borra la historia.
create table if not exists public_page_views(
 id bigserial primary key,
 surface text not null,
 path text not null,
 visitor text not null,
 view_id text not null,
 referrer_domain text,
 is_mobile boolean not null default false,
 seconds integer,
 scroll_pct smallint,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table if not exists public_analytics_events(
 id bigserial primary key,
 surface text not null,
 event text not null,
 visitor text not null,
 label text,
 path text,
 created_at timestamptz not null default now()
);
do $$ begin
 if not exists(select 1 from pg_constraint where conname='public_page_views_surface_check') then
  alter table public_page_views add constraint public_page_views_surface_check check(surface in('landing','demo'));
 end if;
 if not exists(select 1 from pg_constraint where conname='public_page_views_seconds_check') then
  alter table public_page_views add constraint public_page_views_seconds_check check(seconds is null or seconds between 0 and 1800);
 end if;
 if not exists(select 1 from pg_constraint where conname='public_page_views_scroll_check') then
  alter table public_page_views add constraint public_page_views_scroll_check check(scroll_pct is null or scroll_pct between 0 and 100);
 end if;
 if not exists(select 1 from pg_constraint where conname='public_page_views_path_check') then
  alter table public_page_views add constraint public_page_views_path_check check(length(path) between 1 and 120 and path not like '%?%' and path not like '%#%');
 end if;
 if not exists(select 1 from pg_constraint where conname='public_analytics_events_surface_check') then
  alter table public_analytics_events add constraint public_analytics_events_surface_check check(surface in('landing','demo'));
 end if;
 if not exists(select 1 from pg_constraint where conname='public_analytics_events_event_check') then
  alter table public_analytics_events add constraint public_analytics_events_event_check check(event in('cta_click','demo_start','demo_role'));
 end if;
end $$;
create unique index if not exists public_page_views_view_idx on public_page_views(surface,view_id);
create index if not exists public_page_views_created_idx on public_page_views(surface,created_at);
create index if not exists public_analytics_events_created_idx on public_analytics_events(surface,event,created_at);

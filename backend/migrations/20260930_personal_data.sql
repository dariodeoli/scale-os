-- PDP — Ley N° 7593/2025 (scale-os#112): consentimientos verificables, derechos
-- del titular (ARSOP + portabilidad), bitácora de accesos a datos personales,
-- corridas de retención y marcas de bloqueo por supresión.
-- Aditiva, idempotente y re-ejecutable.
create table if not exists personal_data_consents (
  id bigserial primary key,
  organization_id bigint not null references organizations(id) on delete cascade,
  subject_kind text not null check (subject_kind in ('user','client','lead','portal_user')),
  subject_id text not null,
  purpose text not null,
  basis text not null default 'consent' check (basis in ('consent','contract','legal_obligation','vital_interests','public_interest','legitimate_interest')),
  notice_version text not null,
  source text not null,
  granted_at timestamptz not null default now(),
  granted_by_user_id bigint references users(id) on delete set null,
  evidence jsonb not null default '{}'::jsonb,
  revoked_at timestamptz,
  revoked_by_user_id bigint references users(id) on delete set null,
  revoke_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- Un solo consentimiento vigente por titular y finalidad: otorgar de nuevo
-- actualiza la evidencia; revocar libera la clave para volver a otorgar.
create unique index if not exists personal_data_consents_active_key
  on personal_data_consents(organization_id,subject_kind,subject_id,purpose) where revoked_at is null;
create index if not exists personal_data_consents_subject_idx
  on personal_data_consents(organization_id,subject_kind,subject_id,created_at desc);

create table if not exists personal_data_requests (
  id bigserial primary key,
  organization_id bigint not null references organizations(id) on delete cascade,
  subject_kind text not null check (subject_kind in ('user','client','lead','portal_user','other')),
  subject_id text,
  subject_name text not null,
  subject_email text,
  request_type text not null check (request_type in ('access','portability','rectification','suppression','opposition')),
  status text not null default 'received' check (status in ('received','identity_verified','in_review','resolved','rejected','cancelled')),
  details text,
  resolution text,
  rejection_reason text,
  resolution_action text check (resolution_action in ('export_delivered','corrected','opposed','blocked','anonymized','none')),
  source text not null default 'team',
  received_at timestamptz not null default now(),
  due_at timestamptz not null default now() + interval '30 days',
  identity_verified_at timestamptz,
  resolved_at timestamptz,
  created_by_user_id bigint references users(id) on delete set null,
  handled_by_user_id bigint references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists personal_data_requests_queue_idx
  on personal_data_requests(organization_id,status,due_at);
create index if not exists personal_data_requests_subject_idx
  on personal_data_requests(organization_id,subject_kind,subject_id,created_at desc);

-- Quién vio o exportó datos personales. El detalle nunca guarda el contenido
-- exportado: solo la referencia de la operación.
create table if not exists personal_data_access_log (
  id bigserial primary key,
  organization_id bigint not null references organizations(id) on delete cascade,
  actor_kind text not null check (actor_kind in ('user','portal_user','system')),
  actor_user_id bigint,
  actor_label text,
  action text not null,
  subject_kind text,
  subject_id text,
  context text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists personal_data_access_log_org_idx
  on personal_data_access_log(organization_id,created_at desc);
create index if not exists personal_data_access_log_subject_idx
  on personal_data_access_log(organization_id,subject_kind,subject_id,created_at desc);

create table if not exists personal_data_retention_runs (
  id bigserial primary key,
  mode text not null check (mode in ('report','execute')),
  results jsonb not null default '[]'::jsonb,
  candidates integer not null default 0,
  affected integer not null default 0,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

-- Marcas de bloqueo por supresión: la fila se conserva (obligaciones fiscales
-- y trazabilidad) pero deja de tratarse como dato de contacto vivo.
-- Toleran fixtures que no cargan la tabla base (mismo patrón que las
-- migraciones de avisos de suscripción).
do $$ begin
 if exists(select 1 from information_schema.tables where table_schema='public' and table_name='agency_clients') then
  alter table agency_clients add column if not exists personal_data_blocked_at timestamptz;
 end if;
 if exists(select 1 from information_schema.tables where table_schema='public' and table_name='agency_leads') then
  alter table agency_leads add column if not exists personal_data_blocked_at timestamptz;
 end if;
 if exists(select 1 from information_schema.tables where table_schema='public' and table_name='client_portal_users') then
  alter table client_portal_users add column if not exists personal_data_blocked_at timestamptz;
 end if;
 if exists(select 1 from information_schema.tables where table_schema='public' and table_name='organization_members') then
  alter table organization_members add column if not exists personal_data_blocked_at timestamptz;
 end if;
end $$;

-- SSO Fase 2A (#159): proveedores OIDC por organización, dominios de correo
-- verificados por DNS TXT y bitácora de accesos SSO. Aditiva, idempotente y
-- re-ejecutable. El flujo reutiliza oauth_states (PKCE/nonce) y oauth_handoffs
-- de la Fase 1.
create table if not exists organization_identity_providers (
  id bigserial primary key,
  organization_id bigint not null references organizations(id) on delete cascade,
  kind text not null default 'oidc' check (kind in ('oidc')),
  issuer text not null,
  client_id text not null,
  client_secret text not null,
  discovery_url text,
  active boolean not null default true,
  created_by_user_id bigint references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, issuer)
);
create index if not exists organization_identity_providers_org_idx on organization_identity_providers(organization_id, active);

-- El dominio es único a nivel global: una empresa no puede reclamar el dominio
-- de otra. Se guarda en minúsculas, sin protocolo ni puntos extremos.
create table if not exists organization_email_domains (
  id bigserial primary key,
  organization_id bigint not null references organizations(id) on delete cascade,
  domain text not null unique check (domain=lower(domain) and length(domain) between 4 and 253),
  verification_token text not null,
  verified_at timestamptz,
  verification_method text,
  created_by_user_id bigint references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists organization_email_domains_org_idx on organization_email_domains(organization_id);

-- Auditoría de altas/bajas y accesos por organización (evaluación Fase 2A).
create table if not exists organization_sso_events (
  id bigserial primary key,
  organization_id bigint not null references organizations(id) on delete cascade,
  provider_id bigint references organization_identity_providers(id) on delete set null,
  user_id bigint references users(id) on delete set null,
  event text not null check (event in ('login','jit_created','linked','error')),
  email text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists organization_sso_events_org_idx on organization_sso_events(organization_id, created_at desc);
create index if not exists organization_sso_events_provider_idx on organization_sso_events(provider_id, created_at desc);

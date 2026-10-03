-- SSO Fase 1 (#159): identidades sociales por proveedor y datos de PKCE/nonce
-- en los estados OAuth. Aditiva e idempotente.
create table if not exists user_social_identities (
  id bigserial primary key,
  user_id bigint not null references users(id) on delete cascade,
  provider text not null,
  subject text not null,
  email_at_link text,
  linked_at timestamptz not null default now(),
  last_login_at timestamptz,
  unique (provider, subject),
  unique (user_id, provider)
);
create index if not exists user_social_identities_user_idx on user_social_identities(user_id);

alter table oauth_states add column if not exists provider text not null default 'google';
alter table oauth_states add column if not exists code_verifier text;
alter table oauth_states add column if not exists nonce text;

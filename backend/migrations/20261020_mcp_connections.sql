-- MCP grants are independent of browser sessions; only token hashes are stored.
create table if not exists agency_mcp_clients(
 id text primary key,name text not null,redirect_uris jsonb not null,created_at timestamptz not null default now()
);
create table if not exists agency_mcp_connections(
 id uuid primary key,client_id text not null references agency_mcp_clients(id),organization_id bigint not null references organizations(id) on delete cascade,user_id bigint not null references users(id) on delete cascade,
 scopes text[] not null,resource text not null,created_at timestamptz not null default now(),last_used_at timestamptz,reauthenticated_at timestamptz,revoked_at timestamptz
);
create index if not exists agency_mcp_connections_user_idx on agency_mcp_connections(organization_id,user_id);
create table if not exists agency_mcp_authorizations(
 request_hash text primary key,client_id text not null references agency_mcp_clients(id),redirect_uri text not null,resource text not null,scopes text[] not null,state text not null,challenge text not null,
 expires_at timestamptz not null default now()+interval '10 minutes',bound_user_id bigint references users(id) on delete cascade,organization_id bigint references organizations(id) on delete cascade,csrf_hash text,session_hash text,
 consumed_at timestamptz,connection_id uuid references agency_mcp_connections(id) on delete cascade,code_hash text unique,code_expires_at timestamptz,code_consumed_at timestamptz
);
create table if not exists agency_mcp_tokens(
 id bigserial primary key,connection_id uuid not null references agency_mcp_connections(id) on delete cascade,access_hash text unique not null,refresh_hash text unique not null,
 expires_at timestamptz not null default now()+interval '1 hour',refresh_expires_at timestamptz not null default now()+interval '30 days',refresh_used_at timestamptz,revoked_at timestamptz
);
create index if not exists agency_mcp_tokens_connection_idx on agency_mcp_tokens(connection_id);
create table if not exists agency_mcp_browser_nonces(
 token_hash text primary key,user_id bigint not null references users(id) on delete cascade,organization_id bigint not null references organizations(id) on delete cascade,session_hash text not null,expires_at timestamptz not null default now()+interval '10 minutes'
);
create table if not exists agency_mcp_audit(
 id bigserial primary key,organization_id bigint references organizations(id) on delete cascade,user_id bigint references users(id) on delete set null,connection_id uuid references agency_mcp_connections(id) on delete set null,
 action text not null,tool_name text,status integer not null,created_at timestamptz not null default now()
);

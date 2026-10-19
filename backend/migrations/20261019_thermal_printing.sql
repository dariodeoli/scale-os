-- Only 80mm thermal ESC/POS. branch_id is a local scope label, not a branch directory.
create table if not exists agency_print_printers (
 id uuid primary key, organization_id bigint not null references organizations(id), name text not null, model text not null default '', branch_id text not null default 'main',
 connection text not null check(connection in ('lan','cups','usb')), destination text not null, width_mm integer not null default 80 check(width_mm=80), copies integer not null default 1 check(copies between 1 and 5), auto_cut boolean not null default true, enabled boolean not null default true,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(organization_id,id)
);
create table if not exists agency_print_templates (
 id uuid primary key, organization_id bigint not null references organizations(id), name text not null, kind text not null, definition jsonb not null, version integer not null default 1, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(organization_id,id)
);
create table if not exists agency_print_bridges (
 id uuid primary key, organization_id bigint not null references organizations(id), name text not null, branch_id text not null default 'main', created_by bigint not null references users(id), token_hash text unique, pairing_hash text unique, pairing_expires_at timestamptz, last_seen_at timestamptz, revoked_at timestamptz, created_at timestamptz not null default now(), unique(organization_id,id)
);
create table if not exists agency_print_jobs (
 id uuid primary key, organization_id bigint not null references organizations(id), branch_id text not null, printer_id uuid not null, template_id uuid not null, template_version integer not null,
 kind text not null, reference text not null, copies integer not null check(copies between 1 and 5), width_mm integer not null default 80 check(width_mm=80), requested_by bigint not null references users(id),
 idempotency_key text not null, fingerprint text not null, template_snapshot jsonb not null, document_snapshot jsonb, printer_snapshot jsonb not null,
 payload_base64 text, payload_bytes integer not null, confirmation_hash text, confirmation_expires_at timestamptz not null default now()+interval '7 days', confirmation_attempts integer not null default 0,
 state text not null default 'pendiente' check(state in ('pendiente','aceptado','confirmado','incierto','fallido','cancelado')), lease_id uuid, bridge_id uuid, leased_until timestamptz, transport text, error_code text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(organization_id,idempotency_key), unique(organization_id,id),
 foreign key(organization_id,printer_id) references agency_print_printers(organization_id,id), foreign key(organization_id,template_id) references agency_print_templates(organization_id,id), foreign key(organization_id,bridge_id) references agency_print_bridges(organization_id,id)
);
create index if not exists agency_print_jobs_pending on agency_print_jobs(organization_id,branch_id,created_at) where state='pendiente';
create table if not exists agency_print_audit (
 id bigserial primary key, organization_id bigint not null references organizations(id), actor_user_id bigint references users(id), bridge_id uuid, entity_id uuid not null, action text not null, created_at timestamptz not null default now()
);

create table if not exists agency_print_idempotency (
 organization_id bigint not null references organizations(id), key text not null, request_hash text not null, job_id uuid not null, created_at timestamptz not null default now(), primary key(organization_id,key), foreign key(organization_id,job_id) references agency_print_jobs(organization_id,id)
);

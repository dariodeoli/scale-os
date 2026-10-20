-- Refs #330: per-member agency overrides; never changes a platform role.
create table if not exists agency_member_permissions (
 organization_id bigint not null,
 user_id bigint not null,
 capability text not null check(length(capability) between 1 and 100),
 allowed boolean not null,
 updated_by_user_id bigint references users(id),
 updated_at timestamptz not null default now(),
 primary key(organization_id,user_id,capability),
 foreign key(organization_id,user_id) references organization_members(organization_id,user_id) on delete cascade
);
create index if not exists agency_member_permissions_actor_idx on agency_member_permissions(user_id,organization_id);
drop trigger if exists operation_audit on agency_member_permissions;
create trigger operation_audit after insert or update or delete on agency_member_permissions for each row execute function audit_agency_operation();

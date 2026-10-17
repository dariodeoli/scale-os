-- Self-owned UI preferences only; membership/user/tenant deletion removes them.
create table if not exists agency_workspace_preferences (
 organization_id bigint not null,
 user_id bigint not null,
 preferences jsonb not null default '{"version":1,"startup":"summary","production":{"clientId":"","mine":false,"week":false}}'::jsonb,
 updated_at timestamptz not null default now(),
 primary key(organization_id,user_id),
 foreign key(organization_id,user_id) references organization_members(organization_id,user_id) on delete cascade,
 check(jsonb_typeof(preferences)='object' and octet_length(preferences::text)<=1024)
);

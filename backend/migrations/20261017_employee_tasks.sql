-- Employee tasks extend the existing internal task identity used in productivity.
alter table agency_internal_tasks add column if not exists priority text not null default 'normal' check(priority in ('low','normal','high','urgent'));
alter table agency_internal_tasks add column if not exists due_time time without time zone;
alter table agency_internal_tasks add column if not exists project_id bigint references agency_projects(id);
alter table agency_internal_tasks add column if not exists client_id bigint references agency_clients(id);
alter table agency_internal_tasks add column if not exists created_by_user_id bigint references users(id);
alter table agency_internal_tasks add column if not exists updated_by_user_id bigint references users(id);
alter table agency_internal_tasks add column if not exists completed_at timestamptz;
alter table agency_internal_tasks add column if not exists version bigint not null default 1 check(version>0);
alter table agency_internal_tasks add column if not exists checklist jsonb not null default '[]'::jsonb check(jsonb_typeof(checklist)='array');
alter table agency_internal_tasks add column if not exists materials jsonb not null default '[]'::jsonb check(jsonb_typeof(materials)='array');
create table if not exists agency_internal_task_assignees (
 task_id bigint not null references agency_internal_tasks(id) on delete cascade,
 organization_id bigint not null references organizations(id),
 user_id bigint not null references users(id),
 primary key(task_id,user_id)
);
insert into agency_internal_task_assignees(task_id,organization_id,user_id)
 select id,organization_id,assigned_user_id from agency_internal_tasks where assigned_user_id is not null
 on conflict do nothing;
create index if not exists internal_task_people_idx on agency_internal_task_assignees(organization_id,user_id,task_id);
create index if not exists internal_task_scope_idx on agency_internal_tasks(organization_id,due_date,id);
create index if not exists internal_task_project_idx on agency_internal_tasks(organization_id,project_id,id);
create table if not exists agency_internal_task_comments (
 id bigserial primary key,organization_id bigint not null references organizations(id),
 task_id bigint not null references agency_internal_tasks(id) on delete cascade,
 author_user_id bigint not null references users(id),body text not null check(length(trim(body)) between 1 and 2000),
 created_at timestamptz not null default now()
);
create index if not exists internal_task_comments_idx on agency_internal_task_comments(organization_id,task_id,id);
do $$ declare t text; begin
 foreach t in array array['agency_internal_task_assignees','agency_internal_task_comments'] loop
 execute format('drop trigger if exists operation_audit on %I',t);
 execute format('create trigger operation_audit after insert or update or delete on %I for each row execute function audit_agency_operation()',t);
 end loop;
end $$;

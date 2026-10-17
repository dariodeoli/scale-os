-- More than one revision can take effect on the same date. Identity/id breaks
-- the tie; an earlier revision remains an immutable historical observation.
-- An inclusive closure on that date is valid, and canonical lookups below
-- select one winner rather than summing both versions.
drop index if exists agency_client_commercial_terms_effective_idx;
create index agency_client_commercial_terms_effective_idx on agency_client_commercial_terms(organization_id,client_id,effective_from desc,id desc);
create or replace function agency_commercial_terms_on(org bigint,on_date date) returns setof agency_client_commercial_terms language sql stable as $$
 select distinct on(client_id) t.* from agency_client_commercial_terms t
 where organization_id=org and coalesce(effective_from,starts_on)<=on_date
 and (coalesce(effective_until,ends_on) is null or coalesce(effective_until,ends_on)>=on_date)
 order by client_id,coalesce(effective_from,starts_on) desc,id desc
$$;

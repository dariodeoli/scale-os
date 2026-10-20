-- List display choices remain owned by the member; no authorization data.
-- The original1KB payload limit predates per-list visible/order preferences.
alter table agency_workspace_preferences drop constraint if exists agency_workspace_preferences_preferences_check;
alter table agency_workspace_preferences drop constraint if exists agency_workspace_preferences_columns_size_check;
alter table agency_workspace_preferences add constraint agency_workspace_preferences_columns_size_check check(jsonb_typeof(preferences)='object' and octet_length(preferences::text)<=65536);

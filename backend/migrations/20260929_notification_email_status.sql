-- Estados canónicos de envío (§16, owncoding-ui v0.51.0): un envío solo es
-- «enviado» cuando el relay aceptó; sin relay configurado queda «encolado».
-- Aditiva, idempotente y re-ejecutable: traduce el vocabulario anterior
-- (sent/pending/failed/skipped) al canónico (enviado/encolado/duplicado/fallido),
-- fija el default en «encolado» y acota la columna con un check.
update agency_notifications set email_status=case email_status
 when 'sent' then 'enviado'
 when 'pending' then 'encolado'
 when 'failed' then 'fallido'
 when 'skipped' then 'duplicado'
 else email_status end
where email_status in ('sent','pending','failed','skipped');
alter table agency_notifications alter column email_status set default 'encolado';
do $$ begin
 if not exists(select 1 from pg_constraint where conname='agency_notifications_email_status_check' and conrelid='agency_notifications'::regclass) then
  alter table agency_notifications add constraint agency_notifications_email_status_check
   check(email_status in ('enviado','encolado','duplicado','fallido')) not valid;
 end if;
end $$;
alter table agency_notifications validate constraint agency_notifications_email_status_check;

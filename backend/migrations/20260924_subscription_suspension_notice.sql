-- Aviso de suspensión por falta de pago (#59): sello por ciclo de cobro para
-- enviar el correo una sola vez al suspender (cuando vence la gracia de 2 días).
-- Aditiva, idempotente y re-ejecutable; tolera fixtures sin la tabla base.
do $$ begin
 if exists(select 1 from information_schema.tables where table_name='organization_subscriptions') then
  alter table organization_subscriptions add column if not exists suspension_notified_at timestamptz;
 end if;
end $$;

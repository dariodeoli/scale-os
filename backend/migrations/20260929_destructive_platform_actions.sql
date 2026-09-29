-- Borrados globales del panel admin (issue #22): la tabla de vistas previas y
-- las pruebas de re-autenticación solo admitían los borrados de cuenta/empresa,
-- pero el API ya emite `platform.user.delete` y `platform.agency.delete`
-- (backend/platform-admin.js) desde el panel global. Sin esta migración, el
-- CHECK rechaza el INSERT y CUALQUIER borrado desde /superadmin falla con 500.
-- Aditiva, idempotente y re-ejecutable: reemplaza los CHECK por su versión con
-- las acciones globales (no toca filas existentes, que ya cumplen).
alter table destructive_action_previews drop constraint if exists destructive_action_previews_action_check;
alter table destructive_action_previews add constraint destructive_action_previews_action_check
 check(action in ('account.delete','organization.delete','platform.user.delete','platform.agency.delete'));

alter table destructive_action_previews drop constraint if exists destructive_action_previews_check;
alter table destructive_action_previews add constraint destructive_action_previews_check
 check((action in ('account.delete','platform.user.delete') and organization_id is null)
    or (action in ('organization.delete','platform.agency.delete') and organization_id is not null));

alter table destructive_auth_proofs drop constraint if exists destructive_auth_proofs_action_check;
alter table destructive_auth_proofs add constraint destructive_auth_proofs_action_check
 check(action in ('account.delete','organization.delete','platform.user.delete','platform.agency.delete'));

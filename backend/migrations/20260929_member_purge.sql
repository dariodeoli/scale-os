-- Eliminación definitiva de integrantes retirados desde Equipo: la membresía
-- se marca como purgada para que la persona desaparezca del directorio sin
-- borrar la fila (el historial de piezas, reservas, pagos y verificaciones
-- referencia `(organization_id, user_id)` y debe conservarse).
-- Aditiva, idempotente y re-ejecutable; una nueva invitación limpia el purgado.
alter table organization_members add column if not exists purged_at timestamptz;

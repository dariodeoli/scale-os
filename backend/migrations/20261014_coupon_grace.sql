-- Cupones de gracia (Refs #189): vencimiento, empresa destino opcional y nota interna.
-- Aditiva, idempotente y re-ejecutable: las columnas nuevas son nulas, así que los
-- cupones existentes siguen siendo globales y sin vencimiento.
alter table platform_coupons
  add column if not exists expires_at timestamptz,
  add column if not exists organization_id bigint references organizations(id) on delete set null,
  add column if not exists note text;
create index if not exists platform_coupons_organization_idx on platform_coupons(organization_id) where organization_id is not null;

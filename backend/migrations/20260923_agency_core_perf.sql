-- Índices para las listas más pesadas del panel (rendimiento, #46).
-- Aditiva, idempotente y re-ejecutable: solo agrega índices que faltaban para
-- los ORDER BY y joins de /api/agency/work-orders y /api/agency/projects.
create index if not exists agency_work_orders_updated_idx on agency_work_orders(organization_id, updated_at desc, id desc);
create index if not exists agency_work_orders_project_idx on agency_work_orders(organization_id, project_id);
create index if not exists agency_projects_active_idx on agency_projects(organization_id, active desc, created_at desc);
-- El catálogo de inventario no tenía índice por organización: la lista entera
-- (orden i.name, i.id) hacía seq scan + sort en cada carga de OPS.
create index if not exists agency_inventory_organization_idx on agency_inventory(organization_id, name, id);

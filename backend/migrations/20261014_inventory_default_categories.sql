-- Categorías iniciales para empresas creadas después de 20260910_inventory_reservations.sql.
-- Esa migración sembró el set por defecto solo para las empresas existentes; las altas
-- posteriores (registro de prueba, empresa nueva) quedaban sin categorías y el alta de
-- equipos fallaba con el selector vacío. Aditiva, idempotente y re-ejecutable: solo
-- toca empresas sin ninguna categoría (guard por conteo) y `on conflict do nothing`.
-- Las altas nuevas siembran lo mismo con `ensureInventoryCategories` (inventory-reservations.js).
insert into agency_inventory_categories(organization_id,name)
 select o.id,v.name from organizations o
 cross join (values('Cámara'),('Lente'),('Audio'),('Iluminación'),('Computación'),('Accesorio'),('Otro')) v(name)
 where not exists(select 1 from agency_inventory_categories c where c.organization_id=o.id)
 on conflict do nothing;

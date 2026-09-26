"use client";
/**
 * Adopción segura de `?fields=` (#67/#71).
 *
 * El front manda la proyección que dibuja; si el API todavía no la soporta y
 * responde `Campos inválidos`, se reintenta sin ella y queda apagada para esa
 * sesión: cuando PLT publique el `?fields=` del endpoint, la proyección entra
 * sola, sin tocar las vistas, y nunca rompe la pantalla.
 */
const unsupported=new Set<string>();

/** URL con la proyección pedida (o la misma ruta si el endpoint ya la rechazó). */
export function projectedPath(path:string,fields:string):string{
 if(!fields||unsupported.has(path))return path;
 return `${path}${path.includes('?')?'&':'?'}fields=${encodeURIComponent(fields)}`;
}

/** ¿El fallo es «Campos inválidos» del API? Entonces se apaga la proyección. */
export function projectionRejected(path:string,reason:unknown):boolean{
 const message=reason instanceof Error?reason.message:'';
 if(!/Campos inválidos/i.test(message))return false;
 unsupported.add(path);
 return true;
}

/** Solo para tests: el estado de sesión se comparte entre llamadas. */
export function resetProjectionSupport():void{unsupported.clear();}

/** Campos que dibuja el catálogo de inventario (lista, tarjeta, ficha y formularios). */
export const INVENTORY_FIELDS='id,inventory_code,name,category,category_id,category_name,category_icon,category_active,serial_number,photo_url,value,currency,status,storage_shelf,storage_row,storage_location_id,storage_location_name,storage_location_active,location_changed_at,custodian_user_id,location_type,current_custodian_name,current_custodian_user_id,production_name,project_name,active_reservation_id,return_user_name,return_user_id,expected_return_at,last_verified_at,last_verified_by_user_id,last_verification_result,last_verification_differences,last_verified_counted_quantity,last_verifier_name,last_verifier_photo_url,purchase_value,purchase_date,acquired_on,depreciation_method,useful_life_months,residual_value,current_value,accumulated_depreciation,monthly_depreciation,notes,barcode_payload';
/** Reservas del mes: la lista y el calendario no dibujan verifications ni maintenance. */
export const INVENTORY_RESERVATION_FIELDS='id,title,project_id,project_name,starts_at,ends_at,status,responsible_members,items,return_user_id,return_user_name,custodian_user_id,custodian_name,actor_name,actor_photo_url,actor_verified,actor_user_id,checkout_actor_name,checkout_actor_photo_url,checkout_actor_verified,checkout_actor_user_id,return_actor_name,return_actor_photo_url,return_actor_verified,return_actor_user_id,notes,version,checkout_note,return_note,checked_out_at,returned_at,cancelled_at,checked_out_by_user_id,returned_by_user_id,created_at,updated_at';
/** Espacios del estudio: tarjeta y formulario. */
export const STUDIO_SPACE_FIELDS='id,name,scenario,notes,active,responsible_user_id,responsible_name,responsible_photo_url,created_at,updated_at';
/** Reservas del estudio: calendario, lista y formulario. */
export const STUDIO_RESERVATION_FIELDS='id,space_id,space_name,space_scenario,title,production_type,starts_at,ends_at,status,project_id,project_name,responsible_members,actor_name,actor_photo_url,actor_verified,actor_user_id,notes,version,cancelled_at,created_at,updated_at';

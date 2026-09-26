import assert from 'node:assert/strict';
import {projectedPath,projectionRejected,resetProjectionSupport,INVENTORY_FIELDS,INVENTORY_RESERVATION_FIELDS,STUDIO_SPACE_FIELDS,STUDIO_RESERVATION_FIELDS} from '../app/api-projection';

// Adopción segura de `?fields=` (#67/#71): la URL lleva la proyección y, si el
// API responde «Campos inválidos», se apaga para la sesión y se reintenta sin ella.
assert.equal(projectedPath('/api/agency/inventory',INVENTORY_FIELDS),`/api/agency/inventory?fields=${encodeURIComponent(INVENTORY_FIELDS)}`,'la proyección se agrega con ?fields=');
assert.equal(projectedPath('/api/agency/inventory-reservations?from=x&to=y',INVENTORY_RESERVATION_FIELDS),`/api/agency/inventory-reservations?from=x&to=y&fields=${encodeURIComponent(INVENTORY_RESERVATION_FIELDS)}`,'con query existente se agrega con &fields=');
assert.equal(projectedPath('/api/agency/studio-spaces',''),'/api/agency/studio-spaces','sin campos no se toca la URL');

assert.equal(projectionRejected('/api/agency/inventory',new Error('Campos inválidos: category_active')),true,'«Campos inválidos» apaga la proyección');
assert.equal(projectedPath('/api/agency/inventory',INVENTORY_FIELDS),'/api/agency/inventory','tras el rechazo la URL va sin fields');
assert.equal(projectionRejected('/api/agency/inventory-context',new Error('No autorizado')),false,'otro error no apaga la proyección');
assert.equal(projectedPath('/api/agency/inventory-context','id'),'/api/agency/inventory-context?fields=id','otro endpoint sigue proyectando');

for(const [name,fields,expected] of [
 ['inventario',INVENTORY_FIELDS,['id','name','photo_url','value','status','last_verified_at','notes']],
 ['reservas de inventario',INVENTORY_RESERVATION_FIELDS,['id','title','starts_at','ends_at','status','items','responsible_members','version']],
 ['espacios de estudio',STUDIO_SPACE_FIELDS,['id','name','scenario','notes','active']],
 ['reservas de estudio',STUDIO_RESERVATION_FIELDS,['id','space_id','space_name','title','production_type','starts_at','ends_at','status','project_name','responsible_members','version']],
] as const){
 const list=fields.split(',');
 for(const field of expected)assert(list.includes(field),`${name}: la proyección incluye ${field}`);
 assert(!fields.includes(' '),`${name}: la lista no lleva espacios`);
}

resetProjectionSupport();
assert.equal(projectedPath('/api/agency/inventory',INVENTORY_FIELDS),`/api/agency/inventory?fields=${encodeURIComponent(INVENTORY_FIELDS)}`,'reset vuelve a habilitar la proyección');

console.log('PASS api-projection: ?fields= optimista con fallback por «Campos inválidos» y listas OPS completas.');

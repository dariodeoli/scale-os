// Regresión (QA e2e local): una agencia registrada después de
// 20260910_inventory_reservations.sql quedaba sin categorías de inventario y el
// alta de su primer equipo fallaba («Identificador inválido», selector vacío).
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {migrationOrder} from './scripts/migration-order.mjs';
import {registerTrial} from './trial-registration.js';
import {DEFAULT_INVENTORY_CATEGORIES,ensureInventoryCategories} from './inventory-reservations.js';

const read=file=>fs.readFile(new URL(file,import.meta.url),'utf8');
const BACKFILL='20261014_inventory_default_categories.sql';
assert(migrationOrder.includes(BACKFILL),'la migración de respaldo está registrada en la cadena curada');
const pg=new PGlite();
const query=(sql,args)=>pg.query(sql,args);
await pg.exec(await read('schema.sql'));
for(const file of migrationOrder.filter(name=>name!==BACKFILL))await pg.exec(await read(`migrations/${file}`));
const names=async org=>(await query('select name from agency_inventory_categories where organization_id=$1 order by name',[org])).rows.map(row=>row.name);

// 1) Respaldo: una empresa creada sin categorías recibe el set inicial; una con
// categorías propias no se toca; re-ejecutar no duplica.
const late=(await query("insert into organizations(slug,name) values('late-agency','Late') returning id")).rows[0].id;
const custom=(await query("insert into organizations(slug,name) values('custom-agency','Custom') returning id")).rows[0].id;
await query("insert into agency_inventory_categories(organization_id,name) values($1,'Drones')",[custom]);
assert.deepEqual(await names(late),[],'fixture: la empresa tardía arranca sin categorías');
const backfill=await read(`migrations/${BACKFILL}`);
await pg.exec(backfill);await pg.exec(backfill);
assert.deepEqual(await names(late),[...DEFAULT_INVENTORY_CATEGORIES].sort(),'la empresa sin categorías recibe el set inicial una sola vez');
assert.deepEqual(await names(custom),['Drones'],'una empresa con categorías propias no se modifica');

// 2) Alta: el registro de una agencia nueva siembra las categorías en la misma transacción.
await pg.exec('begin');
const account=await registerTrial({query},{email:'nueva@agencia.test',email_verified:true,name:'Nueva Agencia'},{name:'Agencia Nueva',currency:'USD'},{method:'password'});
await pg.exec('commit');
const seeded=await names(account.organizationId);
assert.deepEqual(seeded,[...DEFAULT_INVENTORY_CATEGORIES].sort(),'el registro deja categorías activas para el primer equipo');
assert((await query('select bool_and(active) as active from agency_inventory_categories where organization_id=$1',[account.organizationId])).rows[0].active);

// 3) Idempotente y con guard por conteo.
await ensureInventoryCategories({query},account.organizationId);
await ensureInventoryCategories({query},custom);
assert.equal((await names(account.organizationId)).length,DEFAULT_INVENTORY_CATEGORIES.length);
assert.deepEqual(await names(custom),['Drones']);
console.log('PASS: las agencias nuevas y las tardías tienen categorías de inventario para su primer equipo');

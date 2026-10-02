import assert from 'node:assert/strict';
import test from 'node:test';
import {activityEvent,humanTable} from '../app/activity-format';

// #143: la Actividad se lee como eventos de negocio; el detalle técnico queda
// para escritorio y nunca se pierde.
test('la actividad traduce facturas, pagos y proyectos a eventos de negocio',()=>{
 const invoice=activityEvent({table_name:'agency_invoices',operation:'INSERT',record_id:'312',reference:'F-2026-01',client_name:'Cliente Andina',total:'150.50',currency:'USD'});
 assert.equal(invoice.label,'Factura emitida');
 assert.equal(invoice.client,'Cliente Andina');
 assert.equal(invoice.reference,'F-2026-01');
 assert.equal(invoice.amount,'150.50');
 assert.equal(invoice.currency,'USD');
 assert.equal(invoice.technical,'invoices · INSERT · Registro 312');
 const payment=activityEvent({table_name:'agency_payments',operation:'INSERT',record_id:'308',reference:'TR-99',client_name:'Cliente Andina',amount:'50',currency:'USD'});
 assert.equal(payment.label,'Pago recibido');
 assert.equal(payment.amount,'50');
 assert.equal(payment.reference,'TR-99');
 const project=activityEvent({table_name:'agency_projects',operation:'DELETE',record_id:'7',subject:'Campaña de verano',client_name:'Cliente Andina'});
 assert.equal(project.label,'Proyecto archivado');
 assert.equal(project.subject,'Campaña de verano');
 assert.equal(project.client,'Cliente Andina');
});

test('la actividad cae a un nombre humano y tolera filas incompletas',()=>{
 assert.equal(activityEvent({table_name:'agency_notifications',operation:'UPDATE'}).label,'Notifications actualizado');
 assert.equal(activityEvent({}).label,'Registro actualizado');
 assert.equal(activityEvent({}).technical,'');
 assert.equal(activityEvent({table_name:'agency_clients',operation:'PATCH'}).label,'Clients actualizado','una operación desconocida no se escapa del humano');
 assert.equal(activityEvent({table_name:'agency_work_order_assignees',operation:'UPDATE'}).label,'Responsable actualizado');
 assert.equal(humanTable('agency_inventory_reservations'),'Inventory reservations');
 assert.equal(humanTable('client_portal_deliveries'),'Deliveries');
 assert.equal(humanTable(''),'Registro');
 // Los importes llegan como texto del audit y se prefieren a `total` cuando existen.
 const expense=activityEvent({table_name:'agency_expenses',operation:'INSERT',amount:'1200.00',total:'9999',currency:'PYG'});
 assert.equal(expense.amount,'1200.00');
});

console.log('PASS: la Actividad traduce eventos de negocio con cliente, referencia e importe (#143)');

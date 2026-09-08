import assert from 'node:assert/strict';
import { filterProductionOrders } from '../app/production-filter';

const projects = [{ id: '11', client_id: '1' }, { id: 12, client_id: 1 }, { id: '20', client_id: '2' }];
const orders = [
  { id: 'a', project_id: '11', status: 'recorded' },
  { id: 'b', project_id: '12', status: 'editing' },
  { id: 'c', project_id: '20', status: 'review' },
  { id: 'd', project_id: 'missing', status: 'blocked' },
];
assert.equal(filterProductionOrders(orders, projects, ''), orders, 'General includes every order');
assert.deepEqual(filterProductionOrders(orders, projects, '1').map(o => o.id), ['a', 'b'], 'All projects of a client, numeric or string IDs');
assert.deepEqual(filterProductionOrders(orders, projects, '2').map(o => o.id), ['c'], 'Other clients excluded');
assert.deepEqual(filterProductionOrders(orders, projects, '3'), [], 'Client without orders');
assert.deepEqual(filterProductionOrders([], projects, ''), [], 'Empty agency');
const moved = orders.map(o => o.id === 'a' ? { ...o, status: 'editing' } : o);
assert.equal(filterProductionOrders(moved, projects, '1').filter(o => o.status === 'editing').length, 2, 'Column counts follow movement');
assert.equal(orders[0].status, 'recorded', 'Does not mutate source data');
console.log('PASS: production client filter (7 checks)');

import test from 'node:test';
import assert from 'node:assert/strict';
import {code39Bits,inventoryCode} from '../app/inventory-label';

test('inventory codes are stable, padded and Code 39 printable',()=>{
 assert.equal(inventoryCode('1'),'SC-000001');
 assert.equal(inventoryCode(987654),'SC-987654');
 const bits=code39Bits('SC-000001');
 assert.match(bits,/^[01]+$/);
 assert(bits.length>100,'includes start, stop and all equipment-code characters');
 assert.throws(()=>code39Bits('SC_000001'),/no imprimibles/);
});

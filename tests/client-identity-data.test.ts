import assert from 'node:assert/strict';
import {test} from 'node:test';
import {CLIENT_COLOR_VALUES,clientColorLabels,clientColors,identityColor} from '../app/client-identity-data';

test('identity color always resolves to a palette key',()=>{
 for(const key of CLIENT_COLOR_VALUES)assert.equal(identityColor(key),key,`${key} stays ${key}`);
 assert.equal(identityColor(undefined),'violet');
 assert.equal(identityColor(null),'violet');
 assert.equal(identityColor(''),'violet');
 assert.equal(identityColor('blue '),'violet','unknown values fall back to violet');
 assert.equal(identityColor('red'),'violet');
});

test('palette keeps the seven canonical options with labels',()=>{
 assert.deepEqual(CLIENT_COLOR_VALUES,['violet','blue','teal','green','gold','rose','slate']);
 assert.equal(clientColors.length,7);
 assert.deepEqual(Object.keys(clientColorLabels),[...CLIENT_COLOR_VALUES]);
 assert.equal(clientColorLabels.gold,'Dorado');
});

import assert from 'node:assert/strict';
import {test} from 'node:test';
import {columnListKey,listGridTracks,parseListColumnPreferences,resolveListColumns} from '../app/list-column-preferences';
import {parseWorkspacePreferences} from '../app/workspace-preferences';
const columns=[{key:'client',label:'Cliente'},{key:'activity',label:'Actividad'},{key:'data',label:'Datos'},{key:'actions',label:'Acciones'}];
test('columns preserve identity and permission-derived catalogue, order, hidden and pinned actions',()=>{
 const result=resolveListColumns(columns,{order:['data','private-salary','client','data','actions'],hidden:['client','activity','private-salary']},true);
 assert.deepEqual(result.indices,[2,0,3]);assert.deepEqual(result.order,['data','client','activity','actions']);assert.deepEqual([...result.hidden],['activity']);
 const reduced=resolveListColumns(columns.filter(column=>column.key!=='data'),{order:['data','actions','client'],hidden:['activity']},true);assert.deepEqual(reduced.indices,[0,2]);
 assert.deepEqual(resolveListColumns(columns,{order:[],hidden:[]}).indices,[0,1,2,3]);
});
test('columns use scoped stable path/label keys, bounded payloads and legacy preferences survive',()=>{
 assert.equal(columnListKey('/clientes','Clientes archivados'),'/clientes:clientes-archivados');assert.notEqual(columnListKey('/clientes','Clientes'),columnListKey('/produccion','Clientes'));
 const raw=JSON.parse('{"/clientes:clientes":{"order":["data","data",55,"__proto__"],"hidden":["activity"]},"constructor":{"order":[],"hidden":[]},"bad key":{}}');
 assert.deepEqual(parseListColumnPreferences(raw),{'/clientes:clientes':{order:['data'],hidden:['activity']}});
 const pref=parseWorkspacePreferences(JSON.stringify({version:1,startup:'my-day',production:{clientId:'12',mine:true,week:false},columns:raw}));assert.equal(pref.production.mine,true);assert.equal(pref.startup,'my-day');assert.deepEqual(pref.columns,{'/clientes:clientes':{order:['data'],hidden:['activity']}});
});
test('grid tracks preserve widths when reordered and unsupported templates fail closed',()=>{
 assert.deepEqual(listGridTracks('grid-cols-[minmax(11rem,1.6fr)_8rem_minmax(4rem,1fr)]',3),['minmax(11rem,1.6fr)','8rem','minmax(4rem,1fr)']);assert.deepEqual(listGridTracks('grid-cols-3',3),Array(3).fill('minmax(0,1fr)'));assert.equal(listGridTracks('grid-cols-[1fr_2fr]',3),null);assert.deepEqual(listGridTracks('grid-cols-[var(--project-cols)]',2,'project-list [--project-cols:minmax(10rem,1fr)_7rem]'),['minmax(10rem,1fr)','7rem']);
});

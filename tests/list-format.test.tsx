import React from 'react';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {act,create} from 'react-test-renderer';
require.extensions['.css']=()=>{};
Object.assign(globalThis,{React});
const {SerialTexto,listDateShort,listDateFull,dueTone}=require('../app/list-format') as typeof import('../app/list-format');
const day=(offset:number)=>new Date(Date.now()+offset*86_400_000).toISOString().slice(0,10);
const plain=(node:any):string=>!node?'':typeof node==='string'?node:Array.isArray(node)?node.map(plain).join(''):plain(node.children);

test('serial keeps the ending visible, bolds it and can mask the rest',async()=>{
 let renderer:any;
 await act(async()=>{renderer=create(<SerialTexto value="SN-ABC-4821"/>);});
 const full=JSON.stringify(renderer.toJSON());
 assert(full.includes('SN-ABC'),'head stays readable');
 assert(full.includes('"b"')&&full.includes('4821'),'the last four characters are highlighted');
 assert(renderer.root.findByProps({title:'SN-ABC-4821'}),'full serial stays available as title');
 await act(async()=>{renderer.update(<SerialTexto value="SN-ABC-4821" mask/>);});
 const masked=plain(renderer.toJSON());
 assert(masked.includes('••••4821'),'masked serials keep the ending');
 assert(!masked.includes('SN-ABC'),'masked serials hide the head');
 await act(async()=>{renderer.update(<SerialTexto value=""/>);});
 assert.equal(renderer.toJSON(),null,'empty serials render nothing');
});

test('list dates use the short and full document formats',()=>{
 assert.equal(listDateShort('2026-09-17'),'17-sept');
 assert.equal(listDateFull('2026-09-17T14:30:00.000Z'),'17 sept 26 · 11:30','the clock is shown in Asunción time');
 assert.equal(listDateFull('2026-09-17'),'17 sept 26','date-only values omit the clock');
 assert.equal(listDateShort(''),null);assert.equal(listDateShort('invalid'),null);assert.equal(listDateFull(null),null);
});

test('due tone paints only overdue or within the next week',()=>{
 assert.equal(dueTone(day(-2)),'warn','overdue dates are painted');
 assert.equal(dueTone(day(0)),'warn');assert.equal(dueTone(day(3)),'warn');assert.equal(dueTone(day(7)),'warn');
 assert.equal(dueTone(day(8)),'','far dates stay muted');
 assert.equal(dueTone(''),'');assert.equal(dueTone(null),'');
});

import React from 'react';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import {fechaLista,fechaListaCorta} from 'owncoding-ui';
import {act,create} from 'react-test-renderer';
require.extensions['.css']=()=>{};
Object.assign(globalThis,{React});
const {SerialTexto,listDateShort,listDateFull,dueTone,hasDueWarning}=require('../app/list-format') as typeof import('../app/list-format');
const listFormatSource=readFileSync(new URL('../app/list-format.tsx',import.meta.url),'utf8');
// Las fechas del helper se calculan en el calendario de Asunción (el mismo que
// usa dueTone): con ISO en UTC el borde day(7) cambiaba según la hora del día.
const asuncionDay=(date:Date)=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Asuncion',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
const day=(offset:number)=>asuncionDay(new Date(Date.now()+offset*86_400_000));
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

test('list dates delegate to the shared library with the app empty contract',()=>{
 assert.equal(listDateShort('2026-09-17'),'17-sept');
 assert.equal(listDateFull('2026-09-17T14:30:00.000Z'),'17 sept 26 · 11:30','the clock is shown in Asunción time');
 assert.equal(listDateFull('2026-09-17'),'17 sept 26','date-only values omit the clock');
 assert.equal(listDateFull('2026-09-17T14:30:00.000Z','09:00'),'17 sept 26 · 09:00','an explicit hour wins');
 assert.equal(listDateShort(''),null);assert.equal(listDateShort('invalid'),null);assert.equal(listDateFull(null),null);
 // Una sola implementación: el formato de la app es el de la librería, sin Intl propio.
 assert.match(listFormatSource,/from 'owncoding-ui'/,`list-format usa los objetos de la librería`);
 assert.doesNotMatch(listFormatSource,/new Intl\.DateTimeFormat/,'list-format ya no arma fechas a mano');
 assert.match(listFormatSource,/fechaLista\(value/,'listDateFull delega en fechaLista');
 assert.match(listFormatSource,/fechaListaCorta\(value/,'listDateShort delega en fechaListaCorta');
 assert.match(listFormatSource,/diasHasta\(/,'dueTone sale del cálculo de días de la librería');
});

test('the shared library preserves list labels and empty fallbacks',()=>{
 assert.equal(fechaListaCorta('2026-09-17'),'17-sept');
 assert.equal(fechaLista('2026-09-17T14:30:00.000Z','',{timeZone:'America/Asuncion'}),'17 sept 26 · 11:30');
 assert.equal(fechaLista('2026-09-17'),'17 sept 26');
 assert.equal(fechaListaCorta('', 'Sin fecha'),'Sin fecha');
 assert.equal(fechaLista('invalid', 'Sin fecha'),'Sin fecha');
 assert.equal(fechaListaCorta('',''),'','el vacío explícito de las celdas sigue siendo cadena vacía');
 assert.equal(fechaListaCorta(''),'—','el default de la librería es —');
});

test('due tone paints only overdue or within the next week',()=>{
 assert.equal(dueTone(day(-2)),'warn','overdue dates are painted');
 assert.equal(dueTone(day(0)),'warn');assert.equal(dueTone(day(3)),'warn');assert.equal(dueTone(day(7)),'warn');
 assert.equal(dueTone(day(8)),'','far dates stay muted');
 assert.equal(dueTone(''),'');assert.equal(dueTone(null),'');
});

test('the shared list-format helper preserves the boolean warning contract',()=>{
 assert.equal(hasDueWarning(day(-2)),true,'overdue dates warn');
 assert.equal(hasDueWarning(day(0)),true);assert.equal(hasDueWarning(day(7)),true);
 assert.equal(hasDueWarning(day(8)),false,'far dates stay muted');
 assert.equal(hasDueWarning(''),false);assert.equal(hasDueWarning(null),false);
});

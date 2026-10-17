import React from 'react';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {act,create,type ReactTestRenderer} from 'react-test-renderer';
Object.assign(globalThis,{React});require.extensions['.css']=()=>{};
const {Selector,foldSelectSearch}=require('../app/ui/select') as typeof import('../app/ui/select');
const {SelectCustom,PersonSelect}=require('../app/profile-controls') as typeof import('../app/profile-controls');
const options=[{value:'a',primary:'Lucía',secondary:'Producción',searchText:'lucia@example.invalid',kind:'person' as const},{value:'b',primary:'Otra opción',disabled:true}];
const text=(r:ReactTestRenderer)=>JSON.stringify(r.toJSON());

test('single and multi are controlled; disabled options cannot change selection; unknown values are retained',()=>{
 const changes:unknown[]=[];const record=(value:unknown)=>changes.push(value);let r!:ReactTestRenderer;
 act(()=>{r=create(<Selector presentation="inline" label="Persona" options={options} value="retained" onChange={record}/>);});
 assert.match(text(r),/Opción no disponible/);assert.equal(changes.length,0);
 const buttons=r.root.findAllByType('button');act(()=>buttons[1].props.onClick());assert.equal(changes.length,0);
 act(()=>buttons[0].props.onClick());assert.deepEqual(changes,['a']);assert.match(text(r),/Opción no disponible/,'caller controls the value');
 act(()=>r.update(<Selector presentation="inline" label="Personas" multiple options={options} value={['retained']} onChange={record}/>));
 act(()=>r.root.findAllByProps({type:'checkbox'})[0].props.onChange());assert.deepEqual(changes[1],['retained','a'],'missing selected IDs survive other edits');
 act(()=>r.update(<Selector presentation="inline" label="Personas" multiple options={options} value={['retained','a']} onChange={record}/>));
 act(()=>r.root.findAllByProps({type:'checkbox'})[0].props.onChange());assert.deepEqual(changes[2],['retained']);
 act(()=>r.unmount());
});

test('search includes accent-folded primary/secondary/extra text; empty differs from no results; error retains controlled selection',()=>{
 let r!:ReactTestRenderer;const changed:string[]=[];
 act(()=>{r=create(<Selector presentation="inline" label="Persona" searchable options={options} value="a" error="Cambio rechazado" onChange={v=>changed.push(v)}/>);});
 assert.equal(foldSelectSearch(null),'');assert.equal(foldSelectSearch(undefined),'');assert.equal(foldSelectSearch(' LUCÍA '),'lucia');
 const input=()=>r.root.findByProps({type:'search'});
 act(()=>input().props.onChange({target:{value:'PRODUCCION'}}));assert.equal(r.root.findAllByType('button').length,1);
 act(()=>input().props.onChange({target:{value:'lucia@'}}));assert.equal(r.root.findAllByType('button').length,1);
 act(()=>input().props.onChange({target:{value:'missing'}}));assert.match(text(r),/No hay coincidencias/);
 assert.match(text(r),/Cambio rechazado/);assert.equal(changed.length,0);
 act(()=>r.update(<Selector presentation="inline" label="Persona" searchable options={[]} value="a" onChange={v=>changed.push(v)}/>));
 assert.match(text(r),/No hay opciones disponibles/,'empty source is not a search failure');assert.match(text(r),/Opción no disponible/);
 act(()=>r.update(<Selector presentation="inline" label="Persona" options={options} value="a" loading onChange={v=>changed.push(v)}/>));
 assert.match(text(r),/Cargando opciones/);assert.equal(r.root.findAllByType('button').length,0);
 act(()=>r.unmount());
});

test('facades share one engine and use explicit metadata, never words in their display label',()=>{
 let r!:ReactTestRenderer;
 act(()=>{r=create(<SelectCustom label="Responsable persona custodio" value="a" choices={[{value:'a',label:'Estado'}]} onChange={()=>{}}/>);});
 assert.equal(r.root.findByType(Selector).props.variant,'plain');assert.equal(r.root.findAllByType(PersonSelect).length,0);
 act(()=>r.update(<SelectCustom label="Estado" variant="person" value="a" choices={[{value:'a',label:'Lucía'}]} onChange={()=>{}}/>));
 assert.equal(r.root.findByType(Selector).props.variant,'person');assert.equal(r.root.findAllByType(PersonSelect).length,1);
 act(()=>r.update(<SelectCustom label="Sin palabras especiales" value="a" choices={[{value:'a',label:'Lucía',kind:'person'}]} onChange={()=>{}}/>));
 assert.equal(r.root.findByType(Selector).props.variant,'person');act(()=>r.unmount());
});


test('explicit pinned empty action remains available while filtering inline entities',()=>{
 let r!:ReactTestRenderer;
 act(()=>{r=create(<Selector presentation="inline" label="Cliente" searchable options={[{value:'',primary:'Sin asignar',pinned:true},...options]} value="a" onChange={()=>{}}/>);});
 act(()=>r.root.findByProps({type:'search'}).props.onChange({target:{value:'produccion'}}));
 assert.equal(r.root.findAllByType('button').length,2);assert.match(text(r),/Sin asignar/);
 act(()=>r.unmount());
});

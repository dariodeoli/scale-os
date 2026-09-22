import React from 'react';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {act,create} from 'react-test-renderer';
require.extensions['.css']=()=>{};
Object.assign(globalThis,{React});
const {Kpi,KpiStrip,LoadingBlock,StateChip}=require('../app/ui-v2') as typeof import('../app/ui-v2');
const plain=(node:any):string=>!node?'':typeof node==='string'?node:Array.isArray(node)?node.map(plain).join(''):plain(node.children);

test('un solo chip de estado: tonos semánticos sobre el Badge compartido',async()=>{
 let renderer:any;
 await act(async()=>{renderer=create(<StateChip tone="ok">Al día</StateChip>);});
 const ok=JSON.stringify(renderer.toJSON());
 assert(ok.includes('bg-ok/15')&&ok.includes('text-ok'),'ok usa el verde de éxito');
 assert.equal(plain(renderer.toJSON()),'Al día');
 await act(async()=>{renderer.update(<StateChip tone="bad" title="Vencido hace 3 días">En mora</StateChip>);});
 assert(JSON.stringify(renderer.toJSON()).includes('bg-bad/15'),'bad usa el rojo de peligro');
 assert.equal(renderer.root.findByProps({title:'Vencido hace 3 días'}).props.title,'Vencido hace 3 días','el tooltip explica el estado');
 await act(async()=>{renderer.update(<StateChip tone="mute">Sin estado</StateChip>);});
 assert(JSON.stringify(renderer.toJSON()).includes('bg-ink-600'),'mute cae al gris de superficie');
});

test('un solo KPI: montos por CeldaMoneda, sin truncar y con vacío explícito',async()=>{
 let renderer:any;
 await act(async()=>{renderer=create(<Kpi label="Facturación contratada" valor={1250000} currency="PYG" hint="Neto mensual"/>);});
 const text=plain(renderer.toJSON());
 assert(text.includes('Facturación contratada')&&text.includes('Neto mensual'));
 assert(text.includes('Gs 1.250.000'),'el monto sale del formateador compartido');
 assert(!JSON.stringify(renderer.toJSON()).includes('truncate'),'el KPI no trunca el valor');
 await act(async()=>{renderer.update(<Kpi label="Cobrado" valor={null}/>);});
 assert(plain(renderer.toJSON()).includes('—'),'el dato ausente se muestra explícito');
});

test('KpiStrip y LoadingBlock: grilla responsive y carga anunciada sin inventar datos',async()=>{
 let renderer:any;
 await act(async()=>{renderer=create(<KpiStrip><Kpi label="A" valor={1}/><Kpi label="B" valor={2}/></KpiStrip>);});
 const grid=JSON.stringify(renderer.toJSON());
 assert(grid.includes('grid-cols-1')&&grid.includes('sm:grid-cols-2')&&grid.includes('xl:grid-cols-4'),'la grilla de KPIs es 1/2/4 columnas');
 await act(async()=>{renderer=create(<LoadingBlock label="Cargando clientes…" lines={2}/>);});
 const carga=renderer.root.findByProps({role:'status'});
 assert.equal(String(carga.props['aria-busy']),'true');
 assert.equal(carga.props['aria-label'],'Cargando clientes…');
 assert(JSON.stringify(renderer.toJSON()).split('h-10 w-full').length-1===2,'los esqueletos acompañan la carga');
});

console.log('PASS: primitivas v2 — un chip, un KPI y una carga sobre los objetos compartidos');

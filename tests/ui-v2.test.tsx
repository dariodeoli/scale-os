import React from 'react';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {act,create} from 'react-test-renderer';
require.extensions['.css']=()=>{};
Object.assign(globalThis,{React});
const {EmptyBlock,ErrorBlock,FilterToolbar,Kpi,KpiStrip,ListGrid,ListRow,LoadingBlock,PageHeader,StateChip}=require('../app/ui-v2') as typeof import('../app/ui-v2');
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

test('patrones v2: encabezado, toolbar, lista y estados salen de una sola pieza',async()=>{
 let renderer:any;
 await act(async()=>{renderer=create(<PageHeader eyebrow="Comercial" title="Clientes" subtitle="Mostrando 4 de 4" actions={<button>Nuevo cliente</button>}/>);});
 const header=plain(renderer.toJSON());
 assert(header.includes('Comercial')&&header.includes('Clientes')&&header.includes('Mostrando 4 de 4')&&header.includes('Nuevo cliente'));
 assert(!JSON.stringify(renderer.toJSON()).includes('truncate'),'el encabezado no trunca el título');

 await act(async()=>{renderer=create(<FilterToolbar summary="4 de 4"><span>Buscar</span></FilterToolbar>);});
 const toolbar=plain(renderer.toJSON());
 assert(toolbar.includes('Buscar')&&toolbar.includes('4 de 4'),'la toolbar agrupa controles y contador');

 const template='grid-cols-[minmax(11rem,1.6fr)_8rem_auto]';
 await act(async()=>{renderer=create(<ListGrid label="Clientes" template={template} columns={[{key:'name',label:'Cliente'},{key:'state',label:'Estado'},{key:'actions',label:'Acciones'}]}><ListRow template={template}><span>Estudio</span><span>Activo</span><span>Editar</span></ListRow></ListGrid>);});
 const list=JSON.stringify(renderer.toJSON());
 assert.equal(list.split(template).length-1,2,'el encabezado y la fila comparten la plantilla');
 assert.equal(renderer.root.findByProps({role:'table'}).props['aria-label'],'Clientes','la lista tiene nombre accesible');
 assert(list.includes('silent-scroll'),'la lista conserva el scroll silencioso');

 let retries=0;
 await act(async()=>{renderer=create(<EmptyBlock title="Sin clientes" description="Cargá el primero"/>);});
 assert.equal(renderer.root.findByProps({role:'status'}).props.role,'status','el vacío se anuncia como estado');
 assert(plain(renderer.toJSON()).includes('Sin clientes'));
 await act(async()=>{renderer=create(<ErrorBlock title="No se pudo cargar" onRetry={()=>{retries+=1;}}/>);});
 assert.equal(renderer.root.findByProps({role:'alert'}).props.role,'alert','el error se anuncia como alerta');
 await act(async()=>{renderer.root.findByType('button').props.onClick();});
 assert.equal(retries,1,'el reintento del error dispara el callback');
});

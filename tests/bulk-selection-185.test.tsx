import React from 'react';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {act,create,type ReactTestInstance,type ReactTestRenderer} from 'react-test-renderer';

Object.assign(globalThis,{React});
require.extensions['.css']=()=>{};
// El diálogo compartido se mockea (portal + foco); ui-v2 sólo lo necesita para ActionMenu.
const dialogPath=require.resolve('../app/dialog');
require.cache[dialogPath]={id:dialogPath,filename:dialogPath,loaded:true,exports:{ConfirmDialog:()=>null}} as NodeModule;

const {BulkBar,ListPage,PageChromeContext,PageTitleContext,ViewTabs,useBulkSelection}=require('../app/ui-v2') as typeof import('../app/ui-v2');
type BulkSelection=import('../app/bulk-selection').BulkSelection;

const text=(node:ReactTestInstance|string):string=>typeof node==='string'?node:node.children.map(text).join('');
const IDS=['a','b','c','d','e'];

// Pantalla mínima: expone el hook por una referencia y dibuja BulkBar con una acción.
let api!:BulkSelection;
const notices:string[]=[];
function Screen({role='owner',limit=3}:{role?:string;limit?:number}){
 const bulk=useBulkSelection({limit,noun:'presupuestos',onNotice:message=>notices.push(message)});
 api=bulk;
 return <div>
  <BulkBar count={bulk.count} total={limit} role={role} onSelectVisible={()=>bulk.selectVisible(IDS)} onClear={bulk.clear}><button type="button" className="secondary">Mover a la papelera</button></BulkBar>
  <output>{bulk.ids.join(',')}</output>
 </div>;
}
const mount=async(props:{role?:string;limit?:number}={})=>{let renderer!:ReactTestRenderer;notices.length=0;await act(async()=>{renderer=create(<Screen {...props}/>);});return renderer;};
const bar=(renderer:ReactTestRenderer)=>renderer.root.findAll(node=>node.type==='div'&&typeof node.props.className==='string'&&node.props.className.includes('bulk-bar'));
const button=(renderer:ReactTestRenderer,label:string)=>renderer.root.findAllByType('button').find(candidate=>text(candidate)===label)!;

test('useBulkSelection: alterna, respeta el tope con aviso y expone un Set',async()=>{
 const renderer=await mount();
 assert.equal(bar(renderer).length,0,'sin selección no hay barra');
 act(()=>api.toggle('a'));act(()=>api.toggle('b'));act(()=>api.toggle('c'));
 assert.deepEqual([...api.selected],['a','b','c']);
 assert.equal(api.has('b'),true);
 act(()=>api.toggle('d'));
 assert.deepEqual(api.ids,['a','b','c'],'al tope no suma');
 assert.deepEqual(notices,['El lote admite hasta 3 presupuestos. Quitá alguno para sumar otro.']);
 act(()=>api.toggle('b'));
 assert.deepEqual(api.ids,['a','c'],'alternar un elegido lo quita');
 act(()=>renderer.unmount());
});

test('useBulkSelection: seleccionar visibles recorta al tope, quita si ya estaban y limpia',async()=>{
 const renderer=await mount();
 act(()=>api.selectVisible(IDS));
 assert.deepEqual(api.ids,['a','b','c'],'se recorta al tope');
 assert.deepEqual(notices,['El lote admite hasta 3 presupuestos: se seleccionaron los primeros 3.']);
 act(()=>api.selectVisible(['a','b']));
 assert.deepEqual(api.ids,['c'],'si los visibles ya estaban todos, se quitan');
 act(()=>api.prune(['c','z']));
 assert.deepEqual(api.ids,['c'],'prune conserva lo que sigue vivo');
 act(()=>api.prune(['z']));
 assert.equal(api.count,0,'prune descarta lo que ya no está en la lista');
 act(()=>api.replace(['x','y','x']));
 assert.deepEqual(api.ids,['x','y'],'replace deduplica');
 act(()=>api.clear());
 assert.equal(api.count,0);
 act(()=>renderer.unmount());
});

test('BulkBar: contador, Seleccionar visibles, Limpiar y slot de acciones',async()=>{
 const renderer=await mount();
 act(()=>api.toggle('a'));
 assert.equal(bar(renderer).length,1);
 assert.match(text(bar(renderer)[0]),/1 de 3 seleccionado(?!s)/,'contador singular con tope');
 assert.ok(bar(renderer)[0].props.className.includes('bulk-bar-sticky'),'la barra es pegajosa');
 assert.equal(bar(renderer)[0].props.role,'status');
 assert.ok(button(renderer,'Mover a la papelera'),'el slot muestra la acción del lote');
 act(()=>button(renderer,'Seleccionar visibles').props.onClick());
 assert.match(text(bar(renderer)[0]),/3 de 3 seleccionados/,'contador plural');
 act(()=>button(renderer,'Limpiar').props.onClick());
 assert.equal(bar(renderer).length,0,'al limpiar la barra desaparece');
 act(()=>renderer.unmount());
});

test('BulkBar: el viewer nunca la ve (se oculta, no se deshabilita)',async()=>{
 const renderer=await mount({role:'viewer'});
 act(()=>api.toggle('a'));
 assert.equal(api.count,1);
 assert.equal(bar(renderer).length,0);
 assert.equal(renderer.root.findAllByType('button').length,0);
 act(()=>renderer.unmount());
});

test('ListPage: encabezado con acción primaria, apartados del shell y slots en orden',async()=>{
 let renderer!:ReactTestRenderer;
 await act(async()=>{renderer=create(<PageTitleContext.Provider value="Presupuestos"><PageChromeContext.Provider value={<nav aria-label="Apartados">tabs</nav>}>
  <ListPage primaryAction={<button type="button" className="primary">Nuevo presupuesto</button>} toolbar={<p>toolbar</p>} kpis={<p>kpis</p>} bulk={<p>bulk</p>}><p>contenido</p></ListPage>
 </PageChromeContext.Provider></PageTitleContext.Provider>);});
 const copy=text(renderer.root);
 assert.ok(copy.indexOf('Presupuestos')<copy.indexOf('Nuevo presupuesto'),'título y acción en el encabezado');
 assert.equal(renderer.root.findAllByType('h1').length,1,'un solo h1 con el título del shell');
 const header=renderer.root.findByType('header');
 assert.equal(header.props['data-page-navigation'],true,'el encabezado adopta los apartados del shell');
 assert.equal(header.findAllByType('nav').length,1,'la navegación vive dentro de la misma cabecera, sin una segunda fila de chrome');
 const order=['tabs','toolbar','kpis','bulk','contenido'].map(label=>copy.indexOf(label));
 assert.deepEqual(order,[...order].sort((a,b)=>a-b),'apartados, toolbar, KPI, lote y contenido en ese orden');
 act(()=>renderer.unmount());
});

test('ViewTabs: un solo carril de pestañas de vista con el selector segmentado',async()=>{
 const picked:string[]=[];
 let renderer!:ReactTestRenderer;
 await act(async()=>{renderer=create(<ViewTabs ariaLabel="Vista de prueba" value="a" onChange={value=>picked.push(value)} options={[['a','Uno'],['b','Dos']]}/>);});
 assert.equal(renderer.root.findAll(node=>typeof node.props.className==='string'&&node.props.className.split(/\s+/).includes('tab-scroller')).length,1,'usa el carril desplazable');
 const dos=renderer.root.findAllByType('button').find(candidate=>text(candidate).includes('Dos'))!;
 act(()=>dos.props.onClick());
 assert.deepEqual(picked,['b']);
 act(()=>renderer.unmount());
});

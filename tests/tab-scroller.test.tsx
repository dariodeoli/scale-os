import React from 'react';
import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {readFileSync} from 'node:fs';
import {act,create,type ReactTestRenderer} from 'react-test-renderer';
require.extensions['.css']=()=>{};
Object.assign(globalThis,{React});
const read=(path:string)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

// `TabScroller` sólo necesita window para escuchar scroll/resize; el chequeo de
// scrollWidth se resuelve con un nodo falso por `createNodeMock`.
const oldWindow=Object.getOwnPropertyDescriptor(globalThis,'window');
Object.defineProperty(globalThis,'window',{configurable:true,value:{addEventListener(){},removeEventListener(){},matchMedia:()=>({matches:false})}});
const {TabScroller}=require('../app/tab-scroller') as typeof import('../app/tab-scroller');

function trackNode(width:number,visible:number){
 const calls:number[]=[];
 return {calls,scrollWidth:width,clientWidth:visible,scrollLeft:0,addEventListener(){},removeEventListener(){},
  scrollBy(options:{left:number}){calls.push(options.left);this.scrollLeft=Math.max(0,options.left);}};
}

test('la barra desplazable muestra chevrones sólo si hay pestañas fuera de vista y desplaza de a bloques',async()=>{
 let renderer:ReactTestRenderer;
 const track=trackNode(420,200);
 await act(async()=>{renderer=create(<TabScroller label="apartados"><nav/></TabScroller>,{createNodeMock:()=>track});});
 const buttons=()=>renderer.root.findAllByType('button');
 assert.equal(buttons().length,2,'hay más pestañas que ancho: aparecen los chevrones');
 assert.deepEqual(buttons().map(button=>button.props['aria-label']),['Ver apartados anteriores','Ver apartados siguientes']);
 assert.equal(buttons()[0]!.props.disabled,true,'al inicio no hay anteriores');
 assert.equal(buttons()[1]!.props.disabled,false);
 await act(async()=>buttons()[1]!.props.onClick());
 assert.equal(track.calls.length,1,'el chevron desplaza el carril');
 assert.equal(track.calls[0],160,'un bloque de 80 % del ancho visible (mínimo 160 px)');
 await act(async()=>renderer!.unmount());

 const fit=trackNode(200,200);
 await act(async()=>{renderer=create(<TabScroller label="apartados"><nav/></TabScroller>,{createNodeMock:()=>fit});});
 assert.equal(renderer!.root.findAllByType('button').length,0,'si todo entra, no se dibujan chevrones ni se reserva espacio');
 await act(async()=>renderer!.unmount());
});

// Patrón único: apartados del shell (Equipo/Configuración incluidos), Producción,
// Inventario y planificador comparten el mismo carril scrolleable.
test('las barras de pestañas de los módulos usan el patrón único desplazable',()=>{
 const ui=read('app/ui-system.css');
 assert.match(ui,/\.tab-scroller-track\{[^}]*overflow-x:auto/,'el carril scrollea en horizontal');
 assert.match(ui,/@media\(max-width:760px\)\{\.tab-scroller-button\{width:44px;height:44px\}\}/,'los chevrones conservan 44 px en móvil');
 for(const [file,count] of [['app/scale-workspace.tsx',1],['app/sections/produccion.tsx',1],['app/inventory-workspace.tsx',2],['app/productivity-ui.tsx',1]] as const){
  const source=read(file);
  assert.equal((source.match(/<TabScroller/g)||[]).length,count,`${file} usa TabScroller`);
 }
 assert.match(read('app/scale-workspace.tsx'),/<TabScroller className="mb-3" label="apartados"><nav className="section-tabs/,'los apartados del shell scrollean con chevrones');
 for(const file of ['app/sections/produccion.tsx','app/inventory-workspace.tsx','app/productivity-ui.tsx']){
  assert.match(read(file),/max-lg:flex-nowrap/,'las barras de módulo no envuelven en móvil');
 }
 assert.ok(!/silent-scroll max-lg:max-w-full max-lg:overflow-x-auto/.test(read('app/inventory-workspace.tsx')),'Inventario dejó el scroll silencioso sin afordancia');
});

after(()=>{if(oldWindow)Object.defineProperty(globalThis,'window',oldWindow);});

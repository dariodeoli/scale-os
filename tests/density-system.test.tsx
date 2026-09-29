import React from 'react';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {act,create} from 'react-test-renderer';
Object.assign(globalThis,{React});require.extensions['.css']=()=>{};
const {BulkBar,PageHeader,PageTitleContext}=require('../app/ui-v2') as typeof import('../app/ui-v2');
const file=(path:string)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const plain=(node:any):string=>!node?'':typeof node==='string'?node:Array.isArray(node)?node.map(plain).join(''):plain(node.children);
const ui=file('app/ui-system.css');

test('sistema de densidad: un solo juego de tokens para todo el panel (#97)',()=>{
 const tokens=(name:string)=>new RegExp(`--${name}:`).test(ui);
 for(const token of ['ui-page-padding','ui-section-gap','ui-card-padding','ui-panel-padding','ui-control-height','ui-control-gap','ui-control-gap-lg','ui-card-min-height'])assert(tokens(token),`ui-system.css declara --${token}`);
 assert(/--ui-page-padding:16px/.test(ui),'el gutter móvil es 16 px');
 assert(/@media\(min-width:768px\)\{:root\{--ui-page-padding:24px/.test(ui),'desde 768 el gutter es 24 px');
 assert(/@media\(min-width:1280px\)\{:root\{--ui-page-padding:32px\}\}/.test(ui),'desde 1280 el gutter es 32 px (no 48)');
 assert(/--ui-control-height:40px/.test(ui),'control de 40 px en escritorio');
 assert(/--ui-card-min-height:120px/.test(ui),'piso compacto de tarjeta, sin espacios muertos');
 assert(/--ui-control-gap:var\(--ui-space-2\)/.test(ui)&&/@media\(min-width:768px\)\{:root\{--ui-page-padding:24px;--ui-control-gap:var\(--ui-space-3\)\}\}/.test(ui),'gap de controles 8 px móvil / 12 px escritorio');
 assert(/\.workspace-content\{padding:var\(--ui-space-4\) var\(--ui-page-padding\)/.test(ui),'el ritmo de página sale del token');
 assert(/\.workspace-topbar\{padding-inline:var\(--ui-page-padding\)\}/.test(ui),'la cabecera comparte el gutter de la página');
 const shell=file('app/scale-workspace.tsx');
 assert(shell.includes('className="workspace-content flex min-w-0 flex-1 flex-col"'),'el shell usa la clase del ritmo (sin gutter a mano)');
 assert(!/xl:px-12/.test(shell),'el gutter de 48 px se retiró del marco');
});

test('piso compacto de tarjeta: las tarjetas del sistema no reservan alto de más',()=>{
 for(const sheet of ['app/operations.css']){
  const css=file(sheet);
  assert(!/min-height:\s*(1[7-9][0-9]|2[0-9][0-9])px/.test(css),`${sheet} no fija min-height grande`);
  assert(css.includes('min-height:var(--ui-card-min-height')||!css.includes('min-height:'),`${sheet} usa el piso del sistema`);
 }
 for(const selector of ['.team-directory-card','.commission-hub-card','.finance-account-card','.budget-hub-card','.catalog-card']){
  const css=file('app/operations.css');
  assert(css.includes(`${selector}{`)&&new RegExp(`${selector.replace('.','\\.')}\\{[^}]*min-height:var\\(--ui-card-min-height`).test(css),`${selector} usa el piso compacto`);
 }
});

test('selección contextual: la barra de lote solo existe con selección',async()=>{
 let renderer:any;
 await act(async()=>{renderer=create(<BulkBar count={0} onClear={()=>{}}><button className="secondary">Archivar</button></BulkBar>);});
 assert.equal(renderer.toJSON(),null,'sin selección no ocupa fila');
 await act(async()=>{renderer=create(<BulkBar count={3} total={24} onClear={()=>{}}><button className="secondary">Archivar</button></BulkBar>);});
 const bar=renderer.toJSON() as any;
 assert.equal(bar.props.role,'status','anuncia el lote');
 assert.equal(bar.props['aria-live'],'polite');
 const copy=plain(bar);
 assert(copy.includes('3 de 24 seleccionados')&&copy.includes('Archivar')&&copy.includes('Limpiar'),'una línea con contador, acciones y limpiar');
 assert(String(bar.props.className).includes('bulk-bar'),'usa la barra del sistema (sin variantes locales)');
 await act(async()=>{renderer=create(<BulkBar count={1}><button className="secondary">Archivar</button></BulkBar>);});
 assert(plain(renderer.toJSON()).includes('1 seleccionado'),'el singular no agrega la ese');
 assert(/\.bulk-bar\{[^}]*min-height:var\(--ui-control-height,40px\)/.test(ui),'la barra mide 40 px en escritorio');
 assert(/@media\(max-width:760px\)\{\.bulk-bar\{min-height:44px\}/.test(ui),'y 44 px en móvil');
});

test('un solo título por pantalla: PageHeader no repite el título del shell (#97)',async()=>{
 let renderer:any;
 await act(async()=>{renderer=create(<PageTitleContext.Provider value="Comisiones y referidos"><PageHeader eyebrow="Equipo" title="Comisiones y referidos" subtitle="Liquidación del mes." actions={<button className="primary">Comisión</button>}/></PageTitleContext.Provider>);});
 const header=(renderer.toJSON() as any);
 assert(!JSON.stringify(header).includes('<h1')&&!plain(header).includes('Comisiones y referidos'),'el título repetido no se dibuja de nuevo');
 assert(plain(header).includes('Liquidación del mes.')&&plain(header).includes('Comisión'),'la fila queda para contexto y acciones');
 await act(async()=>{renderer=create(<PageTitleContext.Provider value="Finanzas"><PageHeader eyebrow="Finanzas" title="Estado de pagos" subtitle="Saldo pendiente por antigüedad."/></PageTitleContext.Provider>);});
 assert(plain(renderer.toJSON()).includes('Estado de pagos'),'un título propio de la sección se conserva');
 await act(async()=>{renderer=create(<PageHeader title="Pantalla sin shell"/>);});
 assert(plain(renderer.toJSON()).includes('Pantalla sin shell'),'fuera del shell el título sigue siendo obligatorio en la práctica');
 const shell=file('app/scale-workspace.tsx');
 assert(shell.includes('<PageTitleContext.Provider value={pageTitle}>'),'el shell publica el título de la página activa');
 assert(/const pageTitle = childSections\(active\)\.length>1 \? \(tabLabels\[active\] \|\| active\)/.test(shell),'con apartados publica la etiqueta de la tab activa');
});

test('diálogos y paneles laterales: encabezado y pie compactos, sin alto de más (#97)',()=>{
 const css=file('app/dialog.css');
 assert(/\.dialog-heading\{[^}]*min-height:56px/.test(css),'el encabezado no reserva 68 px');
 assert(/\.dialog-body\{[^}]*padding:var\(--ui-card-padding,16px\) var\(--ui-panel-padding,20px\)/.test(css),'el cuerpo usa el padding de card');
 assert(/\.dialog-footer\{[^}]*padding:12px var\(--ui-panel-padding,20px\)/.test(css),'el pie no reserva aire de más');
 assert(/\.dialog-footer:empty\{display:none\}/.test(css),'sin acciones el pie no existe (nada anclado al fondo)');
 const mobile=css.slice(css.indexOf('@media(max-width:540px)'));
 assert(mobile.includes('.dialog-heading{min-height:52px;padding:10px 16px}'),'en móvil el encabezado baja a 52 px y las acciones conservan 44');
});

import React from 'react';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {existsSync,readFileSync} from 'node:fs';
import {act,create,type ReactTestRenderer} from 'react-test-renderer';
require.extensions['.css']=()=>{};
Object.assign(globalThis,{React});
const {ViewSwitch}=require('../app/ui-v2') as typeof import('../app/ui-v2');
const read=(path:string)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

// #137 D: la vista Lista/Cuadrícula tiene UNA semántica para todas las pantallas.
// El par de botones declara `aria-pressed` (nunca dos checkboxes mutuamente
// excluyentes) y cada uno conserva su nombre accesible.
test('el selector lista/cuadrícula usa aria-pressed con nombres accesibles',async()=>{
 let renderer:ReactTestRenderer;let selected='list';
 await act(async()=>{renderer=create(<ViewSwitch value="list" onChange={value=>{selected=value;}}/>);});
 const buttons=renderer!.root.findAllByType('button');
 assert.equal(buttons.length,2);
 assert.deepEqual(buttons.map(button=>button.props['aria-label']),['Ver como lista','Ver como cuadrícula']);
 for(const button of buttons){
  assert.equal(button.props.type,'button');
  assert.equal(button.props.title,button.props['aria-label'],'el tooltip repite el nombre accesible');
  assert.equal(typeof button.props['aria-pressed'],'boolean');
 }
 assert.equal(buttons[0]!.props['aria-pressed'],true,'la vista activa lo declara');
 assert.equal(buttons[1]!.props['aria-pressed'],false);
 assert.equal(renderer!.root.findAllByType('input').length,0,'la vista no se dibuja con checkboxes');
 assert.equal(renderer!.root.findByProps({role:'group'}).props['aria-label'],'Cambiar vista');
 await act(async()=>buttons[1]!.props.onClick());
 assert.equal(selected,'grid');
 await act(async()=>renderer!.unmount());
});

// Las tres pantallas que mostraban el par comparten el objeto; la variante
// paralela (`ViewToggle`) quedó retirada en este pase.
test('las pantallas de lista/cuadrícula usan el selector único sin variantes muertas',()=>{
 const screens={equipo:read('app/operations.tsx'),proyectos:read('app/scale-workspace.tsx'),clientes:read('app/client-directory-toolbar.tsx')};
 for(const [name,source] of Object.entries(screens))assert.match(source,/ViewSwitch/,`${name} usa el selector único`);
 assert.match(screens.equipo!,/<ViewSwitch value=\{teamView==='list'\?'list':'grid'\} onChange=\{changeTeamView\}\/>/);
 assert.match(screens.proyectos!,/<ViewSwitch value=\{projectView as 'list'\|'grid'\} onChange=\{changeProjectView\}\/>/);
 assert.match(screens.clientes!,/<ViewSwitch value=\{view\} onChange=\{onViewChange\}\/>/);
 assert.equal(existsSync(new URL('../app/view-toggle.tsx',import.meta.url)),false,'no hay una segunda implementación del selector');
 assert.equal(existsSync(new URL('../app/view-toggle.module.css',import.meta.url)),false,'no quedan hojas de la variante retirada');
 assert.match(read('app/ui-v2.tsx'),/export type CollectionView = 'list' \| 'grid'/,'el tipo de vista vive con el primitivo');
});

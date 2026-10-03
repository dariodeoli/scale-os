import React from 'react';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {create} from 'react-test-renderer';
import {readFileSync} from 'node:fs';
Object.assign(globalThis,{React});
// Buscador global migrado a `PaletaComandos` (#135 P2): el destino de cada
// registro y la marca local siguen siendo contrato; el tope de la paleta y las
// acciones del shell viven en `dsn-135-adopcion.test.tsx`.
const {searchDestination}=require('../app/workspace-search') as typeof import('../app/workspace-search');
const {WorkspaceBrand}=require('../app/workspace-brand') as typeof import('../app/workspace-brand');

test('search destinations match their labels for every record kind',()=>{
 for(const [kind,destination] of [['clients','Clientes'],['projects','Proyectos'],['work-orders','Producción']] as const)
  assert.equal(searchDestination(kind),destination);
});

test('brand icon is included locally rather than depending on the agency site',()=>{
 const r=create(<WorkspaceBrand/>),img=r.root.findByType('img');
 assert.equal(img.props.src,'/brand/icon-192.png');assert.equal(img.props.width,34);assert.equal(img.props.height,34);
 const png=readFileSync(new URL('../public/brand/icon-192.png',import.meta.url));
 assert.equal(png.readUInt32BE(16),192);assert.equal(png.readUInt32BE(20),192);r.unmount();
});

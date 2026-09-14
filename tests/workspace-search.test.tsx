import React from 'react';
import assert from 'node:assert/strict';
import test from 'node:test';
import {act,create,type ReactTestRenderer} from 'react-test-renderer';
import {readFileSync} from 'node:fs';
Object.assign(globalThis,{React});
for(const [module,exports] of [
 ['../app/dialog',{Dialog:({children}:{children:React.ReactNode})=><section>{children}</section>}],
 ['../app/suite',{RecordEditor:()=>null}],
 ['../app/client-identity',{ClientIdentity:({name}:{name:string})=><span>{name}</span>}],
 ['../app/actor-identity',{ActorIdentity:()=>null}],
] as const){const id=require.resolve(module);require.cache[id]={id,filename:id,loaded:true,exports} as NodeModule;}
const {WorkspaceSearch}=require('../app/workspace-search') as typeof import('../app/workspace-search');
const {WorkspaceBrand}=require('../app/workspace-brand') as typeof import('../app/workspace-brand');
test('search destinations match their labels and close the search for every record kind',()=>{
 for(const [kind,destination] of [['clients','Clientes'],['projects','Proyectos'],['work-orders','Producción']] as const){
  const destinations:string[]=[];let r!:ReactTestRenderer;
  act(()=>{r=create(<WorkspaceSearch records={[{id:'1',kind,name:'Órbita',context:'Test'}]} navigate={label=>destinations.push(label)}/>);});
  act(()=>r.root.findByProps({'aria-label':'Buscar clientes, proyectos y órdenes'}).props.onClick());
  act(()=>r.root.findByProps({type:'search'}).props.onChange({target:{value:'orbita'}}));
  assert.equal(r.root.findAllByType('article').length,1);
  act(()=>r.root.findByProps({className:'text-button'}).props.onClick());
  assert.deepEqual(destinations,[destination]);assert.equal(r.root.findAllByType('section').length,0);
  act(()=>r.unmount());
 }
});
test('search caps rendering and reports the uncropped count',()=>{
 let r!:ReactTestRenderer;
 act(()=>{r=create(<WorkspaceSearch records={Array.from({length:35},(_,i)=>({id:String(i),kind:'clients',name:'Cliente '+i,context:''}))} navigate={()=>{}}/>);});
 act(()=>r.root.findByProps({'aria-label':'Buscar clientes, proyectos y órdenes'}).props.onClick());
 act(()=>r.root.findByProps({type:'search'}).props.onChange({target:{value:'cliente'}}));
 assert.equal(r.root.findAllByType('article').length,30);
 assert.equal(r.root.findByProps({role:'status'}).props.children,'35 resultados · mostrando los primeros 30');
 act(()=>r.unmount());
});
test('brand icon is included locally rather than depending on the agency site',()=>{
 const r=create(<WorkspaceBrand/>),img=r.root.findByType('img');
 assert.equal(img.props.src,'/brand/icon-192.png');assert.equal(img.props.width,34);assert.equal(img.props.height,34);
 const png=readFileSync(new URL('../public/brand/icon-192.png',import.meta.url));
 assert.equal(png.readUInt32BE(16),192);assert.equal(png.readUInt32BE(20),192);r.unmount();
});

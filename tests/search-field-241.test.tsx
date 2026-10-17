import React,{useState} from 'react';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
import {act,create,type ReactTestRenderer} from 'react-test-renderer';
require.extensions['.css']=()=>{};
Object.assign(globalThis,{React});
const {SearchField}=require('../app/search-field') as typeof import('../app/search-field');
const {ClientDirectoryToolbar}=require('../app/client-directory-toolbar') as typeof import('../app/client-directory-toolbar');
const {PlatformAccess}=require('../app/superadmin/access') as typeof import('../app/superadmin/access');

test('búsqueda controlada conserva pegado, label/aria, error y clear sin submit devolviendo foco',()=>{
 let renderer!:ReactTestRenderer,focused=0,last='';
 function Search(){const [value,setValue]=useState('');return <SearchField label="Buscar integrante" ariaLabel="Buscar personas" value={value} onChange={next=>{last=next;setValue(next);}} invalid describedBy="person-error"/>;}
 act(()=>{renderer=create(<Search/>,{createNodeMock:element=>element.type==='input'?{focus(){focused++;}}:null});});
 const input=()=>renderer.root.findByType('input');
 assert.equal(renderer.root.findByType('label').props.htmlFor,input().props.id);
 assert.equal(input().props['aria-label'],'Buscar personas');assert.equal(input().props['aria-describedby'],'person-error');assert.equal(input().props['aria-invalid'],true);
 assert.equal(input().props.onKeyDown,undefined,'no secuestra Enter, Escape ni composición: conserva teclado nativo');
 act(()=>input().props.onChange({target:{value:'Árbol +595 981'}}));assert.equal(last,'Árbol +595 981');assert.equal(input().props.value,last);
 const clear=renderer.root.findByType('button');assert.equal(clear.props.type,'button');assert.equal(clear.props['aria-label'],'Limpiar: Buscar personas');
 act(()=>clear.props.onClick());assert.equal(last,'');assert.equal(input().props.value,'');assert.equal(focused,1);assert.equal(renderer.root.findAllByType('button').length,0);
 act(()=>renderer.unmount());
});

test('disabled no cambia ni limpia; label solo aria y clearable=false conservan contrato',()=>{
 let writes=0,renderer!:ReactTestRenderer;
 act(()=>{renderer=create(<SearchField ariaLabel="Buscar equipos" value="DJI" disabled onChange={()=>writes++}/>);});
 const input=renderer.root.findByType('input'),clear=renderer.root.findByType('button');
 assert.equal(input.props.disabled,true);assert.equal(clear.props.disabled,true);assert.equal(renderer.root.findByType('label').props.className,'sr-only');
 act(()=>{input.props.onChange({target:{value:'Otro'}});clear.props.onClick();});assert.equal(writes,0);
 act(()=>renderer.update(<SearchField label="Buscar" value="DJI" clearable={false} onChange={()=>writes++}/>));
 assert.equal(renderer.root.findAllByType('button').length,0);act(()=>renderer.unmount());
});

test('Cliente real recibe texto, mantiene restricción de contactos y clear al mismo callback',()=>{
 let query='',renderer!:ReactTestRenderer;
 const props={canCreate:false,contactVisible:false,onCreate(){},onQueryChange(next:string){query=next;},onStatusChange(){},onViewChange(){},query:'uno',resultCount:1,status:'',totalCount:1,view:'list' as const};
 act(()=>{renderer=create(<ClientDirectoryToolbar {...props}/>);});
 const input=renderer.root.findByType('input');assert.equal(input.props.placeholder,'Buscar por nombre');
 act(()=>input.props.onChange({target:{value:'Empresa'}}));assert.equal(query,'Empresa');
 act(()=>renderer.root.findByProps({'aria-label':'Limpiar: Buscar clientes'}).props.onClick());assert.equal(query,'');
 act(()=>renderer.unmount());
});

test('Superadmin real filtra usuarios, limpia y conserva modo solo lectura sin mutaciones',()=>{
 let mutations=0,renderer!:ReactTestRenderer;
 const users=[{id:1,email:'ana@example.invalid',full_name:'Ana',active_agencies:1,platform_admin:false,agency_names:['Norte']},{id:2,email:'bruno@example.invalid',full_name:'Bruno',active_agencies:1,platform_admin:false,agency_names:['Sur']}];
 act(()=>{renderer=create(<PlatformAccess busy={false} state={{users} as any} page={{hasMore:false,total:2,offset:0,limit:50} as any} onMore={()=>{}} writable={false} setConfirming={()=>{mutations++;}} selfRow={()=>false} setPlatformAccess={async()=>{mutations++;}}/>);});
 // Render tree text avoids serializing component props that include React owners.
 const names=()=>renderer.root.findAllByProps({className:'person-container-name'}).map(node=>node.children.join(''));
 assert.deepEqual(names(),['Ana','Bruno']);
 act(()=>renderer.root.findByType('input').props.onChange({target:{value:'bruno'}}));assert.deepEqual(names(),['Bruno']);
 act(()=>renderer.root.findByProps({'aria-label':'Limpiar: Buscar usuario'}).props.onClick());assert.deepEqual(names(),['Ana','Bruno']);assert.equal(mutations,0);
 act(()=>renderer.unmount());
});

test('adopción completa: ningún consumidor importa SearchField externo ni conserva hacks de icono',()=>{
 const paths:string[]=[];
 const walk=(dir:string)=>{for(const file of readdirSync(dir,{withFileTypes:true})){const path=join(dir,file.name);if(file.isDirectory())walk(path);else if(path.endsWith('.tsx'))paths.push(path);}};
 walk('app');let consumers=0;
 for(const path of paths){const source=readFileSync(path,'utf8');assert.doesNotMatch(source,/import\s*\{[^}]*\bSearchField\b[^}]*\}\s*from\s*['"]owncoding-ui['"]/,path);
  if(source.includes('<SearchField')){consumers++;for(const tag of source.match(/<SearchField\b[\s\S]*?\/>/g)||[])assert.doesNotMatch(tag,/\[&>|event\.target\.value/,path);}
 }
 assert(consumers>=19,'cubre todos los consumidores, no solo un ejemplo');
});

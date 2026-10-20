import React from 'react';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {act,create} from 'react-test-renderer';
import {clientSelectChoices} from '../app/client-identity-data';
Object.assign(globalThis,{React});
require.extensions['.css']=()=>{};
const {SelectCustom}=require('../app/profile-controls') as typeof import('../app/profile-controls');

test('client identity metadata follows distinct clients through saved selection and fallback',()=>{
 const clients=[{id:11,name:'Cliente A',logo_url:'https://images.example.invalid/a.webp',legal_name:'Empresa A',tax_id:'80000001-1'},{id:12,name:'Cliente B',logo_url:'https://images.example.invalid/b.webp'},{id:13,name:'Sin foto',logo_url:null}];
 const choices=clientSelectChoices(clients);
 assert.equal(choices[0].secondary,'Empresa A · 80000001-1');
 assert.match(choices[0].searchText,/80000001-1/);
 let renderer!:ReturnType<typeof create>;
 act(()=>{renderer=create(<SelectCustom label="Cliente" value="11" choices={choices} onChange={()=>{}}/>);});
 assert.equal(renderer.root.findByType('img').props.src,clients[0].logo_url);
 act(()=>renderer.update(<SelectCustom label="Cliente" value="12" choices={clientSelectChoices(JSON.parse(JSON.stringify(clients)))} onChange={()=>{}}/>));
 assert.equal(renderer.root.findByType('img').props.src,clients[1].logo_url,'reopening another saved client shows its own photo');
 act(()=>renderer.update(<SelectCustom label="Cliente" value="13" choices={choices} onChange={()=>{}}/>));
 assert.equal(renderer.root.findAllByType('img').length,0,'missing photo stays honest initials fallback');
 assert.match(JSON.stringify(renderer.toJSON()),/Sin foto/);
 act(()=>renderer.unmount());
});

test('new project client field keeps logo when switching and reopening a saved selection',async()=>{
 const {ProjectForm}=require('../app/workspace-forms') as typeof import('../app/workspace-forms');
 const clients=[{id:'31',name:'Primero',logo_url:'https://images.example.invalid/project31.webp'},{id:'32',name:'Segundo',logo_url:'https://images.example.invalid/project32.webp'}] as Parameters<typeof ProjectForm>[0]['clients'];
 const request=async<T,>()=>({} as T);
 let renderer!:ReturnType<typeof create>;
 await act(async()=>{renderer=create(<ProjectForm clients={clients} initialClientId="31" request={request} done={()=>{}}/>);});
 assert.equal(renderer.root.findByType('img').props.src,clients[0].logo_url);
 await act(async()=>renderer.root.findAllByType(SelectCustom).find(node=>node.props.label==='Cliente')!.props.onChange('32'));
 assert.equal(renderer.root.findByType('img').props.src,clients[1].logo_url);
 act(()=>renderer.unmount());
 await act(async()=>{renderer=create(<ProjectForm clients={clients} initialClientId="32" request={request} done={()=>{}}/>);});
 assert.equal(renderer.root.findByType('img').props.src,clients[1].logo_url);
 act(()=>renderer.unmount());
});

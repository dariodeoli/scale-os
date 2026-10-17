import React from 'react';import assert from 'node:assert/strict';import{test}from'node:test';import{act,create,type ReactTestRenderer}from'react-test-renderer';import{readFileSync}from'node:fs';
Object.assign(globalThis,{React});require.extensions['.css']=()=>{};
const{CompanyLegalProfile}=require('../app/company-legal-profile')as typeof import('../app/company-legal-profile');const{SelectCustom}=require('../app/profile-controls')as typeof import('../app/profile-controls');const{Editor,ApiFieldError}=require('../app/operations')as typeof import('../app/operations');
const catalog={version:'owncoding-ui@0.68.19',source:'OwnCoding inherited',status:'inherited-catalog',official:false,records:[{id:'fixture:a',city:'Ciudad de prueba',department:'Departamento A'},{id:'fixture:b',city:'Otra ciudad',department:'Departamento B'}]};
const profile={revision:4,city:'Ciudad histórica libre',department:'Nombre anterior',legal_representative_name:'Representante sintético',legal_representative_document:'',legal_representative_role:'',provenance:{},locality_id:null};
const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json'}}),tick=()=>new Promise(done=>setImmediate(done));
const host=()=>({closest(){return null;},focus(){},querySelector(){return null;},querySelectorAll(){return[];},contains(){return true;},addEventListener(){},removeEventListener(){}});
const plain=(node:any):string=>typeof node==='string'?node:(node.children||[]).map(plain).join('');
const input=(view:ReactTestRenderer,name:string)=>view.root.findAllByType('input').find(node=>node.props.name===name)!;
const selection=(view:ReactTestRenderer)=>view.root.findAllByType(SelectCustom).find(node=>node.props.label.startsWith('Localidad del catálogo'))!;
const submit=(view:ReactTestRenderer)=>act(async()=>{await view.root.findByType('form').props.onSubmit({preventDefault(){},persist(){}});await tick();});

test('legacy locality remains untouched; explicit selection fills a draft, manual keeps it and PATCH uses canonical errors',async()=>{
 const before=globalThis.fetch,writes:any[]=[];globalThis.fetch=async(_url,init)=>{if(init?.method==='PATCH'){const body=JSON.parse(String(init.body));writes.push(body);return json({profile:{...profile,...body,revision:5,provenance:{city:{source:'manual'}}}});}return json({profile,locality_catalog:catalog});};let view!:ReactTestRenderer;
 try{await act(async()=>{view=create(<CompanyLegalProfile organizationId="a" userId="u"/>,{createNodeMock:host});await tick();});assert.equal(view.root.findByType(Editor).props.formHandle.current.getValues().city,'Ciudad histórica libre');assert.equal(view.root.findByType(Editor).props.defaults.city,'Ciudad histórica libre');assert.equal(selection(view).props.value,'');
 await act(async()=>selection(view).props.onChange('fixture:a'));assert.equal(input(view,'city').props.disabled,true);assert.equal(view.root.findByType(Editor).props.formHandle.current.getValues().city,'Ciudad de prueba');assert.equal(view.root.findByType(Editor).props.formHandle.current.getValues().department,'Departamento A');
 await act(async()=>selection(view).props.onChange(''));assert.equal(input(view,'city').props.disabled,false);assert.equal(view.root.findByType(Editor).props.formHandle.current.getValues().city,'Ciudad de prueba','manual preserves last selected draft');
 await act(async()=>input(view,'city').props.onChange({target:{name:'city',value:'Localidad extranjera libre'},type:'change'}));await submit(view);assert.equal(writes.length,1);assert.equal(writes[0].locality_id,null);assert.equal(writes[0].expected_revision,4);assert.equal(writes[0].city,'Localidad extranjera libre');assert.equal(writes[0].locality_catalog_version,undefined);
 }finally{act(()=>view?.unmount());globalThis.fetch=before;}
});
test('selected pairs are checked before fetch, server field errors and409 retain draft and revision',async()=>{
 const before=globalThis.fetch;let writes=0,fail=400;globalThis.fetch=async(_url,init)=>init?.method==='PATCH'?(writes++,json({error:fail===400?'Pareja no válida':'El perfil cambió. Actualizá antes de guardar.',fieldErrors:fail===400?{department:'Revisá el departamento seleccionado.'}:undefined},fail)):json({profile,locality_catalog:catalog});let view!:ReactTestRenderer;
 try{await act(async()=>{view=create(<CompanyLegalProfile organizationId="a" userId="u"/>,{createNodeMock:host});await tick();});await act(async()=>selection(view).props.onChange('fixture:a'));
 await assert.rejects(()=>view.root.findByType(Editor).props.save({...profile,locality_id:'fixture:a',city:'Otra',department:'Departamento A'}),cause=>cause instanceof ApiFieldError&&cause.status===400);assert.equal(writes,0);
 await submit(view);assert.equal(writes,1);assert.match(plain(view.root),/Revisá el departamento seleccionado/);assert.equal(selection(view).props.value,'fixture:a');assert.equal(view.root.findByType(Editor).props.formHandle.current.getValues().city,'Ciudad de prueba');
 fail=409;await act(async()=>selection(view).props.onChange('fixture:b'));await submit(view);assert.equal(writes,2);assert.match(plain(view.root),/El perfil cambió/);assert.equal(view.root.findByType(Editor).props.defaults.city,'Ciudad histórica libre');assert.equal(view.root.findByType(Editor).props.formHandle.current.getValues().city,'Otra ciudad');
 }finally{act(()=>view?.unmount());globalThis.fetch=before;}
});
test('loading a previously associated ID never normalizes the stored city silently',async()=>{
 const before=globalThis.fetch,writes:any[]=[];globalThis.fetch=async(_url,init)=>{if(init?.method==='PATCH')writes.push(JSON.parse(String(init.body)));return json({profile:{...profile,locality_id:'fixture:a',city:'ciudad DE prueba',department:'departamento a'},locality_catalog:catalog});};let view!:ReactTestRenderer;
 try{await act(async()=>{view=create(<CompanyLegalProfile organizationId="a" userId="u"/>,{createNodeMock:host});await tick();});assert.equal(view.root.findByType(Editor).props.formHandle.current.getValues().city,'ciudad DE prueba');await submit(view);assert.equal(writes[0].city,'ciudad DE prueba','unchanged stored spelling reaches canonical server validation');await act(async()=>selection(view).props.onChange(''));await act(async()=>selection(view).props.onChange('fixture:a'));assert.equal(view.root.findByType(Editor).props.formHandle.current.getValues().city,'Ciudad de prueba','reselection is an explicit draft change');}
 finally{act(()=>view?.unmount());globalThis.fetch=before;}
});
test('client receives only API data, never the library catalog or its engine',()=>{
 for(const path of ['app/company-locality-data.ts','app/company-legal-profile.tsx'])assert.doesNotMatch(readFileSync(path,'utf8'),/from ['"]owncoding-ui(?:\/utils)?['"]|LOCALITIES_PARAGUAY|resolveLocality/);
});

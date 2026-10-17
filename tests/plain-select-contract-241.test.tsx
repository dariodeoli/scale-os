import React from 'react';
import assert from 'node:assert/strict';
import {act,create,type ReactTestRenderer,type ReactTestInstance} from 'react-test-renderer';
Object.assign(globalThis,{React});
require.extensions['.css']=()=>{};
const reactDom=require('react-dom');
const domId=require.resolve('react-dom');
require.cache[domId]={id:domId,filename:domId,loaded:true,exports:{...reactDom,createPortal:(children:React.ReactNode)=>children}} as NodeModule;
const {SelectCustom}=require('../app/profile-controls') as typeof import('../app/profile-controls');
import type {SelectProps} from '../app/profile-controls';

async function main(){
 let r:ReactTestRenderer,trigger:FakeNode|null=null;
 const focused:string[]=[];
 type FakeNode={name:string;tabIndex:number;focus:()=>void;hasAttribute:(key:string)=>boolean;closest:()=>null;getClientRects:()=>object[]};
 const doc={activeElement:null as FakeNode|null,body:{},addEventListener(){},removeEventListener(){},querySelectorAll:()=>[before,trigger,after].filter(Boolean)};
 const node=(name:string):FakeNode=>({name,tabIndex:0,focus(){doc.activeElement=this;focused.push(name);},hasAttribute:()=>false,closest:()=>null,getClientRects:()=>[{}]});
 const before=node('before'),after=node('after');
 Object.assign(globalThis,{document:doc,window:{innerWidth:1024,innerHeight:768,addEventListener(){},removeEventListener(){}}});
 const optionCache=new Map<ReactTestInstance,FakeNode>();
 const options=()=>r.root.findAllByType('button').filter(x=>x.props.role==='option');
 const optionNodes=()=>options().filter(option=>!option.props.disabled).map(option=>{
  if(!optionCache.has(option))optionCache.set(option,node(`option-${options().indexOf(option)}`));
  return optionCache.get(option)!;
 });
 const menu={contains:(candidate:FakeNode)=>optionNodes().includes(candidate),querySelector:(selector:string)=>{
  const selected=options().find(option=>option.props['aria-selected']&&!option.props.disabled);
  if(selector.includes('aria-selected')){if(selected){optionNodes();return optionCache.get(selected);}return undefined;}
  return optionNodes()[0];
 },querySelectorAll:()=>optionNodes()};
 const createNodeMock=(element:{type:unknown;props:Record<string,unknown>})=>{
  if(element.props.className==='ops-select-trigger'){
   trigger=Object.assign(node('trigger'),{getBoundingClientRect:()=>({top:50,bottom:90,left:50,width:200})});return trigger;
  }
  if(element.props.className==='ops-select')return{closest:()=>null,contains:(candidate:FakeNode)=>candidate===trigger};
  if(element.props.className==='ops-select-options ops-select-floating')return menu;
  return null;
 };
 const key=async(value:string,shiftKey=false)=>{
  let prevented=false,stopped=false;
  await act(async()=>r.root.findByProps({className:'ops-select'}).props.onKeyDown({key:value,shiftKey,preventDefault(){prevented=true;},stopPropagation(){stopped=true;}}));
  return {prevented,stopped};
 };
 const open=async()=>{await act(async()=>r.root.findByProps({className:'ops-select-trigger'}).props.onClick());};
 const mount=async(props:SelectProps)=>{optionCache.clear();await act(async()=>{r=create(<SelectCustom {...props}/>,{createNodeMock});});};
 const unmount=async()=>{await act(async()=>r.unmount());};
 const changes:string[]=[];
 const choices=[
  {value:'off',label:'Inactivo',disabled:true},
  {value:'a',label:'Águila',secondary:'Empresa del sur',searchText:'RUC 123456',kind:'entity' as const,photoUrl:'/logos/aguila.png'},
  {value:'b',label:'Beta'},
  {value:'off2',label:'No disponible',disabled:true},
 ];
 const props:SelectProps={label:'Empresa responsable',value:'off',kind:'entity',choices,onChange:value=>changes.push(value),searchable:true};
 await mount(props);assert.equal(r!.root.findAllByProps({role:'combobox'}).length,0,'entity logo never selects PersonSelect heuristic');
 await open();
 assert.equal(doc.activeElement?.name,'option-1','initial focus skips disabled selected choice');
 const logo=r!.root.findByType(require('../app/foto-perfil').FotoPerfil);
 assert.equal(logo.props.variante,'logo');assert.equal(logo.props.foto,'/logos/aguila.png','selector delegates photo policy and fallback to the existing canonical identity');
 assert.equal(options()[0].props.disabled,true);assert.equal(options()[0].props['aria-disabled'],true);
 await act(async()=>options()[0].props.onClick());assert.equal(changes.length,0,'even programmatic click of disabled option cannot emit');
 await key('ArrowDown');assert.equal(doc.activeElement?.name,'option-2');
 await key('ArrowDown');assert.equal(doc.activeElement?.name,'option-1','wrap skips disabled');
 await key('End');assert.equal(doc.activeElement?.name,'option-2');
 await key('Home');assert.equal(doc.activeElement?.name,'option-1');
 const search=()=>r!.root.findByType('input');
 for(const query of ['aguila','del sur','123456']){
  await act(async()=>search().props.onChange({target:{value:query}}));
  assert.equal(options().length,1,`search ${query} includes folded label/secondary/searchText`);
 }
 await act(async()=>search().props.onChange({target:{value:'no-match'}}));
 assert.equal(options().length,0);assert(r!.root.findAllByProps({role:'status'}).some(x=>x.children.includes('No hay coincidencias.')));
 await key('ArrowDown'); // No enabled options is safe.
 await act(async()=>search().props.onChange({target:{value:''}}));
 const escape=await key('Escape');assert(escape.prevented&&escape.stopped);assert.equal(doc.activeElement?.name,'trigger');
 await open();const tab=await key('Tab');assert(tab.prevented);assert.equal(doc.activeElement?.name,'after','Tab exits to next form control, not trigger');
 await open();await key('Tab',true);assert.equal(doc.activeElement?.name,'before','Shift+Tab exits backward');
 await open();await act(async()=>options()[2].props.onClick());assert.deepEqual(changes,['b']);assert.equal(doc.activeElement?.name,'trigger');
 await unmount();
 for(const state of [{loading:true,loadingText:'Buscando entidades'},{error:'No se pudieron cargar'},{choices:[],emptyText:'Sin empresas'}]){
  await mount({...props,...state});await open();assert.equal(options().length,0);
  const text=JSON.stringify(r!.toJSON());
  assert(text.includes(String('loadingText' in state?state.loadingText:'error' in state?state.error:'Sin empresas')));
  if('loading' in state)assert.equal(r!.root.findByProps({role:'listbox'}).props['aria-busy'],true);
  if('error' in state)assert(r!.root.findAllByProps({role:'alert'}).length>0);
  await unmount();
 }
 await mount({...props,value:'b'});await open();assert.equal(doc.activeElement?.name,'option-2','selected enabled option takes initial focus before first DOM option');await unmount();
 await mount({...props,disabled:true});await open();assert.equal(options().length,0,'disabled trigger cannot open');await unmount();
 await mount(props);await open();await act(async()=>r!.update(<SelectCustom {...props} disabled/>));assert.equal(options().length,0,'becoming disabled closes open menu');await unmount();
 // Historical scalar selectors without added metadata remain plain and have same change API.
 await mount({label:'Moneda',value:'PYG',choices:[{value:'PYG',label:'Guaraníes'},{value:'USD',label:'Dólares'}],onChange:value=>changes.push(value)});
 await open();assert.equal(r!.root.findAllByType('input').length,0,'search threshold unchanged without opt-in');
 await act(async()=>options()[1].props.onClick());assert.equal(changes.at(-1),'USD');
 await unmount();
 console.log('PASS: PlainSelect #241 — explicit entity identity, disabled options, search metadata, states, keyboard and portal Tab exit (fake DOM)');
}
void main();

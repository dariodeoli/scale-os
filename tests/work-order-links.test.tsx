import React from 'react';
import assert from 'node:assert/strict';
import {act,create,type ReactTestRenderer} from 'react-test-renderer';

Object.assign(globalThis,{React});
require.extensions['.css']=()=>{};
const {WorkOrderLinks}=require('../app/work-order-links') as typeof import('../app/work-order-links');
type Link={id:string;label:string;url:string;visible_to_client:boolean;created_at:string};
let saved:Link[]=[
 {id:'1',label:'Brief',url:'https://drive.google.com/brief',visible_to_client:false,created_at:'2026-09-10T12:00:00Z'},
 {id:'2',label:'Aprobación',url:'https://drive.google.com/aprobacion',visible_to_client:true,created_at:'2026-09-11T12:00:00Z'},
];
const requests:{path:string;method:string;body:Record<string,unknown>|null}[]=[];
globalThis.fetch=async(input,init={})=>{
 const path=String(input),method=init?.method||'GET',body=init?.body?JSON.parse(String(init.body)):null;
 requests.push({path,method,body});
 if(method==='GET')return Response.json({links:saved});
 if(method==='POST'){saved.push({id:'3',label:body!.label as string,url:body!.url as string,visible_to_client:false,created_at:'2026-09-12T12:00:00Z'});return Response.json({link:saved.at(-1)});}
 if(method==='PATCH'){const id=path.split('/').at(-1)!;saved=saved.map(link=>link.id===id?{...link,visible_to_client:body!.visible_to_client as boolean}:link);return Response.json({link:saved.find(link=>link.id===id)});}
 throw Error('unexpected method');
};
const text=(renderer:ReactTestRenderer)=>JSON.stringify(renderer.toJSON());
const checkboxes=()=>renderer.root.findAllByProps({type:'checkbox'});
async function mount(role:string){await act(async()=>{renderer=create(<WorkOrderLinks orderId="41" role={role}/>);});}
let renderer!:ReactTestRenderer;

async function main(){
 await mount('editor');
 assert.equal(requests.length,1);assert.equal(requests[0].path,'/core-api/api/agency/work-orders/41/links');
 assert.equal(checkboxes().length,2,'writers see a visibility toggle per link');
 assert.equal(checkboxes()[0].props.checked,false,'links default to private');
 assert.equal(checkboxes()[1].props.checked,true);
 assert.match(text(renderer),/Visible en el portal/);
 await act(async()=>checkboxes()[0].props.onChange({target:{checked:true}}));
 assert.equal(requests.at(-1)?.method,'PATCH');assert.equal(requests.at(-1)?.path,'/core-api/api/agency/work-orders/41/links/1');
 assert.deepEqual(requests.at(-1)?.body,{visible_to_client:true});
 assert.equal(checkboxes()[0].props.checked,true,'toggle applies immediately');
 await act(async()=>checkboxes()[1].props.onChange({target:{checked:false}}));
 assert.deepEqual(requests.at(-1)?.body,{visible_to_client:false});
 assert.equal(checkboxes()[1].props.checked,false,'removing visibility applies immediately');
 // Adding a link keeps the stored visibility default private.
 const [labelInput,urlInput]=renderer.root.findAllByType('input').filter(node=>node.props.type!=='checkbox');
 await act(async()=>{labelInput.props.onChange({target:{value:'Nueva carpeta'}});urlInput.props.onChange({target:{value:'https://drive.google.com/nueva'}});});
 const submit=renderer.root.findByType('form').props.onSubmit({preventDefault(){}});
 await act(async()=>{await submit;});
 assert.ok(requests.some(request=>request.method==='POST'&&request.body?.label==='Nueva carpeta'),'new links POST with label and URL');
 assert.equal(saved.at(-1)?.visible_to_client,false);
 renderer.unmount();
 await mount('viewer');
 assert.equal(checkboxes().length,0,'readers never see the visibility toggle');
 assert.match(text(renderer),/Solo interno/);assert.match(text(renderer),/Visible en el portal/);
 assert.equal(renderer.root.findAllByType('form').length,0,'readers cannot add links');
 renderer.unmount();
 console.log('PASS: work-order link visibility toggles PATCH immediately, defaults private, and readers only see the state');
}
void main().catch(error=>{console.error(error);process.exitCode=1;});

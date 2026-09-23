import React from 'react';
import assert from 'node:assert/strict';
import test from 'node:test';
import {act,create,type ReactTestRenderer} from 'react-test-renderer';
require.extensions['.css']=()=>{};
const writes:{path:string;body:unknown;method:string}[]=[];
const requests=[
 {id:'1',full_name:'Valid',email:'valid@example.invalid',role:'viewer',status:'pending',unavailableReason:null},
 {id:'2',full_name:'Revoked',email:'revoked@example.invalid',role:'viewer',status:'unavailable',unavailableReason:'revoked'},
 {id:'3',full_name:'Expired',email:'expired@example.invalid',role:'finance',status:'unavailable',unavailableReason:'expired'},
 {id:'4',full_name:'Owner',email:'owner@example.invalid',role:'owner',status:'pending',unavailableReason:null},
];
const id=require.resolve('../app/operations');
require.cache[id]={id,filename:id,loaded:true,exports:{Editor:()=>null,api:async(path:string,body?:unknown,method='POST')=>{
 if(body!==undefined){writes.push({path,body,method});return {ok:true};}
 if(path==='/api/agency/invite-links')return {links:[]};
 assert.equal(path,'/api/agency/access-requests');return {requests};
}}} as NodeModule;
Object.assign(globalThis,{React});
const {InviteLinks}=require('../app/invite-links') as typeof import('../app/invite-links');
test('invalid requests explain unavailability and have no approval action; valid request keeps role checks',async()=>{
 let r:ReactTestRenderer;await act(async()=>{r=create(<InviteLinks role="admin"/>);});
 const articles=r!.root.findAll(node=>node.props.role==='row'&&!String(node.props.className||'').includes('uppercase'));
 assert.equal(articles.length,4);
 const approvals=(i:number)=>articles[i].findAllByType('button').filter(b=>b.props.children==='Aprobar acceso');
 assert.equal(approvals(0).length,1);assert.equal(approvals(0)[0].props.disabled,false);
 assert.equal(approvals(1).length,0);assert.equal(approvals(2).length,0);
 assert.equal(approvals(3)[0].props.disabled,true,'admin cannot approve owner');
 const text=JSON.stringify(r!.toJSON());assert(text.includes('El enlace fue revocado'));assert(text.includes('El enlace venció'));
 await act(async()=>{await approvals(0)[0].props.onClick();});assert.deepEqual(writes,[{path:'/api/agency/access-requests/1',body:{action:'approve'},method:'PATCH'}]);
 assert(articles[1].findAllByType('button').some(b=>String(b.props.children).includes('Rechazar')),'unavailable requests can still be dismissed');
 await act(async()=>r!.unmount());
});

import React from 'react';
import assert from 'node:assert/strict';
import {act,create,type ReactTestRenderer} from 'react-test-renderer';
require.extensions['.css']=()=>{};Object.assign(globalThis,{React});
const {WeeklyReport,emptyWeeklyMetrics,weekMonday}=require('../app/weekly-report') as typeof import('../app/weekly-report');
assert.equal(weekMonday('2026-09-13'),'2026-09-07');assert.equal(weekMonday('2026-09-14'),'2026-09-14');assert.equal(weekMonday('2026-02-30'),'');
assert.equal(emptyWeeklyMetrics().videos.completed,null);
let payload:any,putCount=0,resolvePut:(value:any)=>void;
Object.assign(globalThis,{fetch:async(url:string,options:any)=>{
 const week=new URL('https://test'+url).searchParams.get('week');
 if(options.method==='PUT'){putCount++;payload=JSON.parse(options.body);return new Promise(resolve=>{resolvePut=resolve;});}
 return {ok:true,json:async()=>({records:[],week,scope:'own',source:'declared',canViewTeam:true,canEdit:true})};
}});
async function main(){
 let renderer:ReactTestRenderer;
 await act(async()=>{renderer=create(<WeeklyReport organizationId="1"/>);});
 const root=()=>renderer!.root;
 assert.equal(root().findAllByType('input').filter(i=>i.props.type==='number').every(i=>i.props.value===''),true);
 await act(async()=>root().findByProps({'aria-label':'Videos finales · Previsto'}).props.onChange({target:{value:'5'}}));
 await act(async()=>root().findByProps({'aria-label':'Videos finales · Terminado'}).props.onChange({target:{value:'0'}}));
 assert.equal(root().findAllByType('input').find(i=>i.props.type==='date')!.props.disabled,true);
 let save:Promise<void>;
 await act(async()=>{save=root().findByType('form').props.onSubmit({preventDefault(){}});});
 await act(async()=>{await root().findByType('form').props.onSubmit({preventDefault(){}});});
 assert.equal(putCount,1);assert.equal(payload.metrics.videos.completed,0);assert.equal(payload.metrics.videos.planned,5);assert.equal(payload.metrics.declared_hours,null);assert.equal(payload.metrics.raw_clips,null);
 await act(async()=>{resolvePut!({ok:false,json:async()=>({error:'El reporte cambió'})});await save!;});
 assert.equal(root().findByProps({role:'alert'}).children.join(''),'El reporte cambió');
 assert.equal(root().findByProps({'aria-label':'Videos finales · Previsto'}).props.value,5);
 await act(async()=>renderer!.update(<WeeklyReport organizationId="2"/>));
 assert.equal(root().findByProps({'aria-label':'Videos finales · Previsto'}).props.value,'');
 await act(async()=>renderer!.unmount());
 console.log('PASS weekly UI: blank vs zero, planned separation, single save, failed-save draft and organization reset');
}
void main();

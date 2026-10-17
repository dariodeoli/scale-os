import React from 'react';
import assert from 'node:assert/strict';
import {act,create,type ReactTestRenderer} from 'react-test-renderer';
import {civilDateValid,clockTimeValid,fieldMetadataError,DATE_ERROR,TIME_ERROR} from '../app/field-rules';
Object.assign(globalThis,{React});
require.extensions['.css']=()=>{};
assert(civilDateValid('2024-02-29'));
for(const invalid of ['2025-02-29','2026-02-30','2026-04-31','2026-13-01','2026-00-10','2026-1-01','2026-10-17T12:00:00Z','not a date'])assert.equal(civilDateValid(invalid),false,invalid);
for(const valid of ['00:00','09:05','23:59'])assert(clockTimeValid(valid));
for(const invalid of ['24:00','23:60','9:05','09:05:00','09:05Z','12:00 PM'])assert.equal(clockTimeValid(invalid),false,invalid);
assert.equal(fieldMetadataError('12345',{maxLength:4}),'Usá hasta 4 caracteres.');
assert.equal(fieldMetadataError('12345',{}),null,'no invented limit');
assert.equal(fieldMetadataError('2025-02-29',{type:'date'}),DATE_ERROR);
assert.equal(fieldMetadataError('24:00',{type:'time'}),TIME_ERROR);
assert.equal(fieldMetadataError('',{type:'date'}),null,'optional handled by Editor');
assert.equal(fieldMetadataError('09:05:00',{type:'time'},'09:05:00'),null,'unchanged seconds from legacy work-order remain intact');
assert.equal(fieldMetadataError('legacy-long',{maxLength:4},'legacy-long'),null);

function mock(path:string,exports:unknown){const id=require.resolve(path);require.cache[id]={id,filename:id,loaded:true,exports} as NodeModule;}
const Container=({children}:{children:React.ReactNode})=><div>{children}</div>;
mock('../app/dialog',{Dialog:Container,FormActions:Container,useDialogClose:()=>undefined,useDialogPending:()=>{}});
const {Editor}=require('../app/operations') as typeof import('../app/operations');
const submit=(r:ReactTestRenderer)=>r.root.findByType('form').props.onSubmit({preventDefault(){},persist(){}});
const change=async(r:ReactTestRenderer,name:string,value:string)=>{
 await act(async()=>{await r.root.findAllByType('input').find(input=>input.props.name===name)!.props.onChange({type:'change',target:{name,value}});});
};
async function main(){
 let r:ReactTestRenderer;const writes:Record<string,string>[]=[];const focuses:string[]=[];
 const fields=[{key:'name',label:'Nombre',maxLength:4},{key:'day',label:'Fecha',type:'date' as const,optional:true},{key:'time',label:'Hora',type:'time' as const,optional:true}];
 await act(async()=>{r=create(<Editor fields={fields} defaults={{name:'Ana',day:'',time:''}} save={async values=>{writes.push(values);}}/>,{createNodeMock:element=>element.type==='input'?{type:element.props.type,name:element.props.name,value:element.props.defaultValue,focus:()=>focuses.push(element.props.name)}:null});});
 const firstInput=r!.root.findAllByType('input')[0];
 await change(r!,'name','Nombre demasiado largo');await change(r!,'day','2026-02-30');await change(r!,'time','25:00');
 await act(async()=>{await submit(r!);});
 assert.equal(writes.length,0);
 const alerts=r!.root.findAllByProps({role:'alert'});
 assert.equal(alerts.length,3);
 assert.equal(r!.root.findAllByType('input')[0],firstInput,'invalid submit does not remount the input');
 assert.equal(r!.root.findAllByType('input').find(n=>n.props.name==='name')!.props['aria-invalid'],true);
 assert(focuses.includes('name'),'RHF retains first-invalid focus contract');
 // Each value is corrected explicitly; no reset/normalization after failed submission.
 await change(r!,'name','Luz');await change(r!,'day','2024-02-29');await change(r!,'time','23:59');
 await act(async()=>{await submit(r!);});
 assert.deepEqual(writes,[{name:'Luz',day:'2024-02-29',time:'23:59'}]);
 await act(async()=>r!.unmount());

 const legacyWrites:Record<string,string>[]=[];
 await act(async()=>{r=create(<Editor fields={[...fields,{key:'note',label:'Nota',optional:true}]} defaults={{name:'Nombre legacy largo',day:'2025-02-29',time:'09:05:00',note:''}} save={async values=>{legacyWrites.push(values);}}/>);});
 await change(r!,'note','Cambio independiente');
 await act(async()=>{await submit(r!);});
 assert.deepEqual(legacyWrites,[{name:'Nombre legacy largo',day:'2025-02-29',time:'09:05:00',note:'Cambio independiente'}],'new metadata rules do not rewrite/reject untouched historical values');
 await change(r!,'day','2026-02-30');
 await act(async()=>{await submit(r!);});
 assert.equal(legacyWrites.length,1,'modified invalid date is rejected');
 assert(r!.root.findAllByProps({role:'alert'}).some(n=>n.children.includes(DATE_ERROR)));
 await act(async()=>r!.unmount());
 console.log('PASS: Editor metadata #241 — declared max, civil dates, minute times, inline errors/focus, draft and untouched legacy preservation');
}
void main();

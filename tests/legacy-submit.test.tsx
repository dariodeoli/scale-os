import React from 'react';
import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import {act,create,type ReactTestRenderer} from 'react-test-renderer';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {useSingleFlightSubmit} from '../app/use-single-flight-submit';
import {currencyCodes,currencyLabels} from '../app/currencies';

Object.assign(globalThis,{React});
require.extensions['.css']=()=>{};
const {UrgencySelect}=require('../app/urgency') as typeof import('../app/urgency');
let dialogPending=false;
const dialogId=require.resolve('../app/dialog');
require.cache[dialogId]={id:dialogId,filename:dialogId,loaded:true,exports:{
 FormActions:({children}:{children:React.ReactNode})=><div>{children}</div>,
 useDialogClose:()=>()=>{},useDialogPending:(value:boolean)=>{dialogPending=value;},
}} as NodeModule;
const {SaveActions}=require('../app/save-actions') as typeof import('../app/save-actions');
const text=readFileSync(new URL('../app/scale-workspace.tsx',import.meta.url),'utf8');
const file=ts.createSourceFile('scale-workspace.tsx',text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
const names=['ClientForm','ProjectForm','OrderForm','BudgetForm','AccountForm','InvoiceForm','PaymentForm','TransferForm'];
const declarations=file.statements.filter(node=>ts.isVariableStatement(node)&&node.declarationList.declarations.some(d=>/Schema$/.test(d.name.getText(file))||d.name.getText(file)==='statuses'));
const defaults={name:'Fixture client',email:'fixture@example.invalid',phone:'',clientId:'1',projectId:'2',title:'Fixture production',status:'to_record',driveUrl:'',description:'Fixture service',quantity:1,unitPrice:100,currency:'USD',validUntil:'',accountType:'bank',institution:'Fixture',accountNumber:'',holderName:'',custodianUserId:'',total:100,dueOn:'',invoiceId:'3',accountId:'4',amount:100,receivedOn:'2026-09-10',reference:'',receivedByUserId:'',fromAccountId:'4',toAccountId:'5',transferredOn:'2026-09-10'};
const props={clients:[{id:'1',name:'Fixture client'}],projects:[{id:'2',name:'Fixture project'}],accounts:[{id:'4',name:'A',currency:'USD'},{id:'5',name:'B',currency:'USD'}],invoices:[{id:'3',status:'pending'}],custodians:[]};
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const event=()=>({preventDefault(){},persist(){}});

for(const name of names)test(`${name}: duplicate submit cannot write or unlock a pending save`,async()=>{
 const parent=file.statements.find((node):node is ts.FunctionDeclaration=>ts.isFunctionDeclaration(node)&&node.name?.text===name);
 assert(parent);
 const requests:{path:string;payload:Record<string,unknown>;resolve:(value:unknown)=>void;reject:(error:Error)=>void}[]=[];
 let done=0;
 // Execute the actual form and schema, with real RHF/Zod/hooks. Only transport,
 // dialog environment, fixtures and initial field values are local doubles.
 const scope={React,useState:React.useState,useRef:React.useRef,z,zodResolver,currencyCodes,currencyLabels,SaveActions,useSingleFlightSubmit,UrgencySelect,
  useCompanyCurrency:()=>({currency:'USD'}),
  useForm:(options:Parameters<typeof useForm>[0])=>useForm({...options,defaultValues:{...options?.defaultValues,...defaults}}),
  request:(path:string,options:{body:string})=>new Promise((resolve,reject)=>{requests.push({path,payload:JSON.parse(options.body),resolve,reject});}),
 };
 const compiled=ts.transpileModule([...declarations.map(node=>node.getText(file)),parent.getText(file)].join('\n'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React}}).outputText;
 const Component=new Function(...Object.keys(scope),`${compiled}\nreturn ${name};`)(...Object.values(scope)) as React.ComponentType<Record<string,unknown>>;
 let renderer:ReactTestRenderer;
 await act(async()=>{renderer=create(<Component {...props} done={()=>{done++;}}/>);});
 if(name==='ProjectForm'||name==='OrderForm'){
  const urgency=renderer!.root.findByType(UrgencySelect);
  assert.equal(urgency.props.value,'','new records start unset');
  await act(async()=>{urgency.findByType('select').props.onChange({target:{value:'4'}});});
 }
 const submit=()=>renderer!.root.findByType('form').props.onSubmit(event()) as Promise<void>;
 let first:Promise<void>,second:Promise<void>;
 await act(async()=>{first=submit();second=submit();await tick();});
 assert.equal(requests.length,1,'two clicks/Enter submit only one request');
 if(name==='ProjectForm'||name==='OrderForm'){
  assert.equal(requests[0].payload.urgency,'4','real selector value survives schema and submission');
  assert.equal(renderer!.root.findByType(UrgencySelect).findByType('select').props.disabled,true);
 }
 await act(async()=>{await second!;});
 assert.equal(dialogPending,true,'settling the ignored submit cannot permit dismissal');
 const footer=renderer!.root.findByType(SaveActions);
 assert.equal(footer.props.pending,true);
 assert(footer.findAllByType('button').every(button=>button.props.disabled));
 assert.equal(done,0);
 await act(async()=>{requests[0].reject(new Error('Fixture save unavailable'));await first!;});
 assert.equal(dialogPending,false);assert.equal(done,0);
 assert(JSON.stringify(renderer!.toJSON()).includes('Fixture save unavailable'));
 let retry:Promise<void>;
 await act(async()=>{retry=submit();await tick();});
 assert.equal(requests.length,2);assert.deepEqual(requests[1].payload,requests[0].payload,'failure preserves the exact submitted draft and idempotency key');
 await act(async()=>{requests[1].resolve({client:{id:'1'},project:{id:'2'},workOrder:{id:'6'},budget:{id:'7'},account:{id:'4'},invoice:{id:'3'}});await retry!;});
 assert.equal(dialogPending,false);assert.equal(done,1);
 await act(async()=>{renderer!.unmount();});
});

test('single-flight begins before async validation and releases on invalid or thrown validation',async()=>{
 let finish:()=>void=()=>{},validations=0,hook:ReturnType<typeof useSingleFlightSubmit>;
 let validate=()=>{validations++;return new Promise<void>(resolve=>{finish=resolve;});};
 function Probe(){hook=useSingleFlightSubmit(()=>validate());return null;}
 let renderer:ReactTestRenderer;
 await act(async()=>{renderer=create(<Probe/>);});
 let pending:Promise<void>;
 await act(async()=>{pending=hook!.onSubmit(event() as React.BaseSyntheticEvent);await hook!.onSubmit(event() as React.BaseSyntheticEvent);});
 assert.equal(validations,1);assert.equal(hook!.pending,true);
 await act(async()=>{finish();await pending!;});assert.equal(hook!.pending,false);
 validate=async()=>{throw Error('Validation failed');};
 await act(async()=>{await assert.rejects(hook!.onSubmit(event() as React.BaseSyntheticEvent),/Validation failed/);});
 assert.equal(hook!.pending,false);
 await act(async()=>{renderer!.unmount();});
});

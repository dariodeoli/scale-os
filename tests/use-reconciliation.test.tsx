import React from 'react';
import assert from 'node:assert/strict';
import {act,create,type ReactTestRenderer} from 'react-test-renderer';

// Hook de conciliación: transporte mockeado (`api`) y estado real de React.
Object.assign(globalThis,{React});
require.extensions['.css']=()=>{};
type Call={path:string;resolve:(value:unknown)=>void;reject:(error:Error)=>void};
const calls:Call[]=[];
function mock(path:string,exports:unknown){const id=require.resolve(path);require.cache[id]={id,filename:id,loaded:true,exports} as NodeModule;}
mock('../app/operations',{api:(path:string)=>new Promise((resolve,reject)=>calls.push({path,resolve,reject}))});
const {useReconciliation}=require('../app/use-reconciliation') as typeof import('../app/use-reconciliation');
type StatementLine=import('../app/treasury-data').StatementLine;
type StatementMovement=import('../app/treasury-data').StatementMovement;

let state:{lines:StatementLine[];movements:StatementMovement[];load:(accountId:string)=>Promise<void>;reset:()=>void};
function Probe(){state=useReconciliation();return null;}

async function run(){
 let renderer:ReactTestRenderer;
 await act(async()=>{renderer=create(<Probe/>);});
 assert.deepEqual(state.lines,[],'arranca vacío');
 assert.deepEqual(state.movements,[]);

 let pending!:Promise<void>;
 act(()=>{pending=state.load('5');});
 assert.equal(calls.length,1);
 assert.equal(calls[0].path,'/api/agency/reconciliation?accountId=5');
 await act(async()=>{
  calls[0].resolve({
   lines:[
    {id:'1',account_id:'5',external_id:'EXT-1',booked_on:'2026-09-10',amount:'-150.50',reference:'Pago',match_id:null},
    {id:'2',account_id:'5',external_id:'EXT-2',booked_on:'',amount:'1'}, // incompleta: no debe entrar
   ],
   movements:[{account_id:'5',movement_type:'payment',movement_id:'9',booked_on:'2026-09-10',amount:'-150.50',reference:'Cobro'}],
  });
  await pending;
 });
 assert.equal(state.lines.length,1,'la fila incompleta no llega al estado');
 assert.equal(state.lines[0].external_id,'EXT-1');
 assert.equal(state.movements.length,1);
 assert.equal(state.movements[0].movement_id,'9');

 act(()=>{state.reset();});
 assert.deepEqual(state.lines,[],'reset vacía el extracto');
 assert.deepEqual(state.movements,[],'reset vacía los movimientos');

 let failing!:Promise<void>;
 act(()=>{failing=state.load('6');});
 await act(async()=>{
  calls[1].reject(Error('Sin permiso'));
  await assert.rejects(failing,/Sin permiso/,'el error de transporte se propaga para que la pantalla lo muestre');
 });
 assert.deepEqual(state.lines,[],'un error de carga no deja datos a medias');
 assert.equal(calls[1].path,'/api/agency/reconciliation?accountId=6');

 await act(async()=>{renderer.unmount();});
 console.log('PASS use reconciliation: carga, normalización, reset y propagación de errores');
}
void run();

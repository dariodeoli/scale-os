import React from 'react';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,create,type ReactTestRenderer} from 'react-test-renderer';
import ts from 'typescript';
Object.assign(globalThis,{React});
require.extensions['.css']=()=>{};
const {fetchProjectPieces,resetProjectFilterSupport,PROJECT_PIECES_LIMIT,PROJECT_FILTER_PROBE_ID,remainingPiecesLabel}=require('../app/project-pieces') as typeof import('../app/project-pieces');

// #146: el contador del detalle de proyecto sale de la MISMA consulta que la
// lista (el GET individual no trae `work_order_count`) y cubre 0/1/n y los dos
// caminos del filtro por proyecto (API que lo respeta o que lo ignora).
const source=readFileSync(new URL('../app/project-card.tsx',import.meta.url),'utf8');
const file=ts.createSourceFile('project-card.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
const detail=file.statements.find((node):node is ts.FunctionDeclaration=>ts.isFunctionDeclaration(node)&&node.name?.text==='ProjectDetail');
assert.ok(detail,'ProjectDetail vive en project-card.tsx');
const compiled=ts.transpileModule(detail.getText(file),{compilerOptions:{jsx:ts.JsxEmit.React,target:ts.ScriptTarget.ES2022}}).outputText;

type Piece={id:string;title:string;status:string;due_date?:string|null;due_time?:string|null;project_id:string};
const piece=(id:string,projectId='42'):Piece=>({id,title:`Pieza ${id}`,status:'editing',due_date:null,due_time:null,project_id:projectId});
const baseProject={id:'42',name:'Campaña',client_name:'Cliente',status:'active',work_order_count:undefined as number|undefined,drive_url:null,assignees:[]};

let honored=true;let projectPieces:Piece[]=[];let projectTotal:number|undefined;
const allRows=()=>[...projectPieces,...[piece('ajena-1','99'),piece('ajena-2','99')]];
const api=async(url:string)=>{
 if(url.startsWith('/api/agency/work-orders')){
  if(url.includes(`project_id=${PROJECT_FILTER_PROBE_ID}`))return {workOrders:honored?[]:[piece('sonda','99')]};
  if(url.includes('project_id='))return {workOrders:projectPieces};
  return {workOrders:allRows()};
 }
 if(url.endsWith('/assignees'))return {assignees:[]};
 return {record:{...baseProject,work_order_count:undefined}};
};
const scope={React,useState:React.useState,useEffect:React.useEffect,api,fetchProjectPieces,remainingPiecesLabel,PROJECT_PIECES_LIMIT,Drawer:({children}:{children:React.ReactNode})=><section role="dialog">{children}</section>,ErrorBlock:()=>null,LoadingBlock:()=>null,StateChip:({children}:{children:React.ReactNode})=><span>{children}</span>,UrgencyBadge:()=>null,AssignedPeople:()=>null,DriveLinks:()=>null,hasDueWarning:()=>false,fechaLarga:(value:string)=>value,fechaListaCorta:(value:string)=>value||'Sin fecha',fechaLista:(value:string)=>value,OPS_TIME_ZONE:'America/Asuncion',statuses:[],pieceStatusLabel:(status:string)=>status,STATUS_TONE:{},statusLabel:(status:string)=>status,projectLinks:()=>({links:[],legacy:'',count:0})};
const Detail=new Function(...Object.keys(scope),`${compiled};return ProjectDetail;`)(...Object.values(scope)) as React.ComponentType<any>;

let renderer:ReactTestRenderer;
const flush=async()=>{await act(async()=>{await new Promise(resolve=>setTimeout(resolve,0));});};
const counter=()=>{const node=renderer.root.findAll(node=>node.props?.['data-pieces-count']!==undefined)[0];return node?Number(node.props['data-pieces-count']):null;};
const listed=()=>{const list=renderer.root.findAllByType('ul')[0];return list?list.findAllByType('li').length:0;};
const render=async(project:Record<string,unknown>)=>{
 await act(async()=>{renderer=create(<Detail project={project} onClose={()=>{}}/>);});
 await flush();
};

async function run(){
 // 0: vacío honesto y contador en cero.
 resetProjectFilterSupport();honored=true;projectPieces=[];
 await render({...baseProject});
 assert.equal(counter(),0,'sin piezas el contador es 0');
 assert.equal(listed(),0,'y la lista también');
 assert.match(JSON.stringify(renderer.toJSON()),/El proyecto todavía no tiene piezas\./,'el vacío se explica');
 act(()=>renderer.unmount());

 // 1 y n: el contador iguala la longitud de la lista.
 for(const count of [1,4]){
  resetProjectFilterSupport();projectPieces=Array.from({length:count},(_,index)=>piece(`p-${index+1}`));
  await render({...baseProject});
  assert.equal(counter(),count,`${count} piezas: contador desde la lista`);
  assert.equal(listed(),count,`${count} piezas: la lista las dibuja`);
  act(()=>renderer.unmount());
 }

 // Filtro ignorado por el API: la red de seguridad del cliente filtra y el
 // contador sigue siendo la longitud de la lista resultante.
 resetProjectFilterSupport();honored=false;projectPieces=[piece('a'),piece('b'),piece('c'),piece('d')];
 await render({...baseProject});
 assert.equal(counter(),4,'con el filtro ignorado el contador usa la lista filtrada');
 assert.equal(listed(),4,'y no cuenta piezas de otros proyectos');
 act(()=>renderer.unmount());

 // Ventana de 50: el contador cuenta lo listado y el resumen informa el resto.
 resetProjectFilterSupport();honored=true;projectTotal=PROJECT_PIECES_LIMIT+10;projectPieces=Array.from({length:PROJECT_PIECES_LIMIT},(_,index)=>piece(`w-${index+1}`));
 await render({...baseProject,work_order_count:projectTotal});
 assert.equal(counter(),PROJECT_PIECES_LIMIT,'la ventana lista 50 y el contador no inventa el total');
 assert.match(JSON.stringify(renderer.toJSON()),/y 10 piezas más/,'el resto se resume con el total del directorio');
 act(()=>renderer.unmount());
 projectTotal=undefined;
 console.log('PASS: detalle de proyecto — el contador de piezas sale de la lista (0/1/n, ventana de 50 y filtro por proyecto honrado o ignorado).');
}
void run();

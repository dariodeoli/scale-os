import React from 'react';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import {act,create,type ReactTestInstance,type ReactTestRenderer} from 'react-test-renderer';

// PDP en Comercial (Ley 7593/2025, Refs #114): finalidad visible en los puntos
// de captura, oposición al contacto de oportunidades, minimización de contacto
// del cliente por rol y token del enlace del presupuesto fuera de las listas.
const read=(path:string)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
Object.assign(globalThis,{React});
require.extensions['.css']=()=>{};

const dialogPath=require.resolve('../app/dialog');
require.cache[dialogPath]={id:dialogPath,filename:dialogPath,loaded:true,exports:{
 Dialog:({title,children}:{title?:string;children:React.ReactNode})=><section role="dialog" aria-label={title}>{children}</section>,
 FormActions:({children}:{children:React.ReactNode})=><div>{children}</div>,
 useDialogClose:()=>undefined,useDialogPending:()=>undefined,
}} as NodeModule;
const suitePath=require.resolve('../app/suite');
require.cache[suitePath]={id:suitePath,filename:suitePath,loaded:true,exports:{RecordEditor:()=>null,BudgetActions:()=>null}} as NodeModule;
const archivePath=require.resolve('../app/archive-controls');
require.cache[archivePath]={id:archivePath,filename:archivePath,loaded:true,exports:{RemoveRecord:({name}:{name:string})=><button type="button" aria-label={`Mover a la papelera: ${name}`}>Papelera</button>}} as NodeModule;
const growthPath=require.resolve('../app/growth-dashboard');
require.cache[growthPath]={id:growthPath,filename:growthPath,loaded:true,exports:{GrowthDashboard:()=><div>Tablero de crecimiento</div>}} as NodeModule;
const visitorsPath=require.resolve('../app/live-visitors');
require.cache[visitorsPath]={id:visitorsPath,filename:visitorsPath,loaded:true,exports:{LiveVisitors:()=><div>Viendo ahora</div>}} as NodeModule;
const dndPath=require.resolve('@dnd-kit/core');
require.cache[dndPath]={id:dndPath,filename:dndPath,loaded:true,exports:{
 DndContext:({children}:{children:React.ReactNode})=><div>{children}</div>,
 useDraggable:()=>({setNodeRef(){},attributes:{},listeners:{},isDragging:false}),
 useDroppable:()=>({setNodeRef(){},isOver:false}),useSensor:()=>({}),useSensors:()=>[],PointerSensor(){},KeyboardSensor(){},
 pointerWithin:()=>[],rectIntersection:()=>[],
}} as NodeModule;

const {LEAD_LIST_FIELDS}=require('../app/shell-data') as typeof import('../app/shell-data');
const {PRIVACY_POLICY_URL,PRIVACY_RIGHTS_URL,PRIVACY_LEAD_FINALITY,PRIVACY_CLIENT_FINALITY}=require('../app/privacy-links') as typeof import('../app/privacy-links');
const {PipelineSection}=require('../app/sections/pipeline') as typeof import('../app/sections/pipeline');
const {ClientesSection}=require('../app/sections/clientes') as typeof import('../app/sections/clientes');
const {ClientDirectoryToolbar}=require('../app/client-directory-toolbar') as typeof import('../app/client-directory-toolbar');
import type {User} from '../app/workspace-types';

type Pending={url:string;init:RequestInit;resolve:(response:Response)=>void};
let requests:Pending[]=[];
globalThis.fetch=(input,init={})=>new Promise<Response>(resolve=>{requests.push({url:String(input),init,resolve});});
const text=(node:ReactTestInstance|string):string=>typeof node==='string'?node:node.children.map(text).join('');
const user=(role='owner')=>({id:'1',role,organization_id:'7',full_name:'Prueba',organization_slug:''} as unknown as User);
const button=(renderer:ReactTestRenderer,label:string)=>renderer.root.findAllByType('button').find(candidate=>text(candidate).includes(label));
const flush=async(data:unknown,status=200)=>{const pending=requests.shift()!;await act(async()=>{pending.resolve(new Response(JSON.stringify(data),{status}));});};
const nodeFor=()=>({clientWidth:1400});

test('enlaces de privacidad y captación de la landing',()=>{
 assert.equal(PRIVACY_POLICY_URL,'/privacidad','la política vive en una sola ruta declarada');
 assert.equal(PRIVACY_RIGHTS_URL,'/privacidad#derechos','los derechos se alcanzan desde el mismo aviso');
 const html=read('public/scale-os.html');
 assert.match(html,/Aviso de privacidad y derechos/,'la landing enlaza el aviso en el punto de contacto');
 assert.match(html,/https:\/\/app\.scaleparaguay\.com\/privacidad/);
 assert.match(html,/recibirá tus datos para responder esta consulta y no los usará para otro fin/,'la finalidad declarada del formulario de contacto');
 assert.doesNotMatch(html,/name="consent"[^>]*checked/,'el consentimiento de la landing nunca viaja premarcado');
 // Los puntos de captura de la agencia montan el aviso compartido con la finalidad.
 for(const [surface,source,constant] of [
  ['editor de clientes','app/suite.tsx','PRIVACY_CLIENT_FINALITY'],
  ['alta de cliente','app/scale-workspace.tsx','PRIVACY_CLIENT_FINALITY'],
  ['acceso del portal','app/daily-controls.tsx','PRIVACY_PORTAL_FINALITY'],
  ['editor de oportunidad','app/sections/pipeline.tsx','PRIVACY_LEAD_FINALITY'],
 ] as const){
  const file=read(source);
  assert.match(file,/AvisoPrivacidad/,`${surface}: usa el objeto compartido de la biblioteca`);
  assert.match(file,/PRIVACY_POLICY_URL/,`${surface}: enlaza la política`);
  assert.ok(file.includes(constant),`${surface}: declara su finalidad con el texto único`);
 }
});

test('pipeline: oposición al contacto visible, editable y sin correo en la tarjeta',async()=>{
 requests=[];let renderer!:ReactTestRenderer;
 await act(async()=>{renderer=create(<PipelineSection user={user('owner')}/>);});
 assert.ok(LEAD_LIST_FIELDS.includes('do_not_contact'),'la lista proyecta la oposición');
 assert.equal(requests[0].url,`/core-api/api/agency/leads?limit=300&fields=${LEAD_LIST_FIELDS}`);
 await flush({records:[
  {id:'10',name:'Con oposición',stage:'lead',amount:'1',currency:'PYG',probability:10,email:'no-contactar@example.invalid',do_not_contact:true},
  {id:'11',name:'Contacto vigente',stage:'lead',amount:'2',currency:'PYG',probability:20,email:'si@example.invalid',do_not_contact:false},
  {id:'12',name:'Con notas largas',stage:'lead',amount:'3',currency:'PYG',probability:30,notes:'Descripción que ya no debe viajar a la tarjeta.'},
 ]});
 await flush({stages:[{id:'1',slug:'lead',label:'Lead',position:0,active:true,kind:'open'}]});
 const copy=text(renderer.root);
 assert.match(copy,/No contactar/,'la tarjeta declara la oposición');
 assert.equal(copy.includes('no-contactar@example.invalid')||copy.includes('si@example.invalid'),false,'el tablero no expone correos (minimización)');
 assert.equal(copy.includes('Descripción que ya no debe viajar a la tarjeta.'),false,'la descripción no alarga la tarjeta (#140)');
 assert.ok(renderer.root.findAllByType('button').some(candidate=>String(candidate.props['aria-label']||'').startsWith('Ver oportunidad')),'la acción de la tarjeta es un icono con nombre accesible (#140)');

 // El diálogo refleja la oposición guardada y la envía en el PATCH parcial.
 const flagged=renderer.root.findAllByType('article').find(node=>text(node).includes('Con oposición'))!;
 act(()=>{flagged.findAllByType('button').find(node=>String(node.props['aria-label']||'').startsWith('Ver oportunidad'))!.props.onClick();});
 const dialog=()=>renderer.root.findAllByProps({role:'dialog'})[0];
 assert.ok(dialog(),'la oportunidad abre su editor');
 assert.ok(renderer.root.findByProps({'data-testid':'aviso-privacidad'}),'el editor declara la finalidad con el aviso compartido');
 const oppose=()=>renderer.root.findAllByType('input').find(input=>input.props.type==='checkbox')!;
 assert.equal(oppose().props.checked,true,'la casilla refleja la oposición guardada');
 act(()=>{oppose().props.onChange({target:{checked:false}});});
 await act(async()=>{dialog().findAllByType('form')[0].props.onSubmit({preventDefault(){}});});
 await act(async()=>{});
 const patch=requests.shift()!;
 assert.equal(patch.url,'/core-api/api/agency/leads/10');
 assert.equal(patch.init.method,'PATCH');
 assert.equal(JSON.parse(String(patch.init.body)).do_not_contact,false,'el guardado envía la oposición explícita');
 await act(async()=>{patch.resolve(new Response(JSON.stringify({record:{}}),{status:200}));});
 await act(async()=>{});
 await flush({records:[]});
 act(()=>renderer.unmount());

 // El alta nueva arranca sin oposición y la envía si se marca.
 requests=[];
 await act(async()=>{renderer=create(<PipelineSection user={user('owner')}/>);});
 await flush({records:[]});
 await flush({stages:[{id:'1',slug:'lead',label:'Lead',position:0,active:true,kind:'open'}]});
 act(()=>{button(renderer,'Nueva oportunidad')!.props.onClick();});
 const newOppose=()=>renderer.root.findAllByType('input').find(input=>input.props.type==='checkbox')!;
 assert.equal(newOppose().props.checked,false,'la oposición nunca viene premarcada');
 const nameField=renderer.root.findAllByType('input').find(input=>String(input.props.id||'').endsWith('-name'))!;
 act(()=>{nameField.props.onChange({target:{id:nameField.props.id,name:'name',value:'Prospecto PDP'}});});
 act(()=>{newOppose().props.onChange({target:{checked:true}});});
 await act(async()=>{renderer.root.findAllByProps({role:'dialog'})[0].findAllByType('form')[0].props.onSubmit({preventDefault(){}});});
 await act(async()=>{});
 const post=requests.shift()!;
 assert.equal(post.url,'/core-api/api/agency/leads');
 assert.equal(post.init.method,'POST');
 assert.equal(JSON.parse(String(post.init.body)).do_not_contact,true,'el alta guarda la oposición');
 await act(async()=>{post.resolve(new Response(JSON.stringify({record:{}}),{status:201}));});
 await act(async()=>{});
 await act(async()=>{});
 await flush({records:[]});
 act(()=>renderer.unmount());
});

test('clientes: el rol sin gestión recibe contacto reservado y sin WhatsApp',async()=>{
 let renderer!:ReactTestRenderer;
 const restricted={id:'9',name:'Cliente reservado',active:true,created_at:'2025-02-01',email:null,phone:null,tax_id:null,contact_restricted:true};
 await act(async()=>{renderer=create(<ClientesSection
  dataState="ready" user={user('editor')} clientView="list" clientStatusFilter="" setClientStatusFilter={()=>{}}
  clientSearch="" setClientSearch={()=>{}} archiveBusy="" bulkBusy={false} selectedClients={[]} setSelectedClients={()=>{}}
  canSeeBilling={false} canManageClients={false} clients={[restricted as never]} displayedClients={[restricted as never]} liveClients={[restricted as never]}
  archivedClients={[]} paymentStatuses={[]} clientHubStats={new Map()} commercialSummary={null} commercialState="idle"
  directoryKpis={{active:1,paused:0,activeProjects:0,deliveries:0}} cobrosKpis={{alDia:0,porVencer:0,enMora:0,sinFactura:0}}
  load={async()=>{}} setClientArchive={async()=>{}} toggleClientSelected={()=>{}} selectVisibleClients={()=>{}} batchClients={async()=>{}}
  setDetail={()=>{}}/>,{createNodeMock:nodeFor});});
 const copy=text(renderer.root);
 assert.match(copy,/Contacto reservado/,'el directorio dice la verdad sobre la minimización');
 assert.equal(copy.includes('Sin correo registrado'),false,'la restricción no se disfraza de dato faltante');
 assert.equal(copy.includes('Sin RUC registrado'),false,'los datos fiscales tampoco parecen ausentes');
 assert.equal(renderer.root.findAll(node=>String(node.props?.className||'').includes('whatsapp-button')).length,0,'sin teléfono no hay acción de WhatsApp');
 act(()=>renderer.unmount());

 // Quien gestiona clientes conserva correo, RUC y WhatsApp.
 requests=[];
 const allowed={id:'9',name:'Cliente visible',active:true,created_at:'2025-02-01',email:'cliente@example.invalid',phone:'+595 981000111',tax_id:'80011111-1'};
 await act(async()=>{renderer=create(<ClientesSection
  dataState="ready" user={user('owner')} clientView="list" clientStatusFilter="" setClientStatusFilter={()=>{}}
  clientSearch="" setClientSearch={()=>{}} archiveBusy="" bulkBusy={false} selectedClients={[]} setSelectedClients={()=>{}}
  canSeeBilling={false} canManageClients clients={[allowed as never]} displayedClients={[allowed as never]} liveClients={[allowed as never]}
  archivedClients={[]} paymentStatuses={[]} clientHubStats={new Map()} commercialSummary={null} commercialState="idle"
  directoryKpis={{active:1,paused:0,activeProjects:0,deliveries:0}} cobrosKpis={{alDia:0,porVencer:0,enMora:0,sinFactura:0}}
  load={async()=>{}} setClientArchive={async()=>{}} toggleClientSelected={()=>{}} selectVisibleClients={()=>{}} batchClients={async()=>{}}
  setDetail={()=>{}}/>,{createNodeMock:nodeFor});});
 const allowedCopy=text(renderer.root);
 assert.match(allowedCopy,/cliente@example\.invalid/);
 assert.match(allowedCopy,/RUC 80011111-1/);
 assert.ok(renderer.root.findAll(node=>String(node.props?.className||'').includes('whatsapp-button')).length>0,'quien gestiona conserva el acceso directo');
 act(()=>renderer.unmount());
});

test('buscador de clientes: sin contacto no promete correo ni teléfono',async()=>{
 let renderer!:ReactTestRenderer;
 const props={canCreate:false,onCreate:()=>{},onQueryChange:()=>{},onStatusChange:()=>{},onViewChange:()=>{},query:'',resultCount:0,status:'',totalCount:0,view:'list' as const};
 await act(async()=>{renderer=create(<ClientDirectoryToolbar {...props}/>);});
 assert.equal(renderer.root.findByProps({'aria-label':'Buscar clientes'}).props.placeholder,'Buscar por nombre, correo o teléfono','el rol con contacto conserva la promesa');
 act(()=>renderer.unmount());
 await act(async()=>{renderer=create(<ClientDirectoryToolbar {...props} contactVisible={false}/>);});
 assert.equal(renderer.root.findByProps({'aria-label':'Buscar clientes'}).props.placeholder,'Buscar por nombre','sin contacto el buscador solo promete nombre');
 act(()=>renderer.unmount());
});

test('presupuestos: el token del enlace no viaja en listas ni lecturas',()=>{
 const core=read('backend/agency-core.js');
 const suite=read('backend/agency-suite.js');
 const budgetFields=core.match(/const budgetListFields=\[([^\]]*)\]/)![1];
 assert.equal(budgetFields.includes('public_token'),false,'la whitelist de presupuestos ya no expone el token');
 assert.match(core,/delete row\.public_token/,'la lista completa también lo quita');
 assert.match(suite,/delete result\.budget\.public_token/,'la lectura autenticada tampoco lo entrega');
 assert.match(suite,/result=\{url:`https:\/\/app\.scaleparaguay\.com\/p\/\$\{b\.public_token\}`\}/,'la acción share sigue entregando la URL habilitada');
});

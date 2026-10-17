import React from 'react';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import {act,create,type ReactTestInstance,type ReactTestRenderer} from 'react-test-renderer';

// ClientEditor único (#184 C1/C3), lista fina en anchos chicos (C4) y acciones
// en lote (C5): alta y edición comparten editor, la consulta de RUC exige
// confirmación, el PATCH lleva sólo lo modificado y el CSV respeta el rol.
Object.assign(globalThis,{React});
require.extensions['.css']=()=>{};
const dialogId=require.resolve('../app/dialog');
require.cache[dialogId]={id:dialogId,filename:dialogId,loaded:true,exports:{
  Dialog:({children}:{children:React.ReactNode})=><section role="dialog">{children}</section>,
  FormActions:({children}:{children:React.ReactNode})=><div>{children}</div>,
  ConfirmDialog:({open=true,children,description}:{open?:boolean;children?:React.ReactNode;description?:React.ReactNode})=>open?<div role="alertdialog">{description}{children}</div>:null,
  useDialogClose:()=>undefined,
  useDialogPending:()=>{},
  useOverlay:()=>({requestClose:()=>{}}),
}} as NodeModule;

const {ClientEditor,ClientEditorDialog,clientEditorTitle}=require('../app/client-editor') as typeof import('../app/client-editor');
const {clientFields,clientPatchPayload,clientEditDefaults}=require('../app/client-editor-data') as typeof import('../app/client-editor-data');
const {clientsCsv,clientCsvColumns,assignServicePlan}=require('../app/client-bulk') as typeof import('../app/client-bulk');
const {ClientesSection}=require('../app/sections/clientes') as typeof import('../app/sections/clientes');
const read=(path:string)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

type Call={url:string;method:string;body:Record<string,unknown>|null};
const calls:Call[]=[];
type Route=(url:string,method:string)=>unknown;
let route:Route=()=>({});
globalThis.fetch=(async(input:RequestInfo|URL,init:RequestInit={})=>{
  const url=String(input).replace('/core-api','');
  const method=String(init.method||'GET');
  calls.push({url,method,body:init.body?JSON.parse(String(init.body)):null});
  return new Response(JSON.stringify(route(url,method)),{status:200});
}) as typeof fetch;
const settle=async()=>{await act(async()=>{await new Promise(resolve=>setTimeout(resolve,0));});};
const text=(node:ReactTestInstance|string):string=>typeof node==='string'?node:node.children.map(text).join('');
const buttonWith=(renderer:ReactTestRenderer,label:string)=>renderer.root.findAllByType('button').find(button=>text(button).trim()===label||text(button).includes(label));
const input=(renderer:ReactTestRenderer,name:string)=>renderer.root.findAll(node=>node.type==='input'&&node.props.name===name)[0];
const change=(renderer:ReactTestRenderer,name:string,value:string)=>act(async()=>{input(renderer,name).props.onChange({target:{name,value},type:'change'});});
const submit=async(renderer:ReactTestRenderer)=>{await act(async()=>{await (renderer.root.findAllByType('form').find(form=>form.findAll(node=>node.type==='input'&&node.props.name==='name').length>0)!.props.onSubmit({preventDefault(){}}) as Promise<void>);});};
const sections=(renderer:ReactTestRenderer)=>renderer.root.findAll(node=>node.type==='summary').map(node=>text(node).replace(/ · \d+ con error/,''));

test('alta y edición usan el mismo ClientEditor con las mismas secciones y validadores',async()=>{
  calls.length=0;
  let created!:ReactTestRenderer,edited!:ReactTestRenderer;
  await act(async()=>{created=create(<ClientEditor mode="create"/>);});
  const record={id:'4',name:'ACME',email:'',phone:'',tax_id:'',legal_name:'',notes:'',lifecycle_status:'active',updated_at:'2026-09-20T12:00:00Z',social_links:{}};
  await act(async()=>{edited=create(<ClientEditor mode="edit" clientId="4" record={record}/>);});
  assert.deepEqual(sections(created),['Identidad','Contacto','Fiscal','Datos para contratos']);
  assert.deepEqual(sections(edited),['Identidad','Contacto','Fiscal','Datos para contratos','Enlaces']);
  // Los campos compartidos salen de la misma definición (mismas reglas).
  const createFields=clientFields({mode:'create'}),editFields=clientFields({mode:'edit'});
  for(const key of ['name','email','phone','tax_id','legal_name','notes']){
    const a=createFields.find(field=>field.key===key)!,b=editFields.find(field=>field.key===key)!;
    assert.equal(a.label,b.label);assert.equal(a.maxLength,b.maxLength);assert.equal(a.validate,b.validate);assert.equal(a.type,b.type);
  }
  const withPlan=clientFields({mode:'edit',plan:{clientId:'4',archived:false,terms:null,plans:[],collaborators:[]}}).map(field=>field.section);
  assert.ok(withPlan.includes('Plan y pago'),'con permiso de términos aparece Plan y pago');
  assert.equal(clientFields({mode:'create',plan:{clientId:'4',archived:false,terms:null,plans:[],collaborators:[]}}).some(field=>field.section==='Plan y pago'),false,'el alta no tiene plan');
  act(()=>{created.unmount();edited.unmount();});
  // Un solo editor en todas las entradas (alta, ⋯, ficha, plan).
  assert.match(read('app/suite.tsx'),/<ClientEditorDialog mode="edit"/);
  assert.match(read('app/productivity-ui.tsx'),/<ClientEditorDialog mode="edit"/);
  assert.match(read('app/scale-workspace.tsx'),/<ClientEditorDialog\s+mode="create"/);
  assert.doesNotMatch(read('app/workspace-forms.tsx'),/export function ClientForm/);
});

test('alta: mismo POST de siempre y «Guardar y crear otro» no cierra',async()=>{
  calls.length=0;
  route=(url,method)=>method==='POST'?{client:{id:'9',name:'Serie',email:null,phone:null,active:true}}:{};
  const created:unknown[]=[];
  let renderer!:ReactTestRenderer;
  await act(async()=>{renderer=create(<ClientEditor mode="create" onCreated={(client,keepOpen)=>created.push([client.name,keepOpen])}/>);});
  await change(renderer,'name','Serie');
  await change(renderer,'tax_id','80.168.807-8');
  await act(async()=>{await (buttonWith(renderer,'Guardar y crear otro')!.props.onClick() as Promise<void>);});
  const post=calls.filter(call=>call.method==='POST');
  assert.equal(post.length,1);
  assert.equal(post[0].url,'/api/agency/clients');
  assert.deepEqual(post[0].body,{legal_representative_same_as_client:false,name:'Serie',email:'',phone:'',tax_id:'80168807-8',legal_name:''});
  assert.deepEqual(created,[['Serie',true]]);
  assert.match(text(renderer.root),/Cliente «Serie» creado\. Podés cargar el siguiente\./);
  await change(renderer,'tax_id','ABC');
  await submit(renderer);
  assert.equal(calls.filter(call=>call.method==='POST').length,1,'un RUC inválido no viaja al API');
  assert.match(text(renderer.root),/RUC/,'se explica la regla del RUC');
  act(()=>renderer.unmount());
});

const rucRecord={name:'PEREZ GOMEZ JUAN',tax_id:'80168807-8',tax_state:'ACTIVO',publication_date:'2026-09-01',source:'ruc-provider'};
async function mountWithRuc(){
  calls.length=0;
  route=(url,method)=>url.endsWith('/ruc-lookup')?{record:rucRecord}:method==='POST'?{client:{id:'9',name:'Cliente',email:null,phone:null,active:true}}:{};
  let renderer!:ReactTestRenderer;
  await act(async()=>{renderer=create(<ClientEditor mode="create"/>);});
  await change(renderer,'name','Cliente');
  await change(renderer,'tax_id','80168807');
  await act(async()=>{buttonWith(renderer,'Buscar')!.props.onClick();});
  await settle();
  return renderer;
}

test('consulta de RUC: muestra la tarjeta y no aplica nada hasta «Aplicar»',async()=>{
  const renderer=await mountWithRuc();
  const lookup=calls.find(call=>call.url==='/api/agency/ruc-lookup');
  assert.deepEqual(lookup?.body,{ruc:'80168807'},'se consulta con el RUC tal cual, sin inventar el dígito verificador');
  const card=text(renderer.root);
  assert.match(card,/Juan Perez Gomez|Pérez|Perez/i,'nombre normalizado');
  assert.match(card,/Estado tributario: ACTIVO/);
  assert.match(card,/Fuente: ruc-provider/);
  assert.ok(buttonWith(renderer,'Aplicar')&&buttonWith(renderer,'Descartar'));
  // Sin confirmar, guardar no lleva la razón social del proveedor.
  await submit(renderer);
  const body=calls.find(call=>call.method==='POST'&&call.url==='/api/agency/clients')?.body;
  assert.equal(body?.legal_name,'');
  assert.equal(body?.tax_id,'80168807');
  act(()=>renderer.unmount());
});

test('consulta de RUC: Aplicar vuelca RUC y razón social; Descartar deja la ficha igual',async()=>{
  let renderer=await mountWithRuc();
  await act(async()=>{buttonWith(renderer,'Aplicar')!.props.onClick();});
  await settle();
  assert.equal(buttonWith(renderer,'Aplicar'),undefined,'la tarjeta se cierra');
  await submit(renderer);
  let body=calls.find(call=>call.method==='POST'&&call.url==='/api/agency/clients')?.body;
  assert.equal(body?.tax_id,'80168807-8');
  assert.match(String(body?.legal_name),/Perez|Pérez/i);
  act(()=>renderer.unmount());
  renderer=await mountWithRuc();
  await act(async()=>{buttonWith(renderer,'Descartar')!.props.onClick();});
  await settle();
  assert.equal(buttonWith(renderer,'Aplicar'),undefined);
  assert.match(text(renderer.root),/Descartaste los datos del RUC/);
  await submit(renderer);
  body=calls.filter(call=>call.method==='POST'&&call.url==='/api/agency/clients').at(-1)?.body;
  assert.equal(body?.legal_name,'');
  assert.equal(body?.tax_id,'80168807');
  act(()=>renderer.unmount());
});

test('edición: el PATCH envía sólo los campos modificados (semántica legacy)',async()=>{
  const defaults=clientEditDefaults({id:'4',name:'ACME',email:'legacy-invalido',phone:'+595 981 123456',tax_id:'80168807-8',legal_name:'ACME SA',notes:'',lifecycle_status:'active',social_links:{website:'https://acme.com'}},null);
  assert.deepEqual(clientPatchPayload({...defaults},defaults),{client:null,planTouched:false});
  assert.deepEqual(clientPatchPayload({...defaults,name:' ACME 2 '},defaults).client,{name:'ACME 2'});
  assert.deepEqual(clientPatchPayload({...defaults,tax_id:'80.168.807-8'},defaults).client,{tax_id:'80168807-8'});
  const links=clientPatchPayload({...defaults,instagram:'https://instagram.com/acme'},defaults).client;
  assert.deepEqual(Object.keys(links!),['social_links']);
  calls.length=0;
  route=(url,method)=>method==='GET'&&url==='/api/agency/clients/4'?{record:{id:'4',name:'ACME',email:'x@acme.com',phone:'',tax_id:'',legal_name:'',notes:'',lifecycle_status:'active',updated_at:'t1',social_links:{}}}:{};
  let renderer!:ReactTestRenderer;
  await act(async()=>{renderer=create(<ClientEditorDialog mode="edit" clientId="4" role="finance" close={()=>{}} refresh={async()=>{}}/>);});
  await settle();
  assert.equal(calls.some(call=>call.url.endsWith('/commercial-terms')),false,'finanzas no consulta términos comerciales');
  await change(renderer,'name','ACME Nuevo');
  await submit(renderer);
  const patches=calls.filter(call=>call.method==='PATCH');
  assert.equal(patches.length,1);
  assert.equal(patches[0].url,'/api/agency/clients/4');
  assert.deepEqual(patches[0].body,{name:'ACME Nuevo'});
  act(()=>renderer.unmount());
});

test('edición: aplicar el RUC guarda también la ficha tributaria (ruc-refresh) después del PATCH',async()=>{
  calls.length=0;
  route=(url,method)=>method==='GET'&&url==='/api/agency/clients/4'?{record:{id:'4',name:'ACME',email:'x@acme.com',phone:'',tax_id:'',legal_name:'',notes:'',lifecycle_status:'active',updated_at:'t1',social_links:{}}}:url.endsWith('/ruc-lookup')?{record:rucRecord}:{};
  let renderer!:ReactTestRenderer;
  await act(async()=>{renderer=create(<ClientEditorDialog mode="edit" clientId="4" role="finance" close={()=>{}} refresh={async()=>{}}/>);});
  await settle();
  await change(renderer,'tax_id','80168807');
  await act(async()=>{buttonWith(renderer,'Buscar')!.props.onClick();});
  await settle();
  await act(async()=>{buttonWith(renderer,'Aplicar')!.props.onClick();});
  await settle();
  await submit(renderer);
  const urls=calls.map(call=>`${call.method} ${call.url}`);
  const patch=urls.indexOf('PATCH /api/agency/clients/4'),refresh=urls.indexOf('POST /api/agency/clients/4/ruc-refresh');
  assert.ok(patch>=0&&refresh>patch,'primero se guarda el RUC y después se refresca la ficha tributaria');
  assert.deepEqual(calls[refresh].body,{apply:true});
  act(()=>renderer.unmount());
});

const baseProps={dataState:'ready' as const,clientView:'list',clientStatusFilter:'',setClientStatusFilter:()=>{},clientSearch:'',setClientSearch:()=>{},archiveBusy:'',bulkBusy:false,selectedClients:[] as string[],setSelectedClients:()=>{},canSeeBilling:true,canManageClients:true,archivedClients:[],paymentStatuses:[],clientHubStats:new Map(),commercialSummary:null,commercialState:'idle' as const,directoryKpis:{active:1,paused:0,activeProjects:0,deliveries:0},cobrosKpis:{alDia:0,porVencer:0,enMora:0,sinFactura:0},load:async()=>{},setClientArchive:async()=>{},toggleClientSelected:()=>{},selectVisibleClients:()=>{},batchClients:async()=>{},setDetail:()=>{}};
const acme={id:'1',name:'ACME',email:'a@acme.com',phone:'+595 981 123456',tax_id:'80168807-8',legal_name:'ACME SA',active:true,lifecycle_status:'active',created_at:'2026-01-02T12:00:00Z',has_recurring_price:true,notes:null,logo_url:null,color_key:'violet'};
const user=(role:string)=>({id:'1',role,organization_id:'7',full_name:'Prueba',organization_slug:''} as never);
class StubObserver{callback:()=>void;constructor(callback:()=>void){this.callback=callback;}observe(){this.callback();}disconnect(){}}

test('lista en ancho chico: filas finas con scroll silencioso, nunca tarjetas; fila y tarjeta traen la misma información',async()=>{
  (globalThis as {ResizeObserver?:unknown}).ResizeObserver=StubObserver;
  const clients=[acme as never];
  let renderer!:ReactTestRenderer;
  await act(async()=>{renderer=create(<ClientesSection {...baseProps} user={user('owner')} clients={clients} displayedClients={clients} liveClients={clients}/>,{createNodeMock:()=>({clientWidth:360})});});
  const table=renderer.root.findAll(node=>node.props.role==='table'&&node.props['aria-label']==='Clientes');
  assert.ok(table.length>0,'la lista conserva la tabla de filas finas');
  assert.match(String(table[0].props.className),/silent-scroll/,'scroll horizontal silencioso');
  assert.ok(renderer.root.findAll(node=>node.props.role==='row'&&String(node.props.className).includes('client-hub-row')).length>0,'filas');
  assert.equal(renderer.root.findAll(node=>node.type==='article').length,0,'sin tarjetas');
  const row=text(renderer.root);
  assert.match(row,/RUC/);assert.match(row,/80168807-8/);
  act(()=>renderer.unmount());
  await act(async()=>{renderer=create(<ClientesSection {...baseProps} clientView="grid" user={user('owner')} clients={clients} displayedClients={clients} liveClients={clients}/>,{createNodeMock:()=>({clientWidth:360})});});
  const tile=text(renderer.root);
  for(const label of ['Correo','Teléfono','RUC','Cliente desde','Actividad','Cobros'])assert.ok(tile.includes(label),`la tarjeta muestra ${label}`);
  act(()=>renderer.unmount());
});

test('lote: Asignar plan sólo con permiso de términos y Exportar CSV siempre que haya selección; viewer sin acciones',async()=>{
  const clients=[acme as never];
  const mount=async(role:string,canManageClients:boolean)=>{let renderer!:ReactTestRenderer;await act(async()=>{renderer=create(<ClientesSection {...baseProps} canManageClients={canManageClients} selectedClients={['1']} user={user(role)} clients={clients} displayedClients={clients} liveClients={clients}/>,{createNodeMock:()=>({clientWidth:1400})});});return renderer;};
  let renderer=await mount('sales',true);
  assert.ok(buttonWith(renderer,'Asignar plan')&&buttonWith(renderer,'Exportar CSV')&&buttonWith(renderer,'Archivar')&&buttonWith(renderer,'Reactivar'));
  act(()=>renderer.unmount());
  renderer=await mount('finance',true);
  assert.equal(buttonWith(renderer,'Asignar plan'),undefined,'finanzas no gestiona términos comerciales');
  act(()=>renderer.unmount());
  renderer=await mount('viewer',false);
  assert.equal(buttonWith(renderer,'Exportar CSV'),undefined,'viewer no ve acciones');
  assert.equal(buttonWith(renderer,'Asignar plan'),undefined);
  act(()=>renderer.unmount());
});

test('CSV: columnas visibles según el rol y valores normalizados, sin inyección de fórmulas',()=>{
  const clients=[acme,{...acme,id:'2',name:'=SUMA(1)',email:'b@x.com',phone:'+595 971 000111',tax_id:'',legal_name:'Con "comillas", S.A.'}] as never[];
  const payments=[{client_id:'1',payment_status:'overdue',days_overdue:12,next_due_on:null,outstanding_amount:'1500000',currency:'PYG'}] as never[];
  const activity=new Map([['1',{projects:2,pieces:5,nextDue:'2026-10-20T00:00:00Z'}]]);
  const opts={canSeeContact:true,canSeeBilling:true,payments,activity,stateLabel:()=>'Activo'};
  const lines=clientsCsv(clients,opts).split('\r\n');
  assert.equal(lines[0],'Cliente,Correo,Teléfono,RUC,Razón social,Estado,Estado de cobro,Días de mora,Saldo pendiente,Moneda,Proyectos activos,Piezas en curso,Próxima entrega');
  assert.equal(lines[1],'ACME,a@acme.com,+595 981 123456,80168807-8,ACME SA,Activo,overdue,12,1500000,PYG,2,5,2026-10-20');
  assert.ok(lines[2].startsWith("'=SUMA(1),"),'las fórmulas se neutralizan');
  assert.ok(lines[2].includes('"Con ""comillas"", S.A."'));
  const sinContacto=clientCsvColumns({canSeeContact:false,canSeeBilling:false});
  assert.deepEqual(sinContacto,['Cliente','Estado','Proyectos activos','Piezas en curso','Próxima entrega']);
  const csv=clientsCsv(clients,{...opts,canSeeContact:false,canSeeBilling:false});
  assert.ok(!csv.includes('a@acme.com')&&!csv.includes('80168807-8')&&!csv.includes('1500000'),'sin permiso no viajan contacto ni cobros');
});

test('asignar plan: un GET+PATCH por cliente con la versión vigente y los fallos no frenan el lote',async()=>{
  const seen:string[]=[];
  const call=(async(path:string,body?:unknown,method='GET')=>{
    seen.push(`${method} ${path} ${body?JSON.stringify(body):''}`.trim());
    if(path.includes('/clients/2/')&&method==='PATCH')throw new Error('El cliente cambió.');
    return {reporting:{version:'5'},plans:[]};
  }) as never;
  const result=await assignServicePlan(call,['1','2','3'],'8');
  assert.equal(result.updated,2);
  assert.deepEqual(result.failed,[{id:'2',message:'El cliente cambió.'}]);
  assert.ok(seen.includes('PATCH /api/agency/clients/1/reporting {"expectedVersion":"5","servicePlanId":"8"}'));
  assert.equal(seen.filter(entry=>entry.startsWith('PATCH')).length,3);
});

test('«Cargar plan y pago» abre el editor con su propio título, no «Editar cliente»',()=>{
  assert.equal(clientEditorTitle('create',false,''),'Nuevo cliente');
  assert.equal(clientEditorTitle('edit',false,'Acme'),'Editar cliente');
  assert.equal(clientEditorTitle('edit',true,'Acme'),'Plan y pago · Acme');
  assert.equal(clientEditorTitle('edit',true,''),'Plan y pago del cliente','mientras carga no muestra un nombre vacío');
  assert.match(read('app/client-editor.tsx'),/planMode\?<p className="form-note mb-3">\{CLIENT_PLAN_DESCRIPTION\}/,'el modo plan explica qué se carga');
});

// #220: la ficha se completa una sola vez y el contrato la reutiliza.
test('ficha legal: mismos campos en alta y edición, datos guardados y PATCH parcial',()=>{
 const {CLIENT_LEGAL_KEYS,clientCreatePayload,CLIENT_CREATE_DEFAULTS}=require('../app/client-editor-data') as typeof import('../app/client-editor-data');
 const values={...CLIENT_CREATE_DEFAULTS,name:'Cliente de prueba',party_type:'company',document_type:'passport',document_number:' DOC-TEST ',address:' Domicilio de prueba ',city:'Ciudad de prueba',department:'Departamento de prueba',legal_representative_name:'Representante de prueba',legal_representative_document:'REP-TEST',legal_representative_role:'Apoderado'};
 const payload=clientCreatePayload(values);
 assert.equal(payload.document_number,'DOC-TEST');assert.equal(payload.address,'Domicilio de prueba');
 const defaults=clientEditDefaults({...payload,id:'test'},null);
 assert.equal(defaults.legal_representative_document,'REP-TEST');
 assert.deepEqual(clientPatchPayload({...defaults,city:'Otra ciudad'},defaults).client,{city:'Otra ciudad'});
 assert.deepEqual(clientPatchPayload({...defaults,document_number:''},defaults).client,{document_number:''});
 assert.deepEqual(clientPatchPayload(defaults,defaults).client,null);
 for(const mode of ['create','edit'] as const){
  const fields=clientFields({mode});
  for(const key of CLIENT_LEGAL_KEYS){assert.ok(fields.find(field=>field.key===key));assert.equal(clientFields({mode,restricted:true}).find(field=>field.key===key)?.disabled,true);}
 }
 assert.equal(clientFields({mode:'create'}).find(field=>field.key==='address')?.maxLength,400);
 assert.equal(clientFields({mode:'edit'}).find(field=>field.key==='document_number')?.maxLength,80);
});

// #239: un solo Editor mantiene la relación visible y envía una decisión explícita.
test('responsable vinculado: checkbox deriva el nombre, persiste y permite volver a editar separado',async()=>{
 calls.length=0;route=()=>({});
 const record={id:'link',lifecycle_status:'active',name:'Cliente comercial',legal_name:'Razón social declarada',legal_representative_name:'Representante independiente',legal_representative_document:'CI-DECLARADA',document_number:'RUC-DECLARADO',legal_representative_same_as_client:false};
 let renderer!:ReactTestRenderer;
 await act(async()=>{renderer=create(<ClientEditor mode="edit" clientId="link" record={record}/>);});
 const checkbox=()=>renderer.root.find(node=>node.type==='input'&&node.props.type==='checkbox');
 assert.equal(checkbox().props.checked,false);
 await act(async()=>checkbox().props.onChange({target:{checked:true}}));
 assert.equal(input(renderer,'legal_representative_name').props.disabled,true);
 await change(renderer,'legal_name','Razón social actualizada');
 await submit(renderer);
 let body=calls.find(call=>call.method==='PATCH')?.body;
 assert.equal(body?.legal_representative_same_as_client,true);
 assert.equal(body?.legal_representative_name,'Razón social actualizada');
 assert(!Object.hasOwn(body!,'legal_representative_document'),'no se copia ni cambia el documento');
 act(()=>renderer.unmount());
 await act(async()=>{renderer=create(<ClientEditor mode="edit" clientId="link" record={{...record,legal_name:'Razón social actualizada',legal_representative_name:'Razón social actualizada',legal_representative_same_as_client:true}}/>);});
 calls.length=0;
 await act(async()=>checkbox().props.onChange({target:{checked:false}}));
 assert.equal(input(renderer,'legal_representative_name').props.disabled,false);
 await change(renderer,'legal_representative_name','Nuevo responsable independiente');
 await change(renderer,'legal_name','Otra razón social');
 await submit(renderer);
 body=calls.find(call=>call.method==='PATCH')?.body;
 assert.equal(body?.legal_representative_same_as_client,false);
 assert.equal(body?.legal_representative_name,'Nuevo responsable independiente');
 const defaults=clientEditDefaults({...record,legal_representative_same_as_client:true},null);
 assert.equal(defaults.legal_representative_same_as_client,'true','reabrir conserva la decisión');
 act(()=>renderer.unmount());
});

test('cambio del plan valida vigencia/motivo y edición de contacto conserva términos',async()=>{
 const {planTermsPayload}=require('../app/client-editor-data') as typeof import('../app/client-editor-data');
 const plan={clientId:'4',archived:false,historyRevision:'3',plans:[],collaborators:[],terms:{planId:'',planName:'Manual',recurringAmount:'100000',currency:'PYG' as const,startsOn:'2026-01-15',endsOn:null,cadence:'monthly' as const,intervalMonths:1,invoiceRequired:true,commissionRecipientId:null,commissionMode:'none' as const,commissionValue:null,updatedAt:'2026-10-01'}};
 const defaults=clientEditDefaults({id:'4',name:'Cliente'},plan);
 assert.throws(()=>planTermsPayload({...defaults,plan_amount:'200000'},plan,'fixture-id'),/motivo/);
 assert.throws(()=>planTermsPayload({...defaults,plan_effective_from:'2026-10-15',plan_reason:'Acuerdo nuevo'},plan,'fixture-id'),/primer día/);
 const values={...defaults,plan_amount:'200000',plan_effective_from:'2026-10-01',plan_reason:'Acuerdo comercial nuevo'};
 const payload=planTermsPayload(values,plan,'fixed-request');
 assert.equal(payload.startsOn,'2026-01-15','inicio comercial no se reemplaza por vigencia');
 assert.equal(payload.effectiveFrom,'2026-10-01');assert.equal(payload.expectedRevision,'3');assert.equal(payload.reason,'Acuerdo comercial nuevo');
 calls.length=0;route=()=>({});let renderer!:ReactTestRenderer;
 await act(async()=>{renderer=create(<ClientEditor mode="edit" clientId="4" record={{id:'4',name:'Cliente',lifecycle_status:'active'}} plan={plan}/>);});
 await change(renderer,'name','Cliente actualizado');
 // Sin alterar términos, el guardado de contacto no exige motivo ni historial nuevo.
 await submit(renderer);
 assert.equal(calls.filter(call=>call.url.includes('/commercial-terms')).length,0);
 assert.equal(calls.filter(call=>call.method==='PATCH').length,1);
 act(()=>renderer.unmount());
});

test('lote de plan de servicio conserva clasificación y nunca modifica términos económicos',async()=>{
 const calls:string[]=[];
 const call=(async(path:string,body?:unknown)=>{calls.push(path);return body?{}:{reporting:{version:'3'},plans:[]};}) as Parameters<typeof assignServicePlan>[0];
 await assignServicePlan(call,['4'],'7');
 assert.deepEqual(calls,['/api/agency/clients/4/reporting','/api/agency/clients/4/reporting']);
 assert(!calls.some(path=>path.includes('commercial-terms')));
});

 test('plan: reintento conserva idempotencia, nueva edición genera otra solicitud',async()=>{
 const {MoneyInput}=require('owncoding-ui');
 const plan={clientId:'4',archived:false,historyRevision:'3',plans:[],collaborators:[],terms:{planId:'',planName:'Manual',recurringAmount:'100000',currency:'PYG' as const,startsOn:'2026-01-15',endsOn:null,cadence:'monthly' as const,intervalMonths:1,invoiceRequired:true,commissionRecipientId:null,commissionMode:'none' as const,commissionValue:null,updatedAt:'2026-10-01'}};
 calls.length=0;route=url=>{if(url.endsWith('/commercial-terms'))throw Error('Conexión temporal de prueba');return{};};
 let renderer!:ReactTestRenderer;
 await act(async()=>{renderer=create(<ClientEditor mode="edit" clientId="4" record={{id:'4',name:'Cliente',lifecycle_status:'active'}} plan={plan}/>);});
 await act(async()=>renderer.root.findByType(MoneyInput).props.onValueChange('200000'));
 const reason=()=>renderer.root.find(node=>node.type==='textarea'&&node.props.name==='plan_reason');
 await act(async()=>reason().props.onChange({target:{name:'plan_reason',value:'Nuevo acuerdo comercial'},type:'change'}));
 await submit(renderer);await submit(renderer);
 const changes=()=>calls.filter(call=>call.url.endsWith('/commercial-terms'));
 assert.equal(changes().length,2);
 assert.match(String(changes()[0].body?.requestId),/^[a-f0-9-]{36}$/);
 assert.equal(changes()[0].body?.requestId,changes()[1].body?.requestId);
 assert.equal(changes()[0].body?.expectedRevision,'3');
 await change(renderer,'name','Cliente renombrado durante el reintento');
 await submit(renderer);
 assert.equal(changes()[2].body?.requestId,changes()[1].body?.requestId,'un cambio ajeno al plan no altera su idempotencia');
 await act(async()=>reason().props.onChange({target:{name:'plan_reason',value:'Acuerdo comercial revisado'},type:'change'}));
 await submit(renderer);
 assert.notEqual(changes()[2].body?.requestId,changes()[3].body?.requestId,'cambiar el contenido económico inicia otra solicitud');
 act(()=>renderer.unmount());
});

test('historial ausente o fallido bloquea cambios económicos antes de cualquier PATCH',async()=>{
 const {MoneyInput}=require('owncoding-ui');
 const plan={clientId:'4',archived:false,plans:[],collaborators:[],terms:{planId:'',planName:'Manual',recurringAmount:'100000',currency:'PYG',startsOn:'2026-01-15',endsOn:null,cadence:'monthly',intervalMonths:1,invoiceRequired:true,commissionRecipientId:null,commissionMode:'none',commissionValue:null,updatedAt:'2026-10-01'}};
 for(const unavailable of ['invalid','error']){
  calls.length=0;
  route=url=>{if(url.endsWith('/plan-history')){if(unavailable==='error')throw Error('Historial no disponible');return{};}if(url.endsWith('/commercial-terms'))return plan;if(url.endsWith('/clients/4'))return{record:{id:'4',name:'Cliente',lifecycle_status:'active'}};return{};};
  let renderer!:ReactTestRenderer;
  await act(async()=>{renderer=create(<ClientEditorDialog mode="edit" clientId="4" role="owner" close={()=>{}} refresh={async()=>{}}/>);});
  await settle();
  assert.match(text(renderer.root),/historial|Historial/);
  await change(renderer,'name','Nombre que no debe guardarse junto a plan inválido');
  await act(async()=>renderer.root.findByType(MoneyInput).props.onValueChange('200000'));
  const reason=renderer.root.find(node=>node.type==='textarea'&&node.props.name==='plan_reason');
  await act(async()=>reason.props.onChange({target:{name:'plan_reason',value:'Nuevo acuerdo comercial'},type:'change'}));
  await submit(renderer);
  assert.equal(calls.filter(call=>call.method==='PATCH').length,0,'sin revisión no hay escritura parcial de cliente ni plan');
  assert.match(text(renderer.root),/revisión del plan/);
  act(()=>renderer.unmount());
 }
});

test('el editor usa la revisión atómica de los términos y captura historial antes del borrador',async()=>{
 const {MoneyInput}=require('owncoding-ui');
 const plan={clientId:'4',archived:false,revision:'11',plans:[],collaborators:[],terms:{planId:'',planName:'Manual',recurringAmount:'100000',currency:'PYG',startsOn:'2026-01-15',endsOn:null,cadence:'monthly',intervalMonths:1,invoiceRequired:true,commissionRecipientId:null,commissionMode:'none',commissionValue:null,updatedAt:'2026-10-01'}};
 calls.length=0;route=url=>url.endsWith('/plan-history')?{records:[],revision:'10'}:url.endsWith('/commercial-terms')?plan:url.endsWith('/clients/4')?{record:{id:'4',name:'Cliente',lifecycle_status:'active'}}:{};
 let renderer!:ReactTestRenderer;
 await act(async()=>{renderer=create(<ClientEditorDialog mode="edit" clientId="4" role="owner" close={()=>{}} refresh={async()=>{}}/>);});
 await settle();
 assert(calls.findIndex(call=>call.url.endsWith('/plan-history'))<calls.findIndex(call=>call.url.endsWith('/commercial-terms')));
 await act(async()=>renderer.root.findByType(MoneyInput).props.onValueChange('200000'));
 const reason=renderer.root.find(node=>node.type==='textarea'&&node.props.name==='plan_reason');
 await act(async()=>reason.props.onChange({target:{name:'plan_reason',value:'Cambio comercial verificado'},type:'change'}));
 await submit(renderer);
 assert.equal(calls.find(call=>call.method==='PATCH'&&call.url.endsWith('/commercial-terms'))?.body?.expectedRevision,'11');
 act(()=>renderer.unmount());
});

test('plan monetario entero acepta ceros decimales del MoneyInput real y rechaza centavos',async()=>{
 const {MoneyInput}=require('owncoding-ui');
 for(const currency of ['USD','EUR','PYG'] as const){
  calls.length=0;route=()=>({});
  const plan={clientId:'4',archived:false,historyRevision:'3',plans:[],collaborators:[],terms:{planId:'',planName:'Manual',recurringAmount:'900.00',currency,startsOn:'2026-01-15',endsOn:null,cadence:'monthly' as const,intervalMonths:1,invoiceRequired:true,commissionRecipientId:null,commissionMode:'none' as const,commissionValue:null,updatedAt:'2026-10-01'}};
  let renderer!:ReactTestRenderer;
  await act(async()=>{renderer=create(<ClientEditor mode="edit" clientId="4" record={{id:'4',name:'Cliente',lifecycle_status:'active'}} plan={plan as never}/>);});
  const raw=()=>renderer.root.findByType(MoneyInput).findByType('input');
  const display=currency==='PYG'?'1.200':'1.200,00';
  await act(async()=>raw().props.onChange({currentTarget:{value:display,selectionStart:display.length}}));
  const reason=renderer.root.find(node=>node.type==='textarea'&&node.props.name==='plan_reason');
  await act(async()=>reason.props.onChange({target:{name:'plan_reason',value:'Acuerdo mensual entero'},type:'change'}));
  await submit(renderer);
  const changes=()=>calls.filter(call=>call.method==='PATCH'&&call.url.endsWith('/commercial-terms'));
  assert.equal(changes().length,1,`${currency}: el formulario guarda el entero monetario`);
  assert.equal(changes()[0].body?.recurringAmount,'1200');
  if(currency!=='PYG'){
   await act(async()=>raw().props.onChange({currentTarget:{value:'1.200,25',selectionStart:8}}));
   await submit(renderer);
   assert.equal(changes().length,1,`${currency}: los centavos reales no llegan al API entero`);
   assert.match(text(renderer.root),/número entero/);
  }
  act(()=>renderer.unmount());
 }
});

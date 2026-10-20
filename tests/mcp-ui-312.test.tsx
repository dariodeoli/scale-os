import React from 'react';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {act,create,type ReactTestInstance,type ReactTestRenderer} from 'react-test-renderer';
Object.assign(globalThis,{React});require.extensions['.css']=()=>{};
const layout=require.resolve('../app/access-layout');require.cache[layout]={id:layout,filename:layout,loaded:true,exports:{AccessLayout:({children}:{children:React.ReactNode})=><main>{children}</main>}} as NodeModule;
const dialog=require.resolve('../app/dialog');require.cache[dialog]={id:dialog,filename:dialog,loaded:true,exports:{ConfirmDialog:({onConfirm,onCancel,error,busy,confirmLabel}:{onConfirm:()=>void;onCancel:()=>void;error?:string;busy:boolean;confirmLabel:string})=><section role="dialog"><button disabled={busy} data-confirm-label={confirmLabel} onClick={onConfirm}>Confirmar revocación</button><button disabled={busy} onClick={onCancel}>Cancelar</button>{error?<p role="alert">{error}</p>:null}</section>}} as NodeModule;
Object.assign(globalThis,{window:{setInterval,clearInterval}});
const {McpConsent}=require('../app/mcp-consent') as typeof import('../app/mcp-consent');
const {McpConnections}=require('../app/mcp-connections') as typeof import('../app/mcp-connections');
const {mcpAuthorizationRedirect,readMcpAuthorization,readMcpConnections}=require('../app/mcp-data') as typeof import('../app/mcp-data');
const {safeMcpReturnPath,mcpConsentPath,rememberMcpReturn,takeMcpReturn,MCP_RETURN_KEY}=require('../app/mcp-return') as typeof import('../app/mcp-return');
const request='a'.repeat(43),otherRequest='b'.repeat(43),csrf='csrf-fixture-312';
const authorization=(id=request)=>({request:id,client:{name:'Asistente de prueba',redirectUri:'https://assistant.example.invalid/oauth/callback'},organization:{id:'1',name:'Empresa de prueba'},scopes:['scale:read','scale:write'],expiresAt:new Date(Date.now()+600000).toISOString(),csrfToken:csrf});
const connections=()=>({mcpUrl:'https://api.scaleparaguay.com/mcp',organization:{id:'1',name:'Empresa de prueba'},connections:[{id:'12',clientName:'Asistente de prueba',scopes:['scale:read'],createdAt:'2026-10-20T12:00:00Z',lastUsedAt:null,revokedAt:null}],capabilities:{manage:true},csrfToken:csrf});
type Call={url:string;method:string;body:Record<string,unknown>|null};const calls:Call[]=[];let route:(call:Call)=>unknown|Promise<unknown>=()=>authorization();
globalThis.fetch=(async(input:RequestInfo|URL,init:RequestInit={})=>{const call={url:String(input),method:init.method||'GET',body:init.body?JSON.parse(String(init.body)):null};calls.push(call);assert.equal(init.credentials,'include');assert.equal(init.cache,'no-store');assert.equal(init.redirect,'error');const data=await route(call);return data instanceof Response?data:new Response(JSON.stringify(data),{status:200});}) as typeof fetch;
const text=(node:ReactTestInstance|string):string=>typeof node==='string'?node:node.children.map(text).join('');
const button=(r:ReactTestRenderer,label:string)=>r.root.findAllByType('button').find(node=>text(node)===label)!;
const settle=async()=>act(async()=>{await new Promise(resolve=>setTimeout(resolve,0));});
async function mount(element:React.ReactElement){calls.length=0;let r:ReactTestRenderer;await act(async()=>{r=create(element);});await settle();return r!;}
async function unmount(r:ReactTestRenderer){await act(async()=>r.unmount());}

test('consentimiento explícito: GET no concede acceso y aprobar/denegar envían decisiones independientes con CSRF',async()=>{
 for(const approve of [true,false]){const redirects:string[]=[];route=call=>call.method==='GET'?authorization():{redirectUrl:'https://assistant.example.invalid/oauth/callback?'+(approve?'code=synthetic':'error=access_denied')};const r=await mount(<McpConsent request={request} navigateTo={url=>redirects.push(url)}/>);assert.equal(calls.length,1);assert.equal(calls[0].method,'GET');assert.match(text(r.root),/Empresa de prueba/);assert.match(text(r.root),/Consultar datos/);assert.match(text(r.root),/Crear y modificar datos/);await act(async()=>button(r,approve?'Autorizar lectura y cambios':'No autorizar').props.onClick());await settle();assert.equal(calls.length,2);assert.deepEqual(calls[1].body,{request,approve,csrfToken:csrf});assert.equal(redirects.length,1);await unmount(r);}
});

test('doble click entre aprobar/denegar no duplica autorización y una respuesta vieja no navega otra solicitud',async()=>{
 let release:(value:unknown)=>void=()=>{};const redirects:string[]=[];route=call=>call.method==='GET'?authorization(call.url.includes(otherRequest)?otherRequest:request):new Promise(resolve=>{release=resolve;});const r=await mount(<McpConsent request={request} navigateTo={url=>redirects.push(url)}/>);await act(async()=>{button(r,'Autorizar lectura y cambios').props.onClick();button(r,'No autorizar').props.onClick();});assert.equal(calls.filter(call=>call.method==='POST').length,1);await act(async()=>r.update(<McpConsent request={otherRequest} navigateTo={url=>redirects.push(url)}/>));await settle();await act(async()=>{release({redirectUrl:'https://assistant.example.invalid/oauth/callback?code=old'});});await settle();assert.deepEqual(redirects,[]);await unmount(r);
});

test('sin sesión, rol denegado, solicitud vencida/desconocida y scopes inválidos nunca muestran autorización efectiva',async()=>{
 for(const status of [401,403,410]){route=()=>new Response(JSON.stringify({error:'access_denied',error_description:status===401?'Iniciá sesión':status===410?'Solicitud vencida':'Acceso no disponible'}),{status});const r=await mount(<McpConsent request={request}/>);assert.equal(r.root.findAllByType('button').some(node=>text(node).startsWith('Autorizar ')),false);assert.equal(calls.length,1);if(status===401){const login=r.root.findAllByType('a').find(node=>text(node)==='Iniciar sesión y revisar')!;assert.equal(login.props.href,'/?next='+encodeURIComponent(mcpConsentPath(request)!));}assert.doesNotMatch(text(r.root),/access_denied/,'se muestra el mensaje español, no el código OAuth');await unmount(r);}
 route=()=>({...authorization(),expiresAt:'2020-01-01T00:00:00Z'});let r=await mount(<McpConsent request={request}/>);assert.equal(button(r,'Autorizar lectura y cambios').props.disabled,true);await act(async()=>button(r,'Autorizar lectura y cambios').props.onClick());assert.equal(calls.length,1);await unmount(r);
 route=()=>({...authorization(),scopes:['superadmin']});r=await mount(<McpConsent request={request}/>);assert.match(text(r.root),/No se pudo validar/);assert.equal(r.root.findAllByType('button').some(node=>text(node).startsWith('Autorizar ')),false);await unmount(r);
});

// Faithful to the backend: every GET issues a new nonce; every DELETE consumes
// it before the update/audit and therefore before a possible failure response.
function nonceApi({lost=false}:{lost?:boolean}={}){
 let sequence=0,nonce='',revoked=false,attempts=0,failRefresh=false;
 return {
  get attempts(){return attempts;},set failRefresh(value:boolean){failRefresh=value;},
  handle(call:Call){
   if(call.method==='GET'){
    if(failRefresh)throw new Error('network unavailable');
    nonce='nonce-'+(++sequence);
    return {...connections(),csrfToken:nonce,connections:connections().connections.map(connection=>({...connection,revokedAt:revoked?'2026-10-20T13:00:00Z':null}))};
   }
   assert.equal(call.method,'DELETE');assert.ok(nonce,'a consumed CSRF must never be reused');assert.deepEqual(call.body,{csrfToken:nonce});nonce='';attempts++;
   if(attempts===1){if(lost){revoked=true;throw new Error('response lost');}return new Response(JSON.stringify({error:'server_error',error_description:'No se pudo revocar; reintentá.'}),{status:503});}
   if(attempts===2)return {revoked:true,id:'other'};
   revoked=true;return {revoked:true,id:'12'};
  }
 };
}

test('revocación renueva el CSRF consumido antes de cada reintento y valida el ID confirmado',async()=>{
 const api=nonceApi();route=call=>api.handle(call);const r=await mount(<McpConnections organizationId="1" userId="7"/>);
 await act(async()=>button(r,'Revocar conexión').props.onClick());assert.equal(api.attempts,0);
 await act(async()=>button(r,'Confirmar revocación').props.onClick());await settle();assert.match(text(r.root),/No se pudo revocar/);assert.match(text(r.root),/Asistente de prueba/);
 assert.equal(calls.filter(call=>call.method==='GET').length,2);
 await act(async()=>button(r,'Confirmar revocación').props.onClick());await settle();assert.equal(api.attempts,2);assert.match(text(r.root),/No se pudo confirmar la revocación/);assert.doesNotMatch(text(r.root),/Conexión revocada/);
 await act(async()=>button(r,'Confirmar revocación').props.onClick());await settle();assert.equal(api.attempts,3);assert.match(text(r.root),/Conexión revocada/);assert.equal(r.root.findAllByProps({role:'dialog'}).length,0);await unmount(r);
});

test('respuesta DELETE perdida concilia revokedAt sin un segundo DELETE ni consentimiento adicional',async()=>{
 const api=nonceApi({lost:true});route=call=>api.handle(call);const r=await mount(<McpConnections organizationId="1" userId="7"/>);
 await act(async()=>button(r,'Revocar conexión').props.onClick());await act(async()=>button(r,'Confirmar revocación').props.onClick());await settle();
 assert.equal(api.attempts,1);assert.equal(calls.filter(call=>call.method==='GET').length,2);assert.match(text(r.root),/Conexión revocada/);assert.equal(r.root.findAllByProps({role:'dialog'}).length,0);await unmount(r);
});

test('si falla conciliación sólo permite GET; cancelar/reabrir no reutiliza el nonce y una fila ausente no confirma éxito',async()=>{
 const api=nonceApi();route=call=>api.handle(call);const r=await mount(<McpConnections organizationId="1" userId="7"/>);
 await act(async()=>button(r,'Revocar conexión').props.onClick());api.failRefresh=true;
 await act(async()=>button(r,'Confirmar revocación').props.onClick());await settle();assert.equal(api.attempts,1);assert.match(text(r.root),/Actualizá antes de volver a confirmar/);assert.equal(button(r,'Confirmar revocación').props['data-confirm-label'],'Actualizar conexión');
 await act(async()=>button(r,'Cancelar').props.onClick());await act(async()=>button(r,'Revocar conexión').props.onClick());
 await act(async()=>button(r,'Confirmar revocación').props.onClick());await settle();assert.equal(api.attempts,1);
 api.failRefresh=false;route=call=>call.method==='GET'?{...api.handle(call),connections:[]}:api.handle(call);
 await act(async()=>button(r,'Confirmar revocación').props.onClick());await settle();assert.equal(api.attempts,1);assert.doesNotMatch(text(r.root),/Conexión revocada/);assert.equal(button(r,'Confirmar revocación').props['data-confirm-label'],'Revocar conexión');await unmount(r);
});

test('conciliación rechaza sesión/empresa cambiadas y descarta respuestas tras cambiar de usuario',async()=>{
 for(const outcome of [401,403,'organization'] as const){let gets=0;route=call=>{if(call.method==='DELETE')throw new Error('response lost');gets++;if(gets===1)return connections();if(outcome==='organization')return {...connections(),organization:{id:'2',name:'Empresa ajena'}};return new Response(JSON.stringify({error_description:'Sesión no disponible'}),{status:outcome});};const r=await mount(<McpConnections organizationId="1" userId="7"/>);await act(async()=>button(r,'Revocar conexión').props.onClick());await act(async()=>button(r,'Confirmar revocación').props.onClick());await settle();assert.equal(r.root.findAllByProps({role:'dialog'}).length,0);assert.doesNotMatch(text(r.root),/Asistente de prueba|Conexión revocada/);await unmount(r);}
 let release:(value:unknown)=>void=()=>{};let gets=0;route=call=>{if(call.method==='DELETE')throw new Error('response lost');gets++;if(gets===2)return new Promise(resolve=>{release=resolve;});return {...connections(),connections:[]};};
 // First user needs an active connection before the pending recovery GET.
 route=(()=>{const handle=route;return(call:Call)=>gets===0&&call.method==='GET'?(gets++,connections()):handle(call);})();
 const r=await mount(<McpConnections organizationId="1" userId="7"/>);await act(async()=>button(r,'Revocar conexión').props.onClick());await act(async()=>{void button(r,'Confirmar revocación').props.onClick();});await settle();
 await act(async()=>r.update(<McpConnections organizationId="1" userId="8"/>));await settle();
 await act(async()=>release({...connections(),connections:connections().connections.map(connection=>({...connection,revokedAt:'2026-10-20T13:00:00Z'}))}));await settle();assert.doesNotMatch(text(r.root),/Conexión revocada|Asistente de prueba/);await unmount(r);
});

test('configuración rechaza respuesta de otra empresa y callbacks/login return no permiten destinos abiertos',async()=>{
 route=()=>({...connections(),organization:{id:'2',name:'Empresa ajena'}});const r=await mount(<McpConnections organizationId="1" userId="7"/>);assert.match(text(r.root),/pertenece a otra empresa/);assert.doesNotMatch(text(r.root),/Asistente de prueba|Empresa ajena/);await unmount(r);
 assert.equal(safeMcpReturnPath(mcpConsentPath(request)),mcpConsentPath(request));for(const path of ['//attacker.invalid/mcp/autorizar?request='+request,'https://attacker.invalid/mcp/autorizar?request='+request,'/mcp/autorizar?request='+request+'&request='+otherRequest,'/mcp/autorizar?request='+request+'#x','/mcp/autorizar?request=short','/mcp/autorizar?request='+request+'&next=https://attacker.invalid'])assert.equal(safeMcpReturnPath(path),null);
 for(const target of ['javascript:alert(1)','http://assistant.example.invalid/oauth/callback','https://attacker.invalid/oauth/callback','https://assistant.example.invalid/other','https://user:pass@assistant.example.invalid/oauth/callback'])assert.throws(()=>mcpAuthorizationRedirect({redirectUrl:target},authorization().client.redirectUri));
 assert.throws(()=>mcpAuthorizationRedirect({redirectUrl:'https://assistant.example.invalid/oauth/callback?workspace=other&code=synthetic'},authorization().client.redirectUri+'?workspace=expected'));
 assert.equal(mcpAuthorizationRedirect({redirectUrl:'https://assistant.example.invalid/oauth/callback?code=synthetic&state=synthetic'},authorization().client.redirectUri),'https://assistant.example.invalid/oauth/callback?code=synthetic&state=synthetic');
 const storage=new Map<string,string>();const adapter={setItem:(key:string,value:string)=>storage.set(key,value),getItem:(key:string)=>storage.get(key)||null,removeItem:(key:string)=>storage.delete(key)};rememberMcpReturn(request,adapter);assert.equal(takeMcpReturn(adapter),mcpConsentPath(request));assert.equal(takeMcpReturn(adapter),null);storage.set(MCP_RETURN_KEY,JSON.stringify({path:mcpConsentPath(request),expires:Date.now()-1}));assert.equal(takeMcpReturn(adapter),null);
 assert.throws(()=>readMcpAuthorization({...authorization(),client:{name:'Bad',redirectUri:'javascript:alert(1)'}},request));assert.throws(()=>readMcpConnections({...connections(),csrfToken:''}));
});

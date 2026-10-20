'use client';
import {useEffect,useRef,useState} from 'react';
import {AccessLayout} from './access-layout';
import {LoadingBlock} from './ui-v2';
import {Button} from './ui/button';
import {useSingleFlightSubmit} from './use-single-flight-submit';
import {MCP_RETURN_KEY,mcpConsentPath,rememberMcpReturn,validMcpRequest} from './mcp-return';
import {MCP_SCOPES,McpRequestError,mcpAuthorizationRedirect,mcpErrorMessage,mcpRequest,readMcpAuthorization,type McpAuthorization} from './mcp-data';
import './mcp.css';
const navigate=(url:string)=>window.location.assign(url);
export function McpConsent({request,navigateTo=navigate}:{request:string;navigateTo?:(url:string)=>void}){
 const epoch=useRef(0),decisionLock=useRef(false);
 const [data,setData]=useState<McpAuthorization|null>(null),[error,setError]=useState(''),[status,setStatus]=useState(0),[loading,setLoading]=useState(true),[retry,setRetry]=useState(0),[expired,setExpired]=useState(false);
 useEffect(()=>{const generation=++epoch.current;let alive=true;setDecision(null);setData(null);setError('');setStatus(0);setExpired(false);if(!validMcpRequest(request)){setLoading(false);setError('La solicitud de conexión no es válida. Iniciá una conexión nueva desde tu asistente.');return;}
  setLoading(true);void mcpRequest(`authorization?request=${encodeURIComponent(request)}`).then(value=>{const next=readMcpAuthorization(value,request);if(alive){setData(next);setExpired(Date.parse(next.expiresAt)<=Date.now());}}).catch(cause=>{if(alive){setError(mcpErrorMessage(cause));setStatus(cause instanceof McpRequestError?cause.status:0);}}).finally(()=>{if(alive)setLoading(false);});return()=>{alive=false;if(epoch.current===generation)epoch.current++;};
 },[request,retry]);
 useEffect(()=>{if(!data)return;const update=()=>setExpired(Date.parse(data.expiresAt)<=Date.now());update();const timer=window.setInterval(update,1000);return()=>window.clearInterval(timer);},[data]);
 const authorize=useSingleFlightSubmit(async()=>decide(true)),deny=useSingleFlightSubmit(async()=>decide(false));
 const busy=authorize.pending||deny.pending;
 // Both decisions share the native disabled state; the immediate ref also guards
 // cross-button clicks before React has rendered the pending state.
 const [decision,setDecision]=useState<'approve'|'deny'|null>(null);
 async function decide(approve:boolean){if(!data||expired||decisionLock.current||Date.parse(data.expiresAt)<=Date.now())return;decisionLock.current=true;const generation=epoch.current;setDecision(approve?'approve':'deny');setError('');try{const value=await mcpRequest('authorization',{method:'POST',body:JSON.stringify({request,approve,csrfToken:data.csrfToken})});if(epoch.current===generation)navigateTo(mcpAuthorizationRedirect(value,data.client.redirectUri));}catch(cause){if(epoch.current===generation){setError(mcpErrorMessage(cause));if(cause instanceof McpRequestError&&[404,409,410].includes(cause.status))setExpired(true);if(cause instanceof McpRequestError&&[401,403].includes(cause.status)){setStatus(cause.status);setData(null);}}}finally{decisionLock.current=false;if(epoch.current===generation)setDecision(null);}}
 const path=mcpConsentPath(request),login=path?`/?next=${encodeURIComponent(path)}`:'/';
 return <AccessLayout eyebrow="Conectar un asistente" wide busy={busy}>
  <div className="mcp-panel"><h1>Autorizar conexión de IA</h1>
  {loading?<LoadingBlock label="Revisando solicitud de conexión…" lines={3}/>:null}
  {error&&!expired?<p role="alert" className="error form-error-summary">{error}</p>:null}
  {status===401?<><p>Iniciá sesión en Scale OS para revisar la empresa y los permisos. Iniciar sesión no autoriza la conexión.</p><a className="primary mcp-login" href={login} onClick={()=>{if(path)try{rememberMcpReturn(request,window.sessionStorage);}catch{/* next still preserves password login. */}}}>Iniciar sesión y revisar</a></>:null}
  {status===403?<p>Esta solicitud no está disponible para tu sesión actual. Volvé a iniciar la conexión desde el asistente o revisá el acceso de tu cuenta.</p>:null}
  {data?<><p><strong>{data.client.name}</strong> solicita acceso a <strong>{data.organization.name}</strong>.</p><p className="mcp-muted">Destino de la aplicación: <span className="mcp-break">{data.client.redirectUri}</span>. El nombre lo declara quien solicita acceso; verificá el destino antes de autorizar. Los datos compartidos quedarán sujetos a las condiciones de esa aplicación.</p>
   <section aria-label="Permisos solicitados"><h2>Qué podrá hacer</h2><ul className="mcp-scopes">{data.scopes.map(scope=><li key={scope}><strong>{MCP_SCOPES[scope].title}</strong><p>{MCP_SCOPES[scope].description}</p></li>)}</ul></section>
   <p>Se aplican los permisos actuales de tu usuario. Podés revocar el acceso en Preferencias del espacio → Conexiones de IA. No compartas tu contraseña de Scale ni tokens en el chat.</p>
   {expired?<p role="alert" className="error form-error-summary">Esta solicitud venció o ya fue utilizada. Iniciá la conexión otra vez desde el asistente.</p>:null}
   <div className="mcp-actions"><Button type="button" variant="secondary" disabled={busy||!!decision||expired} onClick={()=>void deny.onSubmit()}>No autorizar</Button><Button type="button" variant="primary" disabled={busy||!!decision||expired} onClick={()=>void authorize.onSubmit()}>{busy?'Procesando…':data.scopes.includes('scale:write')?data.scopes.includes('scale:read')?'Autorizar lectura y cambios':'Autorizar cambios':'Autorizar lectura'}</Button></div>
  </>:null}
  {!loading&&!data&&status!==401&&validMcpRequest(request)&&![403,404,409,410].includes(status)?<Button type="button" variant="secondary" onClick={()=>setRetry(value=>value+1)}>Reintentar</Button>:null}
  <a href="/configuracion/preferencias#preferences-ai" onClick={()=>{try{window.sessionStorage.removeItem(MCP_RETURN_KEY);}catch{/* Optional browser state. */}}}>Volver a mi espacio</a>
  </div>
 </AccessLayout>;
}

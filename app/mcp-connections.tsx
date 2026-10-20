'use client';
import {useEffect,useRef,useState} from 'react';
import {InputControl} from './ui/input-control';
import {Button} from './ui/button';
import {ConfirmDialog} from './dialog';
import {LoadingBlock} from './ui-v2';
import {useSingleFlightSubmit} from './use-single-flight-submit';
import {MCP_SCOPES,McpRequestError,mcpErrorMessage,mcpRequest,readMcpConnections,type McpConnection,type McpConnectionsData} from './mcp-data';
import './mcp.css';
const date=(value:string|null)=>value?new Date(value).toLocaleString('es-PY',{timeZone:'America/Asuncion',hourCycle:'h23'}):'Todavía sin uso';
export function McpConnections({organizationId,userId}:{organizationId:string;userId:string}){return <Connections key={`${organizationId}:${userId}`} organizationId={organizationId}/>;}
function Connections({organizationId}:{organizationId:string}){
 const [data,setData]=useState<McpConnectionsData|null>(null),[error,setError]=useState(''),[status,setStatus]=useState(0),[notice,setNotice]=useState(''),[loading,setLoading]=useState(true),[retry,setRetry]=useState(0),[selected,setSelected]=useState<McpConnection|null>(null),[revokeError,setRevokeError]=useState(''),[revokeNeedsRefresh,setRevokeNeedsRefresh]=useState(false);
 const endpoint=useRef<HTMLInputElement>(null),alive=useRef(true);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 useEffect(()=>{let current=true;setLoading(true);setError('');setStatus(0);void mcpRequest('connections').then(value=>{const next=readMcpConnections(value);if(next.organization.id!==organizationId)throw new Error('La conexión pertenece a otra empresa. Volvé a cargar tu espacio.');if(current){setData(next);setRevokeNeedsRefresh(false);}}).catch(cause=>{if(current){setData(null);setSelected(null);setError(mcpErrorMessage(cause));setStatus(cause instanceof McpRequestError?cause.status:0);}}).finally(()=>{if(current)setLoading(false);});return()=>{current=false;};},[organizationId,retry]);
 // A DELETE may consume its one-use CSRF even when the response fails. Only a
 // fresh authoritative GET can make another confirmation safe or reconcile a
 // completed revocation whose response was lost.
 async function refreshRevocation(id:string,message:string){
  try{
   const next=readMcpConnections(await mcpRequest('connections'));
   if(!alive.current)return;
   if(next.organization.id!==organizationId){setData(null);setSelected(null);setError('La conexión pertenece a otra empresa. Volvé a cargar tu espacio.');return;}
   setData(next);setRevokeNeedsRefresh(false);
   const connection=next.connections.find(connection=>connection.id===id);
   if(connection?.revokedAt){setSelected(null);setRevokeError('');setNotice('Conexión revocada. El asistente ya no puede usar ese acceso.');}
   else setRevokeError(message||'Se actualizó la conexión. Confirmá nuevamente para revocar su acceso.');
  }catch(cause){
   if(!alive.current)return;
   if(cause instanceof McpRequestError&&(cause.status===401||cause.status===403)){setData(null);setSelected(null);setError(mcpErrorMessage(cause));setStatus(cause.status);return;}
   setRevokeError(`${message?message+' ':''}No se pudo actualizar la conexión. Actualizá antes de volver a confirmar.`);
  }
 }
 const revoke=useSingleFlightSubmit(async()=>{
  if(!selected||!data?.capabilities.manage)return;
  const id=selected.id;
  if(revokeNeedsRefresh){await refreshRevocation(id,'');return;}
  setRevokeError('');setRevokeNeedsRefresh(true);
  try{
   const value=await mcpRequest(`connections/${encodeURIComponent(id)}`,{method:'DELETE',body:JSON.stringify({csrfToken:data.csrfToken})});
   if(!value||typeof value!=='object'||!('revoked' in value)||value.revoked!==true||!('id' in value)||value.id!==id)throw new Error('No se pudo confirmar la revocación. Actualizá la lista.');
   if(alive.current){setData(current=>current?{...current,connections:current.connections.filter(connection=>connection.id!==id)}:current);setSelected(null);setNotice('Conexión revocada. El asistente ya no puede usar ese acceso.');setRetry(value=>value+1);}
  }catch(cause){if(alive.current)await refreshRevocation(id,mcpErrorMessage(cause));}
 });
 async function copy(){if(!data)return;setNotice('');try{if(!navigator.clipboard?.writeText)throw Error('unavailable');await navigator.clipboard.writeText(data.mcpUrl);if(alive.current)setNotice('URL de conexión copiada.');}catch{endpoint.current?.focus();endpoint.current?.select();if(alive.current)setNotice('Seleccioná y copiá la URL de conexión.');}}
 return <div className="mcp-connections">
  <p>Conectá Claude o ChatGPT con tu cuenta de Scale OS. Cada aplicación pide autorización y sólo puede usar los permisos que aprobaste para esta empresa.</p>
  {error?<p role="alert" className="error form-error-summary">{error}</p>:null}{notice?<p role="status" className="form-note">{notice}</p>:null}
  {loading?<LoadingBlock label="Cargando conexiones de IA…" lines={2}/>:null}
  {status===403?<p>Tu usuario no tiene permiso para administrar estas conexiones.</p>:null}
  {error&&status!==403?<Button type="button" variant="secondary" onClick={()=>setRetry(value=>value+1)}>Reintentar conexiones</Button>:null}
  {data?<><div><label htmlFor="mcp-endpoint">URL del servidor MCP</label><div className="mcp-endpoint"><InputControl id="mcp-endpoint" ref={endpoint} readOnly value={data.mcpUrl} aria-describedby="mcp-endpoint-help"/><Button type="button" variant="secondary" onClick={()=>void copy()}>Copiar URL</Button></div><p id="mcp-endpoint-help" className="mcp-muted">Esta URL identifica el servicio; no es una contraseña ni concede acceso por sí sola.</p></div>
   <ol className="mcp-guide"><li>En Claude o ChatGPT, abrí la configuración de conectores o apps y elegí agregar un servidor MCP remoto, si tu plan dispone de esa opción.</li><li>Pegá la URL y elegí la autorización OAuth. Se abrirá Scale OS para revisar la empresa y los permisos antes de aceptar.</li><li>Volvé al asistente cuando termine la autorización. Si no ofrece conectores MCP remotos, necesitás una modalidad compatible; pegar la URL en un chat no conecta tu cuenta.</li></ol>
   <p className="mcp-muted">No compartas tu contraseña ni tokens en el chat. Tener esta pantalla disponible no confirma una conexión con Claude o ChatGPT; la conexión aparece abajo sólo después de autorizarla.</p>
   <h3>Conexiones de tu cuenta en {data.organization.name}</h3>
   {data.connections.length?<ul className="mcp-connection-list">{data.connections.map(connection=><li key={connection.id}><div><strong className="mcp-break">{connection.clientName}</strong><p>{connection.scopes.map(scope=>MCP_SCOPES[scope].title).join(' · ')}</p><p className="mcp-muted">Autorizada {date(connection.createdAt)} · Último uso: {date(connection.lastUsedAt)}</p>{connection.revokedAt?<p>Revocada {date(connection.revokedAt)}</p>:null}</div>{data.capabilities.manage&&!connection.revokedAt?<Button type="button" variant="secondary" onClick={()=>{setSelected(connection);setRevokeError('');}}>Revocar conexión</Button>:null}</li>)}</ul>:!loading?<p>No hay conexiones autorizadas para tu cuenta en esta empresa.</p>:null}
  </>:null}
  {selected?<ConfirmDialog title="Revocar conexión de IA" description={`Se retirará el acceso de ${selected.clientName} a esta empresa. Para volver a usarlo tendrás que autorizar una conexión nueva desde el asistente.`} confirmLabel={revokeNeedsRefresh?"Actualizar conexión":"Revocar conexión"} busy={revoke.pending} error={revokeError} variant="danger" onCancel={()=>setSelected(null)} onConfirm={()=>void revoke.onSubmit()}/>:null}
 </div>;
}

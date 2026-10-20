import {transporteError} from './workspace-request';
export const MCP_SCOPES={
 'scale:read':{title:'Consultar datos',description:'Consultar la información de Scale disponible para tu usuario en esta empresa.'},
 'scale:write':{title:'Crear y modificar datos',description:'Ejecutar herramientas de cambios disponibles para tu usuario. El asistente podrá solicitar acciones sobre datos de esta empresa.'},
} as const;
export type McpScope=keyof typeof MCP_SCOPES;
export type McpConnection={id:string;clientName:string;scopes:McpScope[];createdAt:string;lastUsedAt:string|null;revokedAt:string|null};
export type McpConnectionsData={mcpUrl:string;organization:{id:string;name:string};connections:McpConnection[];capabilities:{manage:boolean};csrfToken:string};
export type McpAuthorization={request:string;client:{name:string;redirectUri:string};organization:{id:string;name:string};scopes:McpScope[];expiresAt:string;csrfToken:string};
export class McpRequestError extends Error{constructor(message:string,readonly status:number){super(message);this.name='McpRequestError';}}
export async function mcpRequest(path:string,init:RequestInit={}):Promise<unknown>{
 let response:Response;try{response=await fetch(`/core-api/api/agency/mcp/${path}`,{...init,credentials:'include',cache:'no-store',redirect:'error',signal:init.signal||AbortSignal.timeout(20000),headers:{...(init.body?{'Content-Type':'application/json'}:{}),...init.headers}});}catch(cause){throw transporteError(cause);}
 const data=await response.json().catch(()=>null);
 if(!response.ok)throw new McpRequestError(typeof data?.error_description==='string'?data.error_description:typeof data?.error==='string'?data.error:'No se pudo completar la conexión. Reintentá.',response.status);
 if(!data||typeof data!=='object')throw new McpRequestError('La conexión devolvió una respuesta inválida.',502);
 return data;
}
const text=(value:unknown,max=500):value is string=>typeof value==='string'&&value.trim().length>0&&value.length<=max;
const date=(value:unknown):value is string=>typeof value==='string'&&Number.isFinite(Date.parse(value));
export function secureMcpUrl(value:unknown):value is string{if(typeof value!=='string')return false;try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password&&!url.hash;}catch{return false;}}
export const validMcpScopes=(value:unknown):value is McpScope[]=>Array.isArray(value)&&value.length>0&&value.every(scope=>typeof scope==='string'&&Object.hasOwn(MCP_SCOPES,scope))&&new Set(value).size===value.length;
function organization(value:unknown):value is McpAuthorization['organization']{const record=value as McpAuthorization['organization'];return !!record&&text(record.id,128)&&text(record.name);}
export function readMcpConnections(value:unknown):McpConnectionsData{
 const data=value as McpConnectionsData;
 if(!data||!secureMcpUrl(data.mcpUrl)||new URL(data.mcpUrl).search!==''||!organization(data.organization)||!text(data.csrfToken,2000)||typeof data.capabilities?.manage!=='boolean'||!Array.isArray(data.connections)||new Set(data.connections.map(connection=>connection?.id)).size!==data.connections.length||!data.connections.every(connection=>connection&&text(connection.id,128)&&text(connection.clientName)&&validMcpScopes(connection.scopes)&&date(connection.createdAt)&&(connection.lastUsedAt===null||date(connection.lastUsedAt))&&(connection.revokedAt===null||date(connection.revokedAt))))throw new McpRequestError('No se pudieron validar las conexiones de esta empresa.',502);
 return data;
}
export function readMcpAuthorization(value:unknown,request:string):McpAuthorization{
 const data=value as McpAuthorization;
 if(!data||data.request!==request||!text(data.client?.name)||!secureMcpUrl(data.client?.redirectUri)||!organization(data.organization)||!validMcpScopes(data.scopes)||!date(data.expiresAt)||!text(data.csrfToken,2000))throw new McpRequestError('No se pudo validar la solicitud de autorización.',502);
 return data;
}
/** OAuth redirects are allowed only back to the callback shown in this consent. */
export function mcpAuthorizationRedirect(value:unknown,expected:string){
 const data=value as {redirectUrl?:unknown};if(!secureMcpUrl(data?.redirectUrl)||!secureMcpUrl(expected))throw new McpRequestError('La aplicación devolvió un destino de autorización inválido.',502);
 const target=new URL(data.redirectUrl),callback=new URL(expected);
 if(target.origin!==callback.origin||target.pathname!==callback.pathname||Array.from(new Set(callback.searchParams.keys())).some(key=>JSON.stringify(target.searchParams.getAll(key))!==JSON.stringify(callback.searchParams.getAll(key))))throw new McpRequestError('El destino no coincide con la aplicación autorizada.',502);
 return target.href;
}
export function mcpErrorMessage(cause:unknown){return cause instanceof Error?cause.message:'No se pudo completar la conexión.';}

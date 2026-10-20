/** Only the short-lived MCP consent request can survive a login round trip. */
export const MCP_RETURN_KEY='scale:mcp:consent-return';
export const validMcpRequest=(value:unknown):value is string=>typeof value==='string'&&/^[A-Za-z0-9_-]{32,128}$/.test(value);
export function mcpConsentPath(request:string){return validMcpRequest(request)?`/mcp/autorizar?request=${encodeURIComponent(request)}`:null;}
export function safeMcpReturnPath(value:unknown){
 if(typeof value!=='string'||!value.startsWith('/mcp/autorizar?'))return null;
 try{const url=new URL(value,'https://app.scaleparaguay.com');const keys=Array.from(url.searchParams.keys());const request=url.searchParams.get('request');return url.origin==='https://app.scaleparaguay.com'&&url.pathname==='/mcp/autorizar'&&!url.hash&&keys.length===1&&keys[0]==='request'&&validMcpRequest(request)?mcpConsentPath(request):null;}catch{return null;}
}
export function rememberMcpReturn(request:string,storage:Pick<Storage,'setItem'>){const path=mcpConsentPath(request);if(path)try{storage.setItem(MCP_RETURN_KEY,JSON.stringify({path,expires:Date.now()+15*60*1000}));}catch{/* Login remains available through the next parameter. */}}
export function takeMcpReturn(storage:Pick<Storage,'getItem'|'removeItem'>){
 try{const stored=storage.getItem(MCP_RETURN_KEY);storage.removeItem(MCP_RETURN_KEY);if(!stored)return null;const value=JSON.parse(stored);return typeof value.expires==='number'&&value.expires>Date.now()&&value.expires<=Date.now()+15*60*1000?safeMcpReturnPath(value.path):null;}catch{return null;}
}

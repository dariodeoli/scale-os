const clientPortalApiBase='/core-api/api/client-portal';

export type PortalApiError=Error&{status?:number;link_status?:string};

export function clientPortalApiUrl(path:string){return clientPortalApiBase+path;}

export async function portalApi<T>(path:string,body?:unknown,method='POST'):Promise<T>{
 const response=await fetch(clientPortalApiUrl(path),{method:body===undefined?'GET':method,credentials:'include',cache:'no-store',headers:body===undefined?undefined:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
 const data=await response.json().catch(()=>({error:'No se pudo leer la respuesta'}));
 if(!response.ok){const detail=data&&typeof data==='object'?data as {error?:unknown;link_status?:unknown}:{};throw Object.assign(new Error(typeof detail.error==='string'?detail.error:'No se pudo completar la operación'),{status:response.status,...(typeof detail.link_status==='string'?{link_status:detail.link_status}:{})}) as PortalApiError;}
 return data as T;
}

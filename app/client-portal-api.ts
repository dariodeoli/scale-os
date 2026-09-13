const clientPortalApiBase='/core-api/api/client-portal';

export function clientPortalApiUrl(path:string){return clientPortalApiBase+path;}

export async function portalApi<T>(path:string,body?:unknown,method='POST'):Promise<T>{
 const response=await fetch(clientPortalApiUrl(path),{method:body===undefined?'GET':method,credentials:'include',cache:'no-store',headers:body===undefined?undefined:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
 const data=await response.json().catch(()=>({error:'No se pudo leer la respuesta'}));
 if(!response.ok)throw Object.assign(new Error(data.error||'No se pudo completar la operación'),{status:response.status});
 return data as T;
}

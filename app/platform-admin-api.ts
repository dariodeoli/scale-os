export const platformApiBase='/core-api';
export async function platformApi<T>(path:string,init:RequestInit={}){
 const response=await fetch(platformApiBase+path,{...init,credentials:'include',cache:'no-store',headers:{'Content-Type':'application/json',...(init.headers||{})}});
 const data=await response.json().catch(()=>({}));
 if(!response.ok)throw Object.assign(Error(data.error||'No se pudo completar la administración global.'),{status:response.status});
 return data as T;
}
export function subscriptionExpiry(value:string){
 if(!value)return null;
 const date=new Date(value);if(!Number.isFinite(date.getTime()))throw Error('Elegí una fecha y hora de vencimiento válida.');
 return date.toISOString();
}

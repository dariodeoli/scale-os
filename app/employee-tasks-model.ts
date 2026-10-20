import {clearDataCache,dataFetch} from './data-cache';
export const TASKS_CHANGED='scale:employee-tasks-changed';
export const TASKS_PATH='/api/agency/productivity/internal-tasks';
export type Task={id:string;version:number;title:string;description?:string;status:string;priority:string;due_date?:string|null;due_time?:string|null;project_id?:string|null;client_id?:string|null;project_name?:string;client_name?:string;assigned_user_ids:string[];people?:{id:string;full_name:string}[];assignees?:{id:string;full_name:string}[];checklist:{id:string;text:string;completed:boolean}[];materials:{label:string;url:string}[];comments?:{id:string;body:string;author_name?:string;actor_name?:string;created_at:string}[];can_edit:boolean;can_complete:boolean;updated_at?:string;updated_by_name?:string};
export type TaskContext={people:{id:string;full_name:string;photo_url?:string|null}[];projects:{id:string;name:string;client_id?:string}[];clients:{id:string;name:string;logo_url?:string|null}[];can_assign:boolean;can_edit:boolean};
export const TASK_BUCKETS=[['today','Hoy'],['upcoming','Próximas'],['overdue','Vencidas'],['completed','Completadas'],['undated','Sin fecha'],['all','Todas']] as const;
export const TASK_STATUSES=[{value:'pending',label:'Pendiente'},{value:'in_progress',label:'En curso'},{value:'done',label:'Completada'}];
export const TASK_PRIORITIES=[{value:'low',label:'Baja'},{value:'normal',label:'Normal'},{value:'high',label:'Alta'},{value:'urgent',label:'Urgente'}];
export class TaskRequestError extends Error{constructor(message:string,public status:number){super(message);}}
export async function taskRequest<T>(path:string,body?:unknown,method='PATCH',signal?:AbortSignal):Promise<T>{
 const response=await dataFetch(`/core-api${TASKS_PATH}${path}`,{credentials:'include',cache:'no-store',signal,method:body===undefined?'GET':method,headers:body===undefined?{}:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
 const result=await response.json().catch(()=>({error:'El servidor devolvió una respuesta inválida.'}));
 if(!response.ok)throw new TaskRequestError(result.error||'No se pudo completar la operación.',response.status);
 return result as T;
}
export function tasksChanged(){clearDataCache();if(typeof window!=='undefined')window.dispatchEvent(new Event(TASKS_CHANGED));}
export function taskMaterialUrl(value:string){try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password?url.href:null;}catch{return null;}}

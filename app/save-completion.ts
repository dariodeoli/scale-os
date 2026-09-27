import {completeSave as completeSaveBase} from 'owncoding-ui/utils';
import {notify} from './feedback';

/**
 * Puente al ciclo de guardado de owncoding-ui v0.39 (cosecha ScaleOS #2):
 * cierra después de persistir y convierte un fallo de refresco en la misma
 * advertencia (`AVISO_REFRESCO`). Se llama solo después de que la mutación
 * sucedió, nunca alrededor de la mutación.
 */
export async function completeSave(close:()=>void,refresh:()=>void|Promise<void>):Promise<void>{
 await completeSaveBase(close,refresh,{avisar:message=>notify({tone:'warning',message})});
}

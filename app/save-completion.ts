import {completeSave as completeSaveLib, AVISO_REFRESCO} from 'owncoding-ui';
import {notify} from './feedback';

// Adaptador del contrato de la app sobre `completeSave` de owncoding-ui v0.39
// (#75): la biblioteca cierra tras persistir y devuelve el aviso de refresco
// fallido por callback; acá se conecta al toast único (`notify`). Los
// consumidores no cambian de firma.
export {AVISO_REFRESCO};

/** Call only after the mutation has succeeded, never around the mutation itself. */
export async function completeSave(close:()=>void,refresh:()=>void|Promise<void>){
  await completeSaveLib(close,refresh,{avisar:message=>notify({tone:'warning',message})});
}

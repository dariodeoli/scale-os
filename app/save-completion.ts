import {notify} from './feedback';

/** Call only after the mutation has succeeded, never around the mutation itself. */
export async function completeSave(close:()=>void,refresh:()=>void|Promise<void>){
 close();
 try{await refresh();}catch{
  notify({tone:'warning',message:'Se guardó correctamente, pero no se pudo actualizar la lista. Recargá la página para ver los cambios; no hace falta guardar otra vez.'});
 }
}

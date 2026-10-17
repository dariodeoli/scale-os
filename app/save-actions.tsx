'use client';
import type {ReactNode} from 'react';
import {FormActions,useDialogClose,useDialogPending} from './dialog';
import {Button as ScaleButton} from "./ui/button";


// Keep the form's own submit action and prerequisites; only coordinate dismissal.
// `dirty`: el formulario tiene cambios sin guardar; cerrar el diálogo pide confirmar.
export function SaveActions({pending,children,cancelLabel='Cancelar',dirty=false}:{pending:boolean;children:ReactNode;cancelLabel?:string|false;dirty?:boolean}){
 const requestClose=useDialogClose();
 useDialogPending(pending,dirty&&!pending);
 return <FormActions>
  {requestClose&&cancelLabel&&<ScaleButton type="button" className="secondary" disabled={pending} onClick={()=>{if(!pending)requestClose();}} variant="secondary">{cancelLabel}</ScaleButton>}
  {children}
 </FormActions>;
}

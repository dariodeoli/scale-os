'use client';
import type {ReactNode} from 'react';
import {FormActions,useDialogClose,useDialogPending} from './dialog';

// Keep the form's own submit action and prerequisites; only coordinate dismissal.
export function SaveActions({pending,children,cancelLabel='Cancelar'}:{pending:boolean;children:ReactNode;cancelLabel?:string|false}){
 const requestClose=useDialogClose();
 useDialogPending(pending);
 return <FormActions>
  {requestClose&&cancelLabel&&<button type="button" className="secondary" disabled={pending} onClick={()=>{if(!pending)requestClose();}}>{cancelLabel}</button>}
  {children}
 </FormActions>;
}

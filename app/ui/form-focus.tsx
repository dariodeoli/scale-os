'use client';
import {useId,useLayoutEffect,useRef,useState} from 'react';

export type FormFieldMessages=Record<string,unknown>;
const messageOf=(value:unknown):string|undefined=>value&&typeof value==='object'&&'message' in value&&typeof value.message==='string'?value.message:undefined;

/** RHF validates while its fieldset is locked: defer native/compound trigger focus until it unlocks. */
export function useFormFocus(pending:boolean){
 const formRef=useRef<HTMLFormElement>(null);
 const [keys,setKeys]=useState<string[]>([]);
 const onInvalid=(errors:FormFieldMessages)=>setKeys(Object.keys(errors));
 useLayoutEffect(()=>{
  if(pending||!keys.length||!formRef.current)return;
  const form=formRef.current;
  for(const key of keys){
   const candidates=Array.from(form.querySelectorAll<HTMLElement>('[name], [data-form-field]'));
   const owner=candidates.find(node=>node.getAttribute('name')===key||node.getAttribute('data-form-field')===key);
   const target=owner?.matches('input,select,textarea,button')?owner:owner?.querySelector<HTMLElement>('input:not([type="hidden"]),select,textarea,button');
   if(target&&!target.matches(':disabled')&&!target.closest('[inert]')){target.focus();break;}
  }
  setKeys([]);
 },[pending,keys]);
 return {formRef,onInvalid};
}

/** Existing API/schema messages only; no guessing a field from the text of an error. */
export function FormValidationErrors({errors}:{errors:FormFieldMessages}){
 const id=useId();
 const messages=Object.entries(errors).flatMap(([key,value])=>{const message=messageOf(value);return message?[{key,message}]:[];});
 if(!messages.length)return null;
 return <div role="alert" className="error ops-wide"><ul>{messages.map(({key,message})=><li id={`${id}-${key}`} key={key}>{message}</li>)}</ul></div>;
}

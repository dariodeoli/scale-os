'use client';
import {useId,useLayoutEffect,useRef,useState} from 'react';

export type FormFieldMessages=Record<string,unknown>;
const messageOf=(value:unknown):string|undefined=>value&&typeof value==='object'&&'message' in value&&typeof value.message==='string'?value.message:undefined;

/** FieldError refs may be DOM nodes/cycles; only descend through actual error containers. */
export function flattenErrorPaths(errors:FormFieldMessages):string[]{
 const paths:string[]=[],visited=new WeakSet<object>();
 function visit(value:unknown,path:string){
  if(!value||typeof value!=='object'||visited.has(value))return;
  if(messageOf(value)||'type' in value&&typeof value.type==='string'){if(path)paths.push(path);return;}
  visited.add(value);
  for(const [key,child] of Object.entries(value)){
   if(['ref','types','message','type'].includes(key))continue;
   visit(child,path?`${path}.${key}`:key);
  }
  visited.delete(value);
 }
 visit(errors,'');return paths;
}
const errorAtPath=(errors:FormFieldMessages,path:string):unknown=>errors[path]??path.split('.').reduce<unknown>((value,key)=>value&&typeof value==='object'?(value as Record<string,unknown>)[key]:undefined,errors);

/** RHF validates while its fieldset is locked: defer native/compound trigger focus until it unlocks. */
export function useFormFocus(pending:boolean){
 const formRef=useRef<HTMLFormElement>(null);
 const [keys,setKeys]=useState<string[]>([]);
 const onInvalid=(errors:FormFieldMessages)=>setKeys(flattenErrorPaths(errors));
 useLayoutEffect(()=>{
  if(pending||!keys.length||!formRef.current)return;
  const form=formRef.current;
  for(const key of keys){
   const candidates=Array.from(form.querySelectorAll<HTMLElement>('[name], [data-form-field]'));
   const owner=candidates.find(node=>node.getAttribute('name')===key||node.getAttribute('data-form-field')===key);
   const target=owner?.matches('input,select,textarea,button,[tabindex]')?owner:owner?.querySelector<HTMLElement>('input:not([type="hidden"]),textarea,select,button');
   if(target&&!target.matches(':disabled')&&!target.closest('[inert],[hidden]')){
    for(let node=target.parentElement;node&&node!==form;node=node.parentElement)if(node.tagName==='DETAILS')(node as HTMLDetailsElement).open=true;
    target.focus();break;
   }
  }
  setKeys([]);
 },[pending,keys]);
 return {formRef,onInvalid};
}

/** Existing API/schema messages only; no guessing a field from the text of an error. */
export function FormValidationErrors({errors}:{errors:FormFieldMessages}){
 const id=useId();
 const messages=flattenErrorPaths(errors).flatMap(key=>{const message=messageOf(errorAtPath(errors,key));return message?[{key,message}]:[];});
 if(!messages.length)return null;
 return <div role="alert" className="error ops-wide"><ul>{messages.map(({key,message})=><li id={`${id}-${key}`} key={key}>{message}</li>)}</ul></div>;
}

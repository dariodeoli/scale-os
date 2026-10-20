'use client';

import {forwardRef,type ReactNode} from 'react';
import {Field} from './field';
import {InputBase,type InputBaseProps} from './input';
import {Button} from './button';

export type LookupState='idle'|'loading'|'found'|'not-found'|'error'|'conflict';
export type LookupFieldProps=Omit<InputBaseProps,'children'> & {
 label:ReactNode;
 help?:ReactNode;
 error?:ReactNode;
 state?:LookupState;
 message?:ReactNode;
 lookupLabel:string;
 loadingLabel?:string;
 onLookup:()=>void;
 /** Authorization and availability are resolved by the consumer, never by the UI. */
 policy?:{allowed:boolean;reason?:ReactNode};
};

/** Raw native input events/refs are preserved. Lookup never formats, queries or writes by itself. */
export const LookupField=forwardRef<HTMLInputElement,LookupFieldProps>(function LookupField({
 label,help,error,state='idle',message,lookupLabel,loadingLabel='Buscando…',onLookup,policy,
 id,invalid,describedBy,disabled,pending,...input
},ref){
 return <Field id={id} label={label} help={help} error={error}>
  {control=>{
   const statusId=`${control.id}-lookup`;
   const feedback=message||policy?.reason;
   return <>
    <div className="ops-lookup-row" data-ui-lookup-field="" data-lookup-state={state} aria-busy={state==='loading'||undefined}>
     <InputBase {...input} ref={ref} id={control.id} disabled={disabled} pending={pending}
      onKeyDown={event=>{input.onKeyDown?.(event);if(event.key!=='Enter')return;const cancelled=event.defaultPrevented;event.preventDefault();event.stopPropagation();if(!cancelled&&!event.repeat&&!event.nativeEvent.isComposing&&!disabled&&!pending&&state!=='loading'&&policy?.allowed!==false)onLookup();}}
      invalid={invalid||control.invalid} describedBy={[control.describedBy,describedBy,feedback?statusId:undefined].filter(Boolean).join(' ')||undefined}/>
     <Button type="button" variant="ghost" size="compact" className="text-button ops-lookup-button"
      disabled={disabled||pending||policy?.allowed===false} loading={state==='loading'} onClick={onLookup}>
      {state==='loading'?loadingLabel:lookupLabel}
     </Button>
    </div>
    {feedback?<small id={statusId} className="field-help ops-lookup-note" role="status" data-lookup-state={state}>{feedback}</small>:null}
   </>;
  }}
 </Field>;
});

export type LookupReviewProps={
 label:string;
 heading?:ReactNode;
 children:ReactNode;
 description?:ReactNode;
 onApply:()=>void;
 onDiscard:()=>void;
 applyLabel?:string;
 discardLabel?:string;
 disabled?:boolean;
 className?:string;
};

/** Confirmation presentation only: the consumer maps evidence and applies the chosen data. */
export function LookupReview({label,heading,children,description,onApply,onDiscard,applyLabel='Aplicar',discardLabel='Descartar',disabled=false,className}:LookupReviewProps){
 return <section className={className} aria-label={label} role="group" data-ui-lookup-review="">
  {heading?<b>{heading}</b>:null}
  {children}
  {description?<div className="form-note">{description}</div>:null}
  <div className="inline-actions">
   <Button type="button" variant="primary" disabled={disabled} onClick={onApply}>{applyLabel}</Button>
   <Button type="button" variant="ghost" className="text-button" disabled={disabled} onClick={onDiscard}>{discardLabel}</Button>
  </div>
 </section>;
}

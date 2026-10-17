'use client';
import {forwardRef,type FieldsetHTMLAttributes} from 'react';
import {useDialogPending} from '../dialog';

export type PendingFieldsProps=FieldsetHTMLAttributes<HTMLFieldSetElement>&{pending?:boolean};
/** Native fieldset locks all controls together without changing their values. */
export const PendingFields=forwardRef<HTMLFieldSetElement,PendingFieldsProps>(function PendingFields({pending=false,disabled,className,children,...props},ref){
 return <fieldset {...props} ref={ref} className={['ui-form-fields',className].filter(Boolean).join(' ')} disabled={disabled||pending} aria-busy={pending||props['aria-busy']}>{children}</fieldset>;
});

/** Register a custom form inside Dialog/ConfirmDialog without adding a second footer. */
export function DialogFormState({pending=false,dirty=false}:{pending?:boolean;dirty?:boolean}){
 useDialogPending(pending,dirty);return null;
}

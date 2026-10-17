'use client';
import {forwardRef,type FieldsetHTMLAttributes} from 'react';

export type PendingFieldsProps=FieldsetHTMLAttributes<HTMLFieldSetElement>&{pending?:boolean};
/** Native fieldset locks all controls together without changing their values. */
export const PendingFields=forwardRef<HTMLFieldSetElement,PendingFieldsProps>(function PendingFields({pending=false,disabled,className,children,...props},ref){
 return <fieldset {...props} ref={ref} className={['ui-form-fields',className].filter(Boolean).join(' ')} disabled={disabled||pending} aria-busy={pending||props['aria-busy']}>{children}</fieldset>;
});

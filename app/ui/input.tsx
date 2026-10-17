"use client";

import {forwardRef, type ComponentPropsWithoutRef} from 'react';

export type FieldStateProps = {invalid?: boolean; describedBy?: string; pending?: boolean};
export type InputBaseProps = ComponentPropsWithoutRef<'input'> & FieldStateProps;
export type TextareaBaseProps = ComponentPropsWithoutRef<'textarea'> & FieldStateProps;

/** Native events and refs are intentionally unchanged for form libraries and autofill. */
export const InputBase = forwardRef<HTMLInputElement, InputBaseProps>(function InputBase(
  {invalid, describedBy, pending = false, disabled, 'aria-describedby': description, 'aria-invalid': ariaInvalid, 'aria-busy': ariaBusy, ...props}, ref,
) {
  return <input {...props} ref={ref} disabled={disabled || pending} aria-busy={pending || ariaBusy}
    aria-invalid={invalid ?? ariaInvalid} aria-describedby={[description, describedBy].filter(Boolean).join(' ') || undefined}/>;
});

export const TextareaBase = forwardRef<HTMLTextAreaElement, TextareaBaseProps>(function TextareaBase(
  {invalid, describedBy, pending = false, disabled, 'aria-describedby': description, 'aria-invalid': ariaInvalid, 'aria-busy': ariaBusy, ...props}, ref,
) {
  return <textarea {...props} ref={ref} disabled={disabled || pending} aria-busy={pending || ariaBusy}
    aria-invalid={invalid ?? ariaInvalid} aria-describedby={[description, describedBy].filter(Boolean).join(' ') || undefined}/>;
});

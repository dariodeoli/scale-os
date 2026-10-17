"use client";

import React, {forwardRef,type InputHTMLAttributes,type TextareaHTMLAttributes} from 'react';

/** Capa visual local: no valida, normaliza ni transforma valores o eventos. */
export const Input = forwardRef<HTMLInputElement,InputHTMLAttributes<HTMLInputElement>>(function Input({className,...props},ref){
  return <input {...props} ref={ref} className={['ui-input',className].filter(Boolean).join(' ')}/>;
});

/** Textarea nativo con el mismo contrato de props/ref que el elemento HTML. */
export const Textarea = forwardRef<HTMLTextAreaElement,TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({className,...props},ref){
  return <textarea {...props} ref={ref} className={['ui-textarea',className].filter(Boolean).join(' ')}/>;
});

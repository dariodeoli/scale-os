"use client";
import {forwardRef, useId} from 'react';
import {emailSuggestions} from './field-rules';
import {InputBase, type InputBaseProps} from './ui/input';

export type EmailFieldProps = Omit<InputBaseProps, 'onChange' | 'value' | 'type' | 'list'> & {
  value: string; onChange: (value: string) => void;
};

/** Suggestions only complete domains; native typing, paste and autofill remain available. */
export const EmailField = forwardRef<HTMLInputElement, EmailFieldProps>(function EmailField(
  {id, value, onChange, disabled, pending, placeholder = 'nombre@dominio.com', maxLength = 254, ...props}, ref,
) {
  const generatedId = useId();
  const listId = `${id ?? generatedId}-domains`;
  const suggestions = emailSuggestions(value);
  return <>
    <InputBase inputMode="email" autoComplete="email" {...props} ref={ref} id={id} type="email" maxLength={maxLength}
      placeholder={placeholder} list={suggestions.length ? listId : undefined} value={value} disabled={disabled} pending={pending}
      onChange={event => {if (!disabled && !pending) onChange(event.target.value);}}/>
    {suggestions.length ? <datalist id={listId}>{suggestions.map(option => <option key={option} value={option}/>)}</datalist> : null}
  </>;
});

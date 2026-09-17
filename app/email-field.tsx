"use client";
import {emailSuggestions} from './field-rules';

type EmailFieldProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  invalid?: boolean;
  describedBy?: string;
  required?: boolean;
  placeholder?: string;
};

/** Shared email input: native autofill plus domain suggestions that never intercept paste or submit. */
export function EmailField({id, value, onChange, disabled = false, invalid = false, describedBy, required = false, placeholder = 'nombre@dominio.com'}: EmailFieldProps) {
  const suggestions = emailSuggestions(value);
  const listId = id ? `${id}-domains` : '';
  return <>
    <input id={id} type="email" inputMode="email" autoComplete="email" maxLength={200} placeholder={placeholder} list={suggestions.length ? listId : undefined} value={value} disabled={disabled} required={required} aria-invalid={invalid || undefined} aria-describedby={describedBy} onChange={event => onChange(event.target.value)}/>
    {suggestions.length ? <datalist id={listId}>{suggestions.map(option => <option key={option} value={option}/>)}</datalist> : null}
  </>;
}

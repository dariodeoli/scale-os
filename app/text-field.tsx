"use client";
import {Input} from './ui/input';

type TextFieldProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
  minLength?: number;
  autoComplete?: string;
  autoFocus?: boolean;
  disabled?: boolean;
  invalid?: boolean;
  describedBy?: string;
  required?: boolean;
  placeholder?: string;
  name?: string;
};

/** Shared single-line text input (names, agency, address): same base input as EmailField, limits explicit, no per-screen classes. */
export function TextField({id, value, onChange, maxLength = 120, minLength, autoComplete, autoFocus = false, disabled = false, invalid = false, describedBy, required = false, placeholder, name}: TextFieldProps) {
  return <Input id={id} name={name} type="text" value={value} maxLength={maxLength} minLength={minLength} autoComplete={autoComplete} autoFocus={autoFocus} disabled={disabled} required={required} placeholder={placeholder} aria-invalid={invalid || undefined} aria-describedby={describedBy} onChange={event => onChange(event.target.value)}/>;
}

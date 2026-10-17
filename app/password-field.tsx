"use client";

import {Eye, EyeOff} from 'lucide-react';
import {forwardRef, useState} from 'react';
import {InputBase, type InputBaseProps} from './ui/input';

export type PasswordFieldProps = Omit<InputBaseProps, 'onChange' | 'value' | 'type'> & {
  label: string; value: string; onChange: (value: string) => void; name: string;
  autoComplete: 'new-password' | 'current-password'; bare?: boolean;
};

/** Visibility does not impose a new password policy on existing login flows. */
export const PasswordField = forwardRef<HTMLInputElement, PasswordFieldProps>(function PasswordField(
  {label, value, onChange, maxLength = 128, bare = false, disabled, pending, ...props}, ref,
) {
  const [visible, setVisible] = useState(false);
  const blocked = Boolean(disabled || pending);
  const title = visible ? 'Ocultar contraseña' : 'Mostrar contraseña';
  const control = <span className="password-field-control">
    <InputBase {...props} ref={ref} disabled={disabled} pending={pending} type={visible ? 'text' : 'password'} value={value}
      maxLength={maxLength} onChange={event => {if (!blocked) onChange(event.target.value);}}/>
    <button type="button" className="password-visibility" disabled={blocked} title={title} aria-label={title}
      aria-pressed={visible} onMouseDown={event => event.preventDefault()} onClick={() => {if (!blocked) setVisible(current => !current);}}>
      {visible ? <EyeOff size={18}/> : <Eye size={18}/>}
    </button>
  </span>;
  return bare ? control : <label className="password-field"><span>{label}</span>{control}</label>;
});

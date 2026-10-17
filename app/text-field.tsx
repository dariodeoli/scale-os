"use client";

import {forwardRef} from 'react';
import {InputBase, type InputBaseProps} from './ui/input';

export type TextFieldProps = Omit<InputBaseProps, 'onChange' | 'value' | 'type'> & {
  value: string; onChange: (value: string) => void;
};

/** Existing text adapter; domain-specific limits can override the historical 120-character default. */
export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  {value, onChange, maxLength = 120, disabled, pending, ...props}, ref,
) {
  return <InputBase {...props} ref={ref} type="text" value={value} maxLength={maxLength} disabled={disabled} pending={pending}
    onChange={event => {if (!disabled && !pending) onChange(event.target.value);}}/>;
});

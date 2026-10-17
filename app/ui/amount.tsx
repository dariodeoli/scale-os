"use client";

import {MoneyInput} from 'owncoding-ui';
import {forwardRef, type ComponentPropsWithoutRef} from 'react';
import type {FieldStateProps} from './input';

const currencyMarks: Record<string, string> = {PYG: 'Gs', USD: 'US$', EUR: '€', BRL: 'R$', ARS: '$', MXN: 'MX$'};
export type AmountInputProps = Omit<ComponentPropsWithoutRef<typeof MoneyInput>, 'value' | 'currency' | 'onChange' | 'onValueChange' | 'symbol'> & FieldStateProps & {
  value: string | number; currency: string; onChange: (value: string) => void;
};

/** App contract over the existing renderer: grouping, currency precision and caret stay owned by MoneyInput. */
export const AmountInput = forwardRef<HTMLInputElement, AmountInputProps>(function AmountInput(
  {value, currency, onChange, disabled, pending, invalid, describedBy, integerOnly = false, required = false,
    placeholder = '0', 'aria-describedby': description, 'aria-invalid': ariaInvalid, ...props}, ref,
) {
  return <MoneyInput {...props} ref={ref} placeholder={placeholder} disabled={disabled || pending} required={required}
    aria-invalid={invalid ?? ariaInvalid} aria-describedby={[description, describedBy].filter(Boolean).join(' ') || undefined}
    aria-busy={pending || props['aria-busy']} currency={currency} symbol={currencyMarks[currency] || currency}
    integerOnly={integerOnly} value={value === '' || value === null || value === undefined ? '' : String(value)}
    onValueChange={(next: unknown) => {
      if (!disabled && !pending) onChange(next === '' || next === null || next === undefined ? '' : String(next));
    }}/>
});

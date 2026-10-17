"use client";

import {forwardRef} from 'react';
import {InputBase, type InputBaseProps} from './input';

export type NumberPolicy = 'integer' | 'decimal';
export type PercentagePolicy = 'integer-percent' | 'decimal-percent' | 'ratio';
export type NumberRules = {min?: string | number; max?: string | number; precision?: number; required?: boolean};
export type NumberInputProps = Omit<InputBaseProps, 'value' | 'onChange' | 'type'> & NumberRules & {
  value: string; onChange: (value: string) => void; policy: NumberPolicy;
};
export type PercentageInputProps = Omit<NumberInputProps, 'policy'> & {policy: PercentagePolicy};

function decimalParts(value: string) {
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(value)) return null;
  const negative = value.startsWith('-');
  const [whole, fraction = ''] = value.replace(/^[+-]/, '').split('.');
  return {negative, whole: whole || '0', fraction};
}
function compareDecimal(left: NonNullable<ReturnType<typeof decimalParts>>, right: NonNullable<ReturnType<typeof decimalParts>>) {
  const scale = Math.max(left.fraction.length, right.fraction.length);
  const scaled = (value: typeof left) => BigInt(`${value.negative ? '-' : ''}${value.whole}${value.fraction.padEnd(scale, '0')}`);
  const a = scaled(left), b = scaled(right);
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Exact visual validation only. Bounds/precision belong to the caller; signed values and zero are not universally forbidden. */
export function numberInputValid(value: string, policy: NumberPolicy, {min, max, precision, required = false}: NumberRules = {}): boolean {
  if (value === '') return !required;
  const parsed = decimalParts(value);
  if (!parsed || (policy === 'integer' && !/^[+-]?\d+$/.test(value))) return false;
  if (precision !== undefined && (!Number.isInteger(precision) || precision < 0 || parsed.fraction.length > precision)) return false;
  const minimum = min === undefined ? null : decimalParts(String(min));
  const maximum = max === undefined ? null : decimalParts(String(max));
  if ((min !== undefined && !minimum) || (max !== undefined && !maximum)) return false;
  return (!minimum || compareDecimal(parsed, minimum) >= 0) && (!maximum || compareDecimal(parsed, maximum) <= 0);
}

/** Text input intentionally retains intermediate '-', '.', trailing decimal separators and paste for the caller. */
export const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(function NumberInput(
  {value, onChange, policy, precision, min, max, required, invalid, pending, disabled, inputMode, ...props}, ref,
) {
  const policyInvalid = !numberInputValid(value, policy, {precision, min, max, required});
  return <InputBase {...props} ref={ref} type="text" inputMode={inputMode ?? (policy === 'integer' ? 'numeric' : 'decimal')}
    value={value} min={min} max={max} required={required} invalid={invalid || policyInvalid || undefined} pending={pending} disabled={disabled}
    onChange={event => {if (!disabled && !pending) onChange(event.target.value);}}/>;
});

/** Percent and ratio are distinct caller-selected units; no multiplication or implicit range conversion occurs. */
export const PercentageInput = forwardRef<HTMLInputElement, PercentageInputProps>(function PercentageInput(
  {policy, ...props}, ref,
) {
  return <NumberInput {...props} ref={ref} policy={policy === 'integer-percent' ? 'integer' : 'decimal'}/>;
});

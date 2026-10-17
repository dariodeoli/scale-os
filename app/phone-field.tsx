"use client";
import {OptionsSelect as Select} from './ui/options-select';
import {forwardRef, useState} from 'react';
import {componerTelefono} from 'owncoding-ui/core';
import {DEFAULT_PHONE_COUNTRY, PHONE_COUNTRIES, phoneParts} from './field-rules';
import {InputBase, type InputBaseProps} from './ui/input';

export type PhoneFieldProps = Omit<InputBaseProps, 'onChange' | 'value' | 'type'> & {
  value: string; onChange: (value: string) => void;
};

/** Known country codes use separate controls; unknown/partial international values remain intact. */
export const PhoneField = forwardRef<HTMLInputElement, PhoneFieldProps>(function PhoneField(
  {value, onChange, disabled, pending, placeholder = '981 123 456', ...props}, ref,
) {
  const [emptyCountry, setEmptyCountry] = useState(DEFAULT_PHONE_COUNTRY);
  const parsed = phoneParts(value);
  const country = value ? parsed.country : emptyCountry;
  const blocked = Boolean(disabled || pending);
  const compose = (code: string, number: string) => {
    if (blocked) return;
    const digits = number.replace(/\D/g, '').replace(/^0+/, '');
    onChange(componerTelefono({countryCode: code, phone: digits}) ?? '');
  };
  return <span className="phone-input grid grid-cols-[minmax(94px,.42fr)_minmax(0,1fr)] gap-2">
    <Select hideLabel label="Código de país" value={country} disabled={blocked}
      aria-invalid={props.invalid ?? props['aria-invalid']} aria-describedby={props.describedBy ?? props['aria-describedby']}
      onChange={(value:string)=>{
        if (blocked) return;
        const code = value;
        setEmptyCountry(code);
        compose(code, parsed.national);
      }}>
      {parsed.raw ? <option value="">Código original</option> : null}
      {PHONE_COUNTRIES.map(entry => <option key={entry.code} value={entry.code}>{entry.label}</option>)}
    </Select>
    <InputBase inputMode="tel" autoComplete="tel-national" {...props} ref={ref} type="tel" placeholder={placeholder}
      value={parsed.national} disabled={disabled} pending={pending}
      onChange={event => {
        if (blocked) return;
        const next = event.target.value;
        if (parsed.raw || next.trimStart().startsWith('+')) onChange(next);
        else {
          setEmptyCountry(country);
          compose(country, next);
        }
      }}/>
  </span>;
});

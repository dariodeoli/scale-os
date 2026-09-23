"use client";
import {componerTelefono, parseTelefono} from 'owncoding-ui';
import {DEFAULT_PHONE_COUNTRY, PHONE_COUNTRIES, phoneNational} from './field-rules';

type PhoneFieldProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  invalid?: boolean;
  describedBy?: string;
  required?: boolean;
  placeholder?: string;
};

/** Shared phone input: country code with a fixed plus sign and a digits-only national number. */
export function PhoneField({id, value, onChange, disabled = false, invalid = false, describedBy, required = false, placeholder = '981 123 456'}: PhoneFieldProps) {
  const parsed = parseTelefono(value, DEFAULT_PHONE_COUNTRY);
  const country = PHONE_COUNTRIES.some(entry => entry.code === parsed.countryCode) ? parsed.countryCode : DEFAULT_PHONE_COUNTRY;
  const national = phoneNational(parsed.phone);
  const compose = (countryCode: string, number: string) => onChange(componerTelefono({countryCode, phone: phoneNational(number)}) ?? '');
  return <span className="phone-input grid grid-cols-[minmax(94px,.42fr)_minmax(0,1fr)] gap-2">
    <select className="px-2" aria-label="Código de país" value={country} disabled={disabled} onChange={event => compose(event.target.value, national)}>
      {PHONE_COUNTRIES.map(entry => <option key={entry.code} value={entry.code}>{entry.label}</option>)}
    </select>
    <input id={id} type="tel" inputMode="tel" autoComplete="tel-national" placeholder={placeholder} maxLength={18} value={national} disabled={disabled} required={required} aria-invalid={invalid || undefined} aria-describedby={describedBy} onChange={event => compose(country, event.target.value)}/>
  </span>;
}

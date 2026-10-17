"use client";
import {Input} from './ui/input';
import {PHONE_COUNTRIES, phoneNational, phoneParts, phoneValue} from './field-rules';

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
  const parsed = phoneParts(value);
  const country = parsed.countryCode;
  const national = country ? phoneNational(parsed.phone) : parsed.phone;
  const compose = (countryCode: string, number: string) => onChange(phoneValue(countryCode, number));
  return <span className="phone-input grid grid-cols-[minmax(94px,.42fr)_minmax(0,1fr)] gap-2">
    <select className="px-2" aria-label="Código de país" value={country} disabled={disabled} onChange={event => compose(event.target.value, national)}>
      {!country && <option value="">Código no reconocido</option>}
      {PHONE_COUNTRIES.map(entry => <option key={entry.code} value={entry.code}>{entry.label}</option>)}
    </select>
    <Input id={id} type="tel" inputMode="tel" autoComplete="tel-national" placeholder={placeholder} value={national} disabled={disabled} required={required} aria-invalid={invalid || undefined} aria-describedby={describedBy} onChange={event => compose(country, event.target.value)}/>
  </span>;
}

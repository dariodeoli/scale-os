"use client";
import {DEFAULT_PHONE_COUNTRY, PHONE_COUNTRIES, digitsOnly, internationalPhone, parsePhone} from './field-rules';

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
  const parsed = parsePhone(value);
  const country = parsed && PHONE_COUNTRIES.some(entry => entry.code === parsed.country) ? parsed.country : DEFAULT_PHONE_COUNTRY;
  const national = parsed ? parsed.national : '';
  return <span className="phone-input">
    <select aria-label="Código de país" value={country} disabled={disabled} onChange={event => onChange(internationalPhone(event.target.value, national))}>
      {PHONE_COUNTRIES.map(entry => <option key={entry.code} value={entry.code}>{entry.label}</option>)}
    </select>
    <input id={id} type="tel" inputMode="tel" autoComplete="tel-national" placeholder={placeholder} maxLength={18} value={national} disabled={disabled} required={required} aria-invalid={invalid || undefined} aria-describedby={describedBy} onChange={event => onChange(internationalPhone(country, digitsOnly(event.target.value)))}/>
  </span>;
}

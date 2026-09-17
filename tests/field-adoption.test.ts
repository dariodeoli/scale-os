import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const forms = read('app/workspace-forms.tsx');
assert(forms.includes('<PhoneField'), 'client creation uses the shared phone field');
assert(!forms.includes('dialCode'), 'client creation no longer hand-rolls a country code selector');

const suite = read('app/suite.tsx');
assert((suite.match(/type:'phone'/g) || []).length >= 3, 'suite declares phone fields for leads, clients and settings');

const inventory = read('app/inventory-workspace.tsx');
assert(inventory.includes('normalizeSerial(event.target.value)'), 'inventory normalizes serials while typing');

const operations = read('app/operations.tsx');
assert(operations.includes("f.type === 'phone' ? <PhoneField"), 'editor renders the shared phone field');
assert(operations.includes("f.type === 'email' ? <EmailField"), 'editor renders the shared email field');

const rules = read('app/field-rules.ts');
for (const rule of ['phoneValid', 'normalizePhone', 'normalizeSerial', 'emailSuggestions']) {
  assert(rules.includes(`export function ${rule}`), `field rules export ${rule}`);
}

console.log('PASS: field adoption — shared phone, email and serial components are the single source');

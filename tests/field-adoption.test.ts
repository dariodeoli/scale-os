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

// La lógica compartida vive en owncoding-ui; las copias locales se retiran.
const rules = read('app/field-rules.ts');
for (const rule of ['phoneValid', 'phoneNational', 'normalizeSerial', 'emailSuggestions']) {
  assert(rules.includes(`export function ${rule}`), `field rules export ${rule}`);
}
assert(rules.includes("from 'owncoding-ui'"), 'field rules build on the shared library');
for (const retired of ['digitsOnly', 'parsePhone', 'internationalPhone', 'normalizePhone', 'phoneMessage']) {
  assert(!rules.includes(`export function ${retired}`), `field rules no longer copy ${retired}`);
}

const phoneField = read('app/phone-field.tsx');
assert(phoneField.includes("from 'owncoding-ui'"), 'phone field uses the shared parse/compose helpers');
assert(phoneField.includes('parseTelefono(') && phoneField.includes('componerTelefono('), 'phone field parses and composes with the library');
assert(phoneField.includes('parsed.countryCode') && phoneField.includes('parsed.phone'), 'phone field usa la firma real del runtime ({countryCode, phone})');
assert(phoneField.includes('componerTelefono({countryCode'), 'phone field composes with the object signature');
for (const retired of ['parsePhone(', 'internationalPhone(', 'digitsOnly(']) {
  assert(!phoneField.includes(retired), `phone field no longer hand-rolls ${retired}`);
}
assert(rules.includes('national.length === 8'), 'field rules conservan la excepción PY fijo hasta que la librería generalice telefonoValido (owncoding-ui#2)');

const list = read('app/list-format.tsx');
assert(list.includes('partirSerial') && list.includes('serialEnmascarado'), 'serial cells use the shared serial helpers');

const links = read('app/client-links.tsx');
assert(links.includes("from 'owncoding-ui'"), 'client links build the WhatsApp URL with the shared helper');
assert(links.includes('parseTelefono('), 'client links keep the country code of the stored phone');
assert(!links.includes('wa.me/${digits}'), 'client links no longer hand-roll the wa.me template');

const panel = read('app/subscription-panel.tsx');
assert(panel.includes('whatsappUrl(activationWhatsApp, text)'), 'activation requests use the shared WhatsApp helper');
assert(!panel.includes('wa.me/${activationWhatsApp}'), 'activation requests no longer hand-roll the wa.me template');

for (const page of ['app/verificar-correo/page.tsx', 'app/cliente/invitacion/page.tsx']) {
  const source = read(page);
  assert(source.includes('esToken('), `${page} checks tokens with the shared helper`);
  assert(source.includes('extractTokenFromUrl('), `${page} resolés el token del enlace completo con la util compartida`);
  assert(!source.includes('/^[a-f0-9]{64}$/'), `${page} no longer copies the token pattern`);
  assert(!source.includes('URLSearchParams'), `${page} no longer hand-rolls the query parse`);
}

for (const file of ['app/client-ruc.tsx', 'app/suite.tsx']) {
  const source = read(file);
  assert(source.includes('normalizarNombre(') && source.includes("apellidosPrimero:'sifen'"), `${file} normalizes RUC names with the library`);
}

for (const file of ['app/client-reporting.tsx', 'app/financial-forecast.tsx', 'app/superadmin/page.tsx']) {
  const source = read(file);
  assert(source.includes('soloDigitos'), `${file} uses the shared digits helper`);
  assert(!source.includes('digitsOnly'), `${file} no longer copies digitsOnly`);
}

console.log('PASS: field adoption — shared phone, email, serial, token, name and digit rules come from owncoding-ui');

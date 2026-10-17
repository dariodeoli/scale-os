import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const forms = read('app/workspace-forms.tsx');
const clientEditorData = read('app/client-editor-data.ts');
assert(clientEditorData.includes("type:'phone'"), 'client creation and edition share the Editor phone field (PhoneField)');
assert(!forms.includes('dialCode'), 'client creation no longer hand-rolls a country code selector');

const suite = read('app/suite.tsx');
assert((suite.match(/type:'phone'/g) || []).length >= 1, 'suite declares the phone field for settings (clients live in client-editor-data)');
// El editor de oportunidades vive en la sección del Pipeline (#85) y comparte
// el campo y la ayuda del teléfono.
const pipeline = read('app/sections/pipeline.tsx');
assert(pipeline.includes("{key:'phone',label:'Teléfono',type:'phone',optional:true,help:PHONE_HELP}"), 'el editor de oportunidades usa el campo de teléfono compartido con su ayuda');

const inventory = read('app/inventory-workspace.tsx');
assert(inventory.includes('<SerialField') && inventory.includes('normalizar={normalizeSerial}'), 'inventory normalizes serials with the shared SerialField while typing');
assert(!inventory.includes('normalizeSerial(event.target.value)'), 'inventory no longer hand-rolls serial normalization');

const operations = read('app/operations.tsx');
assert(operations.includes("f.type === 'phone' ? <PhoneField"), 'editor renders the shared phone field');
assert(operations.includes("f.type === 'email' ? <EmailField"), 'editor renders the shared email field');

// La lógica compartida vive en owncoding-ui; las copias locales se retiran.
const rules = read('app/field-rules.ts');
for (const rule of ['phoneValid', 'phoneNational', 'normalizeSerial', 'emailSuggestions']) {
  assert(rules.includes(`export function ${rule}`), `field rules export ${rule}`);
}
assert(rules.includes('export function phoneParts'), 'Scale owns the explicit API country adapter without relying on external parser coverage');
for (const retired of ['digitsOnly', 'parsePhone', 'internationalPhone', 'normalizePhone', 'phoneMessage']) {
  assert(!rules.includes(`export function ${retired}`), `field rules no longer copy ${retired}`);
}

const phoneField = read('app/phone-field.tsx');
assert(phoneField.includes('phoneParts(value)'), 'phone field preserves local API-supported country codes');
assert(phoneField.includes('phoneValue(countryCode, number)'), 'phone field composes without truncating national digits');
assert(!phoneField.includes('DEFAULT_PHONE_COUNTRY'), 'unknown legacy prefixes never silently fall back to Paraguay');
assert(rules.includes('national.length === 8'), 'local policy conserves Paraguay landlines');

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

for (const file of ['app/client-ruc.tsx']) {
  const source = read(file);
  assert(source.includes('normalizarNombre(') && source.includes("apellidosPrimero:'sifen'"), `${file} normalizes RUC names with the library`);
}

for (const file of ['app/client-reporting.tsx', 'app/financial-forecast.tsx', 'app/superadmin/catalog.tsx']) {
  const source = read(file);
  assert(source.includes('soloDigitos'), `${file} uses the shared digits helper`);
  assert(!source.includes('digitsOnly'), `${file} no longer copies digitsOnly`);
}

console.log('PASS: field adoption — local phone API adapter, shared email/serial fields and token/name/digit consumers');

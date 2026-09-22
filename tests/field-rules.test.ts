import assert from 'node:assert/strict';
import {componerTelefono, parseTelefono, soloDigitos, telefonoValido, whatsappUrl} from 'owncoding-ui';
import {DEFAULT_PHONE_COUNTRY, PHONE_COUNTRIES, PHONE_ERROR, decimalInput, emailSuggestions, normalizeSerial, phoneNational, phoneValid} from '../app/field-rules';

// Lógica compartida (owncoding-ui v0.12.0): una sola fuente para el grupo.
assert.equal(soloDigitos('+595 (981) 123-456'), '595981123456');
assert.equal(soloDigitos('abc', 3), '');
assert.deepEqual(parseTelefono('+595 981 123 456'), {countryCode: '+595', phone: '981 123 456'});
assert.deepEqual(parseTelefono('0981 123 456'), {countryCode: '+595', phone: '0981 123 456'});
assert.deepEqual(parseTelefono('+54 9 11 5555 4444'), {countryCode: '+54', phone: '9 11 5555 4444'});
assert.deepEqual(parseTelefono('   '), {countryCode: '+595', phone: ''});
assert.equal(componerTelefono({countryCode: '+595', phone: '981123456'}), '+595 981123456');
assert.equal(componerTelefono({countryCode: '+595', phone: ''}), null);
assert.equal(telefonoValido('981123456', '+595'), true);
assert.equal(telefonoValido('21123456', '+595'), false, 'la regla compartida no acepta fijos paraguayos');
assert.equal(whatsappUrl('0981123456', 'Hola Ana'), 'https://wa.me/595981123456?text=Hola%20Ana');
assert.equal(whatsappUrl('', 'Hola'), '');

// Política de ScaleOS sobre la base compartida: móvil (9) o fijo (8) y solo códigos del selector.
assert.equal(phoneNational('0981 123 456'), '981123456');
assert.equal(phoneNational('021 123 456'), '21123456');
assert.equal(phoneNational('   '), '');
assert.ok(PHONE_COUNTRIES.some(entry => entry.code === DEFAULT_PHONE_COUNTRY));

assert.equal(phoneValid('+595 981 123 456'), true, 'mobile with 9 digits');
assert.equal(phoneValid('0981 123 456'), true, 'legacy domestic form with trunk zero');
assert.equal(phoneValid('+595 21 123 456'), true, 'landline with 8 digits (regla de ScaleOS)');
assert.equal(phoneValid('+55 (11) 91234-5678'), true, 'regional mobile with 11 digits');
assert.equal(phoneValid('+1 555 123 4567'), true, 'ten digits for other countries');
assert.equal(phoneValid('+595 981 123'), false, 'too short for Paraguay');
assert.equal(phoneValid('+595 981 123 4567'), false, 'too long for Paraguay');
assert.equal(phoneValid('+595 21 123 45'), false, 'short landlines are rejected');
assert.equal(phoneValid('12345'), false, 'below the generic minimum');
assert.equal(phoneValid('+49 30 123456'), false, 'country codes outside the selector are rejected');
assert.equal(phoneValid('+595'), false);
assert.equal(phoneValid('no es un teléfono'), false);
assert.equal(phoneValid(''), false);
assert.equal(phoneValid('   '), false);
assert.equal(PHONE_ERROR, 'Ingresá un teléfono válido: código de país y número, por ejemplo +595 981 123 456.');

assert.equal(normalizeSerial(' sn-123 456 '), 'SN123456');
assert.equal(normalizeSerial('dji_mic_2'), 'DJIMIC2');
assert.equal(normalizeSerial(''), '');

assert.equal(decimalInput('12,5'), '12.5', 'una coma se normaliza a punto');
assert.equal(decimalInput('12..5'), '12.5', 'un solo separador');
assert.equal(decimalInput('12,345'), '12.34', 'hasta dos decimales');
assert.equal(decimalInput('abc12'), '12', 'solo dígitos y separador');
assert.equal(decimalInput('1.5.6'), '1.56');

assert.deepEqual(emailSuggestions('ana@g'), ['ana@gmail.com']);
assert.equal(emailSuggestions('ana@').length, 4);
assert.deepEqual(emailSuggestions('ana@gmail.com'), [], 'a complete domain never suggests');
assert.deepEqual(emailSuggestions('ana g@'), [], 'spaces disable suggestions');
assert.deepEqual(emailSuggestions('@g'), [], 'a missing local part never suggests');
assert.deepEqual(emailSuggestions('ana@zzz'), []);

console.log('PASS: shared phone/serial rules from owncoding-ui plus the ScaleOS landline policy');

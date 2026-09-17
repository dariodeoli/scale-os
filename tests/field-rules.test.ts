import assert from 'node:assert/strict';
import {DEFAULT_PHONE_COUNTRY, PHONE_COUNTRIES, digitsOnly, internationalPhone, normalizePhone, parsePhone, phoneMessage, phoneValid} from '../app/field-rules';

assert.equal(digitsOnly('+595 (981) 123-456'), '595981123456');
assert.equal(digitsOnly(''), '');
assert.deepEqual(parsePhone('+595 981 123 456'), {country: '+595', national: '981123456'});
assert.deepEqual(parsePhone('0981 123 456'), {country: '', national: '981123456'});
assert.deepEqual(parsePhone('+54 9 11 5555 4444'), {country: '+54', national: '91155554444'});
assert.deepEqual(parsePhone('+595 021 123 456'), {country: '+595', national: '21123456'});
assert.equal(parsePhone('   '), null);
assert.equal(parsePhone('abc'), null);
assert.ok(PHONE_COUNTRIES.some(entry => entry.code === DEFAULT_PHONE_COUNTRY));

assert.equal(phoneValid('+595 981 123 456'), true, 'mobile with 9 digits');
assert.equal(phoneValid('0981 123 456'), true, 'legacy domestic form with trunk zero');
assert.equal(phoneValid('+595 21 123 456'), true, 'landline with 8 digits');
assert.equal(phoneValid('+595 981 123'), false, 'too short for Paraguay');
assert.equal(phoneValid('+595 981 123 4567'), false, 'too long for Paraguay');
assert.equal(phoneValid('12345'), false, 'below the generic minimum');
assert.equal(phoneValid('+1 555 123 4567'), true, 'ten digits for other countries');
assert.equal(phoneValid('+49 30 123456'), false, 'unknown country code is rejected');
assert.equal(phoneValid(''), false);
assert.equal(phoneValid('   '), false);
assert.equal(phoneMessage('+595 981 123 456'), null);
assert.equal(phoneMessage('+595 123'), 'Ingresá un teléfono válido: código de país y número, por ejemplo +595 981 123 456.');

assert.equal(internationalPhone('+595', '0981 123 456'), '+595 981123456');
assert.equal(internationalPhone('+595', ''), '');
assert.equal(normalizePhone('0981 123 456'), '+595 981123456');
assert.equal(normalizePhone('+55 (11) 91234-5678'), '+55 11912345678');
assert.equal(normalizePhone(''), null);
assert.equal(normalizePhone('no es un teléfono'), null);

console.log('PASS: shared phone rules parse, validate and normalize country code plus national digits');

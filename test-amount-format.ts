import assert from 'node:assert/strict';
import {displayAmount,normalizeAmount,formatMoney} from './app/amount-format';
assert.equal(displayAmount('4000000','PYG'),'4.000.000');
assert.equal(normalizeAmount('4.000.000','PYG'),'4000000');
assert.equal(displayAmount('1250.50','USD'),'1.250,50');
assert.equal(normalizeAmount('1.250,50','USD'),'1250.50');
assert.equal(normalizeAmount('1250.50','USD'),'1250.50');
assert.equal(normalizeAmount('1,250.50','USD'),'1250.50');
assert.equal(normalizeAmount('1.250','USD'),'1250');
assert.equal(normalizeAmount('1.250,509','USD'),'1250.50');
assert.equal(normalizeAmount('0,5','USD'),'0.5');
assert.equal(displayAmount('0.','USD'),'0,');
assert.equal(normalizeAmount('','USD'),'');
assert.equal(normalizeAmount('00050','PYG'),'50');
assert.equal(displayAmount('4000000.00','PYG'),'4.000.000');
console.log('PASS: PYG grouping, USD cents, input normalization and empty states');
for (const currency of ['PYG','USD','EUR','BRL']) {
  const cents = currency === 'PYG' ? '' : ',50';
  assert.equal(formatMoney('1234567.50',currency),currency === 'PYG' ? 'PYG 1.234.568' : `${currency} 1.234.567${cents}`);
  assert.equal(formatMoney(0,currency),`${currency} 0${currency === 'PYG' ? '' : ',00'}`);
  assert.equal(formatMoney('-1250.25',currency),`${currency} -1.250${currency === 'PYG' ? '' : ',25'}`);
  for (const missing of [null,undefined,'','  ','NaN','Infinity',NaN,Infinity,'1.250,50','0x10']) {
    assert.equal(formatMoney(missing,currency),'Sin datos');
  }
  assert.equal(displayAmount('',currency),'','empty input stays editable');
  assert.equal(normalizeAmount('',currency),'','empty input is not a display label');
  assert.equal(displayAmount('1250.50',currency),currency === 'PYG' ? '1.250' : '1.250,50');
  if (currency !== 'PYG') {
    assert.equal(normalizeAmount('1.250,50',currency),'1250.50');
    assert.equal(normalizeAmount('1,250.50',currency),'1250.50');
    assert.equal(displayAmount('0.',currency),'0,');
  }
}
assert.equal(formatMoney('9007199254740993.125','USD'),'USD 9.007.199.254.740.993,13');
assert.equal(formatMoney('999.995','EUR'),'EUR 1.000,00');
assert.equal(formatMoney('-1.005','BRL'),'BRL -1,01');
assert.equal(formatMoney('-0.001','USD'),'USD 0,00');
assert.equal(formatMoney(-1e-7,'USD'),'USD 0,00');
assert.equal(formatMoney(1e21,'USD'),'USD 1.000.000.000.000.000.000.000,00');
assert.equal(formatMoney('1250',' usd '),'USD 1.250,00');
assert.equal(formatMoney('1250','invalid'),'Sin datos');
assert.equal(formatMoney('1250',''),'Sin datos');
assert.equal(formatMoney('1250'),'PYG 1.250');
console.log('PASS: four currencies, grouping, cents, missing/invalid values, exact large decimals, display rounding and unchanged inputs');

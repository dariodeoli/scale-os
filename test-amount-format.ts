import assert from 'node:assert/strict';
import {caretAfterDigits,displayAmount,formatSignedMoney,formatWholeMoney,isMoneyCurrency,normalizeAmount} from './app/amount-format';
assert.equal(displayAmount('4000000','PYG'),'4.000.000');
assert.equal(normalizeAmount('4.000.000','PYG'),'4000000');
assert.equal(normalizeAmount('1.234','PYG'),'1234');
assert.equal(normalizeAmount('1,234','PYG'),'1234');
assert.equal(normalizeAmount('4.000.000,50','PYG'),'4000000');
assert.equal(normalizeAmount('1,2345','PYG'),'12345');
assert.equal(displayAmount('1250.50','USD'),'1.250,50');
assert.equal(normalizeAmount('1.250,50','USD'),'1250.50');
assert.equal(normalizeAmount('1250.50','USD'),'1250.50');
assert.equal(normalizeAmount('1,250.50','USD'),'1250.50');
assert.equal(normalizeAmount('1,234','USD'),'1234');
assert.equal(normalizeAmount('1.250','USD'),'1250');
assert.equal(normalizeAmount('1.250,509','USD'),'1250.50');
assert.equal(normalizeAmount('0,5','USD'),'0.5');
assert.equal(displayAmount('0.','USD'),'0,');
assert.equal(normalizeAmount('','USD'),'');
assert.equal(normalizeAmount('00050','PYG'),'50');
assert.equal(displayAmount('4000000.00','PYG'),'4.000.000');
assert.equal(caretAfterDigits('4.000.000',5),7);
assert.equal(caretAfterDigits('4.000.000',0),0);

// Seis monedas de la empresa: los helpers de entrada aceptan cualquiera de las seis
// (PYG entero, el resto con dos decimales) y el transporte entero de la previsión
// se dibuja sin decimales para todas (excepción documentada de formatWholeMoney).
for(const currency of ['EUR','BRL','ARS','MXN']){
 assert.equal(isMoneyCurrency(currency),true,`${currency} is a company currency`);
 assert.equal(displayAmount('1234.5',currency),'1.234,5',`${currency} keeps two decimals while typing`);
 assert.equal(normalizeAmount('1.234,50',currency),'1234.50',`${currency} normalizes a grouped amount`);
 assert.equal(normalizeAmount('1,234',currency),'1234',`${currency} tolerates the other group separator`);
 assert.match(formatWholeMoney(1234,currency),new RegExp(`^${currency}[\\s\\u00a0]1,234$`),`${currency} whole money shows no decimals`);
 assert.match(formatSignedMoney(-1234,currency),new RegExp(`^−${currency}[\\s\\u00a0]1,234$`),`${currency} signed money keeps the minus`);
}
assert.equal(isMoneyCurrency('GBP'),false,'unknown codes stay invalid');
assert.equal(formatWholeMoney(1234,'GBP'),'Sin dato','unknown codes never format');
assert.equal(formatWholeMoney('1234.50','EUR'),'Sin dato','whole transport rejects fractional values');
console.log('PASS: PYG grouping, grouped paste, USD cents, caret tracking, input normalization, empty states and the six company currencies (PYG integer, the rest with two decimals while typing, none in whole transport)');

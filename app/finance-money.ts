import {currencyCodes} from './currencies';
import {money} from './money-format';
const minorUnits=(value:string|number)=>{const match=String(value).match(/^(-?)(\d+)(?:\.(\d{1,2}))?$/);if(!match)throw Error('Importe monetario inválido');return (match[1]?-1n:1n)*(BigInt(match[2])*100n+BigInt((match[3]||'').padEnd(2,'0')));};
const decimal=(cents:bigint)=>{const absolute=cents<0n?-cents:cents;return `${cents<0n?'-':''}${absolute/100n}${absolute%100n?`.${String(absolute%100n).padStart(2,'0')}`:''}`;};
/** Exact fixed-point arithmetic. Number conversion belongs only in chart geometry. */
export const sumMoney=(values:readonly (string|number)[])=>decimal(values.reduce((total,value)=>total+minorUnits(value),0n));
export const subtractMoney=(left:string|number,right:string|number)=>decimal(minorUnits(left)-minorUnits(right));
export function isRealMoney(value:unknown,currency:unknown,positive=false):value is string|number{
 if(typeof currency!=='string'||!currencyCodes.includes(currency as typeof currencyCodes[number])||typeof value!=='string'&&typeof value!=='number')return false;
 try{const cents=minorUnits(value);return (positive?cents>0n:cents>=0n)&&(currency!=='PYG'||cents%100n===0n);}catch{return false;}
}
export const isPositiveRealMoney=(value:unknown,currency:unknown)=>isRealMoney(value,currency,true);
export function formatRealMoney(value:unknown,currency:string){
 if(typeof value!=='string'&&typeof value!=='number')return 'Sin dato';
 try{minorUnits(value);return money(value,currency);}catch{return 'Sin dato';}
}

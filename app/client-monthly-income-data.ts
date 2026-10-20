import {currencyCodes} from './currencies';
import {sumMoney} from './finance-money';
import {validateMonth} from './ui/temporal-value';

export type MonthlyIncomeEntry={id:string;kind:'base'|'extra';label:string;amount:string|number;currency:string;version:string|number;createdAt:string};
export type MonthlyIncomeTotal={currency:string;baseAmount:string|number;extrasAmount:string|number;totalAmount:string|number};
export type ClientMonthlyIncome={clientId:string;month:string;revision:string;canManage:boolean;periodClosed?:boolean;archived?:boolean;entries:MonthlyIncomeEntry[];totals:MonthlyIncomeTotal[]};
const record=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value);
const money=(value:unknown)=>typeof value==='string'&&/^\d+$/.test(value)||typeof value==='number'&&Number.isSafeInteger(value)&&value>=0;
const currency=(value:unknown)=>typeof value==='string'&&currencyCodes.includes(value as typeof currencyCodes[number]);
/** Fail visibly on inconsistent totals instead of presenting a guessed client income. */
export function monthlyIncome(value:unknown,id:string,month:string):ClientMonthlyIncome|null{
 if(!record(value)||String(value.clientId)!==id||value.month!==month||(!validateMonth(month)||month<'1900-01'||month>'9998-12')||typeof value.revision!=='string'||!/^\d+$/.test(value.revision)||typeof value.canManage!=='boolean'||!Array.isArray(value.entries)||!Array.isArray(value.totals))return null;
 if(['periodClosed','archived'].some(key=>value[key]!==undefined&&typeof value[key]!=='boolean'))return null;
 if(!value.entries.every(row=>record(row)&&typeof row.id==='string'&&/^\d+$/.test(row.id)&&['base','extra'].includes(String(row.kind))&&typeof row.label==='string'&&money(row.amount)&&currency(row.currency)&&(typeof row.version==='string'||typeof row.version==='number')&&typeof row.createdAt==='string'))return null;
 if(!value.totals.every(row=>record(row)&&currency(row.currency)&&money(row.baseAmount)&&money(row.extrasAmount)&&money(row.totalAmount)&&sumMoney([String(row.baseAmount),String(row.extrasAmount)])===sumMoney([String(row.totalAmount)])))return null;
 return value as unknown as ClientMonthlyIncome;
}
export const monthlyIncomeUrl=(id:string,month?:string)=>`/api/agency/clients/${encodeURIComponent(id)}/monthly-income${month?`?month=${encodeURIComponent(month)}`:''}`;
export function monthlyIncomeAmountError(value:string,kind:'base'|'extra'){
 if(!/^\d+$/.test(value)||!Number.isSafeInteger(Number(value))||Number(value)<(kind==='base'?0:1))return kind==='base'?'Ingresá un importe entero igual o mayor a cero.':'Ingresá un importe entero mayor a cero.';
 return null;
}

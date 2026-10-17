import type {CSSProperties} from 'react';
import {formatRealMoney} from './finance-money';
/** One column width for every row/header; unusually long amounts expand only the table's scroll area. */
export function financeMoneyColumns(values:{value:string|null;currency:string}[]):CSSProperties{
 const length=Math.max(0,...values.map(row=>row.value===null?0:formatRealMoney(row.value,row.currency).length));
 return {'--finance-amount-width':`${Math.max(9,length*.55)}rem`} as CSSProperties;
}

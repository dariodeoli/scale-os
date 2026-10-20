import {currencyCodes} from './currencies';
import {isRealMoney,sumMoney} from './finance-money';
export type BalanceClient={client_id:string|number;client_name:string;client_active:boolean|null;client_logo_url:string|null;plan_id:string|number|null;plan_name:string|null;currency:string;contracted_amount:string;base_amount?:string;extras_amount?:string;invoice_required:boolean|null;received_in_month:string;applied_to_month_invoices:string;unallocated_received_in_month:string;registered_outstanding:string};
export type BalancePerson={collaborator_id:string|number;name:string;photo_url:string|null;currency:string;base_amount:string|null;override_amount:string|null;expected_amount:string|null;paid_in_month:string|null;outstanding_amount:string|null;history_known:boolean;salary_source:'monthly'|'fixed'|'none';salary_editable:boolean;salary_revision:string|null};
export type BalanceTotal={currency:string;contracted_amount:string;base_amount?:string;extras_amount?:string;received_in_month:string;registered_outstanding:string;expected_receipts:string};
export type BalanceDetails={month:string;clients:{records:BalanceClient[]};personnel:{records:BalancePerson[]};totals:BalanceTotal[]};
export type FinanceHistoryRecord={id:string;created_at:string;effective_from:string|null;actor_name:string|null;actor_photo_url:string|null;reason:string;before_amount:string|null;after_amount:string;before_currency:string|null;currency:string;compensation_type?:string|null;before_plan_id?:string|null;after_plan_id?:string|null;before_plan_name?:string|null;after_plan_name?:string|null;source:string;history_known:boolean};
export type FinanceHistoryPayload={records:FinanceHistoryRecord[];revision:string};
const record=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value);
const id=(value:unknown)=>typeof value==='string'||typeof value==='number';
const currency=(value:unknown)=>typeof value==='string'&&currencyCodes.includes(value as typeof currencyCodes[number]);
const text=(value:unknown)=>value===null||typeof value==='string';
const signed=(value:unknown)=>{if(typeof value!=='string')return false;try{sumMoney([value]);return true;}catch{return false;}};
/** Keep invalid or missing amounts visible as an error instead of fabricating zero. */
export function balanceDetails(value:unknown):BalanceDetails|null{
 if(!record(value)||typeof value.month!=='string'||!record(value.clients)||!Array.isArray(value.clients.records)||!record(value.personnel)||!Array.isArray(value.personnel.records)||!Array.isArray(value.totals))return null;
 const clients=value.clients.records.every(row=>record(row)&&id(row.client_id)&&typeof row.client_name==='string'&&(row.client_active===undefined||row.client_active===null||typeof row.client_active==='boolean')&&text(row.client_logo_url)&&text(row.plan_name)&&(row.plan_id===null||id(row.plan_id))&&currency(row.currency)&&isRealMoney(row.contracted_amount,row.currency)&&['base_amount','extras_amount'].every(key=>row[key]===undefined||isRealMoney(row[key],row.currency))&&(row.invoice_required===null||typeof row.invoice_required==='boolean')&&signed(row.received_in_month)&&isRealMoney(row.applied_to_month_invoices,row.currency)&&signed(row.unallocated_received_in_month)&&isRealMoney(row.registered_outstanding,row.currency));
 const personnel=value.personnel.records.every(row=>record(row)&&id(row.collaborator_id)&&typeof row.name==='string'&&text(row.photo_url)&&currency(row.currency)&&typeof row.history_known==='boolean'&&['monthly','fixed','none'].includes(String(row.salary_source))&&typeof row.salary_editable==='boolean'&&(row.salary_revision===null||typeof row.salary_revision==='string'&&/^\d+$/.test(row.salary_revision))&&['base_amount','outstanding_amount'].every(key=>row[key]===null||isRealMoney(row[key],row.currency))&&['override_amount','expected_amount','paid_in_month'].every(key=>row[key]===null||signed(row[key])));
 const totals=value.totals.every(row=>record(row)&&currency(row.currency)&&isRealMoney(row.contracted_amount,row.currency)&&['base_amount','extras_amount'].every(key=>row[key]===undefined||isRealMoney(row[key],row.currency))&&signed(row.received_in_month)&&isRealMoney(row.registered_outstanding,row.currency)&&isRealMoney(row.expected_receipts,row.currency));
 return clients&&personnel&&totals?{...value,clients:{...value.clients,records:value.clients.records.map(row=>({...row,client_active:row.client_active??null}))}} as unknown as BalanceDetails:null;
}
export function financeHistory(value:unknown):FinanceHistoryPayload|null{
 if(!record(value)||typeof value.revision!=='string'||!Array.isArray(value.records))return null;
 if(!value.records.every(row=>record(row)&&id(row.id)&&typeof row.created_at==='string'&&text(row.effective_from)&&text(row.actor_name)&&text(row.actor_photo_url)&&typeof row.reason==='string'&&(row.before_amount===null||signed(row.before_amount))&&signed(row.after_amount)&&text(row.before_currency)&&currency(row.currency)&&typeof row.source==='string'&&typeof row.history_known==='boolean'))return null;
 return value as unknown as FinanceHistoryPayload;
}

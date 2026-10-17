'use client';
import {useEffect,useState} from 'react';
import {Check,X,Gem,Package,SlidersHorizontal,CircleHelp} from 'lucide-react';
import {sumMoney} from './finance-money';
import {IconAction} from "./ui/icon-action";
import {PersonContainer} from './person-container';
import {ListGrid,ListRow,MoneyText,type Column} from './ui-v2';
import {ClientEditorDialog} from './client-editor';
import {FinanceHistoryDialog} from './finance-history';
import {formatRealMoney} from './finance-money';
import type {BalanceClient} from './finance-detail-data';
import {financeMoneyColumns} from './finance-list-layout';
import {Button as ScaleButton} from "./ui/button";

export const CLIENT_FINANCE_COLUMNS='grid-cols-[minmax(6.5rem,1fr)_2.25rem_var(--finance-amount-width)_var(--finance-amount-width)_2.75rem_4.25rem]';
const columns:Column[]=[{key:'client',label:'Cliente'},{key:'plan',label:'Plan'},{key:'contracted',label:'Contratado',align:'end'},{key:'paid',label:'Pagado en mes',align:'end'},{key:'invoice',label:'Factura'},{key:'actions',label:'Acciones',align:'end'}];
export function FinanceClientsSection({clients,month,role,canManageTerms,canHistory,onReload,navigate}:{clients:BalanceClient[];month:string;role:string;canManageTerms:boolean;canHistory:boolean;onReload:()=>void;navigate?:(label:string)=>void}){
 const totals=[...new Set(clients.map(row=>row.currency))].sort().map(currency=>({currency,contracted:sumMoney(clients.filter(row=>row.currency===currency).map(row=>row.contracted_amount)),received:sumMoney(clients.filter(row=>row.currency===currency).map(row=>row.received_in_month))}));
 const [selection,setSelection]=useState<{kind:'edit'|'history';client:BalanceClient}|null>(null);
 useEffect(()=>setSelection(null),[month]);
 return <section className="finance-balance-card finance-detail-section" style={financeMoneyColumns(clients.flatMap(row=>[row.contracted_amount,row.received_in_month].map(value=>({value,currency:row.currency}))),true)} aria-labelledby="balance-clients-title"><header><h3 className="finance-detail-title" id="balance-clients-title">Contratado y pagado</h3>{navigate?<ScaleButton className="text-button" onClick={()=>navigate('Clientes')} variant="ghost">Ver clientes</ScaleButton>:null}</header>
 <div className="finance-panel-totals" aria-label="Totales de clientes por moneda">{totals.map(total=><dl key={total.currency}><div><dt>Contratado · {total.currency}</dt><dd><MoneyText valor={total.contracted} currency={total.currency}/></dd></div><div><dt>Recibido en mes · {total.currency}</dt><dd><MoneyText valor={total.received} currency={total.currency}/></dd></div></dl>)}</div>
 <p className="finance-balance-help finance-panel-note">Pagado muestra cobros recibidos en el mes, incluso de períodos anteriores; no indica cancelación del contrato actual. Factura expresa el requisito del cliente.</p>
 {clients.length?<ListGrid label="Clientes y contratos del mes" template={CLIENT_FINANCE_COLUMNS} columns={columns} minWidthClass="min-w-0" className="finance-client-table">{clients.map(client=><ListRow template={CLIENT_FINANCE_COLUMNS} key={`${client.client_id}-${client.currency}`}>
  <span className="min-w-0"><PersonContainer name={client.client_name} photoUrl={client.client_logo_url} verified variante="logo" size="sm"/></span>
  <span className="finance-plan-cell"><FinancePlanIcon name={client.plan_name}/></span>
  <span className="finance-detail-amount"><MoneyText valor={client.contracted_amount} currency={client.currency}/></span>
  <span className="finance-detail-amount" title={`Cobrado en el mes: ${formatRealMoney(client.received_in_month,client.currency)}. Aplicado a facturas emitidas en este mes: ${formatRealMoney(client.applied_to_month_invoices,client.currency)}. Sin aplicación: ${formatRealMoney(client.unallocated_received_in_month,client.currency)}.`}><MoneyText valor={client.received_in_month} currency={client.currency}/></span>
  <span>{client.invoice_required===null?<span className="finance-invoice-icon text-mute" tabIndex={0} role="img" aria-label="Requisito de factura sin definir" title="Requisito de factura sin definir"><CircleHelp size={17} aria-hidden="true"/></span>:<span className={`finance-invoice-icon ${client.invoice_required?'text-ok':'text-bad'}`} tabIndex={0} role="img" aria-label={client.invoice_required?'Pide factura':'No pide factura'} title={client.invoice_required?'Pide factura':'No pide factura'}>{client.invoice_required?<Check size={17} aria-hidden="true"/>:<X size={17} aria-hidden="true"/>}</span>}</span>
  <span className="finance-detail-actions">{canManageTerms?<IconAction icon="edit" label={`Editar plan: ${client.client_name}`} onClick={()=>setSelection({kind:'edit',client})}/>:null}{canHistory?<IconAction icon="clock" label={`Historial del plan: ${client.client_name}`} onClick={()=>setSelection({kind:'history',client})}/>:null}</span>
 </ListRow>)}</ListGrid>:<p className="finance-balance-help">Sin contratos, cobros ni deudas de clientes para este mes.</p>}
 {selection?.kind==='history'?<FinanceHistoryDialog kind="plan" id={String(selection.client.client_id)} name={selection.client.client_name} close={()=>setSelection(null)}/>:null}
 {selection?.kind==='edit'?<ClientEditorDialog mode="edit" clientId={String(selection.client.client_id)} role={role} canManageTerms={canManageTerms} planFocus close={()=>setSelection(null)} refresh={async()=>{onReload();setSelection({kind:'history',client:selection.client});}}/>:null}
 </section>;
}

/** Presentation uses the stored plan name, never the negotiated amount. */
function FinancePlanIcon({name}:{name:string|null}){
 const label=name||'Sin plan registrado';
 const Icon=!name?CircleHelp:/\bsilver\b/i.test(name)?Gem:/personaliz|custom/i.test(name)?SlidersHorizontal:Package;
 return <span className="finance-plan-icon" role="img" tabIndex={0} title={label} aria-label={label}><Icon size={18} aria-hidden="true"/><span className="sr-only">{label}</span></span>;
}

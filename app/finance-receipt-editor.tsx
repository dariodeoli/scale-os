'use client';
import {useRef,useState} from 'react';
import {Dialog,Editor,type EditorHandle,type Field} from './operations';
import {AccountCreateDialog} from './account-create-dialog';
import {MoneyText} from './ui-v2';
import {isCurrency,todayAsuncion} from './forecast-data';
import type {Account} from './workspace-types';
import {Button as ScaleButton} from "./ui/button";

type ReceiptAccount={id:string;name:string;currency:string};
/** Keep the receipt Editor mounted while the shared account dialog is open. */
export function ReceiptPaymentDialog({fields,accounts,companyCurrency,requestId,canCreateAccount,close,onAccountCreated,save}:{fields:Field[];accounts:ReceiptAccount[];companyCurrency:string;requestId:string;canCreateAccount:boolean;close:()=>void;onAccountCreated:(account:Account)=>void;save:(values:Record<string,string>)=>Promise<void>}){
 const editor=useRef<EditorHandle>(null);
 const [defaults]=useState(()=>({accountId:'',amount:'',receivedOn:todayAsuncion(),reference:'',clientId:'',projectId:'',planId:'',requestId}));
 const [creating,setCreating]=useState<{currency:Account['currency']}|null>(null);
 const [currencyChange,setCurrencyChange]=useState<{account:Account;oldCurrency:string;amount:string}|null>(null);
 const currentCurrency=(accountId:string)=>accounts.find(account=>String(account.id)===accountId)?.currency||companyCurrency;
 const openAccount=()=>{const values=editor.current?.getValues()||defaults;const selected=currentCurrency(values.accountId);setCreating({currency:isCurrency(selected)?selected:'PYG'});};
 const accountCreated=(account:Account)=>{
  onAccountCreated(account);setCreating(null);
  const values=editor.current?.getValues()||defaults,previous=currentCurrency(values.accountId);
  if(values.amount!==''&&previous!==account.currency){setCurrencyChange({account,oldCurrency:previous,amount:values.amount});return;}
  editor.current?.patchValues({accountId:String(account.id)});
 };
 const enhancedFields=fields.map(field=>field.key==='accountId'?{...field,after:canCreateAccount?<div className="finance-inline-account"><span className="field-help">{accounts.length?'¿El dinero ingresó a otra cuenta?':'Todavía no hay cuentas de ingreso.'}</span><ScaleButton className="text-button" type="button" onClick={openAccount} variant="ghost">Agregar cuenta</ScaleButton></div>:field.after}:field);
 return <>
  <Dialog title="Recibir pago" close={close}>{!accounts.length&&!canCreateAccount?<p className="field-help">Necesitás una cuenta para registrar el cobro. Pedile a una persona con permiso de cuentas que la agregue.</p>:null}<Editor formHandle={editor} fields={enhancedFields} defaults={defaults} save={save}/></Dialog>
  {canCreateAccount&&creating?<AccountCreateDialog initialCurrency={creating.currency} close={()=>setCreating(null)} done={accountCreated}/>:null}
  {currencyChange?<Dialog title="Revisar moneda del cobro" close={()=>setCurrencyChange(null)}><p>La cuenta nueva usa {currencyChange.account.currency}. El borrador contiene <MoneyText valor={currencyChange.amount} currency={currencyChange.oldCurrency}/>. No se convierte ese importe a otra moneda.</p><p className="field-help">Podés conservar el borrador actual o elegir la cuenta nueva y volver a ingresar el importe en su moneda.</p><div className="finance-balance-actions"><ScaleButton type="button" className="secondary" onClick={()=>setCurrencyChange(null)} variant="secondary">Conservar borrador</ScaleButton><ScaleButton type="button" className="primary" onClick={()=>{editor.current?.patchValues({accountId:String(currencyChange.account.id),amount:''});setCurrencyChange(null);}} variant="primary">Usar cuenta y revisar importe</ScaleButton></div></Dialog>:null}
 </>;
}

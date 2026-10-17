'use client';
import {useEffect,useState} from 'react';
import {IconAction} from 'owncoding-ui';
import {api,Dialog,Editor,type Field} from './operations';
import {PersonContainer} from './person-container';
import {ListGrid,ListRow,MoneyText,ErrorBlock,LoadingBlock,type Column} from './ui-v2';
import {isRecord,isSignedWhole} from './forecast-data';
import {isRealMoney} from './finance-money';
import {FinanceHistoryDialog,FinanceHistoryPanel,financeHistoryUrl,useFinanceHistory} from './finance-history';
import type {BalancePerson} from './finance-detail-data';
import {financeMoneyColumns} from './finance-list-layout';
export const PERSONNEL_COLUMNS='grid-cols-[minmax(11rem,1.5fr)_var(--finance-amount-width)_var(--finance-amount-width)_var(--finance-amount-width)_var(--finance-amount-width)_var(--finance-amount-width)_8rem]';
const columns:Column[]=[{key:'person',label:'Persona'},{key:'base',label:'Salario base',align:'end'},{key:'adjustment',label:'Ajuste del mes',align:'end'},{key:'expected',label:'Cierre previsto',align:'end'},{key:'paid',label:'Pagado en mes',align:'end'},{key:'difference',label:'Diferencia prevista',align:'end'},{key:'actions',label:'Acciones',align:'end'}];
type Selection={kind:'salary'|'adjustment'|'history';person:BalancePerson}|null;
export function FinancePersonnelSection({members,month,canSalary,onReload,navigate}:{members:BalancePerson[];month:string;canSalary:boolean;onReload:()=>void;navigate?:(label:string)=>void}){
 const [selection,setSelection]=useState<Selection>(null);
 const [error,setError]=useState('');
 useEffect(()=>{setSelection(null);setError('');},[month]);
 const completed=(person:BalancePerson)=>{onReload();setSelection({kind:'history',person});};
 return <section className="finance-balance-card finance-detail-section" style={financeMoneyColumns(canSalary?members.flatMap(row=>[row.base_amount,row.override_amount,row.expected_amount,row.paid_in_month,row.outstanding_amount].map(value=>({value,currency:row.currency}))):[])} aria-labelledby="balance-personnel-title"><header><h3 className="finance-detail-title" id="balance-personnel-title">Equipo y salarios</h3>{navigate?<button className="text-button" onClick={()=>navigate('Equipo')}>Ver equipo</button>:null}</header>
  <p className="finance-balance-help">Base y ajustes forman el cierre previsto. Pagado muestra salidas recibidas por la persona en el mes; la diferencia es orientativa y no acredita la cancelación de un período salarial.</p>
  {!canSalary?<p className="finance-balance-help">Tu acceso no incluye información salarial.</p>:null}
  {members.length?<ListGrid label="Equipo y salarios del mes" template={PERSONNEL_COLUMNS} columns={columns} minWidthClass="min-w-[68rem]" className="finance-personnel-table">{members.map(member=><ListRow template={PERSONNEL_COLUMNS} className="forecast-person-row" key={`${member.collaborator_id}-${member.currency}`}>
   <span className="min-w-0"><PersonContainer name={member.name} photoUrl={member.photo_url} verified secondary={member.history_known?undefined:'Vigencia anterior no registrada'} size="sm"/></span>
   <span className="forecast-person-base finance-detail-amount"><MoneyText valor={canSalary?member.base_amount:null} currency={member.currency}/></span>
   <span className="finance-detail-amount"><MoneyText valor={canSalary?member.override_amount:null} currency={member.currency}/></span>
   <span className="forecast-person-total finance-detail-amount"><MoneyText valor={canSalary?member.expected_amount:null} currency={member.currency}/></span>
   <span className="finance-detail-amount" title="Pagos realizados en el mes, sin imputación a un período salarial"><MoneyText valor={canSalary?member.paid_in_month:null} currency={member.currency}/></span>
   <span className="finance-detail-amount" title="Cierre previsto menos pagos del mes; diferencia orientativa, no una deuda salarial acreditada"><MoneyText valor={canSalary?member.outstanding_amount:null} currency={member.currency}/></span>
   {canSalary&&member.base_amount!==null?<span className="forecast-person-actions finance-detail-actions">
    {member.salary_editable?<><IconAction icon="edit" label={`Editar salario: ${member.name}`} onClick={()=>setSelection({kind:'salary',person:member})}/>
    <IconAction icon="sliders" label={`Ajuste del mes: ${member.name}`} onClick={()=>setSelection({kind:'adjustment',person:member})}/></>:null}
    <IconAction icon="clock" label={`Historial salarial: ${member.name}`} onClick={()=>setSelection({kind:'history',person:member})}/>
   </span>:<span aria-hidden="true"/>}
  </ListRow>)}</ListGrid>:<p className="finance-balance-help">Sin integrantes incluidos para este mes.</p>}
  {error?<ErrorBlock title="No se pudo completar la operación" description={error} onRetry={()=>setError('')}/>:null}
  {selection?.kind==='salary'?<SalaryChangeDialog person={selection.person} month={month} close={()=>setSelection(null)} onSaved={()=>completed(selection.person)}/>:null}
  {selection?.kind==='history'?<FinanceHistoryDialog kind="salary" id={String(selection.person.collaborator_id)} name={selection.person.name} close={()=>setSelection(null)}/>:null}
  {selection?.kind==='adjustment'?<SalaryAdjustmentDialog person={selection.person} month={month} close={()=>setSelection(null)} onSaved={()=>{setSelection(null);onReload();}}/>:null}
 </section>;
}
export function SalaryChangeDialog({person,month,close,onSaved}:{person:BalancePerson;month:string;close:()=>void;onSaved:()=>void}){
 const history=useFinanceHistory('salary',String(person.collaborator_id));
 const [requestId]=useState(()=>crypto.randomUUID());
 const fields:Field[]=[{key:'amount',label:'Salario base',type:'money',currency:person.currency,validate:value=>isRealMoney(value,person.currency)?null:'Ingresá un importe sin signo negativo; PYG entero y otras monedas con hasta dos decimales.'},{key:'effectiveFrom',label:'Vigente desde',type:'date',help:'Primer día del mes. Conserva las condiciones de los meses anteriores.',validate:value=>/^\d{4}-(0[1-9]|1[0-2])-01$/.test(value)?null:'Elegí el primer día del mes de vigencia.'},{key:'reason',label:'Motivo del cambio',type:'textarea',maxLength:1000,validate:value=>value.trim().length>=5?null:'Explicá el cambio con al menos cinco caracteres.'}];
 return <Dialog title={`Salario fijo mensual · ${person.name}`} close={close}>
  <p className="field-help">Editás el salario mensual en {person.currency}. Conserva la modalidad y el importe por hora, proyecto o servicio de la ficha; un ajuste puntual del mes se registra por separado.</p>
  {history.data?<Editor fields={fields} defaults={{amount:person.base_amount??'',effectiveFrom:`${month}-01`,reason:''}} label="Guardar salario" save={async values=>{await api(financeHistoryUrl('salary',String(person.collaborator_id)),{...values,currency:person.currency,requestId,expectedRevision:history.data!.revision});onSaved();}}/>:history.error?<ErrorBlock title="No se puede editar sin cargar el historial" description={history.error} onRetry={history.reload}/>:<LoadingBlock label="Cargando historial salarial…" lines={2}/>}
  <FinanceHistoryPanel data={history.data} error={history.error} onRetry={history.reload}/>
 </Dialog>;
}
function SalaryAdjustmentDialog({person,month,close,onSaved}:{person:BalancePerson;month:string;close:()=>void;onSaved:()=>void}){
 const [data,setData]=useState<{amount:string;note:string}|null>(null),[error,setError]=useState(''),[version,setVersion]=useState(0);
 useEffect(()=>{let active=true;setData(null);setError('');void api<unknown>(`/api/agency/collaborators/${person.collaborator_id}/salary-overrides?month=${month}`).then(response=>{if(!active)return;if(isRecord(response)&&response.override===null){setData({amount:'',note:''});return;}if(!isRecord(response)||!isRecord(response.override)||!isSignedWhole(response.override.amount))throw Error('El ajuste recibido no es válido.');setData({amount:String(response.override.amount),note:typeof response.override.note==='string'?response.override.note:''});}).catch(cause=>{if(active)setError(cause instanceof Error?cause.message:'No se pudo cargar el ajuste.');});return()=>{active=false;};},[person.collaborator_id,month,version]);
 return <Dialog title={`Ajuste del mes · ${person.name}`} close={close}>
  <p className="field-help">Sólo afecta {month}; no cambia el salario base ni su vigencia.</p>
  {error?<ErrorBlock title="No se pudo cargar el ajuste" description={error} onRetry={()=>setVersion(value=>value+1)}/>:!data?<LoadingBlock label="Cargando ajuste…" lines={2}/>:<>
   <Editor fields={[{key:'sign',label:'Tipo',choices:[{value:'extra',label:'Extra'},{value:'discount',label:'Descuento'}]},{key:'amount',label:'Importe del ajuste',type:'money',integer:true,currency:person.currency,validate:value=>isRealMoney(value,person.currency,true)?null:'Ingresá un importe mayor a cero.'},{key:'note',label:'Motivo',type:'textarea',maxLength:1000}]} defaults={{sign:data.amount.startsWith('-')?'discount':'extra',amount:data.amount.replace(/^-/,'')||'',note:data.note}} save={async values=>{await api(`/api/agency/collaborators/${person.collaborator_id}/salary-overrides`,{month,amount:`${values.sign==='discount'?'-':''}${values.amount}`,note:values.note},'PATCH');onSaved();}}/>
   {data.amount&&data.amount!=='0'?<Editor fields={[{key:'confirmation',label:'Escribí QUITAR',validate:value=>value==='QUITAR'?null:'Escribí QUITAR para quitar el ajuste.'}]} defaults={{confirmation:''}} label="Quitar ajuste del mes" save={async()=>{await api(`/api/agency/collaborators/${person.collaborator_id}/salary-overrides?month=${month}`,{},'DELETE');onSaved();}}/>:null}
  </>}
 </Dialog>;
}

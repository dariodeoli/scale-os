import {financePaymentReviews} from './finance-payment-reviews.js';
// Fixed finance registry only: execution always uses the application's canonical
// handlers. No account/client is inferred from names, amounts or bank details.
import {agencyCore} from './agency-core.js';
import {suite} from './agency-suite.js';
import {financeTreasury} from './finance-treasury.js';
import {financeControls} from './finance-controls.js';
import {operations} from './operations.js';
import {economicHistory} from './economic-history.js';
import {financialForecast} from './forecast.js';
import {reports} from './reports.js';
import {recordLifecycle} from './record-lifecycle.js';

const identifier={type:'string',pattern:'^[1-9][0-9]{0,18}$'};
const nullableId={anyOf:[identifier,{type:'null'}]};
const month={type:'string',pattern:'^[0-9]{4}-(0[1-9]|1[0-2])$'};
const date={type:'string',pattern:'^[0-9]{4}-(0[1-9]|1[0-2])-[0-9]{2}$'};
const nullableDate={anyOf:[date,{type:'null'}]};
const currency={type:'string',enum:['PYG','USD','EUR','BRL','ARS','MXN']};
const text=max=>({type:'string',maxLength:max});
const reason={type:'string',minLength:5,maxLength:500};
const requestId={type:'string',format:'uuid'};
// Strings keep exact transport precision; canonical money validation determines
// positivity, currency decimals and limits. No floating arithmetic in this module.
const amount={type:'string',pattern:'^[0-9]+(?:\\.[0-9]{1,2})?$',maxLength:32};
const signedAmount={type:'string',pattern:'^-?[0-9]+(?:\\.[0-9]{1,2})?$',maxLength:32};
const whole={type:'string',pattern:'^[0-9]+$',maxLength:15};
const signedWhole={type:'string',pattern:'^-?[0-9]+$',maxLength:16};
const revision={type:'integer',minimum:0,maximum:Number.MAX_SAFE_INTEGER};
const revisionText={type:'string',pattern:'^(0|[1-9][0-9]*)$'};
const object=(properties,required=Object.keys(properties))=>({type:'object',properties,required,additionalProperties:false});
const empty=object({});
const read='scale:read',write='scale:write';
const financeDefinitions=[];
function define(name,method,path,cap,description,{params={},query={},requiredQuery=[],dataSchema,...rest}={}){
 financeDefinitions.push({name,method,path,cap,scope:method==='GET'?read:write,financial:method!=='GET',domain:'finance',description,params,query,requiredQuery,...(method==='GET'?{}:{dataSchema:dataSchema||empty}),...rest});
}
const keyed={params:{id:identifier}};
const monthly={query:{month},requiredQuery:['month']};
const paged={query:{limit:{type:'integer',minimum:1,maximum:100},offset:{type:'integer',minimum:0,maximum:10000}}};
const base='/api/agency';
define('scale_list_accounts','GET',base+'/accounts','accounts.manage','Cuentas bancarias, efectivo, digitales e inversión con saldo actual y titular/custodio.');
define('scale_create_account','POST',base+'/accounts','accounts.manage','Crear cuenta idempotente con requestId y saldo inicial cero. Nombre opcional generado desde banco/tipo/titular; saldo previo mediante account_opening.',{dataSchema:object({name:{type:'string',minLength:2,maxLength:160},accountType:{type:'string',enum:['bank','cash','digital','investment']},currency,institution:{type:['string','null'],maxLength:180},accountNumber:{type:['string','null'],maxLength:180},holderName:{type:['string','null'],maxLength:180},custodianUserId:nullableId,alias:{type:['string','null'],maxLength:120},holderTaxId:{type:['string','null'],maxLength:40},accountSubtype:{type:['string','null'],enum:['savings','checking',null]},requestId},['accountType','currency','requestId'])});
define('scale_update_account','PATCH',base+'/accounts/:id','accounts.manage','Editar metadata bancaria/titular/custodio con requestId y revisión exacta; moneda no cambia si hay movimientos.',{...keyed,dataSchema:object({name:text(240),accountType:{type:'string',enum:['bank','cash','digital','investment']},currency,institution:{type:['string','null'],maxLength:180},accountNumber:{type:['string','null'],maxLength:180},holderName:{type:['string','null'],maxLength:180},custodianUserId:nullableId,alias:{type:['string','null'],maxLength:120},holderTaxId:{type:['string','null'],maxLength:40},accountSubtype:{type:['string','null'],enum:['savings','checking',null]},expectedRevision:revision,requestId},['expectedRevision','requestId'])});
define('scale_list_account_custodians','GET',base+'/custodians','accounts.manage','Personas con acceso para elegir explícitamente custodio de una cuenta.');
define('scale_archive_account','DELETE',base+'/accounts/:id','accounts.manage','Retirar cuenta a papelera; canonical impide retirar una cuenta con saldo. No purga.',keyed);
define('scale_restore_account','POST',base+'/accounts/:id/restore','accounts.manage','Restaurar cuenta de papelera, conservando movimientos e historial.',keyed);
define('scale_add_account_opening','POST',base+'/finance/account-openings','accounts.manage','Registrar saldo previo de cuenta por fecha real, motivo y requestId; no representa ingreso operativo.',{dataSchema:object({accountId:identifier,amount,openedOn:date,reason,requestId})});
define('scale_get_treasury','GET',base+'/finance/treasury','finance.view','Caja por cuenta: apertura, entradas, salidas, cierre, saldo actual y movimientos reales del mes.',monthly);
define('scale_get_finance_context','GET',base+'/finance/context','payments.manage','Buscar IDs explícitos de clientes, proyectos, planes, cuentas y facturas pendientes. No asociar automáticamente por coincidencias.',{query:{q:text(120),clientId:identifier}});
define('scale_get_financial_balance','GET',base+'/finance/balance-details','finance.balance.view','Balance de contratado y recibido, gastos, equipo y salarios; datos salariales enmascarados según permiso.',monthly);
define('scale_get_financial_forecast','GET',base+'/forecast','finance.view','Previsión por moneda; proyección separada del dinero recibido. Sin convertir contratos en cobros.',{query:{month,months:{type:'integer',minimum:1,maximum:12}},requiredQuery:['month']});
define('scale_get_financial_report','GET',base+'/reports','reports.view','Informe histórico de ingresos y costos por período, con límites de cobertura conocidos.',{query:{month,months:{type:'integer',minimum:1,maximum:24},previous:{type:'string',enum:['true','false']}},requiredQuery:['month']});
define('scale_list_finance_periods','GET',base+'/finance/periods','finance.view','Consultar meses abiertos/cerrados y revisión de cada cierre.');
for(const action of ['close','reopen'])define('scale_'+action+'_finance_period','POST',base+'/finance/periods/:month/'+action,'finance.view',`${action==='close'?'Cerrar':'Reabrir'} mes con motivo y revisión. Sólo el dueño: handler verifica rol y período; no reintentar con revisión actualizada automáticamente.`,{params:{month},dataSchema:object({reason,expectedRevision:revision})});
define('scale_list_client_payment_reviews','GET',base+'/finance/payment-reviews','billing.view','Revisión pendiente por defecto de cada cliente/mes, separada de pagos reales; evidencia y faltantes, sin inferir cobros.',{query:{month,...paged.query},requiredQuery:['month']});
define('scale_update_client_payment_review','PATCH',base+'/finance/payment-reviews/:id','payments.manage','Marcar revisión documental del cliente/mes con motivo y revisión; nunca cobra, cancela ni modifica deuda.',{...keyed,dataSchema:object({month,status:{type:'string',enum:['pending','reviewed']},note:{type:'string',minLength:5,maxLength:1000},expectedRevision:revision,requestId})});
// Same legacy names intentionally override only their definitions in the core.
define('scale_list_receipts','GET',base+'/finance/receipts','payments.manage','Cobros con/sin cliente, aplicaciones, saldo disponible y asociaciones explícitas.',paged);
define('scale_receive_payment','POST',base+'/payments','payments.manage','Recibir dinero en cuenta explícita. mode=unassigned permite sin cliente; factura o cliente explícitos aplican deuda existente. Asociar luego mediante links/applications. Nunca inferir cliente ni destino.',{dataSchema:object({mode:{type:'string',enum:['unassigned']},invoiceId:identifier,clientId:identifier,projectId:identifier,planId:identifier,period:{anyOf:[month,{type:'null'}]},monthlyIncomeEntryId:nullableId,accountId:identifier,amount,receivedOn:date,reference:text(180),receivedByUserId:identifier,requestId,parts:{type:'array',minItems:2,maxItems:10,items:object({accountId:identifier,amount})}},['amount','receivedOn','requestId'])});
define('scale_update_receipt_links','PATCH',base+'/payments/:id/links','payments.manage','Asociar o desasociar cobro a IDs explícitos de cliente/proyecto/plan con expectedRevision; no mueve caja.',{...keyed,dataSchema:object({clientId:nullableId,projectId:nullableId,planId:nullableId,period:{anyOf:[month,{type:'null'}]},monthlyIncomeEntryId:nullableId,expectedRevision:revision},['clientId','projectId','planId','expectedRevision'])});
define('scale_list_receipt_applications','GET',base+'/payments/:id/applications','payments.manage','Aplicaciones y saldo disponible de un cobro, sin sumar dinero por segunda vez.',keyed);
define('scale_apply_receipt','POST',base+'/payments/:id/applications','payments.manage','Aplicar cobro libre a factura o mora previa explícita (exactamente un destino), importe y requestId; no crea otro cobro.',{...keyed,dataSchema:object({invoiceId:identifier,receivableId:identifier,amount,requestId},['amount','requestId'])});
define('scale_reverse_receipt_application','DELETE',base+'/payments/:id/applications/:applicationId','payments.manage','Revertir aplicación conservando cobro e historial; requiere motivo.',{params:{id:identifier,applicationId:identifier},dataSchema:object({reason})});
define('scale_correct_receipt_date','POST',base+'/payments/:id/date-correction','payments.manage','Corregir fecha real mediante reemplazo y reversión auditados, con requestId; protege meses cerrados y no duplica caja.',{...keyed,dataSchema:object({receivedOn:date,reason,requestId})});
define('scale_reverse_payment','POST',base+'/payments/:id/reverse','payments.manage','Revertir cobro por ID explícito, fecha y motivo. Requiere dinero disponible; mantiene el historial.',{...keyed,dataSchema:object({reason,reversedOn:date})});
define('scale_list_opening_receivables','GET',base+'/finance/opening-receivables',['billing.view','payments.manage'],'Moras previas: saldo pendiente, período, vencimiento y previsibilidad de pago.');
define('scale_create_opening_receivable','POST',base+'/finance/opening-receivables','payments.manage','Registrar deuda previa manual de cliente explícito con motivo, período, vencimiento y fecha de pago prevista opcional; no recibe dinero.',{dataSchema:object({clientId:identifier,amount,currency,period:month,dueOn:date,expectedOn:nullableDate,forecastIncluded:{type:'boolean'},reason,requestId})});
define('scale_get_client_payment_status','GET',base+'/client-payment-status','billing.view','Estado de cobranza y mora de clientes.',{query:{month,status:{type:'string',enum:['up_to_date','due_soon','late','severe']}}});
define('scale_list_expenses','GET',base+'/expenses','expenses.manage','Gastos pagados y reversiones por fecha real.',monthly);
define('scale_create_expense','POST',base+'/expenses','expenses.manage','Registrar egreso real en cuenta explícita, categoría y fecha; requestId conserva idempotencia.',{dataSchema:object({accountId:identifier,amount,currency,category:{type:'string',minLength:1,maxLength:80},kind:{type:'string',enum:['fixed','variable']},paidOn:date,reference:text(180),requestId},['accountId','amount','currency','category','paidOn','requestId'])});
define('scale_reverse_expense','DELETE',base+'/expenses/:id','expenses.manage','Revertir gasto por ID y motivo, conservando auditoría y fecha real.',{...keyed,dataSchema:object({reason,reversedOn:date})});
const plannedSchema=object({cadence:{type:'string',enum:['monthly','recurring']},effectiveMonth:{...month,description:'Mes efectivo YYYY-MM'},category:{type:'string',minLength:1,maxLength:120},amount:whole,currency,note:{type:['string','null'],maxLength:1000},kind:{type:['string','null'],enum:['fixed','variable',null]}},['cadence','effectiveMonth','category','amount','currency','note']);
define('scale_list_planned_expenses','GET',base+'/planned-expenses','expenses.manage','Gastos previstos del mes, únicos o recurrentes; no egresan dinero.',monthly);
define('scale_create_planned_expense','POST',base+'/planned-expenses','expenses.manage','Planificar gasto único o recurrente; no mueve caja. API no soporta requestId, no reintentar altas automáticamente.',{dataSchema:plannedSchema});
define('scale_update_planned_expense','PATCH',base+'/planned-expenses/:id','expenses.manage','Editar gasto previsto sin modificar pagos reales. API no tiene revisión optimista.',{...keyed,dataSchema:plannedSchema});
define('scale_delete_planned_expense','DELETE',base+'/planned-expenses/:id','expenses.manage','Eliminar planificación de gasto; no revierte egresos ya pagados.',keyed);
define('scale_list_transfers','GET',base+'/transfers','transfers.manage','Transferencias entre cuentas: egreso, recepción, moneda y tipo de cambio explícitos.');
define('scale_create_transfer','POST',base+'/transfers','transfers.manage','Transferir entre dos cuentas explícitas con requestId. Para monedas distintas especificar receivedAmount; no inferir cotización.',{dataSchema:object({fromAccountId:identifier,toAccountId:identifier,amount,receivedAmount:amount,transferredOn:date,reference:text(120),notes:text(1000),requestId},['fromAccountId','toAccountId','amount','transferredOn','requestId'])});
define('scale_list_reconciliation','GET',base+'/reconciliation','accounts.manage','Extracto y movimientos pendientes de conciliar de cuenta explícita.',{query:{accountId:identifier},requiredQuery:['accountId']});
define('scale_import_statement','POST',base+'/reconciliation','accounts.manage','Importar extracto con IDs externos únicos. No crea ingresos ni egresos; filas repetidas se validan contra el original.',{dataSchema:object({accountId:identifier,lines:{type:'array',minItems:1,maxItems:1000,items:object({external_id:{type:'string',minLength:1,maxLength:120},booked_on:date,amount:signedAmount,reference:text(500)},['external_id','booked_on','amount'])}})});
define('scale_match_statement_line','POST',base+'/reconciliation/:id/match','accounts.manage','Conciliar una línea explícita con un movimiento explícito, sin inferir cliente por importe.',{...keyed,dataSchema:object({movement_type:{type:'string',enum:['payment','reversal','expense','expense_reversal','transfer_in','transfer_out','payout','opening']},movement_id:identifier})});
define('scale_unmatch_statement_line','POST',base+'/reconciliation/:id/unmatch','accounts.manage','Quitar conciliación de línea explícita; no cambia caja.',keyed);
define('scale_auto_reconcile_account','POST',base+'/reconciliation/:id/auto','accounts.manage','Conciliación canónica sólo con referencia, fecha e importe únicos exactos. No asocia clientes ni mueve dinero.',keyed);
define('scale_list_invoices','GET',base+'/invoices','invoices.manage','Facturas y saldos pendientes. API devuelve ventana fija 20 o all; respuesta MCP sigue límite global.',{query:{limit:{type:'string',enum:['20','all']}}});
define('scale_create_invoice','POST',base+'/invoices','invoices.manage','Crear factura para cliente explícito; no es cobro. API sin requestId, no reintentar alta automáticamente.',{dataSchema:object({clientId:identifier,total:amount,currency,dueOn:nullableDate,notes:{type:['string','null'],maxLength:2000}},['clientId','total','currency'])});
define('scale_invoice_budget','POST',base+'/budgets/:id/invoice','budgets.manage','Crear/recuperar factura de presupuesto aceptado; además requiere invoices.manage en handler.',keyed);
define('scale_list_salary_history','GET',base+'/collaborators/:id/salary-history','salary.view','Historial salarial, vigencias y revisión del colaborador explícito.',keyed);
define('scale_update_salary','POST',base+'/collaborators/:id/salary-history','salary.view','Cambiar salario con vigencia, motivo, requestId y revisión. Además exige finance.view o members.manage; canonical registra cronología.',{...keyed,dataSchema:object({amount,currency,effectiveFrom:{...date,description:'Primer día del mes'},reason:{type:'string',minLength:5,maxLength:1000},requestId,expectedRevision:revisionText})});
define('scale_list_salary_override','GET',base+'/collaborators/:id/salary-overrides','finance.view','Consultar ajuste salarial del mes; también exige salary.view.',{...keyed,...monthly});
define('scale_update_salary_override','PATCH',base+'/collaborators/:id/salary-overrides','finance.view','Ajuste salarial positivo o negativo del mes; también exige salary.view. Sustituye ajuste previo del mismo mes.',{...keyed,dataSchema:object({month,amount:signedWhole,note:text(1000)},['month','amount'])});
define('scale_delete_salary_override','DELETE',base+'/collaborators/:id/salary-overrides','finance.view','Quitar ajuste salarial del mes; también exige salary.view.',{...keyed,...monthly});
define('scale_list_payouts','GET',base+'/payouts','finance.view','Pagos reales de equipo/comisiones con cuenta, fecha e importe.');
define('scale_create_payout','POST',base+'/payouts','finance.view','Pagar colaborador o comisión aprobada, exactamente un destino explícito, con requestId idempotente; salarios requieren salary.view y toda operación payments.manage.',{allCaps:['payments.manage'],dataSchema:object({collaborator_id:identifier,commission_id:identifier,account_id:identifier,amount,paid_on:date,reference:{type:'string',minLength:1,maxLength:180},requestId},['account_id','amount','paid_on','reference','requestId'])});
define('scale_list_commissions','GET',base+'/commissions','commissions.manage','Comisiones registradas y estados.');
define('scale_get_monthly_commissions','GET',base+'/commissions/monthly','commissions.manage','Comisiones previstas, pendientes, aprobadas y pagadas del mes.',monthly);
define('scale_create_commission','POST',base+'/commissions','commissions.manage','Registrar comisión fija o porcentual de factura explícita con requestId idempotente.',{dataSchema:object({invoice_id:nullableId,collaborator_id:nullableId,basis:{type:'string',enum:['fixed','invoiced','collected']},kind:{type:'string',enum:['sales','referral']},beneficiary_name:{type:'string',minLength:1,maxLength:120},amount,currency,percentage:{type:'string',pattern:'^[0-9]+(?:\\.[0-9]{1,2})?$'},due_on:nullableDate,notes:text(2000),requestId},['basis','kind','beneficiary_name','amount','requestId'])});
define('scale_update_commission_status','PATCH',base+'/commissions/:id','commissions.manage','Aprobar o cancelar comisión pendiente/aprobada; pago separado mediante payouts.',{...keyed,dataSchema:object({status:{type:'string',enum:['approved','cancelled']}})});
define('scale_list_referral_discounts','GET',base+'/referral-discounts','commissions.manage','Descuentos de referidos aplicados a facturas.');
define('scale_create_referral_discount','POST',base+'/referral-discounts','commissions.manage','Aplicar descuento a factura explícita; no reduce total bajo pagado. API sin requestId, no reintentar alta automáticamente.',{dataSchema:object({invoice_id:identifier,amount,referrer:{type:'string',minLength:1,maxLength:120},reason:{type:'string',minLength:1,maxLength:500}})});
define('scale_reverse_referral_discount','PATCH',base+'/referral-discounts/:id','commissions.manage','Revertir descuento aplicado, conservando registro original.',keyed);
define('scale_list_exchange_rates','GET',base+'/exchange-rates','commercial.manage','Cotizaciones USD/PYG registradas; no convertir ni transferir automáticamente.');
define('scale_set_exchange_rate','POST',base+'/exchange-rates','commercial.manage','Registrar cotización USD/PYG por fecha explícita.',{dataSchema:object({rate_date:date,usd_to_pyg:{type:'integer',minimum:1000,maximum:100000}})});

export const mcpFinanceHandlers=[financePaymentReviews,economicHistory,financeTreasury,financeControls,financialForecast,reports,operations,suite,recordLifecycle,agencyCore];
// Full argument schemas and trusted resolvers are consumed by the core. Model input
// cannot supply a URL, method, headers or arbitrary query parameters.
const legacyNames=new Set(['scale_list_receipts','scale_receive_payment','scale_list_planned_expenses','scale_create_planned_expense','scale_update_planned_expense']);
const unsafeCreates=new Set();
function descriptor(d){
 const {params,query,requiredQuery,dataSchema,...rest}=d;
 const properties={...params,...query};
 const required=[...Object.keys(params),...requiredQuery];
 if(d.method!=='GET'){properties.confirm={type:'boolean',const:true};properties.data=dataSchema;required.push('confirm','data');}
 return {...rest,inputSchema:object(properties,required),resolve(args){
  const path=d.path.replace(/:([A-Za-z]+)/g,(_,key)=>encodeURIComponent(args[key]));
  const values={};for(const key of Object.keys(query))if(args[key]!==undefined)values[key]=args[key];
  return {path,query:values};
 }};
}
export const mcpFinanceTools=financeDefinitions.filter(d=>!legacyNames.has(d.name)&&!unsafeCreates.has(d.name)).map(descriptor);
export const mcpFinanceOverrides=financeDefinitions.filter(d=>legacyNames.has(d.name)).map(d=>{
 const mapped=descriptor(d);return {name:d.name,inputSchema:mapped.inputSchema,resolve:mapped.resolve,description:mapped.description};
});
export const financeCoverage=financeDefinitions.map(d=>({method:d.method,path:d.path,tool:unsafeCreates.has(d.name)?null:d.name,status:unsafeCreates.has(d.name)?'excluded-no-canonical-idempotency':legacyNames.has(d.name)?'existing-tool-schema-expanded':'covered',canonicalHandlers:true,financial:d.financial}));
export const financeGaps=[
 {method:'POST',path:base+'/transfers/:id/reverse',tool:null,status:'missing-canonical-api',reason:'Transfer handler has GET/POST collection only; no reversal route.'},
 {method:'POST',path:base+'/payouts/:id/reverse',tool:null,status:'missing-canonical-api',reason:'Payout creation is idempotent with requestId; no reversal endpoint exists.'},
 {method:'PATCH',path:base+'/finance/opening-receivables/:id',tool:null,status:'missing-canonical-api',reason:'Manual previous debts are append-only; no edit/reverse endpoint.'},
 {method:'PATCH',path:base+'/invoices/:id',tool:null,status:'missing-canonical-api',reason:'Only invoice GET/POST collection and accepted-budget invoice conversion exist; no edit/status/cancel endpoint.'},
 {method:'PATCH',path:base+'/collaborators/:id',tool:null,status:'excluded-access-side-effects',reason:'General collaborator PATCH may create users/memberships implicitly. Finance exposes audited salary-history only; compensation modality/profile requires team-domain guard and dedicated coverage.'},
 ...['scale_create_invoice','scale_create_referral_discount','scale_create_planned_expense'].map(tool=>({method:financeDefinitions.find(d=>d.name===tool).method,path:financeDefinitions.find(d=>d.name===tool).path,tool,status:'canonical-limitation',reason:'Canonical API has no requestId for this create. Do not automatically retry ambiguous successes; read records before any new user-confirmed attempt.'})),
];

import {roleCan} from './permissions.js';
import {assertRecordAvailable} from './record-lifecycle.js';
import {fail,id} from './suite-validation.js';
import {zoneTodaySql} from './business-time.js';

const parse=value=>typeof value==='string'?JSON.parse(value):value;
const listing=value=>(parse(value)||[]).map(item=>{
 if(typeof item==='string')return item.trim();
 const description=typeof item?.description==='string'?item.description.trim():'';
 if(!description)return '';
 return item.quantity===undefined||item.quantity===null||item.quantity===''?description:`${item.quantity} × ${description}`;
}).filter(Boolean).join('\n');
const date=value=>value instanceof Date?value.toISOString().slice(0,10):String(value??'').slice(0,10);
const decimal=value=>['string','number'].includes(typeof value)&&/^(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(String(value))&&Number.isFinite(Number(value));
const pricedItems=items=>Array.isArray(items)&&items.length>0&&items.every(item=>item&&typeof item==='object'&&!Array.isArray(item)&&decimal(item.quantity)&&Number(item.quantity)>0&&decimal(item.unitPrice??item.unit_price)&&Number(item.unitPrice??item.unit_price)>=0);

// Commercial amounts remain decimal strings. PostgreSQL does the arithmetic;
// no binary floating point or integer rounding enters a legal snapshot.
async function currentAgreement(c,u,clientId,planId=null){
 return (await c.query(`select *,case when monthly_price is not null then round(case discount_type when 'percent' then monthly_price*(1-discount_value/100) when 'fixed' then greatest(monthly_price-discount_value,0) else monthly_price end,case when currency='PYG' then 0 else 2 end)::text else recurring_amount::text end as contract_amount from agency_commercial_terms_on($1,${zoneTodaySql}) where client_id=$2${planId?' and plan_id=$3':''}`,[u.organization_id,id(clientId),...(planId?[planId]:[])])).rows[0];
}
function putAgreement(term,put,fallbackName=''){
 if(!term)return;
 const putTerm=(key,value)=>put('agreement.'+key,value,'client-commercial-terms',term.id);
 putTerm('amount',term.contract_amount);putTerm('currency',term.currency);putTerm('plan_name',term.plan_name||fallbackName);
 if(parse(term.deliverables)?.length)putTerm('deliverables',listing(term.deliverables));
 putTerm('starts_on',date(term.starts_on||term.effective_from));if(term.ends_on)putTerm('ends_on',date(term.ends_on));
 const cadence={monthly:'Cobro mensual',once:'Pago único',interval:`Cobro cada ${term.interval_months} meses`}[term.cadence];
 if(cadence)putTerm('payment_terms',[cadence,term.discount_terms].filter(Boolean).join('. '));
}

export async function fillContractCommercial(c,u,b,put){
 if(b.budget_id&&b.plan_id)fail('Elegí un presupuesto o un plan');
 if(!b.budget_id&&!b.plan_id){
  // Selecting a client is enough to recover the actual agreed price and dates,
  // including a negotiated snapshot without a catalog plan. Never invent one.
  if(b.client_id&&roleCan(u,'commercial-terms.manage'))putAgreement(await currentAgreement(c,u,b.client_id),put);
  return;
 }
 if(!roleCan(u,'budgets.manage'))fail('Sin permiso para presupuestos y planes',403);
 if(b.collaborator_id)fail('Un presupuesto o plan requiere una contraparte cliente');
 const table=b.budget_id?'agency_budgets':'agency_plans',key=id(b.budget_id||b.plan_id);
 const row=(await c.query(`select *${b.budget_id?',(tax_rate*100)::text as contract_tax_percentage':''} from ${table} where id=$1 and organization_id=$2 for update`,[key,u.organization_id])).rows[0];
 if(!row)fail('Origen comercial no encontrado',404);
 await assertRecordAvailable(c,table,row);
 if(row.active===false)fail('El plan está inactivo',409);
 if(b.budget_id){
  if(!b.client_id||String(row.client_id)!==String(id(b.client_id)))fail('El presupuesto debe corresponder al cliente seleccionado',409);
  if(['rejected','expired'].includes(row.status))fail('El presupuesto está rechazado o vencido',409);
  const putBudget=(key,value)=>put('agreement.'+key,value,'budget',row.id);
  putBudget('title',row.title);putBudget('scope',row.title);putBudget('amount',row.total);putBudget('currency',row.currency);putBudget('notes',row.notes);
  const items=(await c.query('select description,quantity from agency_budget_items where budget_id=$1 order by position',[row.id])).rows;
  putBudget('deliverables',listing(items));
  const taxPercentage=row.contract_tax_percentage.replace(/(\.\d*?)0+$/,'$1').replace(/\.$/,'');
  putBudget('tax_terms',`IVA ${taxPercentage}%; total del presupuesto con impuestos incluidos.`);
  // valid_until is quotation validity, never the service's end date.
  return;
 }
 const putPlan=(key,value)=>put('agreement.'+key,value,'plan',row.id);
 putPlan('plan_name',row.name);putPlan('scope',row.name);putPlan('currency',row.currency);putPlan('notes',row.notes);putPlan('deliverables',listing(row.items));
 const items=parse(row.items);
 if(pricedItems(items)){
  const amount=(await c.query(`select sum(round((item->>'quantity')::numeric*coalesce(item->>'unitPrice',item->>'unit_price')::numeric,2))::text as amount from jsonb_array_elements($1::jsonb) item`,[JSON.stringify(items)])).rows[0].amount;
  putPlan('amount',amount);
 }
 // Explicit catalog selection uses only the selected client's matching agreement.
 if(!b.client_id||!roleCan(u,'commercial-terms.manage'))return;
 putAgreement(await currentAgreement(c,u,b.client_id,row.id),put,row.name);
}
